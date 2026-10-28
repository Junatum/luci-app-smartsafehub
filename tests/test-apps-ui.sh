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
