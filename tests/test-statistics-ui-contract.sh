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

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

jq -e \
  '.["luci-app-smartsafehub"].read.ubus.safeshield | index("statistics") != null' \
  "$ACL" >/dev/null || fail 'statistics must be allowed by the SafeShield read ACL'

grep -Fq 'EXTRA_DEPENDS:=safeshield (>=0.3.14-r2)' "$MAKEFILE" || \
  fail 'SmartSafeHub must require safeshield 0.3.14-r2 or later'
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

echo 'PASS: SafeShield statistics API, ACL, polling and lightweight 24-hour UI contracts are consistent'
