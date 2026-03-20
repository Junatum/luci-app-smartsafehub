// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';

import * as fs from 'fs';
import { connect } from 'ubus';
import { cursor } from 'uci';

// The ucode module loader caches this module, so all feature modules share one
// ubus connection for the lifetime of the rpcd plugin.
const ubus = connect();

function call_result(object, method, args) {
	try {
		return {
			ok: true,
			data: ubus.call(object, method, args ?? {}) ?? {},
		};
	}
	catch (e) {
		return {
			ok: false,
			data: {},
		};
	}
}

export function safe_call(object, method, args) {
	return call_result(object, method, args).data;
};

export function defer_call(object, method, args, callback) {
	return ubus.defer(object, method, args ?? {}, callback);
};

export function success(data) {
	return {
		ok: true,
		data: data,
		error: null,
	};
};

export function failure(code, message) {
	return {
		ok: false,
		data: null,
		error: {
			code: code,
			message: message,
		},
	};
};

export function string_value(value, fallback) {
	return type(value) == 'string' && length(value) ? value : fallback;
};

export function number_value(value) {
	const value_type = type(value);

	return value_type == 'int' || value_type == 'double' ? value : 0;
};

export function memory_value(memory, key) {
	return number_value(memory?.[key]);
};

export function read_json_file(path) {
	const raw = fs.readfile(path);

	if (!raw) {
		return {};
	}

	try {
		return json(raw);
	}
	catch (e) {
		return {};
	}
};

export function new_uci_cursor() {
	const ctx = cursor();

	return ctx ?? null;
};

export function run_command(argv, timeout) {
	try {
		return system(argv, timeout ?? 10000) == 0;
	}
	catch (e) {
		return false;
	}
};
