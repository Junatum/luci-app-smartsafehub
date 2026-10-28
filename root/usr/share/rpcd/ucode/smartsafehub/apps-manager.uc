// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';

import * as fs from 'fs';
import { failure, run_command, success } from './core.uc';

const MANAGER = '/usr/libexec/smartsafehub-apps-manager';
const STATE = '/tmp/smartsafehub/apps-operation.state';
const STATUS = '/tmp/smartsafehub/apps-status.tsv';
const RESTORE_STATE = '/tmp/smartsafehub/apps-restore.state';

function job() {
	const state = { phase: 'idle', action: '', appId: '', code: '', operationId: '' };
	const raw = fs.readfile(STATE);
	if (type(raw) != 'string' || length(raw) > 4096) return state;
	for (let line in split(raw, /\r?\n/)) {
		const fields = split(line, /\t/);
		if (length(fields) != 2) continue;
		const key = fields[0];
		const value = fields[1];
		if (key == 'phase' && match(value, /^(idle|starting|running|success|failed)$/) != null)
			state.phase = value;
		else if (key == 'action' && (value == 'install' || value == 'remove'))
			state.action = value;
		else if (key == 'app_id' && match(value, /^[a-z0-9][a-z0-9-]{0,79}$/) != null)
			state.appId = value;
		else if (key == 'code' && match(value, /^(NONE|LAUNCH|E[0-9]{1,3})$/) != null)
			state.code = value;
		else if (key == 'operation_id' && match(value, /^[0-9]{1,12}-[0-9]{1,12}$/) != null)
			state.operationId = value;
	}
	return state;
}

function restore_status() {
	const result = { phase: 'idle', appId: '', code: '' };
	const raw = fs.readfile(RESTORE_STATE);
	if (type(raw) != 'string' || length(raw) > 4096) return result;
	for (let line in split(raw, /\r?\n/)) {
		const fields = split(line, /\t/);
		if (length(fields) != 2) continue;
		if (fields[0] == 'phase' && match(fields[1], /^(idle|starting|running|success|failed)$/) != null)
			result.phase = fields[1];
		else if (fields[0] == 'app_id' && (fields[1] == '' || match(fields[1], /^[a-z0-9][a-z0-9-]{0,79}$/) != null))
			result.appId = fields[1];
		else if (fields[0] == 'code' && match(fields[1], /^(NONE|BUSY|TIMEOUT|INCOMPLETE|INVALID_MANIFEST|UNKNOWN|E[0-9]{1,3})$/) != null)
			result.code = fields[1];
	}
	return result;
}

export function read_apps_status() {
	if (!run_command([ MANAGER, 'status' ], 15000))
		return failure('APPS_STATUS_UNAVAILABLE', '설치된 앱 상태를 확인하지 못했습니다.');
	const raw = fs.readfile(STATUS);
	if (type(raw) != 'string' || length(raw) > 16384)
		return failure('APPS_STATUS_INVALID', '설치 상태 데이터가 올바르지 않습니다.');
	const installed = {};
	for (let line in split(raw, /\r?\n/)) {
		const fields = split(line, /\t/);
		if ((length(fields) != 4 && length(fields) != 5) ||
			match(fields[0], /^[a-z0-9][a-z0-9-]{0,79}$/) == null)
			continue;
		installed[fields[0]] = {
			installed: fields[1] == '1',
			partial: fields[2] == '1',
			managed: fields[3] == '1',
			webUiReady: length(fields) == 5 && fields[4] == '1',
		};
	}
	return success({ job: job(), restore: restore_status(), installed: installed });
};

function start_apps_operation(request, action) {
	// rpcd passes declared method parameters in request.args, not request itself.
	const app_id = request?.args?.app_id;
	if (type(app_id) != 'string' || match(app_id, /^[a-z0-9][a-z0-9-]{0,79}$/) == null)
		return failure('APPS_INVALID_ID', '올바르지 않은 앱입니다.');
	if (!run_command([ MANAGER, 'start', action, app_id ], 5000))
		return failure('APPS_OPERATION_REJECTED', '다른 작업이 진행 중이거나 요청을 시작하지 못했습니다.');
	return success({ accepted: true, appId: app_id, action: action });
}

export function install_app(request) { return start_apps_operation(request, 'install'); };
export function remove_app(request) { return start_apps_operation(request, 'remove'); };
