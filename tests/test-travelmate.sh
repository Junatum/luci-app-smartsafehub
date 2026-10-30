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
assert 'for required in travelmate luci-app-travelmate' in manager
assert 'primary_package=luci-app-travelmate' in manager
assert 'web_ui.path")" = /cgi-bin/luci/admin/services/travelmate' in manager
assert "id == 'travelmate'" in view
assert "item?.web_ui?.package == 'luci-app-travelmate'" in view
assert "item?.web_ui?.path == '/cgi-bin/luci/admin/services/travelmate'" in view
PY
printf '%s\n' 'PASS: Travelmate Apps demo and catalog contract'
