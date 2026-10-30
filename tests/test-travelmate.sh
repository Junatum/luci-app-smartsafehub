#!/bin/sh
set -eu
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
python3 - "$ROOT" <<'PY'
from pathlib import Path
import sys
root=Path(sys.argv[1])
demo=(root/'frontend/src/demo/data.ts').read_text()
assert "id: 'travelmate'" in demo
assert "version: '2.4.9-r5'" in demo
assert "webUi: null, // Demo never exposes actual LuCI administration routes." in demo
assert "'travelmate': {" in demo
assert "installed: false" in demo
assert "category: 'network'" in demo
assert "luci-app-travelmate" in (root/'docs/APPS.md').read_text()
assert "case 'network': return 'network'" in (root/'frontend/src/components/AppsCategoryIcon.tsx').read_text()
manager = (root/'root/usr/libexec/smartsafehub-apps-manager').read_text()
view = (root/'root/usr/share/rpcd/ucode/smartsafehub/apps.uc').read_text()
assert '[ "$id" = travelmate ]' in manager
assert '[ "$app" = travelmate ]' in manager
assert 'for required in travelmate luci-app-travelmate curl libcurl4 libnghttp2-14 iwinfo rpcd-mod-rpcsys' in manager
assert 'primary_package=luci-app-travelmate' in manager
assert 'web_ui.path")" = /cgi-bin/luci/admin/services/travelmate' in manager
assert "id == 'travelmate'" in view
assert "item?.web_ui?.package == 'luci-app-travelmate'" in view
assert "item?.web_ui?.path == '/cgi-bin/luci/admin/services/travelmate'" in view
assert 'shared_travelmate_dep' in manager
assert '[ "$name" = rpcd-mod-rpcsys ]' in manager
assert 'shared_travelmate_dep "$name" && return 42' in manager
assert 'app="$id" # Status checks' in manager
assert 'append_owned_pin "$name"' in manager
PY
printf '%s\n' 'PASS: Travelmate Apps demo and catalog contract'

# Exercise the exact APK transaction-plan validators, not only static labels.
# A plan with only the seven reviewed packages is permitted, while any
# unintended core upgrade, extra dependency, or automatic removal is blocked.
MANAGER="$ROOT/root/usr/libexec/smartsafehub-apps-manager"
TMPDIR_TM="$(mktemp -d)" || exit 1
trap 'rm -rf "$TMPDIR_TM"' EXIT HUP INT TERM
awk '/^review_install_plan\(\)/,/^}/' "$MANAGER" > "$TMPDIR_TM/functions"
awk '/^review_remove_plan\(\)/,/^}/' "$MANAGER" >> "$TMPDIR_TM/functions"
# shellcheck source=/dev/null
. "$TMPDIR_TM/functions"
ALLOWED='travelmate luci-app-travelmate curl libcurl4 libnghttp2-14 iwinfo rpcd-mod-rpcsys'
printf '%s\n' \
 '(1/7) Installing curl (signed)' \
 '(2/7) Installing libcurl4 (signed)' \
 '(3/7) Installing libnghttp2-14 (signed)' \
 '(4/7) Installing iwinfo (signed)' \
 '(5/7) Installing rpcd-mod-rpcsys (signed)' \
 '(6/7) Installing travelmate (signed)' \
 '(7/7) Installing luci-app-travelmate (signed)' > "$TMPDIR_TM/plan"
review_install_plan "$TMPDIR_TM/plan" "$ALLOWED" || { echo 'FAIL: signed dependency plan rejected' >&2; exit 1; }
cat >> "$TMPDIR_TM/plan" <<'SH_BAD'
(8/8) Upgrading rpcd (unapproved)
SH_BAD
if review_install_plan "$TMPDIR_TM/plan" "$ALLOWED"; then
 echo 'FAIL: core RPC upgrade accepted' >&2; exit 1
fi
sed '/Installing iwinfo /d; /Upgrading rpcd /d' "$TMPDIR_TM/plan" > "$TMPDIR_TM/missing"
if review_install_plan "$TMPDIR_TM/missing" "$ALLOWED"; then
 echo 'FAIL: incomplete dependency plan accepted' >&2; exit 1
fi
printf '%s\n' '(1/2) Purging travelmate (test)' '(2/2) Purging luci-app-travelmate (test)' > "$TMPDIR_TM/remove"
review_remove_plan "$TMPDIR_TM/remove" 'travelmate luci-app-travelmate' || { echo 'FAIL: app-only removal rejected' >&2; exit 1; }
printf '%s\n' '(3/3) Purging rpcd-mod-rpcsys (test)' >> "$TMPDIR_TM/remove"
if review_remove_plan "$TMPDIR_TM/remove" 'travelmate luci-app-travelmate'; then
 echo 'FAIL: shared RPC package removal accepted' >&2; exit 1
fi
printf '%s\n' 'PASS: Travelmate signed dependencies and core package protection'
