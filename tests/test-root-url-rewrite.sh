#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-or-later
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
HANDLER="$ROOT_DIR/root/etc/uhttpd/smartsafehub-root.json"
HELPER="$ROOT_DIR/root/usr/libexec/smartsafehub-root-entry"
UCI_DEFAULT="$ROOT_DIR/root/etc/uci-defaults/99-smartsafehub-root-entry"
MAKEFILE="$ROOT_DIR/Makefile"

fail() {
	echo "FAIL: $*" >&2
	exit 1
}

[ -f "$HANDLER" ] || fail 'missing uHTTPd root rewrite handler'
[ -f "$HELPER" ] || fail 'missing root entry helper'
[ -x "$UCI_DEFAULT" ] || fail 'root entry uci-default must be executable'

jq -e '
  .request == [
    ["if", ["eq", "REQUEST_URI", "/"], ["rewrite", "/cgi-bin/luci/"]]
  ]
' "$HANDLER" >/dev/null || \
	fail 'uHTTPd handler must rewrite only the exact root request to /cgi-bin/luci/'

if grep -R -F 'uhttpd.main.index_page' "$HELPER" "$UCI_DEFAULT" "$MAKEFILE" >/dev/null 2>&1; then
	fail 'SmartSafeHub root entry must not modify the global uHTTPd index_page setting'
fi
if [ -e "$ROOT_DIR/root/www/index.html" ]; then
	fail 'SmartSafeHub package must not replace /www/index.html owned by the base web UI'
fi

grep -Fq '/bin/sh /usr/libexec/smartsafehub-root-entry --install --reload' "$MAKEFILE" || \
	fail 'runtime package install must register the root rewrite via /bin/sh and reload uHTTPd'
grep -Fq '/bin/sh /usr/libexec/smartsafehub-root-entry --remove --reload' "$MAKEFILE" || \
	fail 'package removal must unregister only the SmartSafeHub root rewrite via /bin/sh'
grep -Fq '/bin/sh /usr/libexec/smartsafehub-root-entry --install' "$UCI_DEFAULT" || \
	fail 'firmware first boot must register the root rewrite handler via /bin/sh'
if grep -Fq -- '--reload' "$UCI_DEFAULT"; then
	fail 'uci-default must not reload uHTTPd during first-boot configuration'
fi

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT INT TERM
mkdir -p "$TMP_DIR/bin"
STATE_FILE="$TMP_DIR/json-script.state"
LOG_FILE="$TMP_DIR/uci.log"
COMMIT_FILE="$TMP_DIR/commit.count"
RELOAD_FILE="$TMP_DIR/reload.count"

cat > "$TMP_DIR/bin/uci" <<'STUB'
#!/bin/sh
set -eu
: "${SMARTSAFEHUB_TEST_STATE:?}"
: "${SMARTSAFEHUB_TEST_LOG:?}"
: "${SMARTSAFEHUB_TEST_COMMIT:?}"

printf '%s\n' "$*" >> "$SMARTSAFEHUB_TEST_LOG"
[ "${1:-}" = '-q' ] && shift
cmd="${1:-}"
[ "$#" -gt 0 ] && shift

case "$cmd" in
	show)
		[ "${1:-}" = 'uhttpd.main' ] || exit 1
		exit 0
		;;
	get)
		[ "${1:-}" = 'uhttpd.main.json_script' ] || exit 1
		[ -s "$SMARTSAFEHUB_TEST_STATE" ] || exit 1
		cat "$SMARTSAFEHUB_TEST_STATE"
		;;
	add_list)
		value="${1#uhttpd.main.json_script=}"
		current="$(cat "$SMARTSAFEHUB_TEST_STATE" 2>/dev/null || true)"
		if [ -n "$current" ]; then
			printf '%s %s\n' "$current" "$value" > "$SMARTSAFEHUB_TEST_STATE"
		else
			printf '%s\n' "$value" > "$SMARTSAFEHUB_TEST_STATE"
		fi
		;;
	del_list)
		value="${1#uhttpd.main.json_script=}"
		current="$(cat "$SMARTSAFEHUB_TEST_STATE" 2>/dev/null || true)"
		result=''
		for item in $current; do
			[ "$item" = "$value" ] && continue
			result="${result:+$result }$item"
		done
		printf '%s\n' "$result" > "$SMARTSAFEHUB_TEST_STATE"
		;;
	commit)
		[ "${1:-}" = 'uhttpd' ] || exit 1
		count="$(cat "$SMARTSAFEHUB_TEST_COMMIT" 2>/dev/null || printf '0')"
		printf '%s\n' "$((count + 1))" > "$SMARTSAFEHUB_TEST_COMMIT"
		;;
	*)
		exit 1
		;;
esac
STUB
chmod +x "$TMP_DIR/bin/uci"

cat > "$TMP_DIR/uhttpd" <<'STUB'
#!/bin/sh
set -eu
: "${SMARTSAFEHUB_TEST_RELOAD:?}"
[ "${1:-}" = 'reload' ] || exit 1
count="$(cat "$SMARTSAFEHUB_TEST_RELOAD" 2>/dev/null || printf '0')"
printf '%s\n' "$((count + 1))" > "$SMARTSAFEHUB_TEST_RELOAD"
STUB
chmod +x "$TMP_DIR/uhttpd"

existing_a='/etc/uhttpd/existing-a.json'
existing_b='/etc/uhttpd/existing-b.json'
printf '%s %s\n' "$existing_a" "$existing_b" > "$STATE_FILE"
printf '0\n' > "$COMMIT_FILE"
printf '0\n' > "$RELOAD_FILE"
: > "$LOG_FILE"

export SMARTSAFEHUB_TEST_STATE="$STATE_FILE"
export SMARTSAFEHUB_TEST_LOG="$LOG_FILE"
export SMARTSAFEHUB_TEST_COMMIT="$COMMIT_FILE"
export SMARTSAFEHUB_TEST_RELOAD="$RELOAD_FILE"
export SMARTSAFEHUB_ROOT_HANDLER="$HANDLER"
export SMARTSAFEHUB_UHTTPD_INIT="$TMP_DIR/uhttpd"
PATH="$TMP_DIR/bin:$PATH"
export PATH

sh "$HELPER" --install --reload
expected="$existing_a $existing_b $HANDLER"
[ "$(cat "$STATE_FILE")" = "$expected" ] || \
	fail 'install must append the SmartSafeHub handler without replacing existing json_script handlers'
[ "$(cat "$COMMIT_FILE")" = '1' ] || fail 'first install must commit uhttpd once'
[ "$(cat "$RELOAD_FILE")" = '1' ] || fail 'first runtime install must reload uhttpd once'

sh "$HELPER" --install --reload
[ "$(cat "$STATE_FILE")" = "$expected" ] || fail 'repeated install must be idempotent'
[ "$(cat "$COMMIT_FILE")" = '1' ] || fail 'idempotent install must not commit again'
[ "$(cat "$RELOAD_FILE")" = '1' ] || fail 'idempotent install must not reload again'

sh "$HELPER" --remove --reload
expected="$existing_a $existing_b"
[ "$(cat "$STATE_FILE")" = "$expected" ] || \
	fail 'remove must preserve all json_script handlers owned by other packages'
[ "$(cat "$COMMIT_FILE")" = '2' ] || fail 'remove must commit uhttpd once'
[ "$(cat "$RELOAD_FILE")" = '2' ] || fail 'runtime remove must reload uhttpd once'

sh "$HELPER" --remove --reload
[ "$(cat "$STATE_FILE")" = "$expected" ] || fail 'repeated remove must be idempotent'
[ "$(cat "$COMMIT_FILE")" = '2' ] || fail 'idempotent remove must not commit again'
[ "$(cat "$RELOAD_FILE")" = '2' ] || fail 'idempotent remove must not reload again'

if grep -Fq 'index_page' "$LOG_FILE"; then
	fail 'root entry helper must never read or write index_page'
fi

echo 'PASS: root URL rewrite is exact, preserves other uHTTPd handlers and avoids index_page side effects'
