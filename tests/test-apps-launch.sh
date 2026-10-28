#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-or-later
set -eu
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
python3 - "$ROOT" <<'PY'
from pathlib import Path
import re
import sys
root = Path(sys.argv[1])
ui = (root/'frontend/src/pages/AppsPage.tsx').read_text()
types = (root/'frontend/src/types/apps.ts').read_text()
route = (root/'frontend/src/utils/appsWebUi.ts').read_text()
catalog = (root/'root/usr/share/rpcd/ucode/smartsafehub/apps.uc').read_text()
manager = (root/'root/usr/libexec/smartsafehub-apps-manager').read_text()
status = (root/'root/usr/share/rpcd/ucode/smartsafehub/apps-manager.uc').read_text()
assert 'target="_blank"' in ui and 'rel="noopener noreferrer"' in ui
assert 'approvedAppPath(app.webUi)' in ui and 'state?.webUiReady' in ui
assert '웹 UI 미설치' in ui and '설치 마무리' in ui
assert 'onClick={() => setDismissedJob(jobKey)}' in ui
assert 'window.setTimeout(() => setDismissedJob(jobKey), 7000)' in ui
assert 'webUiReady?: boolean' in types and 'webUi?:' in types
assert "if (webUi.type !== 'luci')" in route
assert "'/cgi-bin/luci/admin/services/nlbw/display'" in catalog
assert 'luci_web_ui_path(item.web_ui.path)' in catalog
assert 'luci-app-nlbwmon' in manager
assert "id == 'retro-arcade'" in catalog and "type: id == 'retro-arcade'" in catalog
assert "'/retro-arcade/'" in route and "webUi.type === 'static'" in route
assert 'smartsafehub-app-retro-arcade' in manager
assert 'SMARTSAFEHUB_APPS_WEB_ROOT' in manager
assert "{ id: 'entertainment', label: '엔터테인먼트' }" in ui
assert 'web_ui_package "$id" "$idx"' in manager
assert "webUiReady: length(fields) == 5 && fields[4] == '1'" in status
allowed = re.compile(r'^/cgi-bin/luci/admin/[a-z0-9_-]+(?:/[a-z0-9_-]+)*$')
assert allowed.fullmatch('/cgi-bin/luci/admin/services/nlbw/display')
for bad in ('https://evil.example/', '//evil.example/', '/cgi-bin/luci/admin/../logout',
            '/cgi-bin/luci/admin/%2e%2e', '/cgi-bin/luci/admin/services/x?url=http',
            '/cgi-bin/luci/admin/services/x#fragment', '/cgi-bin/luci/admin//services/x'):
    assert not allowed.fullmatch(bad), bad
PY
# Check TypeScript helper without producing frontend build files.
if command -v tsc >/dev/null 2>&1; then
 tsc --noEmit --skipLibCheck --target es2020 "$ROOT/frontend/src/utils/appsWebUi.ts"
fi
echo 'PASS: Apps secure new-tab launch and notification contracts'
