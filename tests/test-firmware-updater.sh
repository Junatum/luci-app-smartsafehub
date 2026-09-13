#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-or-later
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
FIRMWARE="$ROOT_DIR/root/usr/libexec/smartsafehub-firmware"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT INT TERM

fail() {
	echo "FAIL: $*" >&2
	exit 1
}

assert_contains() {
	file="$1"
	needle="$2"
	grep -F -- "$needle" "$file" >/dev/null 2>&1 || fail "$file does not contain: $needle"
}

mkdir -p "$TMP/bin" "$TMP/sysinfo" "$TMP/repo"
printf '%s\n' 'iptime,ax3000sm' > "$TMP/sysinfo/board_name"
printf '%s\n' 'https://repo.smartsafehub.com/stable/packages/aarch64_cortex-a53/smartsafehub/packages.adb' > "$TMP/repo/smartsafehub.list"
printf '%s' 'mock-sysupgrade-image-v1' > "$TMP/server-image.bin"
IMAGE_SIZE="$(wc -c < "$TMP/server-image.bin" | tr -d '[:space:]')"
IMAGE_SHA="$(sha256sum "$TMP/server-image.bin" | awk '{ print $1 }')"

cat > "$TMP/resolve.json" <<EOF2
{
  "schema": 1,
  "device_code": "iptime-ax3000sm",
  "channel": "stable",
  "current_build_id": "",
  "update_available": true,
  "release": {
    "id": 21,
    "build_id": "20260913T070000Z-test1234",
    "version": "2026.09.13",
    "device_code": "iptime-ax3000sm",
    "channel": "stable",
    "target": "mediatek/filogic",
    "profile": "iptime_ax3000sm",
    "openwrt_version": "25.12.4",
    "published_at": "2026-09-13T07:00:00Z",
    "release_notes": ["Firmware test release"],
    "sysupgrade": {
      "id": 99,
      "filename": "openwrt-iptime-ax3000sm-sysupgrade.bin",
      "size_bytes": $IMAGE_SIZE,
      "sha256": "$IMAGE_SHA",
      "download_url": "https://www.smartsafehub.com/firmware/download/99/"
    }
  }
}
EOF2

cat > "$TMP/bin/uci" <<'EOF2'
#!/bin/sh
set -eu
[ "${1:-}" = '-q' ] && shift
case "${1:-}" in
	get)
		case "${2:-}" in
			smartsafehub.firmware.check_enabled) echo 1 ;;
			smartsafehub.firmware.check_interval_s) echo 21600 ;;
			smartsafehub.firmware.api_base_url) echo 'https://www.smartsafehub.com/api/v1' ;;
			*) exit 1 ;;
		esac
		;;
	set|commit) exit 0 ;;
	*) exit 1 ;;
esac
EOF2
chmod +x "$TMP/bin/uci"

cat > "$TMP/bin/jsonfilter" <<'EOF2'
#!/bin/sh
set -eu
input=''
expression=''
while [ "$#" -gt 0 ]; do
	case "$1" in
		-i) input="$2"; shift 2 ;;
		-e) expression="$2"; shift 2 ;;
		*) shift ;;
	esac
done
[ -n "$input" ] && [ -n "$expression" ] || exit 1
jq_expression="${expression#@}"
jq -r "$jq_expression | if . == null then empty else . end" "$input"
EOF2
chmod +x "$TMP/bin/jsonfilter"

cat > "$TMP/bin/uclient-fetch" <<'EOF2'
#!/bin/sh
set -eu
output=''
body=''
url=''
while [ "$#" -gt 0 ]; do
	case "$1" in
		-q) shift ;;
		-T) shift 2 ;;
		--method=POST) shift ;;
		--body-file=*) body="${1#--body-file=}"; shift ;;
		--header=*) shift ;;
		-O) output="$2"; shift 2 ;;
		*) url="$1"; shift ;;
	esac
done
printf '%s\n' "$url" >> "${MOCK_FETCH_LOG:?}"
case "$url" in
	*/api/v1/firmware/resolve)
		[ -n "$body" ] || exit 1
		[ "${MOCK_FAIL_RESOLVE:-0}" = '1' ] && exit 1
		cp "$body" "${MOCK_REQUEST_CAPTURE:?}"
		cp "${MOCK_RESOLVE_FILE:?}" "$output"
		;;
	*/firmware/download/99/)
		cp "${MOCK_SERVER_IMAGE:?}" "$output"
		;;
	*) exit 1 ;;
esac
EOF2
chmod +x "$TMP/bin/uclient-fetch"

cat > "$TMP/bin/ubus" <<'EOF2'
#!/bin/sh
set -eu
printf '%s\n' "$*" >> "${MOCK_UBUS_LOG:?}"
printf '%s\n' '{"valid":true,"allow_backup":true}'
EOF2
chmod +x "$TMP/bin/ubus"

cat > "$TMP/bin/sysupgrade" <<'EOF2'
#!/bin/sh
set -eu
printf '%s\n' "$*" >> "${MOCK_SYSUPGRADE_LOG:?}"
[ "${1:-}" = '--test' ] || exit 99
[ -s "${2:-}" ]
EOF2
chmod +x "$TMP/bin/sysupgrade"

export MOCK_FETCH_LOG="$TMP/fetch.log"
export MOCK_REQUEST_CAPTURE="$TMP/request.json"
export MOCK_RESOLVE_FILE="$TMP/resolve.json"
export MOCK_SERVER_IMAGE="$TMP/server-image.bin"
export MOCK_UBUS_LOG="$TMP/ubus.log"
export MOCK_SYSUPGRADE_LOG="$TMP/sysupgrade.log"
export SMARTSAFEHUB_FIRMWARE_STATE_FILE="$TMP/firmware.state"
export SMARTSAFEHUB_FIRMWARE_RESOLVE_FILE="$TMP/resolved.json"
export SMARTSAFEHUB_FIRMWARE_IMAGE_FILE="$TMP/firmware.bin"
export SMARTSAFEHUB_FIRMWARE_LOCK_DIR="$TMP/firmware.lock"
export SMARTSAFEHUB_FIRMWARE_METADATA_FILE="$TMP/missing-firmware.json"
export SMARTSAFEHUB_FIRMWARE_BOARD_NAME_FILE="$TMP/sysinfo/board_name"
export SMARTSAFEHUB_FIRMWARE_REPOSITORY_FILE="$TMP/repo/smartsafehub.list"
export SMARTSAFEHUB_FIRMWARE_UCI_BIN="$TMP/bin/uci"
export SMARTSAFEHUB_FIRMWARE_UCLIENT_FETCH_BIN="$TMP/bin/uclient-fetch"
export SMARTSAFEHUB_FIRMWARE_JSONFILTER_BIN="$TMP/bin/jsonfilter"
export SMARTSAFEHUB_FIRMWARE_SHA256SUM_BIN="$(command -v sha256sum)"
export SMARTSAFEHUB_FIRMWARE_UBUS_BIN="$TMP/bin/ubus"
export SMARTSAFEHUB_FIRMWARE_SYSUPGRADE_BIN="$TMP/bin/sysupgrade"

"$FIRMWARE" check
jq -e '.schema == 1 and .device_code == "iptime-ax3000sm" and .channel == "stable" and .current_build_id == ""' "$TMP/request.json" >/dev/null || \
	fail 'resolve request must contain schema, exact device code, channel and current build id'
assert_contains "$TMP/fetch.log" 'https://www.smartsafehub.com/api/v1/firmware/resolve'
TAB="$(printf '\t')"
assert_contains "$TMP/firmware.state" "phase${TAB}idle"

# A resolved release for another model/channel must never be prepared.
jq '.release.device_code = "xiaomi-ax3000t"' "$TMP/resolved.json" > "$TMP/resolved-mismatch.json"
mv "$TMP/resolved-mismatch.json" "$TMP/resolved.json"
if "$FIRMWARE" prepare; then
	fail 'resolved firmware for another device must be rejected'
fi
assert_contains "$TMP/firmware.state" "error_code${TAB}FIRMWARE_RELEASE_MISMATCH"

# A failed refresh must invalidate the previous resolve document so a stale
# release cannot still be prepared after a server/network failure.
cp "$TMP/resolve.json" "$TMP/resolved.json"
export MOCK_FAIL_RESOLVE=1
if "$FIRMWARE" check; then
	fail 'failed resolve refresh must return an error'
fi
[ ! -e "$TMP/resolved.json" ] || fail 'failed resolve refresh must remove the stale resolve document'
unset MOCK_FAIL_RESOLVE

# Refresh restores the authoritative response before the normal prepare flow.
"$FIRMWARE" check
"$FIRMWARE" prepare
cmp -s "$TMP/server-image.bin" "$TMP/firmware.bin" || fail 'prepared firmware differs from downloaded image'
assert_contains "$TMP/firmware.state" "phase${TAB}ready"
assert_contains "$TMP/firmware.state" "source${TAB}online"
assert_contains "$TMP/firmware.state" "prepared_sha256${TAB}$IMAGE_SHA"
assert_contains "$TMP/firmware.state" "allow_backup${TAB}1"
assert_contains "$TMP/firmware.state" "target_build_id${TAB}20260913T070000Z-test1234"
assert_contains "$TMP/ubus.log" 'call system validate_firmware_image'
assert_contains "$TMP/sysupgrade.log" "--test $TMP/firmware.bin"

# Installation re-checks the SHA-256 before starting sysupgrade.
printf 'tampered' >> "$TMP/firmware.bin"
if "$FIRMWARE" install 1; then
	fail 'tampered prepared image must be rejected before flashing'
fi
assert_contains "$TMP/firmware.state" "error_code${TAB}FIRMWARE_CHECKSUM_MISMATCH"

# Manual uploads use the same OpenWrt validation and sysupgrade --test path.
cp "$TMP/server-image.bin" "$TMP/firmware.bin"
"$FIRMWARE" validate-upload 'manual-test.bin'
assert_contains "$TMP/firmware.state" "phase${TAB}ready"
assert_contains "$TMP/firmware.state" "source${TAB}manual"
assert_contains "$TMP/firmware.state" "filename${TAB}manual-test.bin"
assert_contains "$TMP/firmware.state" "allow_backup${TAB}1"

# Cleaning a prepared image must remove the temporary binary and return to idle.
"$FIRMWARE" clean
[ ! -e "$TMP/firmware.bin" ] || fail 'clean must remove the prepared firmware image'
assert_contains "$TMP/firmware.state" "phase${TAB}idle"

# Safety contract: SmartSafeHub never enables forced sysupgrade.
if grep -Eq '"\$SYSUPGRADE_BIN"[^\n]*(--force|-F)' "$FIRMWARE"; then
	fail 'firmware helper must not offer forced sysupgrade'
fi

echo 'PASS: firmware resolve, download integrity, OpenWrt validation, manual upload and cleanup paths are safe'
