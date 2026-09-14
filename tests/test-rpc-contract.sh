#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-or-later
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
RPC_ENTRY="$ROOT_DIR/root/usr/share/rpcd/ucode/smartsafehub.uc"
UPDATES_MODULE="$ROOT_DIR/root/usr/share/rpcd/ucode/smartsafehub/updates.uc"
FIRMWARE_MODULE="$ROOT_DIR/root/usr/share/rpcd/ucode/smartsafehub/firmware.uc"
FIRMWARE_HELPER="$ROOT_DIR/root/usr/libexec/smartsafehub-firmware"
UPDATER="$ROOT_DIR/root/usr/libexec/smartsafehub-updater"
ACL="$ROOT_DIR/root/usr/share/rpcd/acl.d/luci-app-smartsafehub.json"

fail() {
	echo "FAIL: $*" >&2
	exit 1
}

assert_rpc_method() {
	method="$1"
	grep -Eq "^[[:space:]]*${method}:[[:space:]]*\\{" "$RPC_ENTRY" || \
		fail "rpc method is not registered: $method"
}

assert_acl_method() {
	access="$1"
	method="$2"
	jq -e --arg access "$access" --arg method "$method" \
		'.["luci-app-smartsafehub"][$access].ubus.smartsafehub | index($method) != null' \
		"$ACL" >/dev/null || fail "$method is missing from $access ACL"
}

for method in updates_status updates_check updates_install updates_settings_update \
	firmware_status firmware_check firmware_prepare firmware_validate_upload firmware_install firmware_discard \
	system_time_settings system_timezone_update; do
	assert_rpc_method "$method"
done

jq -e \
	'.["luci-app-smartsafehub"].read.ubus.safeshield | index("statistics") != null' \
	"$ACL" >/dev/null || fail 'safeshield statistics is missing from read ACL'

assert_acl_method read updates_status
assert_acl_method write updates_check
assert_acl_method write updates_install
assert_acl_method write updates_settings_update
assert_acl_method read firmware_status
for method in firmware_check firmware_prepare firmware_validate_upload firmware_install firmware_discard; do
	assert_acl_method write "$method"
done
assert_acl_method read system_time_settings
assert_acl_method write system_timezone_update

jq -e '."luci-app-smartsafehub".write."cgi-io" | index("upload") != null' "$ACL" >/dev/null || \
	fail 'firmware upload must be allowed through cgi-io upload ACL'
jq -e '."luci-app-smartsafehub".write.file["/tmp/smartsafehub-firmware.bin"] | index("write") != null' "$ACL" >/dev/null || \
	fail 'firmware upload ACL must only grant write access to the dedicated temporary image path'

jq -e \
	'.["luci-app-smartsafehub"].write.ubus.smartsafehub | index("updates_status") == null' \
	"$ACL" >/dev/null || fail 'updates_status should remain read-only'

grep -Fq "const UPDATE_PACKAGE = 'luci-app-smartsafehub';" "$UPDATES_MODULE" || \
	fail 'ucode updater target must be luci-app-smartsafehub'
grep -Fq 'UPDATE_PACKAGE="luci-app-smartsafehub"' "$UPDATER" || \
	fail 'shell updater target must be luci-app-smartsafehub'
grep -Fq 'SAFESHIELD_PACKAGE="safeshield"' "$UPDATER" || \
	fail 'shell updater must manage SafeShield dependency identity pins'
grep -Fq "const RELEASE_NOTES_FILE = '/tmp/smartsafehub-release-notes.json';" "$UPDATES_MODULE" || \
	fail 'rpc update status must read the release-note bundle cache'
grep -Fq 'state.releaseNotes = release_notes.notes;' "$UPDATES_MODULE" || \
	fail 'updates_status must expose validated release note metadata'
grep -Fq 'state.releaseNotesComplete = release_notes.complete;' "$UPDATES_MODULE" || \
	fail 'updates_status must expose release-note completeness'
grep -Fq "const UPDATE_REPOSITORY_FILE = '/etc/apk/repositories.d/smartsafehub.list';" "$UPDATES_MODULE" || \
	fail 'updates_status must read the SmartSafeHub repository file for channel metadata'
grep -Fq 'channel: channel,' "$UPDATES_MODULE" || \
	fail 'updates_status must expose the current SmartSafeHub update channel'
grep -Fq "autoInstall: boolean_option(section?.auto_install, channel == 'stable')" "$UPDATES_MODULE" || \
	fail 'new stable installations must default software auto-install on while beta defaults off'
grep -Fq 'AUTO_INSTALL="$(default_auto_install)"' "$UPDATER" || \
	fail 'shell updater must use the channel-aware auto-install default when UCI has no explicit choice'
grep -Fq 'refresh_release_notes "$packages_file"' "$UPDATER" || \
	fail 'updater must refresh display-only release notes after package checks'
grep -Fq 'collect_packages_with_live_installed "$packages_file"' "$UPDATER" || \
	fail 'failed APK index refresh must reconcile live installed state before reusing cached update metadata'
grep -Fq 'preserve_release_notes_cache_or_remove' "$UPDATER" || \
	fail 'temporary release-note failures must preserve a matching last-known-good cache'
grep -Fq '/releases/${UPDATE_PACKAGE}/index.json' "$UPDATER" || \
	fail 'updater must consult the release index before selecting skipped releases'

grep -Fq "const FIRMWARE_HELPER = '/usr/libexec/smartsafehub-firmware';" "$FIRMWARE_MODULE" || \
	fail 'firmware RPC must delegate privileged firmware work to the dedicated helper'
grep -Fq "FIRMWARE_HELPER + ' check" "$FIRMWARE_MODULE" || \
	fail 'firmware check RPC must start the firmware helper'
grep -Fq "request.args.confirm != 'install'" "$FIRMWARE_MODULE" || \
	fail 'firmware installation RPC must require an explicit confirmation token'
grep -Fq 'validate_firmware_image' "$FIRMWARE_HELPER" || \
	fail 'firmware helper must validate images with OpenWrt before flashing'
grep -Fq '"$SYSUPGRADE_BIN" --test "$IMAGE_FILE"' "$FIRMWARE_HELPER" || \
	fail 'firmware helper must run sysupgrade --test before flashing'
grep -Fq '/firmware/resolve' "$FIRMWARE_HELPER" || \
	fail 'firmware helper must use the Hub firmware resolve API'
if grep -Eq '(--force|-F)[[:space:]]+"?\$IMAGE_FILE' "$FIRMWARE_HELPER"; then
	fail 'SmartSafeHub firmware updater must not expose forced sysupgrade'
fi

if grep -Eq '^[[:space:]]*(apk|"\$APK_BIN"|\$APK_BIN)[[:space:]]+upgrade([[:space:]]|$)' "$UPDATER"; then
	fail 'full-system apk upgrade must not be used by SmartSafeHub updater'
fi

grep -Fq '"$APK_BIN" upgrade "$UPDATE_PACKAGE"' "$UPDATER" || \
	fail 'updater must use targeted apk upgrade for luci-app-smartsafehub'

echo 'PASS: rpc registration, ACL permissions and targeted package update contract are consistent'
