#!/bin/sh
set -eu
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
HELPER="$ROOT/root/usr/libexec/smartsafehub-device"
RPC="$ROOT/root/usr/share/rpcd/ucode/smartsafehub/device-registration.uc"
MAIN="$ROOT/root/usr/share/rpcd/ucode/smartsafehub.uc"
grep -Fq 'devices/sync' "$HELPER"
grep -Fq 'devices/pairing-sessions' "$HELPER"
grep -Fq 'devices/credentials/rotate' "$HELPER"
grep -Fq 'Authorization: Device' "$HELPER"
grep -Fq 'device_registration_status' "$MAIN"
grep -Fq 'device_pairing_refresh' "$MAIN"
grep -Fq 'refresh_device_pairing' "$RPC"
! grep -Fq 'license_activate' "$MAIN"
! grep -Fq 'smartsafehub-license' "$ROOT/Makefile"
echo 'device registration contract: ok'

grep -Fq '/etc/smartsafehub/device-credential.json' "$HELPER"
grep -Fq 'devices/bootstrap' "$HELPER"
grep -Fq 'ensure_local_credential' "$HELPER"
grep -Fq 'DEVICE_BOOTSTRAP_UNAVAILABLE' "$HELPER"
grep -Fq 'retry_delay' "$HELPER"
grep -Fq 'devices/credentials/rotate' "$HELPER"

grep -Fq 'random % 1201 - 600' "$HELPER"
grep -Fq 'MAX_RETRY_S=3600' "$HELPER"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT INT TERM
CREDENTIAL_FILE="$TMP_DIR/device-credential.json"
RUNTIME_DIR="$TMP_DIR/runtime"
mkdir -p "$RUNTIME_DIR"

SMARTSAFEHUB_DEVICE_RUNTIME_DIR="$RUNTIME_DIR" \
SMARTSAFEHUB_DEVICE_STATE_FILE="$RUNTIME_DIR/device.json" \
SMARTSAFEHUB_DEVICE_CREDENTIAL_FILE="$CREDENTIAL_FILE" \
SMARTSAFEHUB_DEVICE_UBUS_BIN=/bin/false \
"$HELPER" bootstrap >/dev/null 2>&1 || true

[ -f "$CREDENTIAL_FILE" ] || {
	echo 'device credential must be persisted before bootstrap depends on SafeShield or Hub availability' >&2
	exit 1
}
grep -Eq '"device_uuid":null' "$CREDENTIAL_FILE"
grep -Eq '"token":"ssh_dev_[0-9a-f]{64}"' "$CREDENTIAL_FILE"
