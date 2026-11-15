#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-or-later
set -eu
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
python3 - "$ROOT" <<'PYTEST'
from pathlib import Path
import sys
r = Path(sys.argv[1])
manager = (r / 'root/usr/libexec/smartsafehub-apps-manager').read_text()
rpc = (r / 'root/usr/share/rpcd/ucode/smartsafehub/apps.uc').read_text()
ui = (r / 'frontend/src/utils/appsWebUi.ts').read_text()
pages = (r / 'frontend/src/pages/AppsPage.tsx').read_text()
assert 'if [ "$id" = jarbis ]' in manager
assert '[ "$(field "$CATALOG" "@.apps[$idx].web_ui.path")" = \'#smarthome\' ] || return 1' in manager
assert 'if [ "$app" = jarbis ]' in manager
assert 'for required in rpcd-mod-ucode ucode-mod-uci ucode-mod-fs jsonfilter' in manager
assert 'if [ "$id" = jarbis ] && [ "$managed" -eq 0 ] && ! installed jarbis' in manager
assert "item?.web_ui?.package == 'jarbis'" in rpc
assert "webUi.type === 'smartsafehub'" in ui
assert "webUi.path === '#smarthome'" in ui
assert "app.id === 'jarbis' ? '_self'" in pages
assert 'state?.webUiReady' in pages
print('PASS: Jarbis 공식 스마트홈 App 경로·승인·설치 상태·공유 의존성 보호')
PYTEST
