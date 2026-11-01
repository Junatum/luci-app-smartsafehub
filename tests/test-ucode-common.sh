#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-or-later
set -eu
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
CORE="$ROOT/root/usr/share/rpcd/ucode/smartsafehub/core.uc"
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }
[ -f "$CORE" ] || fail 'core ucode module not found'
for module in activity firmware updates network-management iptv-management health; do
 file="$ROOT/root/usr/share/rpcd/ucode/smartsafehub/$module.uc"
 grep -Eq '^[[:space:]]*integer_value,' "$file" || fail "$module does not import the common integer parser"
 if grep -Eq '^function integer_value\(' "$file"; then
  fail "$module still reimplements common integer validation"
 fi
done
for module in activity firmware health; do
 file="$ROOT/root/usr/share/rpcd/ucode/smartsafehub/$module.uc"
 grep -Eq '^[[:space:]]*read_json_object,' "$file" || fail "$module does not import the common JSON reader"
done
if ! command -v ucode >/dev/null 2>&1; then
 [ "${SMARTSAFEHUB_REQUIRE_UCODE:-0}" != 1 ] || fail 'CI must execute common ucode runtime cases'
 printf 'PASS: common ucode helper imports (runtime requires CI ucode)\n'
 exit 0
fi
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT INT TERM
ln -s "$ROOT/root/usr/share/rpcd/ucode/smartsafehub" "$TMP/smartsafehub"
cat > "$TMP/fs.uc" <<'EOF_FS'
export function readfile(path) {
 if (path == '/valid') return '{"enabled":true,"count":3}';
 if (path == '/array') return '[1,2]';
 if (path == '/bad') return '{bad';
 if (path == '/big') return '{"more":"than 3 bytes"}';
 return null;
};
EOF_FS
cat > "$TMP/ubus.uc" <<'EOF_UBUS'
export function connect() { return null; };
EOF_UBUS
cat > "$TMP/uci.uc" <<'EOF_UCI'
export function cursor() { return null; };
EOF_UCI
cat > "$TMP/runner.uc" <<'EOF_RUNNER'
import { integer_value, read_json_object } from './smartsafehub/core.uc';
if (integer_value('17', 9) != 17 || integer_value('invalid', 9) != 9 ||
 integer_value(null, 9) != 9 || integer_value(0, 9) != 0) {
 printf('FAIL: integer parser returned wrong fallback or coercion\n');
 exit(1);
}
const value = read_json_object('/valid', 100);
if (value == null || value.count != 3 || value.enabled != true ||
 read_json_object('/valid', 4) != null ||
 read_json_object('/array') != null ||
 read_json_object('/bad') != null ||
 read_json_object('/missing') != null) {
 printf('FAIL: JSON reader accepted malformed, oversized or nonobject data\n');
 exit(1);
}
printf('PASS: shared ucode integer and JSON helpers preserve parsing contracts\n');
EOF_RUNNER
ucode -L "$TMP" -L "$ROOT/root/usr/share/rpcd/ucode" "$TMP/runner.uc" || fail 'ucode common helper runtime contract failed'
