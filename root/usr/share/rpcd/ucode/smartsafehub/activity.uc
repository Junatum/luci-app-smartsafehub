// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';

import * as fs from 'fs';

import { failure, success } from './core.uc';

const ACTIVITY_HISTORY_FILE = '/tmp/smartsafehub/activity-history.jsonl';
const LEGACY_EVENTS_FILE = '/tmp/smartsafehub/events.jsonl';
const ACTIVITY_SYNC_STATE_FILE = '/tmp/smartsafehub/activity-sync.json';
const MAX_ACTIVITY_EVENTS = 128;
const MAX_ACTIVITY_FILE_BYTES = 1048576;

function integer_value(value, fallback) {
	const parsed = int(value);
	const parsed_type = type(parsed);

	return (parsed_type == 'int' || parsed_type == 'double') && parsed == parsed
		? parsed
		: fallback;
}

function valid_severity(value) {
	return value == 'info' || value == 'success' || value == 'warning' || value == 'error';
}

function valid_metadata(value) {
	return type(value) == 'object' && type(value) != 'array';
}

function normalize_event(document) {
	if (
		type(document) != 'object' ||
		document?.schema != 1 ||
		type(document?.event_id) != 'string' ||
		!length(document.event_id) ||
		type(document?.event_type) != 'string' ||
		!length(document.event_type) ||
		!valid_severity(document?.severity) ||
		type(document?.source) != 'string' ||
		!length(document.source) ||
		!valid_metadata(document?.metadata)
	) {
		return null;
	}

	const occurred_at = integer_value(document?.occurred_at, 0);
	if (occurred_at <= 0) {
		return null;
	}

	return {
		schema: 1,
		eventId: document.event_id,
		eventType: document.event_type,
		severity: document.severity,
		occurredAt: occurred_at,
		deviceUuid: type(document?.device_uuid) == 'string' && length(document.device_uuid)
			? document.device_uuid
			: null,
		source: document.source,
		metadata: document.metadata,
	};
}


function invalid_cloud_sync_state() {
	return {
		phase: 'unknown',
		eligible: null,
		plan: null,
		retentionDays: 0,
		pendingEvents: 0,
		lastAttemptAt: 0,
		lastSuccessAt: 0,
		lastUploadedCount: 0,
		lastErrorCode: 'ACTIVITY_SYNC_STATE_INVALID',
		nextSyncAt: 0,
	};
}

function read_cloud_sync() {
	const raw = fs.readfile(ACTIVITY_SYNC_STATE_FILE);
	if (type(raw) != 'string' || !length(raw)) {
		return {
			phase: 'preparing',
			eligible: null,
			plan: null,
			retentionDays: 0,
			pendingEvents: 0,
			lastAttemptAt: 0,
			lastSuccessAt: 0,
			lastUploadedCount: 0,
			lastErrorCode: null,
			nextSyncAt: 0,
		};
	}

	try {
		const document = json(raw);
		if (type(document) != 'object' || document?.schema != 1) {
			return invalid_cloud_sync_state();
		}
		const eligible = type(document?.eligible) == 'bool' ? document.eligible : null;
		return {
			phase: type(document?.phase) == 'string' ? document.phase : 'unknown',
			eligible: eligible,
			plan: type(document?.plan) == 'string' && length(document.plan) ? document.plan : null,
			retentionDays: integer_value(document?.retentionDays, 0),
			pendingEvents: integer_value(document?.pendingEvents, 0),
			lastAttemptAt: integer_value(document?.lastAttemptAt, 0),
			lastSuccessAt: integer_value(document?.lastSuccessAt, 0),
			lastUploadedCount: integer_value(document?.lastUploadedCount, 0),
			lastErrorCode: type(document?.lastErrorCode) == 'string' && length(document.lastErrorCode)
				? document.lastErrorCode
				: null,
			nextSyncAt: integer_value(document?.nextSyncAt, 0),
		};
	}
	catch (e) {
		return invalid_cloud_sync_state();
	}
}

function read_history_file() {
	let raw = fs.readfile(ACTIVITY_HISTORY_FILE);
	if (raw == null) {
		// 0.2.19-r8 used events.jsonl as both the future Cloud outbox and the
		// only local history. Keep those already collected events visible after
		// upgrading, while new events are written to the dedicated history file.
		raw = fs.readfile(LEGACY_EVENTS_FILE);
	}

	if (raw == null || length(raw) == 0) {
		return [];
	}
	if (length(raw) > MAX_ACTIVITY_FILE_BYTES) {
		return null;
	}

	const events = [];
	for (let line in split(raw, '\n')) {
		if (!length(line)) {
			continue;
		}

		try {
			const normalized = normalize_event(json(line));
			if (normalized != null) {
				push(events, normalized);
			}
		}
		catch (e) {
			// A partially written/corrupt record must not hide the remaining
			// valid local activity history from the UI.
		}
	}

	return events;
}

export function read_activity_history() {
	const history = read_history_file();
	if (history == null) {
		return failure(
			'ACTIVITY_HISTORY_TOO_LARGE',
			'최근 활동 기록의 크기가 허용 범위를 초과했습니다.'
		);
	}

	// status RPC has no activity limit argument. Always return the bounded local
	// history instead of coercing an omitted argument and accidentally clamping
	// the response to a single event on the target ucode runtime.
	const events = [];
	for (let index = length(history) - 1; index >= 0 && length(events) < MAX_ACTIVITY_EVENTS; index--) {
		push(events, history[index]);
	}

	return success({
		schema: 1,
		scope: 'current_boot',
		volatile: true,
		maxEvents: MAX_ACTIVITY_EVENTS,
		cloud: read_cloud_sync(),
		events: events,
	});
};
