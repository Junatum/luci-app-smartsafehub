#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-or-later
set -eu

ROOT_DIR="$(CDPATH='' cd -- "$(dirname "$0")/.." && pwd)"
MAKEFILE="$ROOT_DIR/Makefile"
ACL="$ROOT_DIR/root/usr/share/rpcd/acl.d/luci-app-smartsafehub.json"
API="$ROOT_DIR/frontend/src/api/safeshield.ts"
HOOK="$ROOT_DIR/frontend/src/hooks/useSafeShieldStatistics.ts"
APP="$ROOT_DIR/frontend/src/app/App.tsx"
PANEL="$ROOT_DIR/frontend/src/components/SafeShieldStatisticsPanel.tsx"
CHART="$ROOT_DIR/frontend/src/components/SafeShieldBlockedBarChart.tsx"
DEVICE_LIST="$ROOT_DIR/frontend/src/components/SafeShieldDeviceStatisticsList.tsx"
PACKAGE_JSON="$ROOT_DIR/frontend/package.json"

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

jq -e \
  '.["luci-app-smartsafehub"].read.ubus.safeshield | index("statistics") != null' \
  "$ACL" >/dev/null || fail 'statistics must be allowed by the SafeShield read ACL'

grep -Fq 'LUCI_EXTRA_DEPENDS:=safeshield (>=0.3.19)' "$MAKEFILE" || \
  fail 'SmartSafeHub must require safeshield 0.3.19 or later'
grep -Fq "callSafeShield<RawSafeShieldStatistics>('statistics')" "$API" || \
  fail 'frontend API must call the safeshield statistics RPC'
grep -Fq 'const STATISTICS_REFRESH_INTERVAL_MS = 60_000;' "$HOOK" || \
  fail 'statistics polling interval must remain 60 seconds'
grep -Fq "useSafeShieldStatistics(route === 'safeshield')" "$APP" || \
  fail 'statistics resource must only be active on the SafeShield route'
grep -Fq 'const DISPLAY_HOURS = 24;' "$PANEL" || \
  fail 'statistics chart must display the latest 24 hourly buckets'
grep -Fq 'DNS 요청 원본은 저장하지 않고 숫자만 로컬 메모리에 집계합니다.' "$PANEL" || \
  fail 'statistics UI must explain local aggregate-only behavior'
grep -Fq '<SafeShieldBlockedBarChart buckets={buckets} />' "$PANEL" || \
  fail 'statistics panel must render the Chart.js bar chart component'
grep -Fq 'deviceLimit: numberValue(source.device_limit)' "$API" || \
  fail 'statistics API must normalize the per-device tracking limit'
grep -Fq 'devicesTruncated: boolValue(source.devices_truncated)' "$API" || \
  fail 'statistics API must normalize the device truncation flag'
grep -Fq 'devices,' "$API" || \
  fail 'statistics API must expose normalized per-device statistics'
grep -Fq '<SafeShieldDeviceStatisticsList' "$PANEL" || \
  fail 'statistics panel must render the per-device statistics list'
grep -Fq '기기별 통계' "$DEVICE_LIST" || \
  fail 'device statistics list must label the per-device section'
grep -Fq 'DHCP 식별' "$DEVICE_LIST" || \
  fail 'device statistics list must show DHCP identification state'
grep -Fq 'IP 임시 식별' "$DEVICE_LIST" || \
  fail 'device statistics list must show temporary IP identification state'
grep -Fq 'device.blocked' "$DEVICE_LIST" || \
  fail 'device statistics list must render blocked request counts'
jq -e '.dependencies["chart.js"] == "4.5.1"' "$PACKAGE_JSON" >/dev/null || \
  fail 'frontend must pin Chart.js 4.5.1'
grep -Fq "from 'chart.js';" "$CHART" || \
  fail 'statistics chart must import Chart.js modules directly'
grep -Fq 'BarController' "$CHART" || fail 'statistics chart must register BarController'
grep -Fq 'BarElement' "$CHART" || fail 'statistics chart must register BarElement'
grep -Fq 'CategoryScale' "$CHART" || fail 'statistics chart must register CategoryScale'
grep -Fq 'LinearScale' "$CHART" || fail 'statistics chart must register LinearScale'
grep -Fq 'Tooltip' "$CHART" || fail 'statistics chart must register Tooltip'
if grep -Fq "chart.js/auto" "$CHART"; then
  fail 'statistics chart must not use chart.js/auto'
fi
grep -Fq 'prefers-reduced-motion: reduce' "$CHART" || \
  fail 'statistics chart must respect reduced-motion preferences'

jq -e \
  '.["luci-app-smartsafehub"].write.ubus.safeshield | index("config_update") != null' \
  "$ACL" >/dev/null || fail 'statistics toggle requires config_update write ACL'
grep -Fq "callSafeShield<RawSafeShieldMutation>('config_update'" "$API" || \
  fail 'statistics toggle must update SafeShield through config_update'
grep -Fq 'statistics_enabled: enabled' "$API" || \
  fail 'statistics toggle must only update statistics_enabled'
grep -Fq 'collectorRunning: boolValue(source.collector_running)' "$API" || \
  fail 'statistics API must expose collector runtime state'
grep -Fq 'role="switch"' "$PANEL" || \
  fail 'statistics panel must expose an accessible enable switch'
grep -Fq 'onSetEnabled(!data.enabled)' "$PANEL" || \
  fail 'statistics switch must toggle the current enabled state'

grep -Fq 'reconciled: boolValue(response.reconciled)' "$API" || \
  fail 'statistics toggle must normalize backend reconciliation state'
grep -Fq "action === 'statistics-enable' || action === 'statistics-disable'" "$PANEL" || \
  fail 'statistics panel must expose a dedicated busy state for toggle actions'
grep -Fq 'animate-spin' "$PANEL" || \
  fail 'statistics switch must show a spinner while the setting is being reconciled'
grep -Fq 'cursor-wait' "$PANEL" || \
  fail 'statistics panel must show a wait cursor while the setting is being reconciled'
grep -Fq '활성화하는 중…' "$PANEL" || \
  fail 'statistics panel must show an enabling state label'
grep -Fq '비활성화하는 중…' "$PANEL" || \
  fail 'statistics panel must show a disabling state label'
grep -Fq 'scheduleStatisticsRefreshes([500, 1500]);' "$ROOT_DIR/frontend/src/hooks/useSafeShieldActions.ts" || \
  fail 'statistics toggle must use short statistics-only follow-up refreshes'

echo 'PASS: SafeShield statistics API, ACL, toggle, polling and Chart.js 24-hour UI contracts are consistent'
