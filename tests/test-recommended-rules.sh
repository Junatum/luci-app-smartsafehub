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
const expr=args[args.indexOf('-e')+1].replace(/^@\./,'').replace(/\[\*\]$/,'');
for (const key of expr.split('.')) obj=obj && !Array.isArray(obj) ? obj[key] : undefined;
if (Array.isArray(obj)) for (const item of obj) console.log(item);
else if (obj !== undefined && obj !== null) console.log(obj);
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
printf '["manual.example.org"]' > "$TMP/rules.json"
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
grep -Fq 'aria-label="추천 규칙 분류"' "$PAGE"
grep -Fq 'https://www.smartsafehub.com/dashboard/recommended-rules/' "$PAGE"
grep -Fq 'RECOMMENDED_HELPER' "$DEVICE"
grep -Fq 'recommended_rules_ack' "$DEVICE"
grep -Fq '/etc/smartsafehub/recommended-rules.state' "$ROOT/root/lib/upgrade/keep.d/smartsafehub-device"
echo '추천 사용자 규칙 동기화 및 UI 계약: PASS'
