#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-or-later
set -eu
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
python3 - "$ROOT" <<'PY'
from pathlib import Path
import sys

root = Path(sys.argv[1])
page = (root / 'frontend/src/pages/AppsPage.tsx').read_text()
styles = (root / 'frontend/src/styles/app.css').read_text()
package = (root / 'Makefile').read_text()


def check(ok, message):
    if not ok:
        raise AssertionError(message)


# Version/revision validity is covered by test-package-contract.sh.
check('PKG_VERSION:=0.2.30' in package, 'unexpected Apps package version')
check('border-teal-300 text-teal-800 hover:bg-teal-50' in page, 'install should stay teal')
check('border-red-300 text-red-700 hover:bg-red-50' in page, 'removal must be red outline')
check('hover\\:bg-red-50:hover' in styles, 'red hover needs an explicit dark-mode style')
check('rgb(239 68 68 / 0.16)' in styles, 'dark-mode removal hover should be subtle')
check('installed && managed ? <span class="rounded-full border border-emerald-200' in page,
      'managed installed apps need a green status badge')


# App installation storage must refer to the writable APK filesystem.
backend = (root / 'root/usr/share/rpcd/ucode/smartsafehub/apps-manager.uc').read_text()
card = (root / 'frontend/src/components/AppsStorageCard.tsx').read_text()
utils = (root / 'frontend/src/utils/appsStorage.ts').read_text()
check("fs.statvfs(mount)" in backend and "let mount = '/overlay'" in backend,
      'Apps status must read writable overlay using fs.statvfs')
check("mount = '/'" in backend, 'ext4 rootfs without /overlay requires a fallback')
check('stats.bavail' in backend and 'stats.frsize' in backend and 'storage: writable_storage()' in backend,
      'Apps status must report actual APK-available bytes without spawning df')
check("'/bin/df'" not in backend, 'storage must not spawn a polling command')
check('lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]' in page,
      'Apps info and storage must be side by side on desktop and stacked on mobile')
check('<AppsStorageCard storage={installStatus?.storage} />' in page,
      'Apps storage must share existing status polling')
check('stroke-dasharray=' in card and 'aria-label="앱 설치 저장 공간"' in card,
      'storage donut must be accessible and use SVG')
check('용량 정보를 확인할 수 없습니다.' in card and 'summarizeAppsStorage(storage)' in card,
      'storage errors and older RPC responses need a safe fallback')
check('storage.availableBytes > storage.totalBytes' in utils,
      'malformed storage reports must be rejected')
check(".ssh-app[data-theme='dark'] .ssh-apps-storage-track" in styles and
      "[data-level='critical']" in styles,
      'donut must support dark mode and dangerously low storage')

# Removal never calls onRemove from a card or from the orphan-list button.
check("onClick={(event) => removable ? openRemoveDialog(app, event.currentTarget)" in page,
      'catalog removal must open confirmation')
check("onClick={(event) => openRemoveDialog({ id, name: id" in page,
      'orphaned apps must open the same confirmation')
check("onClick={() => void requestOperation(removeTarget, 'remove')}" in page,
      'dialog approval must be the only removal confirmation action')
check(page.count('onRemove(app.id)') == 1, 'only the accepted operation may call the remove RPC callback')
check('aria-modal="true"' in page and 'aria-labelledby="apps-remove-title"' in page,
      'remove confirmation must be accessible')
check('취소</button>' in page and '앱 제거</button>' in page, 'dialog must offer both choices')
check("if (event.key === 'Escape')" in page and "event.key !== 'Tab'" in page,
      'dialog must support escape and focus containment')
check("if (action === 'remove') closeRemoveDialog()" in page,
      'confirmed operation should close the modal before starting')
check("if (!installStatus || statusError || pending !== null || running || restoring) return;" in page,
      'operation must preserve status and concurrency guards')

# Installing still uses the existing confirmation and neither action bypasses RPC guards.
check("action === 'install' && !window.confirm" in page, 'existing install confirmation must remain')
check("<OperationIndicator action={activeAction} />" in page, 'loading must show on app and orphan entries')
check("{removing ? '제거 중…' : action === 'update' ? '업데이트 중…' : '설치 중…'}" in page,
      'install, update and remove must show distinct spinner states')
check("job.action === 'remove' ? '앱 제거 중' : job.action === 'update' ? '앱 업데이트 중' : '앱 설치 중'" in page,
      'running job status must use the action name')
check("job.phase === 'failed' ? 'border-rose-200 bg-rose-50 text-rose-800'" in page,
      'errors must keep a red alert')
check('useState<string | null>(readDismissedAppsJob)' in page,
      'dismissal must be restored after refreshing Apps')
check('saveDismissedAppsJob(key)' in page and 'onClick={() => dismissJob(jobKey)}' in page,
      'dismissing a job should persist the dismissed operation ID')
check("onClick={() => void requestOperation(app, 'update')}" in page, 'approved update action must be shown')
check('setDismissedJob(null)' not in page,
      'starting a new operation must not resurrect the previous failure')
PY
echo 'PASS: Apps removal confirmation, theme and operation states'
