#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-or-later
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
HELPER="$ROOT_DIR/root/usr/libexec/smartsafehub-events"
INIT_SCRIPT="$ROOT_DIR/root/etc/init.d/smartsafehub-events"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT INT TERM

fail() {
	echo "FAIL: $*" >&2
	exit 1
}

[ -x "$HELPER" ] || fail 'event helper가 실행 가능해야 합니다.'
[ -x "$INIT_SCRIPT" ] || fail 'event boot init script가 실행 가능해야 합니다.'
sh -n "$HELPER" || fail 'event helper가 POSIX shell 문법 검사를 통과해야 합니다.'
sh -n "$INIT_SCRIPT" || fail 'event init script가 POSIX shell 문법 검사를 통과해야 합니다.'

mkdir -p "$TMP/bin" "$TMP/runtime"
printf '%s\n' '11111111-2222-3333-4444-555555555555' > "$TMP/boot_id"

cat > "$TMP/bin/jsonfilter" <<'EOF_JSONFILTER'
#!/bin/sh
set -eu
file=''
while [ "$#" -gt 0 ]; do
	case "$1" in
		-i) file="$2"; shift 2 ;;
		-e) shift 2 ;;
		*) shift ;;
	esac
done
jq -e . "$file" >/dev/null
EOF_JSONFILTER
chmod +x "$TMP/bin/jsonfilter"

cat > "$TMP/bin/date" <<'EOF_DATE'
#!/bin/sh
[ "${1:-}" = '+%s' ] || exit 1
printf '%s\n' "${MOCK_EVENT_EPOCH:-1800000000}"
EOF_DATE
chmod +x "$TMP/bin/date"

cat > "$TMP/bin/logger" <<'EOF_LOGGER'
#!/bin/sh
exit 0
EOF_LOGGER
chmod +x "$TMP/bin/logger"

run_events() {
	SMARTSAFEHUB_EVENTS_RUNTIME_DIR="$TMP/runtime" \
	SMARTSAFEHUB_EVENTS_FILE="$TMP/runtime/events.jsonl" \
	SMARTSAFEHUB_EVENTS_HISTORY_FILE="$TMP/runtime/activity-history.jsonl" \
	SMARTSAFEHUB_EVENTS_LOCK_DIR="$TMP/runtime/events.lock" \
	SMARTSAFEHUB_EVENTS_SEQ_FILE="$TMP/runtime/events.seq" \
	SMARTSAFEHUB_EVENTS_BOOT_MARKER_FILE="$TMP/runtime/events.boot-id" \
	SMARTSAFEHUB_EVENTS_BOOT_ID_FILE="$TMP/boot_id" \
	SMARTSAFEHUB_EVENTS_JSONFILTER_BIN="$TMP/bin/jsonfilter" \
	SMARTSAFEHUB_EVENTS_DATE_BIN="$TMP/bin/date" \
	SMARTSAFEHUB_EVENTS_LOGGER_BIN="$TMP/bin/logger" \
	SMARTSAFEHUB_EVENTS_MAX_EVENTS=8 \
	PATH="$TMP/bin:$PATH" \
	"$HELPER" "$@"
}

first_id="$(MOCK_EVENT_EPOCH=1800000001 run_events emit safeshield safeshield.blocklist.updated success '{"domain_count":33818}' 1800000001)"
[ -n "$first_id" ] || fail '정규화 event emit은 event_id를 반환해야 합니다.'
run_events list > "$TMP/list.json"
jq -e --arg id "$first_id" '.schema == 1 and (.events | length) == 1 and .events[0].event_id == $id and .events[0].event_type == "safeshield.blocklist.updated" and .events[0].severity == "success" and .events[0].occurred_at == 1800000001 and .events[0].device_uuid == null and .events[0].source == "safeshield" and .events[0].metadata.domain_count == 33818' "$TMP/list.json" >/dev/null || \
	fail 'event queue는 schema v1 정규화 레코드를 보존해야 합니다.'

run_events history > "$TMP/history.json"
jq -e --arg id "$first_id" '.schema == 1 and (.events | length) == 1 and .events[0].event_id == $id' "$TMP/history.json" >/dev/null || \
	fail 'local activity history는 outbox와 별도로 동일한 정규화 이벤트를 보존해야 합니다.'

# r8 -> r9 migration: before the dedicated history exists, reads fall back to the
# old outbox; the first new r9 event must seed history with those r8 records.
rm -f "$TMP/runtime/activity-history.jsonl"
run_events history > "$TMP/history-r8-fallback.json"
jq -e --arg id "$first_id" '(.events | length) == 1 and .events[0].event_id == $id' "$TMP/history-r8-fallback.json" >/dev/null || \
	fail '전용 history가 없으면 r8 outbox를 최근 활동 fallback으로 읽어야 합니다.'
second_id="$(MOCK_EVENT_EPOCH=1800000002 run_events emit network network.internet.recovered success '{"downtime_seconds":48}' 1800000002)"
run_events history > "$TMP/history-r9-seeded.json"
jq -e --arg first "$first_id" --arg second "$second_id" '(.events | length) == 2 and .events[0].event_id == $first and .events[1].event_id == $second' "$TMP/history-r9-seeded.json" >/dev/null || \
	fail '첫 r9 이벤트는 기존 r8 outbox를 local history에 승계한 뒤 새 이벤트를 추가해야 합니다.'

if run_events emit safeshield bad.event notice '{}' >/dev/null 2>&1; then
	fail 'severity는 info/success/warning/error 외 값을 허용하면 안 됩니다.'
fi
if run_events emit safeshield bad.event info '[1,2,3]' >/dev/null 2>&1; then
	fail 'metadata는 JSON object만 허용해야 합니다.'
fi
if run_events emit safeshield bad.event info '{broken' >/dev/null 2>&1; then
	fail '잘못된 JSON metadata를 큐에 기록하면 안 됩니다.'
fi

# Queue growth is bounded; oldest lines are dropped first.
i=0
while [ "$i" -lt 10 ]; do
	i=$((i + 1))
	run_events emit system "test.event.$i" info "{\"index\":$i}" "$((1800000100 + i))" >/dev/null
done
run_events list > "$TMP/list.json"
[ "$(jq '.events | length' "$TMP/list.json")" -eq 8 ] || fail 'event queue는 설정된 최대 개수를 초과하면 안 됩니다.'
[ "$(jq -r '.events[0].metadata.index' "$TMP/list.json")" = '3' ] || fail 'queue 초과 시 가장 오래된 event부터 제거해야 합니다.'
run_events history > "$TMP/history.json"
[ "$(jq '.events | length' "$TMP/history.json")" -eq 8 ] || fail 'local activity history도 설정된 최대 개수를 초과하면 안 됩니다.'
[ "$(jq -r '.events[0].metadata.index' "$TMP/history.json")" = '3' ] || fail 'history 초과 시 가장 오래된 event부터 제거해야 합니다.'

ack_id="$(jq -r '.events[3].event_id' "$TMP/list.json")"
run_events ack "$ack_id"
run_events list > "$TMP/list-after-ack.json"
jq -e --arg id "$ack_id" 'all(.events[]; .event_id != $id)' "$TMP/list-after-ack.json" >/dev/null || \
	fail 'ack된 event는 local queue에서 제거되어야 합니다.'
run_events history > "$TMP/history-after-ack.json"
jq -e --arg id "$ack_id" 'any(.events[]; .event_id == $id)' "$TMP/history-after-ack.json" >/dev/null || \
	fail 'Cloud outbox ack가 공유기 웹사이트용 local history를 삭제하면 안 됩니다.'

# Boot event is one-per-kernel-boot even if the init service is restarted.
rm -f "$TMP/runtime/events.jsonl" "$TMP/runtime/activity-history.jsonl" "$TMP/runtime/events.seq" "$TMP/runtime/events.boot-id"
MOCK_EVENT_EPOCH=1800001000 run_events boot
MOCK_EVENT_EPOCH=1800001001 run_events boot
run_events list > "$TMP/boot-list.json"
jq -e '.events | length == 1 and .[0].event_type == "system.booted" and .[0].source == "system" and .[0].metadata.boot_id == "11111111-2222-3333-4444-555555555555"' "$TMP/boot-list.json" >/dev/null || \
	fail '같은 boot_id에서는 system.booted 이벤트가 중복되면 안 됩니다.'

printf '%s\n' 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' > "$TMP/boot_id"
MOCK_EVENT_EPOCH=1800002000 run_events boot
run_events list > "$TMP/boot-list.json"
[ "$(jq '.events | length' "$TMP/boot-list.json")" -eq 2 ] || fail '새 boot_id에서는 새 system.booted 이벤트를 기록해야 합니다.'

# Production sources must emit normalized raw events rather than localized title/description strings.
for contract in \
	'root/usr/libexec/smartsafehub-updater:software.update.completed' \
	'root/usr/libexec/smartsafehub-updater:software.update.failed' \
	'root/usr/libexec/smartsafehub-firmware:firmware.update.started' \
	'root/usr/libexec/smartsafehub-firmware:firmware.update.failed' \
	'root/usr/libexec/smartsafehub-license:license.activated' \
	'root/usr/libexec/smartsafehub-license:license.changed' \
	'root/usr/libexec/smartsafehub-license:license.cleared' \
	'root/usr/libexec/smartsafehub-health:network.internet.disconnected' \
	'root/usr/libexec/smartsafehub-health:network.internet.recovered' \
	'root/usr/libexec/smartsafehub-health:safeshield.blocklist.updated' \
	'root/usr/libexec/smartsafehub-health:safeshield.blocklist.update_failed' \
	'root/usr/libexec/smartsafehub-health:safeshield.protection.enabled' \
	'root/usr/libexec/smartsafehub-health:safeshield.protection.disabled' \
	'root/usr/libexec/smartsafehub-health:health.issue.started' \
	'root/usr/libexec/smartsafehub-health:health.issue.resolved'; do
	file="${contract%%:*}"
	event_type="${contract#*:}"
	grep -Fq "$event_type" "$ROOT_DIR/$file" || fail "production event source가 누락되었습니다: $event_type"
done

printf 'PASS: SmartSafeHub normalized event outbox/history, boot deduplication, bounded retention and production event source contracts are valid\n'
