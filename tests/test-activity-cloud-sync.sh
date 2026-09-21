#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-or-later
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
SYNC_BIN="$ROOT_DIR/root/usr/libexec/smartsafehub-activity-sync"
EVENTS_BIN="$ROOT_DIR/root/usr/libexec/smartsafehub-events"
SAFE_ADAPTER="$ROOT_DIR/root/usr/share/rpcd/ucode/smartsafehub/safeshield-management.uc"
HEALTH_BIN="$ROOT_DIR/root/usr/libexec/smartsafehub-health"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT INT TERM

fail() {
  printf 'FAIL: %s\n' "$*" >&2
  exit 1
}

for file in "$SYNC_BIN" "$EVENTS_BIN" "$SAFE_ADAPTER"; do
  [ -f "$file" ] || fail "missing activity producer/sync component: $file"
done

# Direct vs observer ownership contracts: explicit SafeShield mutations are
# emitted at the mutation call site, while Health owns only external state
# transitions. Async blocklist completion is observed by the unified event daemon.
grep -Fq 'safeshield.protection.enabled' "$SAFE_ADAPTER" || fail 'SafeShield enable must emit directly from the mutation adapter'
grep -Fq 'safeshield.protection.disabled' "$SAFE_ADAPTER" || fail 'SafeShield disable must emit directly from the mutation adapter'
grep -Fq 'watch-refresh-detached' "$SAFE_ADAPTER" || fail 'manual refresh must start a completion watcher after SafeShield accepts the request'
grep -Fq 'safeshield.blocklist.updated' "$EVENTS_BIN" || fail 'unified event daemon must record each observed SafeShield refresh completion'
grep -Fq 'safeshield.blocklist.update_failed' "$EVENTS_BIN" || fail 'unified event daemon must record SafeShield refresh failures'
grep -Fq 'safeshield_observe_once' "$EVENTS_BIN" || fail 'SafeShield refresh observer must live in smartsafehub-events'
[ ! -e "$ROOT_DIR/root/usr/libexec/smartsafehub-safeshield-events" ] || fail 'standalone SafeShield event daemon must be removed'
[ ! -e "$ROOT_DIR/root/etc/init.d/smartsafehub-safeshield-events" ] || fail 'standalone SafeShield event init service must be removed'
if grep -Fq 'safeshield.protection.enabled' "$HEALTH_BIN" || grep -Fq 'safeshield.blocklist.updated' "$HEALTH_BIN"; then
  fail 'Health observer must not duplicate SafeShield mutation/refresh events'
fi
grep -Fq 'network.internet.disconnected' "$HEALTH_BIN" || fail 'Health observer must keep WAN transition events'
grep -Fq 'health.issue.started' "$HEALTH_BIN" || fail 'Health observer must keep diagnostic transition events'
grep -Fq 'consume_wake_marker' "$SYNC_BIN" || fail 'activity sync daemon must consume wake markers so backend failures do not retry every daemon tick'
grep -Fq 'mv "$WAKE_FILE" "$consumed"' "$SYNC_BIN" || fail 'wake marker consumption must use atomic rename so events emitted during sync create a fresh marker'
grep -Fq 'RETRY_INITIAL_S=900' "$SYNC_BIN" || fail 'Cloud activity resolve failures must start with a 15-minute retry backoff'
grep -Fq 'RETRY_MAX_S=3600' "$SYNC_BIN" || fail 'Cloud activity retry backoff must be capped at one hour'
grep -Fq 'retry_backoff_active' "$SYNC_BIN" || fail 'new event wake markers must respect an active Cloud failure backoff'
grep -Fq '[ -e "$WAKE_FILE" ] && ! retry_backoff_active' "$SYNC_BIN" || fail 'event wake must not bypass Cloud failure backoff'

for contract in \
  'root/usr/share/rpcd/ucode/smartsafehub/system.uc:settings.scheduled_reboot.updated' \
  'root/usr/share/rpcd/ucode/smartsafehub/system.uc:settings.timezone.updated' \
  'root/usr/share/rpcd/ucode/smartsafehub/updates.uc:settings.software_updates.updated' \
  'root/usr/share/rpcd/ucode/smartsafehub/health.uc:settings.health_reporter.enabled' \
  'root/usr/share/rpcd/ucode/smartsafehub/wifi-management.uc:settings.wifi.updated' \
  'root/usr/share/rpcd/ucode/smartsafehub/network-management.uc:settings.lan.updated' \
  'root/usr/share/rpcd/ucode/smartsafehub/iptv-management.uc:settings.iptv.updated'; do
  file="${contract%%:*}"
  event="${contract#*:}"
  grep -Fq "$event" "$ROOT_DIR/$file" || fail "direct settings event missing: $event"
done

MOCK_BIN="$TMP_DIR/bin"
RUNTIME="$TMP_DIR/runtime"
OUTBOX="$TMP_DIR/outbox.jsonl"
ACK_LOG="$TMP_DIR/ack.log"
CLEAR_LOG="$TMP_DIR/clear.log"
mkdir -p "$MOCK_BIN" "$RUNTIME"
: > "$ACK_LOG"
: > "$CLEAR_LOG"

cat > "$MOCK_BIN/events" <<'EOF_EVENTS'
#!/bin/sh
set -eu
case "${1:-}" in
  list)
    printf '{"schema":1,"events":['
    first=1
    if [ -s "$MOCK_OUTBOX" ]; then
      while IFS= read -r line || [ -n "$line" ]; do
        [ -n "$line" ] || continue
        [ "$first" -eq 1 ] || printf ','
        printf '%s' "$line"
        first=0
      done < "$MOCK_OUTBOX"
    fi
    printf ']}\n'
    ;;
  ack)
    id="${2:-}"
    printf '%s\n' "$id" >> "$MOCK_ACK_LOG"
    tmp="${MOCK_OUTBOX}.tmp.$$"
    awk -v needle="\"event_id\":\"$id\"" 'index($0, needle) == 0 { print }' "$MOCK_OUTBOX" > "$tmp"
    mv "$tmp" "$MOCK_OUTBOX"
    ;;
  clear-outbox)
    : > "$MOCK_OUTBOX"
    printf 'clear\n' >> "$MOCK_CLEAR_LOG"
    ;;
  *) exit 2 ;;
esac
EOF_EVENTS
chmod +x "$MOCK_BIN/events"

cat > "$MOCK_BIN/uci" <<'EOF_UCI'
#!/bin/sh
case "$*" in
  *smartsafehub.activity.sync_interval_s*) printf '300\n' ;;
  *smartsafehub.activity.startup_delay_s*) printf '0\n' ;;
  *smartsafehub.activity.api_base_url*) printf 'https://www.smartsafehub.com/api/v1\n' ;;
esac
EOF_UCI
chmod +x "$MOCK_BIN/uci"

cat > "$MOCK_BIN/ubus" <<'EOF_UBUS'
#!/bin/sh
if [ "$1" = call ] && [ "$2" = safeshield ] && [ "$3" = license_get ]; then
  printf '%s\n' '{"license":{"configured":true,"key":"SSH-PAID-TEST"}}'
  exit 0
fi
if [ "$1" = call ] && [ "$2" = safeshield ] && [ "$3" = status ]; then
  cat <<'EOF_STATUS'
{"version":"0.3.24-r1","device":{"physical_fingerprint":"0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef","fingerprint_version":1,"identity_provider":"physical","identity_source":"factory","identity_strength":"strong","identity_profile":"router","installation_id":"install-test","configured":{"vendor":"SmartSafeHub","model":"AX3000SM","arch":"aarch64_cortex-a53","memory_mb":256,"device_code":"iptime-ax3000sm","device_code_source":"smartsafehub_firmware"}}}
EOF_STATUS
  exit 0
fi
exit 1
EOF_UBUS
chmod +x "$MOCK_BIN/ubus"

cat > "$MOCK_BIN/jsonfilter" <<'EOF_JSONFILTER'
#!/bin/sh
set -eu
file=''
expr=''
while [ "$#" -gt 0 ]; do
  case "$1" in
    -i) file="$2"; shift 2 ;;
    -e) expr="$2"; shift 2 ;;
    *) shift ;;
  esac
done
jq_expr="$(printf '%s' "$expr" | sed -e 's/^@//' -e 's/\[\*\]/[]/g')"
jq -r "$jq_expr | if . == null then empty else . end" "$file"
EOF_JSONFILTER
chmod +x "$MOCK_BIN/jsonfilter"

cat > "$MOCK_BIN/date" <<'EOF_DATE'
#!/bin/sh
printf '1800000000\n'
EOF_DATE
chmod +x "$MOCK_BIN/date"

cat > "$MOCK_BIN/logger" <<'EOF_LOGGER'
#!/bin/sh
exit 0
EOF_LOGGER
chmod +x "$MOCK_BIN/logger"

cat > "$MOCK_BIN/uclient-fetch" <<'EOF_FETCH'
#!/bin/sh
set -eu
output=''
body=''
url=''
while [ "$#" -gt 0 ]; do
  case "$1" in
    -O) output="$2"; shift 2 ;;
    --body-file=*) body="${1#--body-file=}"; shift ;;
    --body-file) body="$2"; shift 2 ;;
    --header=*|-q) shift ;;
    --header|-T|--method) shift 2 ;;
    *) url="$1"; shift ;;
  esac
done
case "$url" in
  */licenses/resolve)
    case "${MOCK_RESOLVE_MODE:-paid}" in
      paid)
        cat > "$output" <<'EOF_PAID'
{"license":{"plan":"pro"},"activity_history":{"upload_url":"https://www.smartsafehub.com/api/v1/activity/events","token":"activity-token","token_expires_in_s":172800,"retention_days":90}}
EOF_PAID
        ;;
      paid-missing)
        printf '%s\n' '{"license":{"plan":"pro"},"activity_history":null}' > "$output"
        ;;
      legacy-paid)
        printf '%s\n' '{"plan":"pro","artifact_id":"legacy-artifact"}' > "$output"
        ;;
      unknown)
        printf '%s\n' '{"artifact_id":"legacy-artifact"}' > "$output"
        ;;
      free)
        printf '%s\n' '{"license":{"plan":"free"},"activity_history":null}' > "$output"
        ;;
      unavailable)
        exit 1
        ;;
      *) exit 1 ;;
    esac
    ;;
  */activity/events)
    count="$(jq '.events | length' "$body")"
    printf '{"status":"accepted","received":%s,"accepted":%s,"duplicates":0,"expired":0}\n' "$count" "$count" > "$output"
    ;;
  *) exit 1 ;;
esac
EOF_FETCH
chmod +x "$MOCK_BIN/uclient-fetch"

cat > "$MOCK_BIN/sleep" <<'EOF_SLEEP'
#!/bin/sh
exit 0
EOF_SLEEP
chmod +x "$MOCK_BIN/sleep"

write_outbox() {
  cat > "$OUTBOX" <<'EOF_OUTBOX'
{"schema":1,"event_id":"evt-1","event_type":"settings.wifi.updated","severity":"info","occurred_at":1799999900,"device_uuid":null,"source":"network","metadata":{"origin":"direct"}}
{"schema":1,"event_id":"evt-2","event_type":"network.internet.recovered","severity":"success","occurred_at":1799999950,"device_uuid":null,"source":"network","metadata":{"origin":"observer","downtime_seconds":10}}
EOF_OUTBOX
}

run_sync() {
  env \
    SMARTSAFEHUB_COMMON_LIB="$ROOT_DIR/root/usr/lib/smartsafehub/common.sh" \
    SMARTSAFEHUB_ACTIVITY_RUNTIME_DIR="$RUNTIME" \
    SMARTSAFEHUB_ACTIVITY_EVENTS_BIN="$MOCK_BIN/events" \
    SMARTSAFEHUB_ACTIVITY_UCI_BIN="$MOCK_BIN/uci" \
    SMARTSAFEHUB_ACTIVITY_UBUS_BIN="$MOCK_BIN/ubus" \
    SMARTSAFEHUB_ACTIVITY_JSONFILTER_BIN="$MOCK_BIN/jsonfilter" \
    SMARTSAFEHUB_ACTIVITY_UCLIENT_FETCH_BIN="$MOCK_BIN/uclient-fetch" \
    SMARTSAFEHUB_ACTIVITY_DATE_BIN="$MOCK_BIN/date" \
    SMARTSAFEHUB_ACTIVITY_SLEEP_BIN="$MOCK_BIN/sleep" \
    SMARTSAFEHUB_ACTIVITY_LOGGER_BIN="$MOCK_BIN/logger" \
    MOCK_OUTBOX="$OUTBOX" MOCK_ACK_LOG="$ACK_LOG" MOCK_CLEAR_LOG="$CLEAR_LOG" \
    MOCK_RESOLVE_MODE="$1" \
    "$SYNC_BIN" sync-once
}

write_outbox
run_sync paid || fail 'paid activity batch must synchronize successfully'
[ ! -s "$OUTBOX" ] || fail 'successful upload must ack only the snapshotted outbox events'
[ "$(wc -l < "$ACK_LOG" | tr -d ' ')" -eq 2 ] || fail 'successful two-event upload must ack both event IDs'
jq -e '.eligible == true and .plan == "pro" and .retentionDays == 90 and .pendingEvents == 0 and .lastUploadedCount == 2 and .lastSuccessAt == 1800000000' "$RUNTIME/activity-sync.json" >/dev/null || \
  fail 'paid synchronization state must expose entitlement, retention, pending count and success metadata'

rm -f "$RUNTIME/activity-sync-credential.json"
: > "$ACK_LOG"
: > "$CLEAR_LOG"
write_outbox
if run_sync paid-missing >/dev/null 2>&1; then
  fail 'paid resolve without an activity credential must be retried as an error'
fi
[ -s "$OUTBOX" ] || fail 'paid events must never be discarded when the backend omits the activity credential'
[ ! -s "$CLEAR_LOG" ] || fail 'paid missing-credential response must not clear the Cloud outbox'
jq -e '.phase == "error" and .lastErrorCode == "ACTIVITY_RESOLVE_FAILED"' "$RUNTIME/activity-sync.json" >/dev/null || \
  fail 'paid missing-credential response must surface a retryable resolve error'

rm -f "$RUNTIME/activity-sync-credential.json"
: > "$ACK_LOG"
: > "$CLEAR_LOG"
write_outbox
if run_sync legacy-paid >/dev/null 2>&1; then
  fail 'legacy paid resolve without activity credentials must remain retryable until the Hub activity API is deployed'
fi
[ -s "$OUTBOX" ] || fail 'legacy paid resolve must preserve the bounded Cloud outbox'
[ ! -s "$CLEAR_LOG" ] || fail 'legacy paid resolve must never clear Cloud events before the activity API rollout'

rm -f "$RUNTIME/activity-sync-credential.json"
: > "$ACK_LOG"
: > "$CLEAR_LOG"
write_outbox
if run_sync unknown >/dev/null 2>&1; then
  fail 'resolve responses with unknown entitlement must be retryable rather than treated as Free'
fi
[ -s "$OUTBOX" ] || fail 'unknown/partial resolve response must preserve Cloud events'
[ ! -s "$CLEAR_LOG" ] || fail 'unknown/partial resolve response must not clear the Cloud outbox'

rm -f "$RUNTIME/activity-sync-credential.json" "$RUNTIME/activity-sync.json"
: > "$ACK_LOG"
: > "$CLEAR_LOG"
write_outbox
if run_sync unavailable >/dev/null 2>&1; then
  fail 'unreachable Hub activity API must surface a retryable synchronization error'
fi
[ -s "$OUTBOX" ] || fail 'Hub API communication failure must preserve Cloud events for a later retry'
[ ! -s "$CLEAR_LOG" ] || fail 'Hub API communication failure must not clear the Cloud outbox'
jq -e '.lastErrorCode == "ACTIVITY_RESOLVE_FAILED" and .nextSyncAt == 1800000900' "$RUNTIME/activity-sync.json" >/dev/null || \
  fail 'first Cloud resolve failure must back off for 15 minutes instead of retrying after five minutes'
if run_sync unavailable >/dev/null 2>&1; then
  fail 'repeated unavailable Hub resolve must remain retryable'
fi
jq -e '.nextSyncAt == 1800001800' "$RUNTIME/activity-sync.json" >/dev/null || \
  fail 'second consecutive Cloud resolve failure must back off for 30 minutes'
if run_sync unavailable >/dev/null 2>&1; then
  fail 'third unavailable Hub resolve must remain retryable'
fi
jq -e '.nextSyncAt == 1800003600' "$RUNTIME/activity-sync.json" >/dev/null || \
  fail 'Cloud resolve retry backoff must grow to the one-hour cap'
if run_sync unavailable >/dev/null 2>&1; then
  fail 'capped unavailable Hub resolve must remain retryable'
fi
jq -e '.nextSyncAt == 1800003600' "$RUNTIME/activity-sync.json" >/dev/null || \
  fail 'Cloud resolve retry backoff must remain capped at one hour'

rm -f "$RUNTIME/activity-sync-credential.json"
: > "$ACK_LOG"
: > "$CLEAR_LOG"
write_outbox
run_sync free || fail 'ineligible activity sync must settle without a daemon failure'
[ ! -s "$OUTBOX" ] || fail 'Free/ineligible device must not retain a Cloud-only outbox indefinitely'
grep -Fq 'clear' "$CLEAR_LOG" || fail 'ineligible resolve must explicitly clear only the Cloud outbox'
jq -e '.phase == "ineligible" and .eligible == false and .pendingEvents == 0' "$RUNTIME/activity-sync.json" >/dev/null || \
  fail 'Free/ineligible synchronization state must be exposed to the router UI'

printf '%s\n' 'PASS: paid Cloud activity batching/ack, rollout-safe retries, entitlement handling and direct-vs-observer event ownership are valid'
