// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';

import {
	defer_call,
	failure,
	memory_value,
	number_value,
	run_command,
	string_value,
	success
} from './core.uc';

export function reboot_system(request) {
	if (request.args.confirm != 'reboot') {
		return failure(
			'SYSTEM_REBOOT_CONFIRMATION_REQUIRED',
			'재부팅 확인 값이 올바르지 않습니다.'
		);
	}

	const scheduled_at = time() + 2;
	const command = '(sleep 2; /sbin/reboot) >/dev/null 2>&1 </dev/null &';
	if (!run_command([ '/bin/sh', '-c', command ], 2000)) {
		return failure(
			'SYSTEM_REBOOT_START_FAILED',
			'공유기 재부팅을 시작하지 못했습니다.'
		);
	}

	return success({
		accepted: true,
		scheduledAt: scheduled_at,
	});
};

function system_status_payload(board, info, wan) {
	const release = board?.release ?? {};
	const memory = info?.memory ?? {};
	const load = info?.load ?? [ 0, 0, 0 ];
	const ipv4 = wan?.['ipv4-address'];
	const first_ipv4 = type(ipv4) == 'array' && length(ipv4) ? ipv4[0] : {};

	return {
		device: {
			hostname: string_value(board?.hostname, 'OpenWrt'),
			model: string_value(board?.model, 'OpenWrt device'),
			boardName: string_value(board?.board_name, null),
		},
		software: {
			distribution: string_value(release?.distribution, 'OpenWrt'),
			version: string_value(release?.version, 'unknown'),
			revision: string_value(release?.revision, 'unknown'),
			kernel: string_value(board?.kernel, 'unknown'),
		},
		runtime: {
			uptime: number_value(info?.uptime),
			localtime: number_value(info?.localtime),
			load: [
				number_value(load?.[0]),
				number_value(load?.[1]),
				number_value(load?.[2]),
			],
			memory: {
				total: memory_value(memory, 'total'),
				free: memory_value(memory, 'free'),
				shared: memory_value(memory, 'shared'),
				buffered: memory_value(memory, 'buffered'),
				available: memory_value(memory, 'available'),
				cached: memory_value(memory, 'cached'),
			},
		},
		network: {
			available: type(wan) == 'object' && length(keys(wan)) > 0,
			up: wan?.up == true,
			protocol: string_value(wan?.proto, null),
			ipv4Address: string_value(first_ipv4?.address, null),
		},
	};
}

function collect_system_status(done) {
	// OpenWrt's rpcd ucode API requires nested ubus requests to be deferred.
	// Returning this first deferred request keeps the original rpcd request
	// alive until done() eventually calls request.reply().
	return defer_call('system', 'board', {}, function(board_code, board) {
		if (
			board_code != 0 ||
			type(board) != 'object' ||
			length(keys(board)) == 0
		) {
			done(failure(
				'SYSTEM_BOARD_UNAVAILABLE',
				'OpenWrt board information is unavailable'
			));
			return;
		}

		const info_request = defer_call('system', 'info', {}, function(info_code, info) {
			if (info_code != 0 || type(info) != 'object') {
				done(failure(
					'SYSTEM_INFO_UNAVAILABLE',
					'OpenWrt runtime information is unavailable'
				));
				return;
			}

			const wan_request = defer_call(
				'network.interface.wan',
				'status',
				{},
				function(wan_code, wan) {
					const wan_payload = wan_code == 0 && type(wan) == 'object'
						? wan
						: {};

					done(success(system_status_payload(board, info, wan_payload)));
				}
			);

			if (wan_request == null) {
				// A WAN interface is optional. Keep valid board/runtime values and
				// report the network portion as unavailable instead of failing all.
				done(success(system_status_payload(board, info, {})));
			}
		});

		if (info_request == null) {
			done(failure(
				'SYSTEM_INFO_REQUEST_FAILED',
				'OpenWrt runtime information request could not be started'
			));
		}
	});
}

export function read_status(request) {
	return collect_system_status(function(result) {
		request.reply(result);
	});
};
