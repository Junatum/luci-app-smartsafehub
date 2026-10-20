// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';

import * as fs from 'fs';
import { failure, run_command, success } from './core.uc';

const HELPER = '/usr/libexec/smartsafehub-apps';
const CATALOG_FILE = '/tmp/smartsafehub/apps-catalog.json';

function text(value, max_length) {
	return type(value) == 'string' && length(value) <= max_length ? value : '';
}

// This endpoint is *read-only*. The catalog never supplies executable
// commands, repository URLs or permissions to a package installer. The
// separate privileged installer must revalidate every approval in the future.
export function read_apps_catalog() {
	if (!run_command([ HELPER ], 12000)) {
		return failure('APPS_CATALOG_UNAVAILABLE',
			'검증된 앱 목록을 불러오지 못했습니다. 인터넷 연결과 펌웨어 정보를 확인해 주세요.');
	}

	const raw = fs.readfile(CATALOG_FILE);
	if (type(raw) != 'string' || length(raw) < 2 || length(raw) > 131072) {
		return failure('APPS_CATALOG_INVALID', '앱 목록 데이터가 올바르지 않습니다.');
	}

	let data;
	try {
		data = json(raw);
	}
	catch (e) {
		return failure('APPS_CATALOG_INVALID', '앱 목록을 읽지 못했습니다.');
	}
	if (type(data) != 'object' || data?.schema != 1 || type(data?.apps) != 'array' ||
		length(data.apps) > 100 || !text(data?.device_code, 80) ||
		!text(data?.firmware_build_id, 80)) {
		return failure('APPS_CATALOG_INVALID', '앱 목록 형식이 올바르지 않습니다.');
	}

	const apps = [];
	for (let item in data.apps) {
		if (type(item) != 'object' || item.runtime != 'router' || item.installer != 'apk') {
			continue;
		}
		const id = text(item?.id, 80);
		const name = text(item?.name, 120);
		if (!length(id) || !length(name) || match(id, /^[a-z0-9][a-z0-9-]{0,79}$/) == null) {
			continue;
		}
		// Only UI copy crosses into the unprivileged browser. All package hashes,
		// permissions and install descriptors remain server-side until an installer
		// with independent verification is implemented.
		push(apps, {
			id: id,
			name: name,
			summary: text(item?.summary, 320),
			description: text(item?.description, 2000),
			category: text(item?.category, 64),
			version: text(item?.version, 64),
		});
	}
	return success({
		schema: 1,
		deviceCode: data.device_code,
		firmwareBuildId: data.firmware_build_id,
		channel: text(data?.channel, 16),
		apps: apps,
	});
};
