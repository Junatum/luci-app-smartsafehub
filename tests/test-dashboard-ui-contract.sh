#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-or-later
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
APP="$ROOT_DIR/frontend/src/app/App.tsx"
HOME="$ROOT_DIR/frontend/src/pages/HomePage.tsx"
DEVICES_HOOK="$ROOT_DIR/frontend/src/hooks/useConnectedDevices.ts"

fail() {
	echo "FAIL: $*" >&2
	exit 1
}

for file in "$APP" "$HOME" "$DEVICES_HOOK"; do
	[ -f "$file" ] || fail "missing dashboard source: ${file#$ROOT_DIR/}"
done

grep -Fq "const dashboardDevices = useConnectedDevices(route === 'home', false);" "$APP" || \
	fail 'Dashboard connected-device summary must disable periodic polling'
grep -Fq "const dashboardSafeShield = useSafeShieldStatus(route === 'home');" "$APP" || \
	fail 'Dashboard must load SafeShield status'
grep -Fq 'devices={dashboardDevices.data}' "$APP" || \
	fail 'Dashboard must receive the connected-device summary'
grep -Fq 'safeshield={dashboardSafeShield.data}' "$APP" || \
	fail 'Dashboard must receive SafeShield status'
grep -Fq 'dashboardDevices.refresh()' "$APP" || \
	fail 'Dashboard refresh must refresh connected-device information'
grep -Fq 'dashboardSafeShield.refresh()' "$APP" || \
	fail 'Dashboard refresh must refresh SafeShield information'
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

if grep -Fq 'pollInterval: polling ? REFRESH_INTERVAL_MS : null' "$DEVICES_HOOK"; then
	fail 'connected-device hook must not pass null as pollInterval'
fi

if grep -Fq 'pollInterval: polling ? REFRESH_INTERVAL_MS : undefined' "$DEVICES_HOOK"; then
	fail 'connected-device hook must not explicitly pass undefined as pollInterval'
fi

grep -Fq 'title="시스템 개요"' "$HOME" || \
	fail 'Dashboard must use the product-style system overview heading'
grep -Fq 'eyebrow="SafeShield"' "$HOME" || \
	fail 'Dashboard must expose the SafeShield protection summary'
grep -Fq 'eyebrow="Connected devices"' "$HOME" || \
	fail 'Dashboard must expose connected-device information'
grep -Fq 'eyebrow="Software update"' "$HOME" || \
	fail 'Dashboard must expose software update information'
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

echo 'PASS: dashboard overview, useful status data and low-frequency summary loading are consistent'
