#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-or-later
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
APP="$ROOT_DIR/frontend/src/app/App.tsx"
HOME="$ROOT_DIR/frontend/src/pages/HomePage.tsx"
ACTIVITY="$ROOT_DIR/frontend/src/components/DashboardSafeShieldActivity.tsx"
DEVICES_HOOK="$ROOT_DIR/frontend/src/hooks/useConnectedDevices.ts"
STATISTICS_HOOK="$ROOT_DIR/frontend/src/hooks/useSafeShieldStatistics.ts"

fail() {
	echo "FAIL: $*" >&2
	exit 1
}

for file in "$APP" "$HOME" "$ACTIVITY" "$DEVICES_HOOK" "$STATISTICS_HOOK"; do
	[ -f "$file" ] || fail "missing dashboard source: ${file#$ROOT_DIR/}"
done

grep -Fq "const dashboardDevices = useConnectedDevices(route === 'home', false);" "$APP" || \
	fail 'Dashboard connected-device summary must disable periodic polling'
grep -Fq "const dashboardSafeShield = useSafeShieldStatus(route === 'home');" "$APP" || \
	fail 'Dashboard must load SafeShield status'
grep -Fq "const dashboardSafeShieldStatistics = useSafeShieldStatistics(route === 'home', false);" "$APP" || \
	fail 'Dashboard SafeShield statistics must disable periodic polling'
grep -Fq 'devices={dashboardDevices.data}' "$APP" || \
	fail 'Dashboard must receive the connected-device summary'
grep -Fq 'safeshield={dashboardSafeShield.data}' "$APP" || \
	fail 'Dashboard must receive SafeShield status'
grep -Fq 'statistics={dashboardSafeShieldStatistics.data}' "$APP" || \
	fail 'Dashboard must receive SafeShield statistics'
grep -Fq 'dashboardDevices.refresh()' "$APP" || \
	fail 'Dashboard refresh must refresh connected-device information'
grep -Fq 'dashboardSafeShield.refresh()' "$APP" || \
	fail 'Dashboard refresh must refresh SafeShield information'
grep -Fq 'dashboardSafeShieldStatistics.refresh()' "$APP" || \
	fail 'Dashboard refresh must refresh SafeShield statistics'
grep -Fq 'updates.refresh()' "$APP" || \
	fail 'Dashboard refresh must refresh update information'

grep -Fq 'export function useConnectedDevices(active: boolean, polling = true)' "$DEVICES_HOOK" || \
	fail 'connected-device hook must support one-shot Dashboard loading'
grep -Fq '...(polling ? { pollInterval: REFRESH_INTERVAL_MS } : {}),' "$DEVICES_HOOK" || \
 	fail 'connected-device Dashboard loading must not schedule the 15-second poll'

grep -Fq 'export function useConnectedDevices(active: boolean, polling = true)' "$DEVICES_HOOK" || \
	fail 'connected-device hook must support one-shot Dashboard loading'

grep -Fq '...(polling ? { pollInterval: REFRESH_INTERVAL_MS } : {}),' "$DEVICES_HOOK" || \
	fail 'connected-device Dashboard loading must omit pollInterval when polling is disabled'

grep -Fq 'export function useSafeShieldStatistics(active: boolean, polling = true)' "$STATISTICS_HOOK" || \
	fail 'SafeShield statistics hook must support one-shot Dashboard loading'
grep -Fq '...(polling ? { pollInterval: STATISTICS_REFRESH_INTERVAL_MS } : {}),' "$STATISTICS_HOOK" || \
	fail 'SafeShield Dashboard statistics must omit pollInterval when polling is disabled'

for hook in "$DEVICES_HOOK" "$STATISTICS_HOOK"; do
	if grep -Fq 'pollInterval: polling ?' "$hook"; then
		fail "optional polling must omit pollInterval instead of assigning null/undefined: ${hook#$ROOT_DIR/}"
	fi
done

grep -Fq 'title="시스템 개요"' "$HOME" || \
	fail 'Dashboard must use the product-style system overview heading'
grep -Fq 'eyebrow="SafeShield"' "$HOME" || \
	fail 'Dashboard must expose the SafeShield protection summary'
grep -Fq 'eyebrow="Connected devices"' "$HOME" || \
	fail 'Dashboard must expose connected-device information'
grep -Fq 'eyebrow="Software update"' "$HOME" || \
	fail 'Dashboard must expose software update information'
grep -Fq 'title="네트워크 보호 활동"' "$HOME" || \
	fail 'Dashboard must expose the network protection activity section'
grep -Fq '<DashboardSafeShieldActivity' "$HOME" || \
	fail 'Dashboard must render SafeShield activity visualization'
grep -Fq 'title="시스템 상태"' "$HOME" || \
	fail 'Dashboard must expose the system health section'
grep -Fq 'title="최근 상태 확인"' "$HOME" || \
	fail 'Dashboard must expose freshness information'
grep -Fq 'formatLoadAverage(data.runtime.load[1])' "$HOME" || \
	fail 'Dashboard must show the 5-minute load average'
grep -Fq 'formatLoadAverage(data.runtime.load[2])' "$HOME" || \
	fail 'Dashboard must show the 15-minute load average'
grep -Fq 'value={data.network.ipv4Address || '\''할당되지 않음'\''}' "$HOME" || \
	fail 'Dashboard device details must include the WAN address'

grep -Fq "import { SafeShieldBlockedBarChart } from './SafeShieldBlockedBarChart';" "$ACTIVITY" || \
	fail 'Dashboard must reuse the existing SafeShield Chart.js bar chart'
grep -Fq 'const DISPLAY_HOURS = 24;' "$ACTIVITY" || \
	fail 'Dashboard SafeShield activity must use a 24-hour window'
grep -Fq '<SafeShieldBlockedBarChart buckets={buckets} />' "$ACTIVITY" || \
	fail 'Dashboard must chart hourly blocked requests'
grep -Fq 'DNS 요청' "$ACTIVITY" || \
	fail 'Dashboard SafeShield activity must show DNS query totals'
grep -Fq '차단율' "$ACTIVITY" || \
	fail 'Dashboard SafeShield activity must show the block rate'

echo 'PASS: dashboard overview, SafeShield activity chart and one-shot summary loading are consistent'
