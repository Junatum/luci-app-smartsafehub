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

require_executable "$ROOT_DIR/root/etc/init.d/smartsafehub-updater"
require_executable "$ROOT_DIR/root/usr/libexec/smartsafehub-updater"
require_executable "$ROOT_DIR/tests/run.sh"
require_executable "$ROOT_DIR/tests/test-updater.sh"
require_executable "$ROOT_DIR/tests/test-package-contract.sh"
require_executable "$ROOT_DIR/tests/test-navigation-contract.sh"
require_executable "$ROOT_DIR/tests/test-rpc-contract.sh"
require_executable "$ROOT_DIR/tests/test-ucode-imports.sh"

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
grep -Fq "assetVersion: host.dataset.assetVersion ?? '$package_release_version'" "$FRONTEND_ENTRY" || \
	fail "frontend fallback asset version must be $package_release_version"

grep -Eq '^LUCI_DEPENDS:=.*(^|[[:space:]])\+safeshield([[:space:]]|$)' "$MAKEFILE" || \
	fail 'LUCI_DEPENDS must include +safeshield'
grep -Eq '^LUCI_DEPENDS:=.*(^|[[:space:]])\+uclient-fetch([[:space:]]|$)' "$MAKEFILE" || \
	fail 'LUCI_DEPENDS must include +uclient-fetch for release note downloads'
grep -Eq '^LUCI_EXTRA_DEPENDS:=safeshield \(>=[0-9]+\.[0-9]+\.[0-9]+([._~+-][A-Za-z0-9._~+-]+)?\)$' "$MAKEFILE" || \
	fail 'LUCI_EXTRA_DEPENDS must require a minimum safeshield version'

awk '
	/^define Package\/luci-app-smartsafehub\/conffiles$/ { in_block = 1; next }
	in_block && /^endef$/ { exit }
	in_block && $0 == "/etc/config/smartsafehub" { found = 1 }
	END { exit(found ? 0 : 1) }
' "$MAKEFILE" || fail '/etc/config/smartsafehub must be declared as a conffile'

echo "PASS: package metadata, versions, conffile and executable permissions are consistent"
