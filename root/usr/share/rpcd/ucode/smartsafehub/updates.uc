// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';

import * as fs from 'fs';
import {
	failure,
	new_uci_cursor,
	run_command,
	string_value,
	success
} from './core.uc';

const UPDATE_STATE_FILE = '/tmp/smartsafehub-updates.state';
const AUTO_INSTALL_MARKER = '/tmp/smartsafehub-updater-auto-date';
const UPDATE_PACKAGE = 'luci-app-smartsafehub';
const MIN_CHECK_INTERVAL_S = 900;
const MAX_CHECK_INTERVAL_S = 604800;

function boolean_option(value, fallback) {
	if (value == '1') {
		return true;
	}
	if (value == '0') {
		return false;
	}
	return fallback;
}

function integer_value(value, fallback) {
	const parsed = int(value);
	const parsed_type = type(parsed);

	return parsed_type == 'int' || parsed_type == 'double' ? parsed : fallback;
}

function read_update_settings() {
	const ctx = new_uci_cursor();
	const section = ctx?.get_all('smartsafehub', 'updates') ?? {};
	let interval = integer_value(section?.check_interval_s, 21600);

	if (interval < MIN_CHECK_INTERVAL_S || interval > MAX_CHECK_INTERVAL_S) {
		interval = 21600;
	}

	const auto_install_time = string_value(section?.auto_install_time, '03:00');

	return {
		checkEnabled: boolean_option(section?.check_enabled, true),
		checkIntervalSeconds: interval,
		autoInstall: boolean_option(section?.auto_install, false),
		autoInstallTime: match(auto_install_time, /^([01][0-9]|2[0-3]):[0-5][0-9]$/) != null
			? auto_install_time
			: '03:00',
		repositoryHost: string_value(section?.repository_host, 'repo.smartsafehub.com'),
		updatePackage: UPDATE_PACKAGE,
	};
}

function empty_update_state() {
	return {
		phase: 'idle',
		updateCount: 0,
		packages: [],
		lastCheckAt: null,
		lastInstallAt: null,
		lastError: null,
	};
}

function state_timestamp(value) {
	const parsed = integer_value(value, 0);
	return parsed > 0 ? parsed : null;
}

function read_update_state() {
	const raw = fs.readfile(UPDATE_STATE_FILE);
	if (type(raw) != 'string' || !length(raw)) {
		return empty_update_state();
	}

	const state = empty_update_state();
	let error_code = '';
	let error_message = '';
	let error_at = null;

	for (let line in split(raw, /\r?\n/)) {
		if (!length(line)) {
			continue;
		}

		const parts = split(line, /\t/);
		const key = parts?.[0];

		switch (key) {
		case 'phase':
			if (parts?.[1] == 'idle' || parts?.[1] == 'checking' || parts?.[1] == 'installing' || parts?.[1] == 'error') {
				state.phase = parts[1];
			}
			break;
		case 'last_check_at':
			state.lastCheckAt = state_timestamp(parts?.[1]);
			break;
		case 'last_install_at':
			state.lastInstallAt = state_timestamp(parts?.[1]);
			break;
		case 'last_error_at':
			error_at = state_timestamp(parts?.[1]);
			break;
		case 'error_code':
			error_code = string_value(parts?.[1], '');
			break;
		case 'error_message':
			error_message = string_value(parts?.[1], '');
			break;
		case 'package':
			const package_name = parts?.[1];
			const installed_version = string_value(parts?.[2], null);
			const available_version = string_value(parts?.[3], null);
			const update_available = parts?.[4] == '1';

			if (package_name != UPDATE_PACKAGE || installed_version == null) {
				break;
			}

			push(state.packages, {
				name: package_name,
				installedVersion: installed_version,
				availableVersion: available_version,
				updateAvailable: update_available,
			});
			if (update_available) {
				state.updateCount++;
			}
			break;
		}
	}

	if (length(error_code) || length(error_message)) {
		state.lastError = {
			code: length(error_code) ? error_code : 'UPDATES_FAILED',
			message: length(error_message) ? error_message : '업데이트 작업에 실패했습니다.',
			at: error_at,
		};
	}

	return state;
}

export function read_updates_status() {
	const state = read_update_state();
	state.settings = read_update_settings();
	return success(state);
};

function update_operation_running() {
	const phase = read_update_state().phase;
	return phase == 'checking' || phase == 'installing';
}

function start_updater_action(action) {
	if (update_operation_running()) {
		return failure(
			'UPDATES_BUSY',
			'다른 업데이트 작업이 진행 중입니다. 잠시 후 다시 시도해 주세요.'
		);
	}

	const command = action == 'check'
		? '/usr/libexec/smartsafehub-updater check >/dev/null 2>&1 </dev/null &'
		: '/usr/libexec/smartsafehub-updater install >/dev/null 2>&1 </dev/null &';

	if (!run_command([ '/bin/sh', '-c', command ], 2000)) {
		return failure(
			'UPDATES_START_FAILED',
			'업데이트 작업을 시작하지 못했습니다.'
		);
	}

	return success({ accepted: true });
}

export function check_updates() {
	return start_updater_action('check');
};

export function install_updates(request) {
	if (request.args.confirm != 'install') {
		return failure(
			'UPDATES_INSTALL_CONFIRMATION_REQUIRED',
			'업데이트 설치 확인 값이 올바르지 않습니다.'
		);
	}

	return start_updater_action('install');
};

export function update_update_settings(request) {
	const check_enabled = request.args.check_enabled;
	const check_interval_s = request.args.check_interval_s;
	const auto_install = request.args.auto_install;
	const auto_install_time = request.args.auto_install_time;

	if (type(check_enabled) != 'bool' || type(auto_install) != 'bool') {
		return failure('UPDATES_SETTINGS_INVALID', '자동 업데이트 설정 값이 올바르지 않습니다.');
	}
	if (
		type(check_interval_s) != 'int' ||
		check_interval_s < MIN_CHECK_INTERVAL_S ||
		check_interval_s > MAX_CHECK_INTERVAL_S
	) {
		return failure(
			'UPDATES_INTERVAL_INVALID',
			'업데이트 확인 주기는 15분에서 7일 사이로 설정해 주세요.'
		);
	}
	if (
		type(auto_install_time) != 'string' ||
		match(auto_install_time, /^([01][0-9]|2[0-3]):[0-5][0-9]$/) == null
	) {
		return failure('UPDATES_TIME_INVALID', '자동 설치 시간을 HH:MM 형식으로 입력해 주세요.');
	}

	const ctx = new_uci_cursor();
	if (!ctx || ctx.get_all('smartsafehub', 'updates') == null) {
		return failure('UPDATES_CONFIG_UNAVAILABLE', 'SmartSafeHub 업데이트 설정을 읽지 못했습니다.');
	}

	const changed =
		ctx.set('smartsafehub', 'updates', 'check_enabled', check_enabled ? '1' : '0') == true &&
		ctx.set('smartsafehub', 'updates', 'check_interval_s', sprintf('%d', check_interval_s)) == true &&
		ctx.set('smartsafehub', 'updates', 'auto_install', auto_install ? '1' : '0') == true &&
		ctx.set('smartsafehub', 'updates', 'auto_install_time', auto_install_time) == true;

	if (!changed || ctx.commit('smartsafehub') != true) {
		return failure('UPDATES_CONFIG_COMMIT_FAILED', '업데이트 설정을 저장하지 못했습니다.');
	}

	// Recalculate today's automatic-install schedule after any settings change.
	fs.unlink(AUTO_INSTALL_MARKER);

	run_command([
		'/bin/sh',
		'-c',
		'/etc/init.d/smartsafehub-updater restart >/dev/null 2>&1 </dev/null &',
	], 2000);

	return success(read_update_settings());
};
