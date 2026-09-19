#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-or-later
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
MAKEFILE="$ROOT_DIR/Makefile"
PACKAGE_JSON="$ROOT_DIR/frontend/package.json"
PACKAGE_LOCK="$ROOT_DIR/frontend/package-lock.json"
CONFIG_FILE="$ROOT_DIR/root/etc/config/smartsafehub"
LOGIN_TEMPLATE="$ROOT_DIR/root/usr/share/ucode/luci/template/smartsafehub/login.ut"
FRONTEND_ENTRY="$ROOT_DIR/frontend/src/main.tsx"
README="$ROOT_DIR/README.md"
FAVICON_FILE="$ROOT_DIR/root/www/luci-static/smartsafehub/favicon.svg"
SHELLSPEC_CONFIG="$ROOT_DIR/.shellspec"
SHELLSPEC_CONTRACTS="$ROOT_DIR/spec/contracts_spec.sh"

fail() {
	echo "FAIL: $*" >&2
	exit 1
}

require_file() {
	[ -f "$1" ] || fail "missing required file: ${1#$ROOT_DIR/}"
}

require_executable() {
	[ -x "$1" ] || fail "file must be executable in git checkout: ${1#$ROOT_DIR/}"
}

make_value() {
	key="$1"
	awk -F ':=' -v key="$key" '$1 == key { print $2; exit }' "$MAKEFILE" | tr -d '[:space:]'
}

require_file "$MAKEFILE"
require_file "$PACKAGE_JSON"
require_file "$PACKAGE_LOCK"
require_file "$CONFIG_FILE"
require_file "$LOGIN_TEMPLATE"
require_file "$FRONTEND_ENTRY"
require_file "$README"
require_file "$FAVICON_FILE"
require_file "$SHELLSPEC_CONFIG"
require_file "$SHELLSPEC_CONTRACTS"
[ ! -e "$ROOT_DIR/tests/run.sh" ] || fail 'tests/run.sh must not be used; run shellspec directly'

require_executable "$ROOT_DIR/root/etc/init.d/smartsafehub-updater"
require_executable "$ROOT_DIR/root/etc/init.d/smartsafehub-firmware"
require_executable "$ROOT_DIR/root/etc/init.d/smartsafehub-maintenance"
require_executable "$ROOT_DIR/root/etc/init.d/smartsafehub-health"
require_executable "$ROOT_DIR/root/etc/init.d/smartsafehub-license"
require_executable "$ROOT_DIR/root/usr/libexec/smartsafehub-updater"
require_executable "$ROOT_DIR/root/usr/libexec/smartsafehub-firmware"
require_executable "$ROOT_DIR/root/usr/libexec/smartsafehub-maintenance"
require_executable "$ROOT_DIR/root/usr/libexec/smartsafehub-health"
require_executable "$ROOT_DIR/root/usr/libexec/smartsafehub-license"
require_executable "$ROOT_DIR/root/usr/libexec/smartsafehub-backup"
require_file "$ROOT_DIR/root/usr/libexec/smartsafehub-root-entry"
require_executable "$ROOT_DIR/root/etc/uci-defaults/99-smartsafehub-root-entry"
require_executable "$ROOT_DIR/tests/test-static-validation.sh"
require_executable "$ROOT_DIR/tests/test-shell-pipeline-safety.sh"
require_executable "$ROOT_DIR/tests/test-updater.sh"
require_executable "$ROOT_DIR/tests/test-firmware-updater.sh"
require_executable "$ROOT_DIR/tests/test-package-contract.sh"
require_executable "$ROOT_DIR/tests/test-document-ui-contract.sh"
require_executable "$ROOT_DIR/tests/test-reload-safety.sh"
require_executable "$ROOT_DIR/tests/test-rpc-contract.sh"
require_executable "$ROOT_DIR/tests/test-system-time-contract.sh"
require_executable "$ROOT_DIR/tests/test-scheduled-reboot.sh"
require_executable "$ROOT_DIR/tests/test-health.sh"
require_executable "$ROOT_DIR/tests/test-license.sh"
require_executable "$ROOT_DIR/tests/test-backup-restore.sh"
require_executable "$ROOT_DIR/tests/test-initial-password-setup.sh"
require_executable "$ROOT_DIR/tests/test-ucode-imports.sh"
require_executable "$ROOT_DIR/tests/test-runtime-path-contract.sh"
require_executable "$ROOT_DIR/tests/test-lan-settings.sh"
require_executable "$ROOT_DIR/tests/test-root-url-rewrite.sh"

pkg_version="$(make_value PKG_VERSION)"
pkg_release="$(make_value PKG_RELEASE)"
frontend_version="$(jq -er '.version' "$PACKAGE_JSON")"
lock_version="$(jq -er '.version' "$PACKAGE_LOCK")"
lock_root_version="$(jq -er '.packages[""].version' "$PACKAGE_LOCK")"

[ -n "$pkg_version" ] || fail 'PKG_VERSION is missing'
printf '%s\n' "$pkg_version" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$' || \
	fail 'PKG_VERSION must use x.y.z format'
case "$pkg_release" in
	''|*[!0-9]*) fail 'PKG_RELEASE must be a positive integer' ;;
esac
[ "$pkg_release" -gt 0 ] || fail 'PKG_RELEASE must be greater than zero'

[ "$frontend_version" = "$pkg_version" ] || \
	fail "frontend/package.json version ($frontend_version) does not match PKG_VERSION ($pkg_version)"
[ "$lock_version" = "$pkg_version" ] || \
	fail "frontend/package-lock.json version ($lock_version) does not match PKG_VERSION ($pkg_version)"
[ "$lock_root_version" = "$pkg_version" ] || \
	fail "package-lock root version ($lock_root_version) does not match PKG_VERSION ($pkg_version)"

package_release_version="${pkg_version}-r${pkg_release}"
grep -Fq "data-asset-version=\"$package_release_version\"" "$LOGIN_TEMPLATE" || \
	fail "login template asset version must be $package_release_version"
grep -Fq "app.js?v=$package_release_version" "$LOGIN_TEMPLATE" || \
	fail "login template app.js cache key must be $package_release_version"
grep -Fq 'rel="icon" type="image/svg+xml"' "$LOGIN_TEMPLATE" || \
	fail 'login template must register the SmartSafeHub SVG favicon'
grep -Fq "favicon.svg?v=$package_release_version" "$LOGIN_TEMPLATE" || \
	fail "favicon cache key must be $package_release_version"
grep -Fq "assetVersion: host.dataset.assetVersion ?? '$package_release_version'" "$FRONTEND_ENTRY" || \
	fail "frontend fallback asset version must be $package_release_version"

grep -Eq '^LUCI_DEPENDS:=.*(^|[[:space:]])\+safeshield([[:space:]]|$)' "$MAKEFILE" || \
	fail 'LUCI_DEPENDS must include +safeshield'
grep -Eq '^LUCI_DEPENDS:=.*(^|[[:space:]])\+uclient-fetch([[:space:]]|$)' "$MAKEFILE" || \
	fail 'LUCI_DEPENDS must include +uclient-fetch for release note downloads'
grep -Eq '^LUCI_DEPENDS:=.*(^|[[:space:]])\+jsonfilter([[:space:]]|$)' "$MAKEFILE" || \
	fail 'LUCI_DEPENDS must include +jsonfilter for firmware metadata validation'
grep -Eq '^LUCI_EXTRA_DEPENDS:=safeshield \(>=[0-9]+\.[0-9]+\.[0-9]+([._~+-][A-Za-z0-9._~+-]+)?\)$' "$MAKEFILE" || \
	fail 'LUCI_EXTRA_DEPENDS must require a minimum safeshield version'

safeshield_min_version="$(sed -n 's/^LUCI_EXTRA_DEPENDS:=safeshield (>=\([^)]*\))$/\1/p' "$MAKEFILE")"
[ -n "$safeshield_min_version" ] || fail 'could not resolve minimum safeshield version from Makefile'
grep -Fq "safeshield (>= $safeshield_min_version)" "$README" || \
	fail "README safeshield dependency must match Makefile minimum version ($safeshield_min_version)"

awk '
	/^define Package\/luci-app-smartsafehub\/conffiles$/ { in_block = 1; next }
	in_block && /^endef$/ { exit }
	in_block && $0 == "/etc/config/smartsafehub" { found = 1 }
	END { exit(found ? 0 : 1) }
' "$MAKEFILE" || fail '/etc/config/smartsafehub must be declared as a conffile'

postinst_block="$(awk '
	/^define Package\/luci-app-smartsafehub\/postinst$/ { in_block = 1 }
	in_block { print }
	in_block && /^endef$/ { exit }
' "$MAKEFILE")"
[ -n "$postinst_block" ] || fail 'package postinst hook is missing'
printf '%s\n' "$postinst_block" | grep -Fq '[ -z "$${IPKG_INSTROOT}" ]' ||
	fail 'package postinst must limit service enable to runtime installation'
printf '%s\n' "$postinst_block" | grep -Fq 'mkdir -p /tmp/smartsafehub' ||
	fail 'package postinst must create the SmartSafeHub runtime directory'
printf '%s\n' "$postinst_block" | grep -Fq '/etc/init.d/smartsafehub-firmware enable' ||
	fail 'package postinst must force-enable smartsafehub-firmware'
printf '%s\n' "$postinst_block" | grep -Fq '/etc/init.d/smartsafehub-health enable' ||
	fail 'package postinst must force-enable smartsafehub-health'
printf '%s\n' "$postinst_block" | grep -Fq '/etc/init.d/smartsafehub-health restart' ||
	fail 'package postinst must start or restart smartsafehub-health immediately after installation'
printf '%s\n' "$postinst_block" | grep -Fq '/etc/init.d/smartsafehub-license enable' ||
	fail 'package postinst must force-enable smartsafehub-license'
printf '%s\n' "$postinst_block" | grep -Fq '/etc/init.d/smartsafehub-license restart' ||
	fail 'package postinst must start or restart smartsafehub-license immediately after installation'
printf '%s\n' "$postinst_block" | grep -Fq 'rm -f /tmp/luci-indexcache' ||
	fail 'package postinst must clear the LuCI index cache after installing RPC/menu changes'
printf '%s\n' "$postinst_block" | grep -Fq '/etc/init.d/rpcd reload' ||
	fail 'package postinst must reload rpcd so newly installed ucode methods and ACL files are active'
if printf '%s\n' "$postinst_block" | grep -Fq '/etc/init.d/rpcd restart'; then
	fail 'package postinst must reload rpcd instead of restarting it and discarding active sessions'
fi
printf '%s\n' "$postinst_block" | grep -Fq 'uci -q delete smartsafehub.firmware.check_enabled' ||
	fail 'package postinst must remove the obsolete firmware check_enabled option on existing installs'
if printf '%s\n' "$postinst_block" | grep -Fq 'smartsafehub.updates.check_enabled'; then
	fail 'package postinst must not remove the management software check_enabled option'
fi
if printf '%s\n' "$postinst_block" | grep -Eq 'PKG_UPGRADE|smartsafehub-firmware enabled'; then
	fail 'firmware service enable must not depend on upgrade or previous enabled state'
fi
printf '%s\n' "$postinst_block" | grep -Fq '/bin/sh /usr/libexec/smartsafehub-root-entry --install --reconcile' ||
	fail 'package postinst must register the SmartSafeHub exact-root uHTTPd rewrite at runtime via /bin/sh'

prerm_block="$(awk '
	/^define Package\/luci-app-smartsafehub\/prerm$/ { in_block = 1 }
	in_block { print }
	in_block && /^endef$/ { exit }
' "$MAKEFILE")"
[ -n "$prerm_block" ] || fail 'package prerm hook is missing'
printf '%s\n' "$prerm_block" | grep -Fq '[ -z "$${IPKG_INSTROOT}" ]' ||
	fail 'package prerm must limit uHTTPd cleanup to runtime removal'
printf '%s\n' "$prerm_block" | grep -Fq '/bin/sh /usr/libexec/smartsafehub-root-entry --remove --reconcile' ||
	fail 'package prerm must unregister only the SmartSafeHub root rewrite via /bin/sh'

firmware_config_block="$(awk '
	/^config firmware / { in_block = 1 }
	in_block && /^config / && $0 !~ /^config firmware / { exit }
	in_block { print }
' "$CONFIG_FILE")"
if printf '%s\n' "$firmware_config_block" | grep -Fq 'check_enabled'; then
	fail 'firmware config must not expose check_enabled; firmware checks are always enabled'
fi
grep -Fq "config updates 'updates'" "$CONFIG_FILE" ||
	fail 'updates config section is missing'
grep -A5 -F "config updates 'updates'" "$CONFIG_FILE" | grep -Fq "option check_enabled '1'" ||
	fail 'management software check_enabled must remain user-configurable'
if grep -R -F 'smartsafehub.firmware.check_enabled' \
	"$ROOT_DIR/root/usr/libexec/smartsafehub-firmware" \
	"$ROOT_DIR/root/usr/share/rpcd/ucode/smartsafehub/firmware.uc" \
	"$ROOT_DIR/frontend/src/types/firmware.ts" >/dev/null 2>&1; then
	fail 'firmware-only code must not reference smartsafehub.firmware.check_enabled'
fi
if grep -Fq 'checkEnabled' "$ROOT_DIR/root/usr/share/rpcd/ucode/smartsafehub/firmware.uc" || \
	grep -Fq 'checkEnabled' "$ROOT_DIR/frontend/src/types/firmware.ts"; then
	fail 'firmware status contract must not expose checkEnabled'
fi

echo "PASS: package metadata, versions, conffile, forced firmware enable, firmware check policy and executable permissions are consistent"
