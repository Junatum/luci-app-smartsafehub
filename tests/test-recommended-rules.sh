#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-or-later
set -eu
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
HELPER="$ROOT/root/usr/libexec/smartsafehub-recommended-rules"
DEVICE="$ROOT/root/usr/libexec/smartsafehub-device"
PAGE="$ROOT/frontend/src/pages/SafeShieldRulesPage.tsx"
RPC="$ROOT/root/usr/share/rpcd/ucode/smartsafehub.uc"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT HUP INT TERM
mkdir -p "$TMP/bin" "$TMP/run" "$TMP/etc"
cat > "$TMP/bin/jsonfilter" <<'JS'
#!/usr/bin/env node
const fs=require('fs'), args=process.argv.slice(2);
let obj=JSON.parse(fs.readFileSync(args[args.indexOf('-i')+1]));
const typeMode=args.includes('-t');
const expression=args[args.indexOf(typeMode ? '-t' : '-e')+1];
const expr=expression.replace(/^@\./,'').replace(/\[\*\]$/,'');
for (const key of expr.split('.')) obj=obj && !Array.isArray(obj) ? obj[key] : undefined;
if (obj === undefined || obj === null) process.exit(1);
if (typeMode) {
  console.log(Array.isArray(obj) ? 'array' : typeof obj);
} else if (Array.isArray(obj)) {
  if (!obj.length) process.exit(1); // OpenWrt jsonfilter: [*] has no match
  for (const item of obj) console.log(item);
} else {
  console.log(typeof obj === 'object' ? JSON.stringify(obj) : obj);
}
JS
cat > "$TMP/bin/ubus" <<'JS'
#!/usr/bin/env node
const fs=require('fs'),path=require('path');
const dir=process.env.MOCK_RECOMMENDED_DIR, method=process.argv[4], file=path.join(dir,'rules.json');
let rules=JSON.parse(fs.readFileSync(file,'utf8'));
if (method==='rules_list') {
  console.log(process.env.BROKEN_LIST==='1' ? '{"ok":true}' : JSON.stringify({ok:true,allow:rules,block:[]}));
  process.exit(0);
}
if (process.env.FAIL_METHOD === method) { console.log('{"ok":false}'); process.exit(1); }
let domain='';
if (method==='rule_add'||method==='rule_delete') {
  const data=JSON.parse(process.argv[5]);
  if (data.action!=='allow'||data.refresh!==false) process.exit(1);
  domain=data.domain;
  if (method==='rule_add' && !rules.includes(domain)) rules.push(domain);
  if (method==='rule_delete') rules=rules.filter(v=>v!==domain);
  fs.writeFileSync(file,JSON.stringify(rules));
}
fs.appendFileSync(path.join(dir,'calls.log'),method+' '+domain+'\n');
console.log('{"ok":true}');
JS
chmod +x "$TMP/bin/ubus" "$TMP/bin/jsonfilter"
printf '[]' > "$TMP/rules.json"
export MOCK_RECOMMENDED_DIR="$TMP"
export SMARTSAFEHUB_RECOMMENDED_STATE_FILE="$TMP/etc/state"
export SMARTSAFEHUB_RECOMMENDED_RECEIPT_FILE="$TMP/etc/receipt.json"
export SMARTSAFEHUB_DEVICE_JSONFILTER_BIN="$TMP/bin/jsonfilter"
export SMARTSAFEHUB_DEVICE_UBUS_BIN="$TMP/bin/ubus"
export SMARTSAFEHUB_DEVICE_RUNTIME_DIR="$TMP/run"
response() {
  python3 - "$TMP/response.json" "$1" <<'PY'
import sys,json,hashlib
items=json.loads(sys.argv[2]); h=hashlib.sha256('\n'.join(sorted(set(items))).encode()).hexdigest()
json.dump({'recommended_rules':{'revision':h,'domains':items}},open(sys.argv[1],'w'))
PY
}
assert_rules() {
  python3 - "$TMP/rules.json" "$1" <<'PY'
import json,sys
assert sorted(json.load(open(sys.argv[1])))==sorted(json.loads(sys.argv[2]))
PY
}
# An empty SafeShield allow list is normal on a newly configured router.
# OpenWrt jsonfilter returns 1 for @.allow[*] when there are no entries.
response '["tv.example.org"]'
"$HELPER" "$TMP/response.json"
assert_rules '["tv.example.org"]'
[ -f "$TMP/etc/state" ]
# Server-assigned IDs and titles are stored only after SafeShield confirms the rules.
python3 - "$TMP/response.json" <<'PY_RULES'
import hashlib,json,sys
path=sys.argv[1]
entry={'id':42,'title':'TV 테스트 규칙','domains':['tv.example.org']}
obj=json.load(open(path))
obj['recommended_rules'].update(rules=[entry],rules_revision=hashlib.sha256(b'test-rule-metadata').hexdigest())
json.dump(obj,open(path,'w'))
PY_RULES
"$HELPER" "$TMP/response.json"
python3 - "$TMP/run/recommended-rules.catalog.json" <<'PY_CATALOG'
import json,sys
obj=json.load(open(sys.argv[1]))
assert obj['rules'][0]['id'] == 42
assert obj['rules'][0]['domains'] == ['tv.example.org']
PY_CATALOG
# A valid empty recommended_rules.domains array must also be accepted.
response '[]'
"$HELPER" "$TMP/response.json"
assert_rules '[]'
# An empty allow list on both the initial read and verification is valid.
"$HELPER" "$TMP/response.json"
assert_rules '[]'
# Continue existing scenarios with pre-existing manual rules.
rm -f "$TMP/etc/state" "$TMP/etc/receipt.json" "$TMP/calls.log"
printf '["manual.example.org"]' > "$TMP/rules.json"
# Existing manual entries are never claimed even if the cloud recommends them.
response '["tv.example.org","manual.example.org"]'
"$HELPER" "$TMP/response.json"
assert_rules '["manual.example.org","tv.example.org"]'
grep -Fqx 'tv.example.org' "$TMP/etc/state"
! grep -Fqx 'manual.example.org' "$TMP/etc/state"
# A pre-existing allow entry is confirmed but never attributed to Hub.
python3 - "$TMP/etc/receipt.json" <<'PY_CHECK'
import json,sys
receipt=json.load(open(sys.argv[1]))
assert receipt['status']=='confirmed'
assert {d['domain']:d['source'] for d in receipt['domains']} == {'manual.example.org':'manual','tv.example.org':'managed'}
PY_CHECK
# Stable revisions must not call refresh again.
count="$(wc -l < "$TMP/calls.log")"
"$HELPER" "$TMP/response.json"
[ "$count" -eq "$(wc -l < "$TMP/calls.log")" ]
# Removing one recommendation must only remove the locally owned entry.
response '[]'; "$HELPER" "$TMP/response.json"
assert_rules '["manual.example.org"]'
# Broken responses must not be interpreted as an empty rules list.
response '["tv.example.org"]'
if BROKEN_LIST=1 "$HELPER" "$TMP/response.json"; then exit 1; fi
[ ! -f "$TMP/etc/receipt.json" ]
assert_rules '["manual.example.org"]'
# Rule mutation failures must not acknowledge a newer revision.
if FAIL_METHOD=rule_add "$HELPER" "$TMP/response.json"; then exit 1; fi
[ ! -f "$TMP/etc/receipt.json" ]
expected="$(python3 - "$TMP/response.json" <<'PY'
import sys,json
print(json.load(open(sys.argv[1]))['recommended_rules']['revision'])
PY
)"
[ "$(sed -n '1p' "$TMP/etc/state")" != "$expected" ]
"$HELPER" "$TMP/response.json"
assert_rules '["manual.example.org","tv.example.org"]'
# Failed refresh retries without deleting or duplicating recommendations.
response '[]'
if FAIL_METHOD=refresh "$HELPER" "$TMP/response.json"; then exit 1; fi
[ ! -f "$TMP/etc/receipt.json" ]
[ "$(sed -n '1p' "$TMP/etc/state")" = '-' ]
"$HELPER" "$TMP/response.json"
assert_rules '["manual.example.org"]'
[ "$(sed -n '1p' "$TMP/etc/state")" = "$expected" ] && exit 1
# A missing or incorrectly typed array is NOT the same as an empty one.
revision="$(python3 - "$TMP/response.json" <<'PYREV'
import hashlib
print(hashlib.sha256(b'').hexdigest())
PYREV
)"
printf '{"recommended_rules":{"revision":"%s","domains":null}}\n' "$revision" > "$TMP/response.json"
if "$HELPER" "$TMP/response.json"; then exit 1; fi
printf '{"recommended_rules":{"revision":"%s","domains":{}}}\n' "$revision" > "$TMP/response.json"
if "$HELPER" "$TMP/response.json"; then exit 1; fi
# Bad domain or malformed hash must never mutate SafeShield.
response '["evil.example.org;reboot"]'
if "$HELPER" "$TMP/response.json"; then exit 1; fi
! grep -Fq evil.example.org "$TMP/calls.log"
printf '{"recommended_rules":{"revision":"invalid","domains":[]}}\n' > "$TMP/response.json"
if "$HELPER" "$TMP/response.json"; then exit 1; fi
# Older Hub versions do not opt into the cloud-managed list.
printf '{}\n' > "$TMP/response.json"
"$HELPER" "$TMP/response.json"
assert_rules '["manual.example.org"]'
# The last reconciliation result must be written to tmpfs and distinguish a
# SafeShield rule failure from a successful device account synchronization.
RECOMMENDED_STATUS="$ROOT/root/usr/share/rpcd/ucode/smartsafehub/device-registration.uc"
ACL="$ROOT/root/usr/share/rpcd/acl.d/luci-app-smartsafehub.json"
API="$ROOT/frontend/src/api/smartsafehub.ts"
APP="$ROOT/frontend/src/app/App.tsx"
grep -Fq 'RECOMMENDED_SYNC_STATUS=' "$DEVICE"
grep -Fq 'write_recommended_sync_status failed' "$DEVICE"
grep -Fq 'write_recommended_sync_status confirmed' "$DEVICE"
grep -Fq "sync?.status == 'failed'" "$RECOMMENDED_STATUS"
grep -Fq 'refresh_recommended_rules_status' "$RECOMMENDED_STATUS"
grep -Fq 'device_recommended_rules_refresh' "$RPC"
grep -Fq '"device_recommended_rules_refresh"' "$ACL"
grep -Fq 'refreshRecommendedRulesStatus' "$API"
grep -Fq 'onSyncRecommendedRules={refreshRecommendedRulesStatus}' "$APP"
grep -Fq '지금 동기화' "$PAGE"
! grep -Fq 'recommendedStatus.confirmedDomains.map' "$PAGE" # no repeated list
# Exercise the real helper's atomic status writer with an isolated temp dir.
sed -n '/^write_recommended_sync_status() {/,/^}/p' "$DEVICE" > "$TMP/status-function.sh"
(
  . "$TMP/status-function.sh"
  RUNTIME_DIR="$TMP/status-runtime"
  RECOMMENDED_SYNC_STATUS="$RUNTIME_DIR/recommended-rules.sync.json"
  now_epoch() { printf '12345'; }
  write_recommended_sync_status failed
  grep -Fq '"status":"failed","checkedAt":12345' "$RECOMMENDED_SYNC_STATUS"
  write_recommended_sync_status confirmed
  grep -Fq '"status":"confirmed","checkedAt":12345' "$RECOMMENDED_SYNC_STATUS"
  [ ! -e "$RECOMMENDED_SYNC_STATUS.tmp.$$" ]
)
# The UI must not allow manual deletion of entries owned by the cloud.
grep -Fq 'device_recommended_rules_status' "$RPC"
# A missing semicolon after an exported ucode function prevents the whole
# smartsafehub rpcd object from loading, including the security status RPC.
# Check this even on hosts without the ucode compiler (real compilation is
# separately mandatory in CI via tests/test-ucode-syntax.sh).
DEVICE_RPC="$ROOT/root/usr/share/rpcd/ucode/smartsafehub/device-registration.uc"
awk '
  /^export function read_device_registration_status\(/ {
    found = 1
    if (previous !~ /^[[:space:]]*};[[:space:]]*$/) exit 1
  }
  { if ($0 !~ /^[[:space:]]*$/) previous = $0 }
  END { if (!found) exit 1 }
' "$DEVICE_RPC" || {
  echo '추천 규칙 RPC 함수는 }; 로 끝나야 합니다 (ucode 모듈 로딩 실패 방지).' >&2
  exit 1
}
# Keep the shared rules page independent from executable API imports so that
# the public router demo does not inherit authenticated RPC dependencies.
grep -Fq 'onLoadRecommendedRulesStatus' "$PAGE"
! grep -Fq "from '../api/" "$PAGE"
! grep -Fq 'from "../api/' "$PAGE"
grep -Fq 'onLoadRecommendedRulesStatus={fetchRecommendedRulesStatus}' "$ROOT/frontend/src/app/App.tsx"
grep -Fq 'disabled={busy || cloudManaged}' "$PAGE"
grep -Fq "cloudManaged ? '추천 규칙' : '직접 추가'" "$PAGE"
# Group allow entries by who controls them without repeating the domains.
grep -Fq 'aria-label="직접 추가한 허용 규칙"' "$PAGE"
grep -Fq 'aria-label="웹사이트 추천 규칙"' "$PAGE"
grep -Fq 'recommendedDomains.includes(domain)' "$PAGE"
grep -Fq 'aria-expanded={showRecommended}' "$PAGE"
grep -Fq 'const showRecommended = searching ||' "$PAGE"
grep -Fq 'max-h-[20rem]' "$PAGE"
grep -Fq '약 30초마다 확인합니다' "$PAGE"
! grep -Fq '추천 규칙은 약 5분마다 자동 동기화됩니다' "$PAGE"
# Never invent service names that the router API does not provide.
! grep -Fq '삼성 TV Plus' "$PAGE"
grep -Fq 'aria-label="추천 사용자 규칙"' "$PAGE"
grep -Fq 'https://www.smartsafehub.com/dashboard/recommended-rules/' "$PAGE"
grep -Fq 'RECOMMENDED_HELPER' "$DEVICE"
grep -Fq 'recommended_rules_ack' "$DEVICE"
grep -Fq '/etc/smartsafehub/recommended-rules.state' "$ROOT/root/lib/upgrade/keep.d/smartsafehub-device"
# The short-poll path must not use full device sync or reapply unchanged
# rules. Exercise the real function with a fake authenticated Hub response.
sed -n '/^recommended_fast_sync() {/,/^}/p' "$DEVICE" > "$TMP/fast-function.sh"
(
  . "$TMP/fast-function.sh"
  RUNTIME_DIR="$TMP/run"
  API_BASE_URL="https://example.test/api/v1"
  STATE_FILE="$TMP/device.json"
  RECOMMENDED_STATE="$TMP/etc/state"
  RECOMMENDED_HELPER="$HELPER"
  RECOMMENDED_RECEIPT="$TMP/etc/receipt.json"
  printf '{"accountRegistered":true}\n' > "$STATE_FILE"
  printf '[]\n' > "$TMP/rules.json"
  rm -f "$RECOMMENDED_STATE" "$TMP/calls.log"
  credential_token() { printf 'ssh_dev_test'; }
  json_value() { "$TMP/bin/jsonfilter" -i "$1" -e "$2" 2>/dev/null | head -n 1 || true; }
  write_recommended_sync_status() { printf '%s\n' "$1" > "$TMP/fast-status"; }
  post_json() {
    printf '%s\n' "$1" > "$TMP/fast-url"
    cp "$TMP/hub-poll.json" "$3"
  }
  python3 - "$TMP/hub-poll.json" <<'PY_FAST'
import hashlib,json,sys
items=['tv.example.org']; revision=hashlib.sha256('\n'.join(items).encode()).hexdigest()
json.dump({'changed':True,'recommended_rules':{'revision':revision,'domains':items}},open(sys.argv[1],'w'))
PY_FAST
  recommended_fast_sync
  grep -Fqx 'confirmed' "$TMP/fast-status"
  grep -Fq '/devices/recommended-rules' "$TMP/fast-url"
  grep -Fqx 'tv.example.org' "$RECOMMENDED_STATE"
  grep -Fq 'tv.example.org' "$TMP/rules.json"
  [ -f "$RECOMMENDED_RECEIPT" ]
  old_count="$(wc -l < "$TMP/calls.log")"
  revision="$(sed -n '1p' "$RECOMMENDED_STATE")"
  printf '{"changed":false,"revision":"%s"}\n' "$revision" > "$TMP/hub-poll.json"
  recommended_fast_sync
  [ "$old_count" -eq "$(wc -l < "$TMP/calls.log")" ] || exit 1
  # Removing an assigned rule must remove only the Hub-owned rule.
  python3 - "$TMP/hub-poll.json" <<'PY_EMPTY'
import hashlib,json,sys
json.dump({'changed':True,'recommended_rules':{'revision':hashlib.sha256(b'').hexdigest(),'domains':[]}},open(sys.argv[1],'w'))
PY_EMPTY
  recommended_fast_sync
  [ "$(cat "$TMP/rules.json")" = '[]' ] || exit 1
  # Never accept an invalid changed flag or an unverified no-change revision.
  printf '{"changed":false,"revision":"invalid"}\n' > "$TMP/hub-poll.json"
  if recommended_fast_sync; then exit 1; fi
  grep -Fqx 'failed' "$TMP/fast-status"
  printf '{"changed":true,"recommended_rules":{"revision":"bad","domains":[]}}\n' > "$TMP/hub-poll.json"
  if recommended_fast_sync; then exit 1; fi
  [ "$(cat "$TMP/rules.json")" = '[]' ] || exit 1
)
# Revocation must call the device-authenticated Hub endpoint before touching
# SafeShield and must immediately reconcile the Hub's authoritative new list.
sed -n '/^recommended_revoke() {/,/^}/p' "$DEVICE" > "$TMP/revoke-function.sh"
(
  . "$TMP/revoke-function.sh"
  API_BASE_URL="https://example.test/api/v1"
  RUNTIME_DIR="$TMP/run"
  STATE_FILE="$TMP/device.json"
  RECOMMENDED_HELPER="$HELPER"
  printf '{"accountRegistered":true}\n' > "$STATE_FILE"
  printf '[]\n' > "$TMP/rules.json"
  rm -f "$SMARTSAFEHUB_RECOMMENDED_STATE_FILE"
  response '["tv.example.org"]'
  "$HELPER" "$TMP/response.json"
  python3 - "$TMP/revoke-hub.json" <<'PY_REVOKE'
import json,hashlib,sys
json.dump({'changed':True,'recommended_rules':{
 'revision':hashlib.sha256(b'').hexdigest(),'domains':[],
 'rules':[], 'rules_revision':hashlib.sha256(b'[]').hexdigest()
}},open(sys.argv[1],'w'))
PY_REVOKE
  credential_token() { printf 'ssh_dev_test'; }
  json_value() { "$TMP/bin/jsonfilter" -i "$1" -e "$2" 2>/dev/null | head -n 1 || true; }
  write_recommended_sync_status() { printf '%s\n' "$1" > "$TMP/revoke-status"; }
  post_json() { printf '%s\n' "$1" > "$TMP/revoke-url"; cp "$TMP/revoke-hub.json" "$3"; }
  if recommended_revoke invalid; then exit 1; fi
  recommended_revoke 42
  grep -Fq '/devices/recommended-rules/42/revoke' "$TMP/revoke-url"
  grep -Fxq confirmed "$TMP/revoke-status"
  [ "$(cat "$TMP/rules.json")" = '[]' ] || exit 1
  python3 - "$TMP/run/recommended-rules.catalog.json" <<'PY_EMPTY_RULES'
import json,sys
assert json.load(open(sys.argv[1]))['rules'] == []
PY_EMPTY_RULES
)
grep -Fq 'RECOMMENDED_POLL_INTERVAL_S=30' "$DEVICE"
grep -Fq 'next_fast=' "$DEVICE"
grep -Fq 'next_full=' "$DEVICE"
grep -Fq "recommended-sync) recommended_fast_sync" "$DEVICE"
grep -Fq "[ HELPER, 'recommended-sync' ]" "$ROOT/root/usr/share/rpcd/ucode/smartsafehub/device-registration.uc"
# With exactOptionalPropertyTypes, omit an optional callback rather than pass undefined.
# The block card does not need a revoke callback; only recommended allow rules do.
if grep -Fq 'onRequestRevoke={onRevokeRecommendedRule ? setRevokeTarget : undefined}' "$PAGE"; then
  echo 'FAIL: optional revoke callbacks must be omitted when unavailable' >&2
  exit 1
fi
grep -Fq '{...(onRevokeRecommendedRule ? { onRequestRevoke: setRevokeTarget } : {})}' "$PAGE" || {
  echo 'FAIL: the allow card must conditionally pass the revoke callback' >&2
  exit 1
}
[ "$(grep -Fc 'onRequestRevoke: setRevokeTarget' "$PAGE")" -eq 1 ] || {
  echo 'FAIL: only the allow card may request recommended rule revocation' >&2
  exit 1
}
echo '추천 사용자 규칙 동기화 및 UI 계약: PASS'
