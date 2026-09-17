#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-or-later
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
APP="$ROOT_DIR/frontend/src/app/App.tsx"
HOME="$ROOT_DIR/frontend/src/pages/HomePage.tsx"
ACTIVITY="$ROOT_DIR/frontend/src/components/DashboardSafeShieldActivity.tsx"
DEVICES_HOOK="$ROOT_DIR/frontend/src/hooks/useConnectedDevices.ts"
STATISTICS_HOOK="$ROOT_DIR/frontend/src/hooks/useSafeShieldStatistics.ts"
FORMAT="$ROOT_DIR/frontend/src/app/format.ts"

fail() {
	echo "FAIL: $*" >&2
	exit 1
}

for file in "$APP" "$HOME" "$ACTIVITY" "$DEVICES_HOOK" "$STATISTICS_HOOK" "$FORMAT"; do
	[ -f "$file" ] || fail "missing dashboard source: ${file#$ROOT_DIR/}"
done

grep -Fq "const dashboardDevices = useConnectedDevices(route === 'home', false);" "$APP" || \
	fail 'Dashboard connected-device summary must disable periodic polling'
grep -Fq "const dashboardSafeShield = useSafeShieldStatus(route === 'home');" "$APP" || \
	fail 'Dashboard must load SafeShield status'
grep -Fq "const dashboardSafeShieldStatistics = useSafeShieldStatistics(route === 'home', false);" "$APP" || \
	fail 'Dashboard SafeShield statistics must disable periodic polling'
grep -Fq "route === 'system' || route === 'home' || route === 'settings'" "$APP" || \
	fail 'Dashboard and Settings must load cached SmartSafeHub firmware identity'
grep -Fq 'devices={dashboardDevices.data}' "$APP" || \
	fail 'Dashboard must receive the connected-device summary'
grep -Fq 'safeshield={dashboardSafeShield.data}' "$APP" || \
	fail 'Dashboard must receive SafeShield status'
grep -Fq 'statistics={dashboardSafeShieldStatistics.data}' "$APP" || \
	fail 'Dashboard must receive SafeShield statistics'
grep -Fq 'firmware={firmware.data}' "$APP" || \
	fail 'Dashboard must receive SmartSafeHub firmware status'
grep -Fq 'dashboardDevices.refresh()' "$APP" || \
	fail 'Dashboard refresh must refresh connected-device information'
grep -Fq 'dashboardSafeShield.refresh()' "$APP" || \
	fail 'Dashboard refresh must refresh SafeShield information'
grep -Fq 'dashboardSafeShieldStatistics.refresh()' "$APP" || \
	fail 'Dashboard refresh must refresh SafeShield statistics'
grep -Fq 'updates.refresh()' "$APP" || \
	fail 'Dashboard refresh must refresh update information'
grep -Fq 'firmware.refresh()' "$APP" || \
	fail 'Dashboard refresh must refresh firmware identity information'

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
if grep -Fq 'title="최근 상태 확인"' "$HOME" || grep -Fq 'dashboard-freshness-title' "$HOME"; then
	fail 'Dashboard must not keep a separate freshness section'
fi
grep -Fq 'formatRelativeTime(timestamp, nowTimestamp)' "$HOME" || \
	fail 'Dashboard overview cards must render relative freshness timestamps'
grep -Fq "safeShieldStale ? '차단 목록 갱신 지연' : '차단 목록 갱신'" "$HOME" || \
	fail 'SafeShield overview must own its freshness metadata and stale warning'
grep -Fq "devicesStale ? '목록 갱신 권장' : '목록 확인'" "$HOME" || \
	fail 'connected-device overview must own its freshness metadata and stale warning'
grep -Fq "updatesStale ? '업데이트 확인 지연' : '마지막 확인'" "$HOME" || \
	fail 'software-update overview must own its freshness metadata and stale warning'
grep -Fq '{label}: {formatRelativeTime(timestamp, nowTimestamp)}' "$HOME" || \
	fail 'Dashboard freshness metadata must separate the label and relative time with a colon'
grep -Fq "updates && !updates.settings.checkEnabled" "$HOME" || \
	fail 'disabled software auto-check must not be reported as stale'
grep -Fq 'const RELATIVE_TIME_TICK_MS = 60_000;' "$HOME" || \
	fail 'Dashboard relative freshness labels must update once per minute without backend polling'
grep -Fq "return '방금 전';" "$FORMAT" || \
	fail 'relative time formatter must expose a just-now state'
grep -Fq 'Math.floor(elapsedSeconds / 60)}분 전' "$FORMAT" || \
	fail 'relative time formatter must expose minute granularity'
grep -Fq 'Math.floor(elapsedSeconds / 3_600)}시간 전' "$FORMAT" || \
	fail 'relative time formatter must expose hour granularity'
grep -Fq 'Math.floor(elapsedSeconds / 86_400)}일 전' "$FORMAT" || \
	fail 'relative time formatter must expose day granularity'
grep -Fq 'formatLoadAverage(data.runtime.load[1])' "$HOME" || \
	fail 'Dashboard must show the 5-minute load average'
grep -Fq 'formatLoadAverage(data.runtime.load[2])' "$HOME" || \
	fail 'Dashboard must show the 15-minute load average'
grep -Fq "const customFirmwareAvailable = Boolean(firmware?.current.metadataAvailable);" "$HOME" || \
	fail 'Dashboard device details must detect SmartSafeHub custom firmware metadata'
grep -Fq '`SmartSafeHub ${firmware.current.releaseVersion}`' "$HOME" || \
	fail 'Dashboard device details must prefer the SmartSafeHub product firmware version'
grep -Fq "firmware?.current.buildId || data.software.revision" "$HOME" || \
	fail 'Dashboard device details must prefer the immutable SmartSafeHub build ID'
grep -Fq "const deviceRevisionLabel = customFirmwareAvailable ? '빌드 ID' : '리비전';" "$HOME" || \
	fail 'Dashboard must label custom firmware identity as build ID and preserve OpenWrt revision fallback'
grep -Fq '`${data.software.distribution} ${data.software.version}`' "$HOME" || \
	fail 'Dashboard device details must retain OpenWrt firmware fallback for legacy images'
grep -Fq '<DetailRow label="커널" value={data.software.kernel} />' "$HOME" || \
	fail 'Dashboard device details must keep the actual running kernel version'
grep -Fq 'value={data.network.ipv4Address || '\''할당되지 않음'\''}' "$HOME" || \
	fail 'Dashboard device details must include the WAN address'

grep -Fq 'aria-label={`메모리 사용률 ${memoryPercent}%`}' "$HOME" || \
	fail 'Dashboard memory card must expose its utilization progress bar'
grep -Fq 'class="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200"' "$HOME" || \
	fail 'Dashboard memory progress bar must stay inside the compact memory card'
if grep -Fq '<span>메모리 사용률</span>' "$HOME"; then
	fail 'Dashboard must not duplicate memory utilization in a separate block'
fi

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
