#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-or-later
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
UPDATER="$ROOT_DIR/root/usr/libexec/smartsafehub-updater"
MAKEFILE="$ROOT_DIR/Makefile"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT INT TERM

fail() {
	echo "FAIL: $*" >&2
	exit 1
}

assert_contains() {
	file="$1"
	needle="$2"
	grep -F "$needle" "$file" >/dev/null 2>&1 || fail "$file does not contain: $needle"
}

assert_not_contains() {
	file="$1"
	needle="$2"
	if grep -F "$needle" "$file" >/dev/null 2>&1; then
		fail "$file unexpectedly contains: $needle"
	fi
}

assert_contains "$MAKEFILE" 'LUCI_DEPENDS:=+luci-base +rpcd-mod-ucode +ucode +ucode-mod-ubus +ucode-mod-fs +ucode-mod-uci +procd +uclient-fetch +safeshield'
SAFESHIELD_MIN_VERSION="$(sed -n 's/^LUCI_EXTRA_DEPENDS:=safeshield (>=\([^)]*\))$/\1/p' "$MAKEFILE")"
[ -n "$SAFESHIELD_MIN_VERSION" ] || fail 'unable to read safeshield minimum version from LUCI_EXTRA_DEPENDS'
PKG_VERSION="$(sed -n 's/^PKG_VERSION:=//p' "$MAKEFILE" | head -n1)"
PKG_RELEASE="$(sed -n 's/^PKG_RELEASE:=//p' "$MAKEFILE" | head -n1)"
RELEASE_VERSION="${PKG_VERSION}-r${PKG_RELEASE}"

mkdir -p "$TMP/bin" "$TMP/repos" "$TMP/pkg" "$TMP/releases"
printf '%s\n' 'https://repo.smartsafehub.com/stable/packages/x86_64/smartsafehub/packages.adb' > "$TMP/repos/smartsafehub.list"

cat > "$TMP/bin/uci" <<'MOCKUCI'
#!/bin/sh
[ "${1:-}" = '-q' ] && shift
[ "${1:-}" = 'get' ] || exit 1
case "${2:-}" in
	smartsafehub.updates.check_enabled) echo 1 ;;
	smartsafehub.updates.check_interval_s) echo 21600 ;;
	smartsafehub.updates.auto_install) echo 0 ;;
	smartsafehub.updates.auto_install_time) echo '03:00' ;;
	smartsafehub.updates.repository_host) echo 'repo.smartsafehub.com' ;;
	*) exit 1 ;;
esac
MOCKUCI
chmod +x "$TMP/bin/uci"

cat > "$TMP/pkg/safeshield.installed" <<EOF2
0.0.0
EOF2
cat > "$TMP/pkg/safeshield.available" <<EOF2
$SAFESHIELD_MIN_VERSION
EOF2
cat > "$TMP/pkg/luci-app-smartsafehub.installed" <<EOF2
0.2.1-r1
EOF2
cat > "$TMP/pkg/luci-app-smartsafehub.available" <<EOF2
$RELEASE_VERSION
EOF2
cat > "$TMP/releases/index.json" <<EOF2
{
  "schema_version": 1,
  "package": "luci-app-smartsafehub",
  "releases": [
    { "version": "$RELEASE_VERSION", "date": "2026-08-28" },
    { "version": "0.2.3-r1", "date": "2026-08-28" },
    { "version": "0.2.2-r1", "date": "2026-08-28" },
    { "version": "0.2.1-r1", "date": "2026-08-28" },
    { "version": "0.2.0-r1", "date": "2026-08-21" }
  ]
}
EOF2

for version in "$RELEASE_VERSION" 0.2.3-r1 0.2.2-r1; do
  cat > "$TMP/releases/$version.json" <<EOF2
{
  "schema_version": 1,
  "package": "luci-app-smartsafehub",
  "version": "$version",
  "date": "2026-08-28",
  "summary": "SmartSafeHub release note test for $version",
  "sections": [
    { "title": "Test", "items": ["Release metadata is display-only."] }
  ]
}
EOF2
done

cat > "$TMP/bin/uclient-fetch" <<'MOCKFETCH'
#!/bin/sh
set -eu
output=''
url=''
while [ "$#" -gt 0 ]; do
	case "$1" in
		-q) shift ;;
		-T) shift 2 ;;
		-O) output="$2"; shift 2 ;;
		*) url="$1"; shift ;;
	esac
done
printf '%s\n' "$url" >> "${MOCK_FETCH_LOG:?}"
name="${url##*/}"
if [ "${MOCK_FETCH_FAIL:-0}" = '1' ] || [ "${MOCK_FETCH_FAIL_NAME:-}" = "$name" ]; then
	exit 1
fi
cp "${MOCK_RELEASE_ROOT:?}/$name" "$output"
MOCKFETCH
chmod +x "$TMP/bin/uclient-fetch"

cat > "$TMP/bin/apk" <<'MOCKAPK'
#!/bin/sh
set -eu
root="${MOCK_APK_ROOT:?}"
command="${1:-}"
shift || true
case "$command" in
	update)
		exit 0
		;;
	list)
		if [ "${1:-}" = '-I' ] && [ "${2:-}" = '--manifest' ]; then
			package="${3:-}"
			[ -f "$root/$package.installed" ] || exit 0
			printf '%s %s\n' "$package" "$(cat "$root/$package.installed")"
			exit 0
		fi
		if [ "${1:-}" = '-u' ]; then
			package="${2:-}"
			[ -f "$root/$package.installed" ] || exit 0
			[ -f "$root/$package.available" ] || exit 0
			installed="$(cat "$root/$package.installed")"
			available="$(cat "$root/$package.available")"
			[ "$installed" != "$available" ] || exit 0
			printf '%s-%s all {mock} (GPL) [upgradable from: %s]\n' "$package" "$available" "$installed"
			exit 0
		fi
		exit 2
		;;
	add)
		[ "${1:-}" = '--upgrade' ] || exit 2
		shift
		printf 'add --upgrade' > "${MOCK_APK_LOG:?}"
		for package in "$@"; do
			printf ' %s' "$package" >> "$MOCK_APK_LOG"
			if [ -f "$root/$package.available" ]; then
				cp "$root/$package.available" "$root/$package.installed"
			fi
			if [ "$package" = 'luci-app-smartsafehub' ] && [ -f "$root/safeshield.available" ]; then
				cp "$root/safeshield.available" "$root/safeshield.installed"
			fi
		done
		printf '\n' >> "$MOCK_APK_LOG"
		exit 0
		;;
	*)
		exit 2
		;;
esac
MOCKAPK
chmod +x "$TMP/bin/apk"

export MOCK_APK_ROOT="$TMP/pkg"
export MOCK_APK_LOG="$TMP/apk.log"
export MOCK_FETCH_LOG="$TMP/fetch.log"
export MOCK_RELEASE_ROOT="$TMP/releases"
export SMARTSAFEHUB_UPDATER_STATE_FILE="$TMP/updates.state"
export SMARTSAFEHUB_UPDATER_RELEASE_NOTES_FILE="$TMP/release-notes.json"
export SMARTSAFEHUB_UPDATER_LOCK_DIR="$TMP/updater.lock"
export SMARTSAFEHUB_UPDATER_AUTO_MARKER="$TMP/auto-date"
export SMARTSAFEHUB_UPDATER_REPOSITORY_DIR="$TMP/repos"
export SMARTSAFEHUB_UPDATER_APK_BIN="$TMP/bin/apk"
export SMARTSAFEHUB_UPDATER_UCLIENT_FETCH_BIN="$TMP/bin/uclient-fetch"
export SMARTSAFEHUB_UPDATER_UCI_BIN="$TMP/bin/uci"
export SMARTSAFEHUB_UPDATER_RPCD_INIT=''
export SMARTSAFEHUB_UPDATER_LUCI_INDEX_CACHE="$TMP/luci-indexcache"

"$UPDATER" check
TAB="$(printf '\t')"
assert_contains "$TMP/updates.state" "phase${TAB}idle"
assert_not_contains "$TMP/updates.state" "package${TAB}safeshield"
assert_contains "$TMP/updates.state" "package${TAB}luci-app-smartsafehub${TAB}0.2.1-r1${TAB}${RELEASE_VERSION}${TAB}1"
assert_contains "$TMP/fetch.log" "https://repo.smartsafehub.com/stable/releases/luci-app-smartsafehub/index.json"
assert_contains "$TMP/fetch.log" "https://repo.smartsafehub.com/stable/releases/luci-app-smartsafehub/${RELEASE_VERSION}.json"
assert_contains "$TMP/fetch.log" "https://repo.smartsafehub.com/stable/releases/luci-app-smartsafehub/0.2.3-r1.json"
assert_contains "$TMP/fetch.log" "https://repo.smartsafehub.com/stable/releases/luci-app-smartsafehub/0.2.2-r1.json"
assert_contains "$TMP/release-notes.json" "\"installed_version\": \"0.2.1-r1\""
assert_contains "$TMP/release-notes.json" "\"available_version\": \"${RELEASE_VERSION}\""
assert_contains "$TMP/release-notes.json" "\"version\": \"${RELEASE_VERSION}\""
assert_contains "$TMP/release-notes.json" "\"version\": \"0.2.3-r1\""
assert_contains "$TMP/release-notes.json" "\"version\": \"0.2.2-r1\""
assert_not_contains "$TMP/release-notes.json" "\"version\": \"0.2.1-r1\""
assert_contains "$TMP/release-notes.json" '"complete": true'

# One missing intermediate note should preserve the other notes and mark the bundle incomplete.
rm -f "$TMP/release-notes.json"
MOCK_FETCH_FAIL_NAME='0.2.3-r1.json' "$UPDATER" check
assert_contains "$TMP/release-notes.json" "\"version\": \"${RELEASE_VERSION}\""
assert_not_contains "$TMP/release-notes.json" "\"version\": \"0.2.3-r1\""
assert_contains "$TMP/release-notes.json" "\"version\": \"0.2.2-r1\""
assert_contains "$TMP/release-notes.json" '"complete": false'

# Release note metadata is display-only: a fetch failure must not fail update detection.
rm -f "$TMP/release-notes.json"
MOCK_FETCH_FAIL=1 "$UPDATER" check
assert_contains "$TMP/updates.state" "package${TAB}luci-app-smartsafehub${TAB}0.2.1-r1${TAB}${RELEASE_VERSION}${TAB}1"
[ ! -e "$TMP/release-notes.json" ] || fail 'failed release note download must not leave a stale cache'

"$UPDATER" install
assert_contains "$TMP/apk.log" 'add --upgrade luci-app-smartsafehub'
assert_not_contains "$TMP/apk.log" ' safeshield'
[ "$(cat "$TMP/pkg/safeshield.installed")" = "$SAFESHIELD_MIN_VERSION" ] || fail 'safeshield dependency did not reach the required minimum version'
assert_contains "$TMP/updates.state" "package${TAB}luci-app-smartsafehub${TAB}${RELEASE_VERSION}${TAB}${TAB}0"
[ ! -e "$TMP/release-notes.json" ] || fail 'release note cache must be removed after the update is installed'

last_install_at="$(awk -F '\t' '$1 == "last_install_at" { print $2 }' "$TMP/updates.state")"
[ "${last_install_at:-0}" -gt 0 ] || fail 'last_install_at was not recorded'

echo "PASS: updater tracks SmartSafeHub, bundles skipped release notes fail-open, and enforces safeshield >= $SAFESHIELD_MIN_VERSION through package metadata"
