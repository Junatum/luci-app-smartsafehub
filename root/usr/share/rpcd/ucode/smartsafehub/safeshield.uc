// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';

import * as fs from 'fs';
import {
	failure,
	new_uci_cursor,
	number_value,
	read_json_file,
	run_command,
	string_value,
	success
} from './core.uc';

const SAFESHIELD_CONFIG = 'safeshield';
const SAFESHIELD_SECTION = 'config';
const SAFESHIELD_STATUS_FILE = '/dev/shm/safeshield.status.json';
const SAFESHIELD_REFRESH_LOCK = '/tmp/smartsafehub-safeshield-refresh.lock';
const SAFESHIELD_REFRESH_LOG = '/tmp/smartsafehub-safeshield-refresh.log';
const SAFESHIELD_RULES_DIR = '/etc/safeshield';
const SAFESHIELD_ALLOWLIST_FILE = '/etc/safeshield/allowlist';
const SAFESHIELD_BLOCKLIST_FILE = '/etc/safeshield/blocklist';
const SAFESHIELD_RULES_LOCK = '/tmp/smartsafehub-safeshield-rules.lock';
const SAFESHIELD_RULE_FILE_MAX_BYTES = 131072;
const SAFESHIELD_RULE_LIMIT_PER_LIST = 500;
const SAFESHIELD_RULE_LIMIT_TOTAL = 1000;

function read_safeshield_bool(option, fallback) {
	const ctx = new_uci_cursor();

	if (!ctx) {
		return null;
	}

	const value = ctx.get(SAFESHIELD_CONFIG, SAFESHIELD_SECTION, option);

	if (value == null) {
		return fallback;
	}

	return sprintf('%s', value) == '1';
}

function read_safeshield_enabled() {
	return read_safeshield_bool('enabled', null);
}

function read_safeshield_apply_local_overrides() {
	return read_safeshield_bool('apply_local_overrides', true);
}

function safeshield_refresh_running() {
	const lock = fs.stat(SAFESHIELD_REFRESH_LOCK);

	if (lock) {
		// A power loss or killed child may leave the lock behind. Treat locks
		// older than 30 minutes as stale and recover automatically.
		if (time() - number_value(lock.mtime) < 1800) {
			return true;
		}

		fs.rmdir(SAFESHIELD_REFRESH_LOCK);
	}

	const state = read_json_file(SAFESHIELD_STATUS_FILE);
	const status = state?.status ?? state?.data?.status;

	return status == 'running';
}

function apply_safeshield_runtime(enabled) {
	if (enabled) {
		return run_command([ '/etc/init.d/safeshield', 'restart' ], 10000);
	}

	const stopped = run_command([ '/etc/init.d/safeshield', 'stop' ], 5000);
	const cache_deleted = run_command([ '/etc/init.d/safeshield', 'delete_cache' ], 5000);
	const dns_restarted = run_command([ '/etc/init.d/dnsmasq', 'restart' ], 10000);

	return stopped && cache_deleted && dns_restarted;
}

function persist_safeshield_enabled(enabled) {
	const ctx = new_uci_cursor();

	if (!ctx) {
		return false;
	}

	if (!ctx.set(
		SAFESHIELD_CONFIG,
		SAFESHIELD_SECTION,
		'enabled',
		enabled ? '1' : '0'
	)) {
		return false;
	}

	return ctx.commit(SAFESHIELD_CONFIG) == true;
}

export function set_safeshield_enabled(request) {
	const enabled = request.args.enabled;
	const previous = read_safeshield_enabled();

	if (previous == null) {
		return failure(
			'SAFESHIELD_CONFIG_READ_FAILED',
			'SafeShield 설정을 읽지 못했습니다.'
		);
	}

	if (!enabled && safeshield_refresh_running()) {
		return failure(
			'SAFESHIELD_REFRESH_RUNNING',
			'차단 목록 갱신이 끝난 뒤 SafeShield를 비활성화해 주세요.'
		);
	}

	if (previous == enabled) {
		return success({
			enabled: enabled,
			changed: false,
		});
	}

	if (!persist_safeshield_enabled(enabled)) {
		return failure(
			'SAFESHIELD_CONFIG_COMMIT_FAILED',
			'SafeShield 설정을 저장하지 못했습니다.'
		);
	}

	if (!apply_safeshield_runtime(enabled)) {
		// Best-effort rollback. This prevents the persisted configuration from
		// claiming a state which the runtime could not apply.
		persist_safeshield_enabled(previous);
		apply_safeshield_runtime(previous);

		return failure(
			'SAFESHIELD_RUNTIME_APPLY_FAILED',
			'SafeShield 실행 상태를 적용하지 못했습니다.'
		);
	}

	return success({
		enabled: enabled,
		changed: true,
	});
};

export function refresh_safeshield() {
	const enabled = read_safeshield_enabled();

	if (enabled == null) {
		return failure(
			'SAFESHIELD_CONFIG_READ_FAILED',
			'SafeShield 설정을 읽지 못했습니다.'
		);
	}

	if (!enabled) {
		return failure(
			'SAFESHIELD_DISABLED',
			'SafeShield가 비활성화되어 있어 갱신할 수 없습니다.'
		);
	}

	if (safeshield_refresh_running()) {
		return failure(
			'SAFESHIELD_REFRESH_RUNNING',
			'이미 SafeShield 차단 목록을 갱신하고 있습니다.'
		);
	}

	// mkdir() is atomic and acts as a small request lock. It prevents two
	// browsers from launching simultaneous foreground refresh_once processes.
	if (fs.mkdir(SAFESHIELD_REFRESH_LOCK) != true) {
		return failure(
			'SAFESHIELD_REFRESH_RUNNING',
			'이미 SafeShield 차단 목록을 갱신하고 있습니다.'
		);
	}

	// refresh_once may download and validate a large artifact. Start it in the
	// background so the rpcd request returns immediately instead of timing out.
	// All paths are constants controlled by this package.
	const command = sprintf(
		'(/etc/init.d/safeshield refresh_once; rc=$?; rmdir %s; exit $rc) >%s 2>&1 </dev/null &',
		SAFESHIELD_REFRESH_LOCK,
		SAFESHIELD_REFRESH_LOG
	);

	if (!run_command([ '/bin/sh', '-c', command ], 2000)) {
		fs.rmdir(SAFESHIELD_REFRESH_LOCK);

		return failure(
			'SAFESHIELD_REFRESH_START_FAILED',
			'SafeShield 갱신 작업을 시작하지 못했습니다.'
		);
	}

	return success({
		accepted: true,
		startedAt: time(),
	});
};

function ensure_directory(path) {
	const stat = fs.stat(path);

	if (stat) {
		return stat.type == 'directory';
	}

	return fs.mkdir(path) == true;
}

function normalize_domain(value) {
	if (type(value) != 'string') {
		return null;
	}

	const domain = rtrim(lc(trim(value)), '.');

	if (!length(domain) || length(domain) > 253 || index(domain, '.') < 1) {
		return null;
	}

	if (iptoarr(domain) != null || match(domain, /^[a-z0-9.-]+$/) == null) {
		return null;
	}

	for (let label in split(domain, '.')) {
		if (
			!length(label) ||
			length(label) > 63 ||
			match(label, /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/) == null
		) {
			return null;
		}
	}

	return domain;
}

function load_rule_list(path) {
	const stat = fs.stat(path);

	if (!stat) {
		return {
			ok: true,
			rules: [],
			ignored: 0,
		};
	}

	if (stat.type != 'file' || number_value(stat.size) > SAFESHIELD_RULE_FILE_MAX_BYTES) {
		return {
			ok: false,
			code: 'SAFESHIELD_RULE_FILE_INVALID',
			message: '사용자 규칙 파일이 올바르지 않거나 너무 큽니다.',
		};
	}

	const raw = fs.readfile(path, SAFESHIELD_RULE_FILE_MAX_BYTES);

	if (raw == null) {
		return {
			ok: false,
			code: 'SAFESHIELD_RULE_FILE_READ_FAILED',
			message: '사용자 규칙 파일을 읽지 못했습니다.',
		};
	}

	const seen = {};
	let ignored = 0;

	for (let line in split(raw, /\r?\n/)) {
		const candidate = trim(line);

		if (!length(candidate) || match(candidate, /^#/) != null) {
			continue;
		}

		const domain = normalize_domain(candidate);

		if (domain == null) {
			ignored++;
			continue;
		}

		seen[domain] = true;
	}

	return {
		ok: true,
		rules: sort(keys(seen)),
		ignored: ignored,
	};
}

function read_rule_lists() {
	const allow = load_rule_list(SAFESHIELD_ALLOWLIST_FILE);

	if (!allow.ok) {
		return allow;
	}

	const block = load_rule_list(SAFESHIELD_BLOCKLIST_FILE);

	if (!block.ok) {
		return block;
	}

	return {
		ok: true,
		allow: allow.rules,
		block: block.rules,
		ignored: {
			allow: allow.ignored,
			block: block.ignored,
		},
	};
}

function build_rules_payload(lists) {
	const enabled = read_safeshield_enabled();
	const apply_local_overrides = read_safeshield_apply_local_overrides();

	return {
		allow: lists.allow,
		block: lists.block,
		counts: {
			allow: length(lists.allow),
			block: length(lists.block),
			total: length(lists.allow) + length(lists.block),
		},
		ignored: lists.ignored,
		safeshieldEnabled: enabled == true,
		applyLocalOverrides: apply_local_overrides == true,
		limits: {
			perList: SAFESHIELD_RULE_LIMIT_PER_LIST,
			total: SAFESHIELD_RULE_LIMIT_TOTAL,
		},
	};
}

export function read_safeshield_rules() {
	const lists = read_rule_lists();

	if (!lists.ok) {
		return failure(lists.code, lists.message);
	}

	return success(build_rules_payload(lists));
};

function write_rule_file(path, rules) {
	if (!ensure_directory(SAFESHIELD_RULES_DIR)) {
		return false;
	}

	const temp = sprintf('%s.smartsafehub.%d.tmp', path, time());
	const content = length(rules) ? sprintf('%s\n', join('\n', rules)) : '';

	if (fs.writefile(temp, content) == null) {
		return false;
	}

	if (fs.chmod(temp, 0o644) != true) {
		fs.unlink(temp);
		return false;
	}

	if (fs.rename(temp, path) != true) {
		fs.unlink(temp);
		return false;
	}

	return true;
}

function acquire_rules_lock() {
	const lock = fs.stat(SAFESHIELD_RULES_LOCK);

	if (lock) {
		if (time() - number_value(lock.mtime) < 30) {
			return false;
		}

		fs.rmdir(SAFESHIELD_RULES_LOCK);
	}

	return fs.mkdir(SAFESHIELD_RULES_LOCK) == true;
}

function release_rules_lock() {
	fs.rmdir(SAFESHIELD_RULES_LOCK);
}

function refresh_after_rule_change() {
	if (read_safeshield_apply_local_overrides() != true) {
		return {
			started: false,
			reason: 'local_overrides_disabled',
		};
	}

	if (read_safeshield_enabled() != true) {
		return {
			started: false,
			reason: 'safeshield_disabled',
		};
	}

	const result = refresh_safeshield();

	if (result.ok) {
		return {
			started: true,
			reason: 'started',
		};
	}

	return {
		started: false,
		reason: result.error?.code == 'SAFESHIELD_REFRESH_RUNNING'
			? 'already_running'
			: 'start_failed',
	};
}

export function mutate_safeshield_rule(request, operation) {
	const action = request.args.action;
	const domain = normalize_domain(request.args.domain);

	if (action != 'allow' && action != 'block') {
		return failure(
			'SAFESHIELD_RULE_ACTION_INVALID',
			'규칙 종류는 allow 또는 block이어야 합니다.'
		);
	}

	if (domain == null) {
		return failure(
			'SAFESHIELD_RULE_DOMAIN_INVALID',
			'유효한 도메인을 입력해 주세요. URL, IP 주소, 와일드카드는 사용할 수 없습니다.'
		);
	}

	if (!acquire_rules_lock()) {
		return failure(
			'SAFESHIELD_RULES_BUSY',
			'다른 사용자 규칙 작업이 진행 중입니다. 잠시 후 다시 시도해 주세요.'
		);
	}

	let response;

	try {
		const lists = read_rule_lists();

		if (!lists.ok) {
			response = failure(lists.code, lists.message);
		}
		else {
			const selected = action == 'allow' ? lists.allow : lists.block;
			const opposite = action == 'allow' ? lists.block : lists.allow;
			const selected_path = action == 'allow'
				? SAFESHIELD_ALLOWLIST_FILE
				: SAFESHIELD_BLOCKLIST_FILE;
			const existing_index = index(selected, domain);
			let changed = false;

			if (operation == 'add') {
				if (index(opposite, domain) >= 0) {
					response = failure(
						'SAFESHIELD_RULE_CONFLICT',
						'같은 도메인이 반대 규칙 목록에 이미 있습니다. 기존 규칙을 먼저 삭제해 주세요.'
					);
				}
				else if (existing_index < 0) {
					if (
						length(selected) >= SAFESHIELD_RULE_LIMIT_PER_LIST ||
						length(lists.allow) + length(lists.block) >= SAFESHIELD_RULE_LIMIT_TOTAL
					) {
						response = failure(
							'SAFESHIELD_RULE_LIMIT_EXCEEDED',
							'사용자 규칙 개수 제한에 도달했습니다.'
						);
					}
					else {
						push(selected, domain);
						sort(selected);
						changed = true;
					}
				}
			}
			else if (operation == 'delete' && existing_index >= 0) {
				splice(selected, existing_index, 1);
				changed = true;
			}

			if (response == null) {
				if (changed && !write_rule_file(selected_path, selected)) {
					response = failure(
						'SAFESHIELD_RULE_FILE_WRITE_FAILED',
						'사용자 규칙을 저장하지 못했습니다.'
					);
				}
				else {
					const refresh = changed
						? refresh_after_rule_change()
						: { started: false, reason: 'unchanged' };

					response = success({
						action: action,
						domain: domain,
						changed: changed,
						refresh: refresh,
						rules: build_rules_payload(lists),
					});
				}
			}
		}
	}
	catch (e) {
		response = failure(
			'SAFESHIELD_RULE_MUTATION_FAILED',
			'사용자 규칙을 처리하지 못했습니다.'
		);
	}

	release_rules_lock();
	return response;
};
