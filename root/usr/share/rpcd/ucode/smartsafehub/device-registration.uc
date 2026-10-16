// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';
import * as fs from 'fs';
import { failure, run_command, success } from './core.uc';
const STATE_FILE = '/tmp/smartsafehub/device.json';
const HELPER = '/usr/libexec/smartsafehub-device';
function read_state() {
 const raw = fs.readfile(STATE_FILE);
 if (raw == null || length(raw) == 0) return { schema:1, component:'device', phase:'pending', lastResult:'never', lastErrorCode:null, accountRegistered:null, plan:null, pairingCode:null, pairingExpiresAt:null, protectionRefreshPending:false, nextSyncAt:0, lastSuccessAt:0 };
 try { return json(raw); } catch (e) { return null; }
}
// Local state only: the hub owns the list of recommended rules, while
// the router exposes the domains actually owned by the reconciler.
const RECOMMENDED_FILE = '/etc/smartsafehub/recommended-rules.state';
export function read_recommended_rules_status(request) {
 const raw = fs.readfile(RECOMMENDED_FILE);
 if (raw == null || length(raw) == 0) return success({ revision: null, domains: [] });
 const lines = split(raw, '\n');
 const revision = lines[0];
 if (revision != '-' && match(revision, /^[0-9a-f]{64}$/) == null) return failure('RECOMMENDED_STATE_INVALID', '추천 규칙 상태가 올바르지 않습니다.');
 let domains = [];
 for (let i = 1; i < length(lines); i++) {
  let domain = lines[i];
  if (domain == '') continue;
  if (match(domain, /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/) == null) return failure('RECOMMENDED_STATE_INVALID', '추천 규칙 상태가 올바르지 않습니다.');
  push(domains, domain);
 }
 return success({ revision: revision == '-' ? null : revision, domains: domains });
};
export function read_device_registration_status(request) { const state = read_state(); return state != null ? success(state) : failure('DEVICE_STATE_INVALID', '기기 등록 상태를 읽지 못했습니다.'); };
export function refresh_device_registration_status(request) { if (!run_command([ HELPER, 'status-sync' ], 25000)) return failure('DEVICE_SYNC_FAILED', 'SmartSafeHub 계정 연결 상태를 확인하지 못했습니다.'); const state = read_state(); return state != null ? success(state) : failure('DEVICE_STATE_INVALID', '기기 등록 상태를 읽지 못했습니다.'); };
export function refresh_device_pairing(request) { if (!run_command([ HELPER, 'pairing-session' ], 15000)) return failure('DEVICE_PAIRING_FAILED', 'SmartSafeHub 계정 연결 코드를 발급하지 못했습니다.'); const state = read_state(); return state != null ? success(state) : failure('DEVICE_STATE_INVALID', '기기 등록 상태를 읽지 못했습니다.'); };
