#!/bin/sh
set -eu
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
HELPER="$ROOT/root/usr/libexec/smartsafehub-device"
RPC="$ROOT/root/usr/share/rpcd/ucode/smartsafehub/device-registration.uc"
MAIN="$ROOT/root/usr/share/rpcd/ucode/smartsafehub.uc"
INIT="$ROOT/root/etc/init.d/smartsafehub-device"
grep -Fq 'devices/sync' "$HELPER"
grep -Fq 'devices/pairing-sessions' "$HELPER"
grep -Fq 'devices/credentials/rotate' "$HELPER"

grep -Fq 'SMARTSAFEHUB_DEVICE_HEXDUMP_BIN' "$HELPER"
grep -Fq 'hexdump' "$HELPER"
if grep -Eq '(^|[^[:alnum:]_])od[[:space:]]' "$HELPER"; then
	echo 'device helper must not depend on the non-default OpenWrt BusyBox od applet' >&2
	exit 1
fi
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
grep -Fq 'prepare_credential' "$HELPER"
grep -Fq 'prepare-credential' "$HELPER"
grep -Fq '"$PROG" prepare-credential' "$INIT"
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

HEXDUMP_BIN="$(command -v hexdump 2>/dev/null || true)"
if [ -z "$HEXDUMP_BIN" ] && command -v busybox >/dev/null 2>&1; then
	HEXDUMP_BIN="$TMP_DIR/hexdump"
	cat > "$HEXDUMP_BIN" <<'EOF'
#!/bin/sh
exec busybox hexdump "$@"
EOF
	chmod +x "$HEXDUMP_BIN"
fi
[ -n "$HEXDUMP_BIN" ] || { echo 'hexdump is required for device credential test' >&2; exit 1; }

SMARTSAFEHUB_DEVICE_RUNTIME_DIR="$RUNTIME_DIR" \
SMARTSAFEHUB_DEVICE_STATE_FILE="$RUNTIME_DIR/device.json" \
SMARTSAFEHUB_DEVICE_CREDENTIAL_FILE="$CREDENTIAL_FILE" \
SMARTSAFEHUB_DEVICE_HEXDUMP_BIN="$HEXDUMP_BIN" \
"$HELPER" prepare-credential >/dev/null 2>&1

[ -f "$CREDENTIAL_FILE" ] || {
	echo 'device credential must be created immediately during service preparation' >&2
	exit 1
}
rm -f "$CREDENTIAL_FILE"

SMARTSAFEHUB_DEVICE_RUNTIME_DIR="$RUNTIME_DIR" \
SMARTSAFEHUB_DEVICE_STATE_FILE="$RUNTIME_DIR/device.json" \
SMARTSAFEHUB_DEVICE_CREDENTIAL_FILE="$CREDENTIAL_FILE" \
SMARTSAFEHUB_DEVICE_HEXDUMP_BIN="$HEXDUMP_BIN" \
SMARTSAFEHUB_DEVICE_UBUS_BIN=/bin/false \
"$HELPER" bootstrap >/dev/null 2>&1 || true

[ -f "$CREDENTIAL_FILE" ] || {
	echo 'device credential must be persisted before bootstrap depends on SafeShield or Hub availability' >&2
	exit 1
}
grep -Eq '"device_uuid":null' "$CREDENTIAL_FILE"
grep -Eq '"token":"ssh_dev_[0-9a-f]{64}"' "$CREDENTIAL_FILE"
