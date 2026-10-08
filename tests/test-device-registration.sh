#!/bin/sh
set -eu
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
HELPER="$ROOT/root/usr/libexec/smartsafehub-device"
RPC="$ROOT/root/usr/share/rpcd/ucode/smartsafehub/device-registration.uc"
MAIN="$ROOT/root/usr/share/rpcd/ucode/smartsafehub.uc"
SAFE_PAGE="$ROOT/frontend/src/pages/SafeShieldPage.tsx"
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

# Pairing can bootstrap an unregistered local credential itself, so the UI must
# not deadlock the flow by requiring phase=registered before the user can ask
# for a pairing code. Only an in-flight request should disable the button.
grep -Fq 'disabled={pairingBusy}' "$SAFE_PAGE" || {
	echo 'pairing button must stay available while device bootstrap is pending' >&2
	exit 1
}
if grep -Fq "pairingBusy || deviceRegistration?.phase !== 'registered'" "$SAFE_PAGE"; then
	echo 'pairing button must not require an already-registered phase' >&2
	exit 1
fi
! grep -Fq 'license_activate' "$MAIN"
! grep -Fq 'smartsafehub-license' "$ROOT/Makefile"
echo 'device registration contract: ok'

grep -Fq '/etc/smartsafehub/device-credential.json' "$HELPER"
grep -Fq 'devices/bootstrap' "$HELPER"
grep -Fq 'ensure_local_credential' "$HELPER"
grep -Fq 'credential_device_uuid' "$HELPER"
grep -Fq 'ensure_device_bootstrapped' "$HELPER"
grep -Fq 'prepare_credential' "$HELPER"
grep -Fq 'prepare-credential' "$HELPER"
grep -Fq '"$PROG" prepare-credential' "$INIT"
grep -Fq 'DEVICE_BOOTSTRAP_UNAVAILABLE' "$HELPER"
grep -Fq 'retry_delay' "$HELPER"
grep -Fq 'devices/credentials/rotate' "$HELPER"

grep -Fq 'random % 1201 - 600' "$HELPER"
grep -Fq 'MAX_RETRY_S=3600' "$HELPER"

# A locally prepared token is not a Hub registration. Both sync and pairing must
# ensure bootstrap completed (device_uuid persisted) before authenticated calls.
status_block="$(sed -n '/^status_sync() {/,/^}/p' "$HELPER")"
pairing_block="$(sed -n '/^pairing_session() {/,/^}/p' "$HELPER")"
printf '%s\n' "$status_block" | grep -Fq 'ensure_device_bootstrapped || return 1' || {
	echo 'status sync must bootstrap credentials that do not have a device UUID yet' >&2
	exit 1
}
printf '%s\n' "$pairing_block" | grep -Fq 'ensure_device_bootstrapped || return 1' || {
	echo 'pairing must bootstrap credentials that do not have a device UUID yet' >&2
	exit 1
}

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


# Regression: preparing a local credential must not make the helper skip Hub
# bootstrap. A null device_uuid means the token has not been registered yet.
FLOW_DIR="$TMP_DIR/flow"
FLOW_RUNTIME="$FLOW_DIR/runtime"
FLOW_CREDENTIAL="$FLOW_DIR/device-credential.json"
FLOW_URL_LOG="$FLOW_DIR/urls.log"
FLOW_BOOTSTRAP_BODY="$FLOW_DIR/bootstrap-body.json"
mkdir -p "$FLOW_RUNTIME"
cp "$CREDENTIAL_FILE" "$FLOW_CREDENTIAL"

FAKE_JSONFILTER="$FLOW_DIR/jsonfilter"
cat > "$FAKE_JSONFILTER" <<'EOF'
#!/bin/sh
file=''
expr=''
while [ "$#" -gt 0 ]; do
	case "$1" in
		-i) file="$2"; shift 2 ;;
		-e) expr="$2"; shift 2 ;;
		*) shift ;;
	esac
done
case "$expr" in
	'@.token') sed -n 's/.*"token":"\([^"]*\)".*/\1/p' "$file" ;;
	'@.device_uuid') sed -n 's/.*"device_uuid":"\([^"]*\)".*/\1/p' "$file" ;;
	'@.issued_at') sed -n 's/.*"issued_at":\([0-9][0-9]*\).*/\1/p' "$file" ;;
	'@.device.physical_fingerprint') printf '%064d\n' 0 | tr '0' 'a' ;;
	'@.device.fingerprint_version') echo 1 ;;
	'@.device.identity_provider') echo test ;;
	'@.device.identity_source') echo test ;;
	'@.device.identity_strength') echo strong ;;
	'@.device.identity_profile') echo default ;;
	'@.device.installation_id') echo 11111111-2222-3333-4444-555555555555 ;;
	'@.device.configured.vendor') echo OpenWrt ;;
	'@.device.configured.model') echo TestRouter ;;
	'@.device.configured.arch') echo test_arch ;;
	'@.device.configured.memory_mb') echo 256 ;;
	'@.device.vendor'|'@.device.model'|'@.device.arch'|'@.device.memory_mb') ;;
	'@.version') echo 0.3.24-r2 ;;
	'@.device.device_code') echo test-router ;;
	'@.device.device_code_source') echo test ;;
	'@.device.uuid') echo 11111111-1111-1111-1111-111111111111 ;;
	'@.device.registered') echo false ;;
	'@.entitlement.plan') echo free ;;
	'@.credential.rotation_due') echo false ;;
	'@.pairing_session.code') echo ABCD-EFGH ;;
	'@.pairing_session.expires_at') echo 2026-10-08T12:00:00Z ;;
	'@.lastSuccessAt') sed -n 's/.*"lastSuccessAt":\([0-9][0-9]*\).*/\1/p' "$file" ;;
	'@.pairingCode') sed -n 's/.*"pairingCode":"\([^"]*\)".*/\1/p' "$file" ;;
	'@.pairingExpiresAt') sed -n 's/.*"pairingExpiresAt":"\([^"]*\)".*/\1/p' "$file" ;;
	*) ;;
esac
EOF
chmod +x "$FAKE_JSONFILTER"

FAKE_UBUS="$FLOW_DIR/ubus"
cat > "$FAKE_UBUS" <<'EOF'
#!/bin/sh
cat <<'JSON'
{"device":{"physical_fingerprint":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","fingerprint_version":1,"identity_provider":"test","identity_source":"test","identity_strength":"strong","identity_profile":"default","installation_id":"11111111-2222-3333-4444-555555555555","device_code":"test-router","device_code_source":"test","configured":{"vendor":"OpenWrt","model":"TestRouter","arch":"test_arch","memory_mb":256}},"version":"0.3.24-r2"}
JSON
EOF
chmod +x "$FAKE_UBUS"

FAKE_FETCH="$FLOW_DIR/uclient-fetch"
cat > "$FAKE_FETCH" <<'EOF'
#!/bin/sh
url="$1"
shift
out=''
while [ "$#" -gt 0 ]; do
	case "$1" in
		-O) out="$2"; shift 2 ;;
		*) shift ;;
	esac
done
printf '%s\n' "$url" >> "$SMARTSAFEHUB_TEST_URL_LOG"
case "$url" in
	*/devices/bootstrap)
		cat > "$out" <<'JSON'
{"device":{"uuid":"11111111-1111-1111-1111-111111111111","registered":false},"credential":{"rotate_after":"2027-01-01T00:00:00Z"}}
JSON
		;;
	*/devices/sync)
		cat > "$out" <<'JSON'
{"device":{"uuid":"11111111-1111-1111-1111-111111111111","registered":false},"entitlement":{"plan":"free"},"credential":{"rotation_due":false}}
JSON
		;;
	*/devices/pairing-sessions)
		cat > "$out" <<'JSON'
{"device":{"uuid":"11111111-1111-1111-1111-111111111111","registered":false},"pairing_session":{"code":"ABCD-EFGH","expires_at":"2026-10-08T12:00:00Z"}}
JSON
		;;
	*) exit 1 ;;
esac
EOF
chmod +x "$FAKE_FETCH"

FAKE_CURL="$FLOW_DIR/curl"
cat > "$FAKE_CURL" <<'EOF'
#!/bin/sh
out=''
url=''
body=''
while [ "$#" -gt 0 ]; do
	case "$1" in
		-o) out="$2"; shift 2 ;;
		--data-binary) body="${2#@}"; shift 2 ;;
		-H|--connect-timeout|--max-time) shift 2 ;;
		-f|-s|-S|-fsS) shift ;;
		http://*|https://*) url="$1"; shift ;;
		*) shift ;;
	esac
done
printf '%s\n' "$url" >> "$SMARTSAFEHUB_TEST_URL_LOG"
case "$url" in
	*/devices/bootstrap)
		[ -n "$body" ] && cp "$body" "$SMARTSAFEHUB_TEST_BOOTSTRAP_BODY"
		cat > "$out" <<'JSON'
{"device":{"uuid":"11111111-1111-1111-1111-111111111111","registered":false},"credential":{"rotate_after":"2027-01-01T00:00:00Z"}}
JSON
		;;
	*/devices/sync)
		cat > "$out" <<'JSON'
{"device":{"uuid":"11111111-1111-1111-1111-111111111111","registered":false},"entitlement":{"plan":"free"},"credential":{"rotation_due":false}}
JSON
		;;
	*/devices/pairing-sessions)
		cat > "$out" <<'JSON'
{"device":{"uuid":"11111111-1111-1111-1111-111111111111","registered":false},"pairing_session":{"code":"ABCD-EFGH","expires_at":"2026-10-08T12:00:00Z"}}
JSON
		;;
	*) exit 1 ;;
esac
EOF
chmod +x "$FAKE_CURL"

SMARTSAFEHUB_DEVICE_RUNTIME_DIR="$FLOW_RUNTIME" \
SMARTSAFEHUB_DEVICE_STATE_FILE="$FLOW_RUNTIME/device.json" \
SMARTSAFEHUB_DEVICE_CREDENTIAL_FILE="$FLOW_CREDENTIAL" \
SMARTSAFEHUB_DEVICE_JSONFILTER_BIN="$FAKE_JSONFILTER" \
SMARTSAFEHUB_DEVICE_UBUS_BIN="$FAKE_UBUS" \
SMARTSAFEHUB_DEVICE_UCLIENT_FETCH_BIN="$FAKE_FETCH" \
SMARTSAFEHUB_TEST_URL_LOG="$FLOW_URL_LOG" \
SMARTSAFEHUB_TEST_BOOTSTRAP_BODY="$FLOW_BOOTSTRAP_BODY" \
PATH="$FLOW_DIR:$PATH" \
"$HELPER" status-sync >/dev/null 2>&1

grep -Fq '/devices/bootstrap' "$FLOW_URL_LOG" || {
	echo 'status sync must bootstrap a locally prepared credential before device sync' >&2
	exit 1
}
grep -Fq '/devices/sync' "$FLOW_URL_LOG" || {
	echo 'status sync must continue with device sync after bootstrap succeeds' >&2
	exit 1
}
grep -Fq '"device_uuid":"11111111-1111-1111-1111-111111111111"' "$FLOW_CREDENTIAL" || {
	echo 'successful bootstrap must persist the Hub device UUID' >&2
	exit 1
}
[ -f "$FLOW_BOOTSTRAP_BODY" ] || {
	echo 'bootstrap request body must be captured' >&2
	exit 1
}
grep -Fq '"vendor":"OpenWrt"' "$FLOW_BOOTSTRAP_BODY" || {
	echo 'bootstrap must read vendor from the SafeShield device.configured schema' >&2
	exit 1
}
grep -Fq '"model":"TestRouter"' "$FLOW_BOOTSTRAP_BODY" || {
	echo 'bootstrap must read model from the SafeShield device.configured schema' >&2
	exit 1
}
grep -Fq '"arch":"test_arch"' "$FLOW_BOOTSTRAP_BODY" || {
	echo 'bootstrap must read arch from the SafeShield device.configured schema' >&2
	exit 1
}
grep -Fq '"memory_mb":256' "$FLOW_BOOTSTRAP_BODY" || {
	echo 'bootstrap must read memory from the SafeShield device.configured schema' >&2
	exit 1
}

SMARTSAFEHUB_DEVICE_RUNTIME_DIR="$FLOW_RUNTIME" \
SMARTSAFEHUB_DEVICE_STATE_FILE="$FLOW_RUNTIME/device.json" \
SMARTSAFEHUB_DEVICE_CREDENTIAL_FILE="$FLOW_CREDENTIAL" \
SMARTSAFEHUB_DEVICE_JSONFILTER_BIN="$FAKE_JSONFILTER" \
SMARTSAFEHUB_DEVICE_UBUS_BIN="$FAKE_UBUS" \
SMARTSAFEHUB_DEVICE_UCLIENT_FETCH_BIN="$FAKE_FETCH" \
SMARTSAFEHUB_TEST_URL_LOG="$FLOW_URL_LOG" \
PATH="$FLOW_DIR:$PATH" \
"$HELPER" pairing-session >/dev/null 2>&1

grep -Fq '/devices/pairing-sessions' "$FLOW_URL_LOG" || {
	echo 'pairing session must use the registered device credential' >&2
	exit 1
}
grep -Fq '"pairingCode":"ABCD-EFGH"' "$FLOW_RUNTIME/device.json" || {
	echo 'pairing session response must be persisted for the router UI' >&2
	exit 1
}
