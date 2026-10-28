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
check('ssh-apps-installed-badge' in page and 'ssh-apps-update-badge' in page and
      'ssh-apps-update-button' in page,
      'installed, update notice and update action need distinct styles')
check('.ssh-apps-update-button' in styles and ".ssh-app[data-theme='dark'] .ssh-apps-update-button" in styles,
      'update action must have a distinct dark-mode style')


# App installation storage must refer to the writable APK filesystem.
backend = (root / 'root/usr/share/rpcd/ucode/smartsafehub/apps-manager.uc').read_text()
card = (root / 'frontend/src/components/AppsStorageCard.tsx').read_text()
utils = (root / 'frontend/src/utils/appsStorage.ts').read_text()
check("fs.statvfs(mount)" in backend and "let mount = '/overlay'" in backend,
      'Apps status must read writable overlay using fs.statvfs')
check("mount = '/'" in backend, 'ext4 rootfs without /overlay requires a fallback')
# ucode type() returns "integer", never "int". The old check rejected
# all valid statvfs counters, silently producing storage: null on routers.
for counter in ('frsize', 'blocks', 'bavail'):
    check(f"type(stats.{counter}) != 'integer'" in backend and
          f"type(stats.{counter}) != 'double'" in backend and
          f"type(stats.{counter}) != 'int'" not in backend,
          f'Apps storage must accept ucode integer/double statvfs {counter}')
check('stats.bavail' in backend and 'stats.frsize' in backend and 'storage: storage' in backend,
      'optional Apps metrics must report actual APK-available bytes without spawning df')
check('read_apps_metrics()' in backend and 'return success({ job: job(), restore: restore_status(), installed: installed });' in backend,
      'critical Apps status must be separate from optional storage metrics')
check("run_command([ MANAGER, 'sizes' ], 6000)" in backend and 'try {' in backend,
      'optional APK size failures must not block status')
check('apps_metrics:' in (root / 'root/usr/share/rpcd/ucode/smartsafehub.uc').read_text(),
      'metrics RPC must be independently accessible')
import json
acl = json.loads((root / 'root/usr/share/rpcd/acl.d/luci-app-smartsafehub.json').read_text())
check('apps_metrics' in acl['luci-app-smartsafehub']['read']['ubus']['smartsafehub'],
      'critical regression: Apps metrics RPC is missing from LuCI read ACL')
check('fetchAppsMetrics' in (root / 'frontend/src/app/App.tsx').read_text() and
      'pollInterval: 60000' in (root / 'frontend/src/app/App.tsx').read_text(),
      'optional Apps metrics should run separately and less frequently')
check("'/bin/df'" not in backend, 'storage must not spawn a polling command')
check('lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]' in page,
      'Apps info and storage must be side by side on desktop and stacked on mobile')
check('<AppsStorageCard storage={metrics?.storage} />' in page,
      'Apps storage should be read from independent optional metrics')
check('stroke-dasharray=' in card and 'aria-label="앱 설치 저장 공간"' in card,
      'storage donut must be accessible and use SVG')
check('용량 정보를 확인할 수 없습니다.' in card and 'summarizeAppsStorage(storage)' in card,
      'storage errors and older RPC responses need a safe fallback')
check('storage.availableBytes > storage.totalBytes' in utils,
      'malformed storage reports must be rejected')
check(".ssh-app[data-theme='dark'] .ssh-apps-storage-track" in styles and
      "[data-level='critical']" in styles,
      'donut must support dark mode and dangerously low storage')

# Per-app size reflects the installed APK package metadata only (no du scan).
manager = (root / 'root/usr/libexec/smartsafehub-apps-manager').read_text()
check('installed_size_bytes() {' in manager and '"$APK" info -s "$@"' in manager,
      'Apps installed size should use one APK metadata lookup per app')
check('du -' not in manager and 'find /' not in manager,
      'installed size must not recursively scan the router filesystem')
check('installedSizes[fields[0]]' in backend and 'length(fields) != 2' in backend and
      'installedBytes:' not in backend and 'installedVersion:' in backend,
      'package size data must be parsed separately from the six-column status')
check('sizes) mkdir -p "$RUNTIME"; sizes;;' in manager and 'installed_size_bytes "$@"' in manager,
      'optional sizes command must report app APK totals without modifying status')
check('app_bytes=' not in manager and 'set --' not in manager.split('sizes() {')[0].split('status() {')[1],
      'status must not invoke optional size processing')
check('sizeLabel !== null' in page and '패키지 설치 용량 약 {sizeLabel}' in page,
      'installed app card must show a real size only when known')
check('Number.isSafeInteger(bytes)' in page and 'installed && typeof bytes' in page and 'metrics?.installedSizes' in page,
      'missing or invalid sizes must not be guessed')
check('캐시는 포함되지 않습니다' in page,
      'metadata size must not be misrepresented as actual overlay consumption')
check('installedVersion?: string | null' in (root / 'frontend/src/types/apps.ts').read_text(),
      'installed APK version must have a typed field')
check('installed_release="$(installed_version "$primary_package" || :)"' in manager and
      '"$update_ready" "$installed_release"' in manager,
      'current APK version must originate from installed package metadata')
check('installedVersion: length(fields) >= 7' in backend and
      'match(fields[6]' in backend,
      'RPC parser must validate installed APK version')
check('설치 v${installedVersion}' in page and '제공 v{app.version}' in page,
      'installed and approved versions must have independent labels')
check('업데이트 가능</span>' in page and '설치 버전 확인 불가' in page,
      'updates must be distinguished from unknown installed versions')

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
