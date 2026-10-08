#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-or-later
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
PAGE="$ROOT_DIR/frontend/src/pages/SmartSafeHubAccountPage.tsx"
HOOK="$ROOT_DIR/frontend/src/hooks/useDeviceRegistration.ts"
APP="$ROOT_DIR/frontend/src/app/App.tsx"
API="$ROOT_DIR/frontend/src/api/smartsafehub.ts"
RPC="$ROOT_DIR/root/usr/share/rpcd/ucode/smartsafehub/device-registration.uc"
ACL="$ROOT_DIR/root/usr/share/rpcd/acl.d/luci-app-smartsafehub.json"

fail() { echo "FAIL: $*" >&2; exit 1; }

for file in "$PAGE" "$HOOK" "$APP" "$API" "$RPC" "$ACL"; do
	[ -f "$file" ] || fail "missing account source: ${file#$ROOT_DIR/}"
done

grep -Fq '<SmartSafeHubAccountPage' "$APP" || fail 'App must render the dedicated SmartSafeHub account page'
grep -Fq "route === 'account'" "$APP" || fail 'account data hook must only be enabled on the account route'
grep -Fq "callApi(API_OBJECT, 'device_registration_refresh'" "$API" || fail 'frontend must expose explicit account status synchronization'
grep -Fq 'refresh_device_registration_status' "$RPC" || fail 'rpcd must execute device status-sync for fresh account state'
grep -Fq '"device_registration_refresh"' "$ACL" || fail 'ACL must allow authenticated account status refresh'
grep -Fq 'const PAIRING_POLL_INTERVAL_MS = 5_000;' "$HOOK" || fail 'pairing status must poll every five seconds while waiting'
grep -Fq 'pairingStillValid(data)' "$HOOK" || fail 'polling must only run while a pairing session is active'
grep -Fq 'refreshDeviceRegistrationStatus().catch(() => null)' "$HOOK" || fail 'page entry must verify cached registration state with Hub'
grep -Fq 'if (loading) return <LoadingPanel />;' "$PAGE" || fail 'cached pairing code must not flash before initial Hub verification'
grep -Fq 'const connected = status?.accountRegistered === true;' "$PAGE" || fail 'page must derive explicit account connection state'
grep -Fq 'const pairingCode = !connected && !expired ? status?.pairingCode : null;' "$PAGE" || fail 'connected devices must never display a stale pairing code'
grep -Fq 'SmartSafeHub 계정에 연결됨' "$PAGE" || fail 'connected state must be clearly communicated'
grep -Fq '계정 연결 코드 복사' "$PAGE" || fail 'pairing code must keep an accessible copy action'
grep -Fq "navigator.clipboard?.writeText" "$PAGE" || fail 'pairing copy must use the modern clipboard API when available'
grep -Fq "document.execCommand('copy')" "$PAGE" || fail 'pairing copy must keep an HTTP-router fallback'
grep -Fq '웹사이트에서 기기 관리' "$PAGE" || fail 'connected devices must link to website device management'

echo 'PASS: SmartSafeHub account UI contract is present'
