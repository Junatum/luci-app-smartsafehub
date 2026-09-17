#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-or-later
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
HELPER="$ROOT_DIR/root/usr/libexec/smartsafehub-health"
INIT_SCRIPT="$ROOT_DIR/root/etc/init.d/smartsafehub-health"
CONFIG="$ROOT_DIR/root/etc/config/smartsafehub"
HEALTH_MODULE="$ROOT_DIR/root/usr/share/rpcd/ucode/smartsafehub/health.uc"
RPC_ENTRY="$ROOT_DIR/root/usr/share/rpcd/ucode/smartsafehub.uc"
ACL="$ROOT_DIR/root/usr/share/rpcd/acl.d/luci-app-smartsafehub.json"
API="$ROOT_DIR/frontend/src/api/smartsafehub.ts"
HOOK="$ROOT_DIR/frontend/src/hooks/useHealth.ts"
SETTINGS_PAGE="$ROOT_DIR/frontend/src/pages/SettingsPage.tsx"

fail() {
	echo "FAIL: $*" >&2
	exit 1
}

for file in "$HELPER" "$INIT_SCRIPT" "$CONFIG" "$HEALTH_MODULE" "$RPC_ENTRY" "$ACL" "$API" "$HOOK" "$SETTINGS_PAGE"; do
	[ -f "$file" ] || fail "Health 소스 파일이 없습니다: ${file#$ROOT_DIR/}"
done

sh -n "$HELPER" || fail 'Health helper가 POSIX shell 문법 검사를 통과해야 합니다.'
sh -n "$INIT_SCRIPT" || fail 'Health init script가 POSIX shell 문법 검사를 통과해야 합니다.'
if grep -Fq -- '-v load=' "$HELPER"; then
	fail 'GNU awk의 load 내장 이름을 -v 변수명으로 사용하면 안 됩니다.'
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT INT TERM
mkdir -p "$TMP/bin" "$TMP/runtime"

cat > "$TMP/bin/uci" <<'EOF_UCI'
#!/bin/sh
set -eu
STATE="${MOCK_UCI_STATE:?}"
[ -f "$STATE" ] || : > "$STATE"
if [ "${1:-}" = "-q" ]; then shift; fi
case "${1:-}" in
	get)
		key="${2:-}"
		value="$(awk -F '=' -v key="$key" '$1 == key { print substr($0, index($0, "=") + 1); exit }' "$STATE")"
		[ -n "$value" ] || exit 1
		printf '%s\n' "$value"
		;;
	set)
		assignment="${2:-}"
		key="${assignment%%=*}"
		value="${assignment#*=}"
		tmp="${STATE}.tmp"
		awk -F '=' -v key="$key" '$1 != key { print }' "$STATE" > "$tmp"
		printf '%s=%s\n' "$key" "$value" >> "$tmp"
		mv "$tmp" "$STATE"
		;;
	commit) exit 0 ;;
	*) exit 1 ;;
esac
EOF_UCI
chmod +x "$TMP/bin/uci"

cat > "$TMP/bin/jsonfilter" <<'EOF_JSONFILTER'
#!/bin/sh
set -eu
file=''
expression=''
while [ "$#" -gt 0 ]; do
	case "$1" in
		-i) file="$2"; shift 2 ;;
		-e) expression="$2"; shift 2 ;;
		*) shift ;;
	esac
done
jq_expression="$(printf '%s' "$expression" | sed 's/^@//')"
jq -r "$jq_expression // empty" "$file"
EOF_JSONFILTER
chmod +x "$TMP/bin/jsonfilter"

cat > "$TMP/bin/ubus" <<'EOF_UBUS'
#!/bin/sh
set -eu
[ "${1:-}" = "call" ] || exit 1
case "${2:-}:${3:-}" in
	network.interface.wan:status)
		printf '{"up":%s}\n' "${MOCK_WAN_UP:-true}"
		;;
	safeshield:status)
		cat <<EOF_STATUS
{"enabled":${MOCK_SAFESHIELD_ENABLED:-true},"status":"${MOCK_SAFESHIELD_STATUS:-idle}","runtime":{"dns_runtime_ok":${MOCK_DNS_RUNTIME_OK:-true},"last_error_code":"${MOCK_SAFESHIELD_ERROR:-}"},"blocklist":{"installed":${MOCK_BLOCKLIST_INSTALLED:-true}},"license":{"configured":${MOCK_LICENSE_CONFIGURED:-true},"plan":"${MOCK_LICENSE_PLAN:-ULTIMATE}","status":"${MOCK_LICENSE_STATUS:-active}"}}
EOF_STATUS
		;;
	safeshield:license_get)
		printf '{"configured":true,"key":"%s"}\n' "${MOCK_LICENSE_KEY:-secret-license-key}"
		;;
	*) exit 1 ;;
esac
EOF_UBUS
chmod +x "$TMP/bin/ubus"

cat > "$TMP/bin/df" <<'EOF_DF'
#!/bin/sh
cat <<EOF_OUTPUT
Filesystem           1024-blocks    Used Available Capacity Mounted on
/dev/mock                  100000   ${MOCK_STORAGE_USED:-20000}     80000  ${MOCK_STORAGE_PERCENT:-20}% /overlay
EOF_OUTPUT
EOF_DF
chmod +x "$TMP/bin/df"

cat > "$TMP/bin/dnsmasq-init" <<'EOF_DNSMASQ'
#!/bin/sh
[ "${1:-}" = "running" ] || exit 1
[ "${MOCK_DNSMASQ_RUNNING:-1}" = "1" ]
EOF_DNSMASQ
chmod +x "$TMP/bin/dnsmasq-init"

cat > "$TMP/bin/date" <<'EOF_DATE'
#!/bin/sh
[ "${1:-}" = "+%s" ] || exit 1
printf '%s\n' "${MOCK_EPOCH:-1800000000}"
EOF_DATE
chmod +x "$TMP/bin/date"

cat > "$TMP/bin/logger" <<'EOF_LOGGER'
#!/bin/sh
exit 0
EOF_LOGGER
chmod +x "$TMP/bin/logger"

cat > "$TMP/bin/uclient-fetch" <<'EOF_FETCH'
#!/bin/sh
set -eu
printf '%s\n' "$*" >> "${MOCK_FETCH_ARGS:?}"
body=''
while [ "$#" -gt 0 ]; do
	case "$1" in
		--body-file=*) body="${1#*=}"; shift ;;
		--body-file) body="$2"; shift 2 ;;
		*) shift ;;
	esac
done
[ -n "$body" ] || exit 1
printf '%s\n' '---' >> "${MOCK_FETCH_BODIES:?}"
cat "$body" >> "${MOCK_FETCH_BODIES:?}"
printf '\n' >> "${MOCK_FETCH_BODIES:?}"
exit "${MOCK_FETCH_EXIT:-0}"
EOF_FETCH
chmod +x "$TMP/bin/uclient-fetch"

MEMINFO="$TMP/meminfo"
LOADAVG="$TMP/loadavg"
CPUINFO="$TMP/cpuinfo"
UCI_STATE="$TMP/uci.state"
FETCH_ARGS="$TMP/fetch.args"
FETCH_BODIES="$TMP/fetch.bodies"
HEALTH_FILE="$TMP/runtime/health.json"
REPORT_STATE="$TMP/runtime/health-reporter.state"
UPDATER_STATE="$TMP/runtime/updates.state"
FIRMWARE_STATE="$TMP/runtime/firmware.state"
: > "$FETCH_ARGS"
: > "$FETCH_BODIES"
printf 'MemTotal:       100000 kB\nMemAvailable:    50000 kB\n' > "$MEMINFO"
printf '0.10 0.05 0.01 1/100 100\n' > "$LOADAVG"
printf 'processor\t: 0\nprocessor\t: 1\n' > "$CPUINFO"
printf 'phase\tidle\n' > "$UPDATER_STATE"
printf 'phase\tidle\n' > "$FIRMWARE_STATE"
cat > "$UCI_STATE" <<'EOF_CONFIG'
smartsafehub.health.check_interval_s=300
smartsafehub.health.reporter_enabled=0
smartsafehub.health.report_interval_s=1800
smartsafehub.health.api_base_url=https://www.smartsafehub.com/api/v1
EOF_CONFIG

run_health() {
	MOCK_UCI_STATE="$UCI_STATE" \
	MOCK_FETCH_ARGS="$FETCH_ARGS" \
	MOCK_LICENSE_PLAN="${MOCK_LICENSE_PLAN:-ULTIMATE}" \
	MOCK_LICENSE_STATUS="${MOCK_LICENSE_STATUS:-active}" \
	MOCK_LICENSE_CONFIGURED="${MOCK_LICENSE_CONFIGURED:-true}" \
	MOCK_LICENSE_KEY="${MOCK_LICENSE_KEY:-secret-license-key}" \
	MOCK_WAN_UP="${MOCK_WAN_UP:-true}" \
	MOCK_SAFESHIELD_ENABLED="${MOCK_SAFESHIELD_ENABLED:-true}" \
	MOCK_SAFESHIELD_STATUS="${MOCK_SAFESHIELD_STATUS:-idle}" \
	MOCK_DNS_RUNTIME_OK="${MOCK_DNS_RUNTIME_OK:-true}" \
	MOCK_BLOCKLIST_INSTALLED="${MOCK_BLOCKLIST_INSTALLED:-true}" \
	MOCK_SAFESHIELD_ERROR="${MOCK_SAFESHIELD_ERROR:-}" \
	MOCK_EPOCH="${MOCK_EPOCH:-1800000000}" \
	MOCK_FETCH_BODIES="$FETCH_BODIES" \
	MOCK_FETCH_EXIT="${MOCK_FETCH_EXIT:-0}" \
	SMARTSAFEHUB_HEALTH_RUNTIME_DIR="$TMP/runtime" \
	SMARTSAFEHUB_HEALTH_FILE="$HEALTH_FILE" \
	SMARTSAFEHUB_HEALTH_REPORT_STATE_FILE="$REPORT_STATE" \
	SMARTSAFEHUB_HEALTH_MEMINFO_FILE="$MEMINFO" \
	SMARTSAFEHUB_HEALTH_LOADAVG_FILE="$LOADAVG" \
	SMARTSAFEHUB_HEALTH_CPUINFO_FILE="$CPUINFO" \
	SMARTSAFEHUB_HEALTH_UPDATER_STATE_FILE="$UPDATER_STATE" \
	SMARTSAFEHUB_HEALTH_FIRMWARE_STATE_FILE="$FIRMWARE_STATE" \
	SMARTSAFEHUB_HEALTH_DNSMASQ_INIT="$TMP/bin/dnsmasq-init" \
	SMARTSAFEHUB_HEALTH_UCI_BIN="$TMP/bin/uci" \
	SMARTSAFEHUB_HEALTH_UBUS_BIN="$TMP/bin/ubus" \
	SMARTSAFEHUB_HEALTH_JSONFILTER_BIN="$TMP/bin/jsonfilter" \
	SMARTSAFEHUB_HEALTH_UCLIENT_FETCH_BIN="$TMP/bin/uclient-fetch" \
	SMARTSAFEHUB_HEALTH_DF_BIN="$TMP/bin/df" \
	SMARTSAFEHUB_HEALTH_DATE_BIN="$TMP/bin/date" \
	SMARTSAFEHUB_HEALTH_LOGGER_BIN="$TMP/bin/logger" \
	PATH="$TMP/bin:$PATH" \
	"$HELPER" "$@"
}

# 무료/유료 여부와 관계없이 로컬 진단은 동작하고 기본 원격 보고는 꺼져 있어야 한다.
MOCK_LICENSE_PLAN=FREE MOCK_LICENSE_STATUS=active run_health run-once
jq -e '.schema == 1 and .overall == "ok" and .summary.total >= 8' "$HEALTH_FILE" >/dev/null || \
	fail '정상 장치의 로컬 진단은 schema v1과 ok 상태를 생성해야 합니다.'
grep -Eq '^enabled[[:space:]]+0$' "$REPORT_STATE" || fail '원격 상태 보고는 opt-in 방식이며 기본값이 OFF여야 합니다.'
[ ! -s "$FETCH_ARGS" ] || fail '로컬 전용 진단은 서버 요청을 보내면 안 됩니다.'

# 낮은 가용 메모리는 로컬에서 critical 이상으로 판정한다.
printf 'MemTotal:       100000 kB\nMemAvailable:     5000 kB\n' > "$MEMINFO"
MOCK_LICENSE_PLAN=FREE MOCK_LICENSE_STATUS=active run_health run-once
jq -e '.overall == "critical" and any(.checks[]; .code == "MEMORY_PRESSURE" and .status == "critical")' "$HEALTH_FILE" >/dev/null || \
	fail '가용 메모리가 매우 낮으면 critical 메모리 압박으로 진단해야 합니다.'

# FREE 사용자는 원격 상태 보고를 켤 수 없어야 한다.
set +e
MOCK_LICENSE_PLAN=FREE MOCK_LICENSE_STATUS=active run_health set-reporter 1
free_status=$?
set -e
[ "$free_status" -eq 3 ] || fail 'FREE 사용자가 원격 상태 보고를 활성화하려는 요청은 거부해야 합니다.'
grep -Eq '^smartsafehub.health.reporter_enabled=0$' "$UCI_STATE" || fail 'FREE 사용자의 opt-in 거부 후 Reporter는 비활성 상태를 유지해야 합니다.'

# 유료 active 사용자는 명시적으로 opt-in 할 수 있고, 첫 cycle에서 최소 상태 payload만 전송한다.
printf 'MemTotal:       100000 kB\nMemAvailable:    50000 kB\n' > "$MEMINFO"
MOCK_LICENSE_PLAN=ULTIMATE MOCK_LICENSE_STATUS=active run_health set-reporter 1
grep -Eq '^smartsafehub.health.reporter_enabled=1$' "$UCI_STATE" || fail '유료 사용자의 opt-in은 reporter_enabled=1로 저장해야 합니다.'
MOCK_LICENSE_PLAN=ULTIMATE MOCK_LICENSE_STATUS=active MOCK_EPOCH=1800000000 run_health run-cycle
[ "$(wc -l < "$FETCH_ARGS" | tr -d ' ')" -eq 1 ] || fail '유료 사용자가 opt-in하면 첫 Health 보고를 전송해야 합니다.'

grep -Fq '/health/reports' "$FETCH_ARGS" || fail 'Health Reporter는 전용 Health 보고 endpoint를 사용해야 합니다.'
grep -Fq 'X-SafeShield-License-Key: secret-license-key' "$FETCH_ARGS" || fail 'Health Reporter는 등록된 SafeShield 라이선스로 인증해야 합니다.'
for forbidden in hostname wan_ip ipv4Address ssid mac dns_query logs password license_key secret-license-key; do
	if grep -Fiq "$forbidden" "$FETCH_BODIES"; then
		fail "Health 보고 payload에 개인정보 필드/값이 포함되면 안 됩니다: $forbidden"
	fi
done
jq -e '.schema == 1 and has("metrics") and has("issues") and (has("device") | not) and (has("wifi") | not)' \
	"$(awk 'BEGIN{p=0} /^---$/{p=1;next} p{print}' "$FETCH_BODIES" > "$TMP/last-report.json"; printf '%s' "$TMP/last-report.json")" >/dev/null || \
	fail 'Health 보고 payload는 개인정보를 최소화한 whitelist schema를 사용해야 합니다.'

# 같은 상태에서는 30분 주기 전까지 중복 보고하지 않는다.
MOCK_LICENSE_PLAN=ULTIMATE MOCK_LICENSE_STATUS=active MOCK_EPOCH=1800000060 run_health run-cycle
[ "$(wc -l < "$FETCH_ARGS" | tr -d ' ')" -eq 1 ] || fail 'Health 상태가 바뀌지 않았으면 주기 전에는 중복 보고하면 안 됩니다.'

# 상태 fingerprint가 바뀌면 정기 주기 전이라도 한 번 즉시 보고한다.
printf 'MemTotal:       100000 kB\nMemAvailable:     5000 kB\n' > "$MEMINFO"
MOCK_LICENSE_PLAN=ULTIMATE MOCK_LICENSE_STATUS=active MOCK_EPOCH=1800000120 run_health run-cycle
[ "$(wc -l < "$FETCH_ARGS" | tr -d ' ')" -eq 2 ] || fail 'Health 이상 상태가 바뀌면 즉시 한 번 보고해야 합니다.'

# 서버 전송이 실패하면 5분 backoff를 적용해 매 분 재시도하지 않는다.
MOCK_LICENSE_PLAN=ULTIMATE MOCK_LICENSE_STATUS=active MOCK_EPOCH=1800004000 MOCK_FETCH_EXIT=1 run_health run-cycle
[ "$(wc -l < "$FETCH_ARGS" | tr -d ' ')" -eq 3 ] || fail '실패하는 Health 보고는 한 번의 업로드 시도만 수행해야 합니다.'
grep -Eq '^last_result[[:space:]]+failed$' "$REPORT_STATE" || fail 'Health 업로드 실패 상태를 로컬에 기록해야 합니다.'
grep -Eq '^next_retry_at[[:space:]]+1800004300$' "$REPORT_STATE" || fail 'Health 업로드 실패 후 5분 재시도 backoff를 예약해야 합니다.'
MOCK_LICENSE_PLAN=ULTIMATE MOCK_LICENSE_STATUS=active MOCK_EPOCH=1800004060 MOCK_FETCH_EXIT=0 run_health run-cycle
[ "$(wc -l < "$FETCH_ARGS" | tr -d ' ')" -eq 3 ] || fail 'Health 업로드 실패 후 backoff 만료 전에는 재시도하면 안 됩니다.'
MOCK_LICENSE_PLAN=ULTIMATE MOCK_LICENSE_STATUS=active MOCK_EPOCH=1800004301 MOCK_FETCH_EXIT=0 run_health run-cycle
[ "$(wc -l < "$FETCH_ARGS" | tr -d ' ')" -eq 4 ] || fail 'Health Reporter는 backoff가 만료되면 재시도해야 합니다.'

# 사용자가 끄면 설정이 즉시 OFF가 되고 그 이후 cycle에서는 네트워크 요청이 없어야 한다.
MOCK_LICENSE_PLAN=ULTIMATE MOCK_LICENSE_STATUS=active run_health set-reporter 0
before="$(wc -l < "$FETCH_ARGS" | tr -d ' ')"
MOCK_LICENSE_PLAN=ULTIMATE MOCK_LICENSE_STATUS=active MOCK_EPOCH=1800004000 run_health run-cycle
after="$(wc -l < "$FETCH_ARGS" | tr -d ' ')"
[ "$before" -eq "$after" ] || fail '원격 상태 보고를 끄면 서버 요청을 보내면 안 됩니다.'
grep -Eq '^last_result[[:space:]]+disabled$' "$REPORT_STATE" || fail 'Reporter 비활성 상태를 로컬 상태에 명시해야 합니다.'

# rpcd handler는 다른 ubus 객체를 호출하는 health helper를 동기 실행하면 안 된다.
grep -Fq "HEALTH_HELPER + ' ' + action + ' >/dev/null 2>&1 </dev/null &'" "$HEALTH_MODULE" || \
	fail 'Health RPC는 helper를 분리된 프로세스로 시작해야 합니다.'
if grep -Fq "run_command([ HEALTH_HELPER, 'run-once' ]" "$HEALTH_MODULE"; then
	fail 'Health RPC는 중첩 ubus 호출을 수행하는 helper를 동기 실행하면 안 됩니다.'
fi

# RPC/UI 계약: 로컬 상태/실행 RPC와 Reporter 설정 변경 권한을 각각 검증한다.
for method in health_status; do
	jq -e --arg method "$method" '."luci-app-smartsafehub".read.ubus.smartsafehub | index($method) != null' "$ACL" >/dev/null || \
		fail "ACL이 읽기 RPC를 허용해야 합니다: $method"
done
for method in health_run health_reporter_update; do
	jq -e --arg method "$method" '."luci-app-smartsafehub".write.ubus.smartsafehub | index($method) != null' "$ACL" >/dev/null || \
		fail "ACL이 쓰기 RPC를 허용해야 합니다: $method"
done

grep -Fq "option reporter_enabled '0'" "$CONFIG" || fail 'UCI에서 원격 상태 보고 기본값은 OFF여야 합니다.'
grep -Fq "option check_interval_s '300'" "$CONFIG" || fail '로컬 Health 진단 기본 주기는 5분이어야 합니다.'
grep -Fq "option report_interval_s '1800'" "$CONFIG" || fail 'Health Reporter heartbeat 기본 주기는 30분이어야 합니다.'
grep -Fq "fetchHealthStatus" "$API" || fail '프런트엔드 API가 로컬 Health 상태 조회를 제공해야 합니다.'
grep -Fq "updateHealthReporter" "$HOOK" || fail 'Health hook이 Reporter opt-in 변경을 제공해야 합니다.'
grep -Fq '로컬 진단은 멤버십과 관계없이 사용할 수 있습니다.' "$SETTINGS_PAGE" || fail '설정 UI가 무료 로컬 진단을 설명해야 합니다.'
grep -Fq '기본값은 꺼짐이며 언제든지 다시 끌 수 있습니다.' "$SETTINGS_PAGE" || fail '설정 UI가 Reporter opt-in과 opt-out을 설명해야 합니다.'
grep -Fq '전송하지 않는 정보' "$SETTINGS_PAGE" || fail '설정 UI가 Health Reporter의 개인정보 제외 항목을 안내해야 합니다.'

echo 'PASS: 무료 로컬 진단과 유료/Trial opt-in 원격 상태 보고 계약이 정상입니다.'
