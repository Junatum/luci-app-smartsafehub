#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-or-later
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
RPC_ENTRY="$ROOT_DIR/root/usr/share/rpcd/ucode/smartsafehub.uc"
UPDATES_MODULE="$ROOT_DIR/root/usr/share/rpcd/ucode/smartsafehub/updates.uc"
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

for method in updates_status updates_check updates_install updates_settings_update; do
	assert_rpc_method "$method"
done

assert_acl_method read updates_status
assert_acl_method write updates_check
assert_acl_method write updates_install
assert_acl_method write updates_settings_update

jq -e \
	'.["luci-app-smartsafehub"].write.ubus.smartsafehub | index("updates_status") == null' \
	"$ACL" >/dev/null || fail 'updates_status should remain read-only'

grep -Fq "const UPDATE_PACKAGE = 'luci-app-smartsafehub';" "$UPDATES_MODULE" || \
	fail 'ucode updater target must be luci-app-smartsafehub'
grep -Fq 'UPDATE_PACKAGE="luci-app-smartsafehub"' "$UPDATER" || \
	fail 'shell updater target must be luci-app-smartsafehub'

if grep -Eq '^[[:space:]]*(apk|"\$APK_BIN"|\$APK_BIN)[[:space:]]+upgrade([[:space:]]|$)' "$UPDATER"; then
	fail 'full-system apk upgrade must not be used by SmartSafeHub updater'
fi

grep -Fq '"$APK_BIN" add --upgrade "$UPDATE_PACKAGE"' "$UPDATER" || \
	fail 'updater must use targeted apk add --upgrade for luci-app-smartsafehub'

echo 'PASS: rpc registration, ACL permissions and targeted package update contract are consistent'
