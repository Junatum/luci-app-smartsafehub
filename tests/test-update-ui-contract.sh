#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-or-later
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
UPDATES_CARD="$ROOT_DIR/frontend/src/components/SoftwareUpdatesCard.tsx"
FIRMWARE_CARD="$ROOT_DIR/frontend/src/components/FirmwareUpdatesCard.tsx"
FIRMWARE_HOOK="$ROOT_DIR/frontend/src/hooks/useFirmwareUpdates.ts"
FIRMWARE_UPLOAD="$ROOT_DIR/frontend/src/api/firmwareUpload.ts"
UPDATE_PAGE="$ROOT_DIR/frontend/src/pages/UpdatePage.tsx"
SETTINGS_PAGE="$ROOT_DIR/frontend/src/pages/SettingsPage.tsx"
UPDATES_HOOK="$ROOT_DIR/frontend/src/hooks/useSoftwareUpdates.ts"
ASYNC_RESOURCE="$ROOT_DIR/frontend/src/hooks/useAsyncResource.ts"
APP_CSS="$ROOT_DIR/frontend/src/styles/app.css"

fail() {
	echo "FAIL: $*" >&2
	exit 1
}

for file in "$UPDATES_CARD" "$FIRMWARE_CARD" "$FIRMWARE_HOOK" "$FIRMWARE_UPLOAD" "$UPDATE_PAGE" "$SETTINGS_PAGE" "$UPDATES_HOOK" "$ASYNC_RESOURCE" "$APP_CSS"; do
	[ -f "$file" ] || fail "missing required file: ${file#$ROOT_DIR/}"
done

# Update status should read as a product summary instead of a package-manager panel.
grep -Fq 'SmartSafeHub 업데이트' "$UPDATES_CARD" || \
	fail 'update card must expose the SmartSafeHub update heading'
for label in Installed Available 'Last check' 'Auto install'; do
	grep -Fq "$label" "$UPDATES_CARD" || \
		fail "update summary must include $label"
done

grep -Fq '업데이트 확인' "$UPDATES_CARD" || \
	fail 'update card must provide an explicit check action'
grep -Fq 'ReloadIcon class="size-4"' "$UPDATES_CARD" || \
	fail 'update card check actions must use the shared reload icon'
if grep -Fq 'LoaderIcon' "$UPDATES_CARD" || grep -Fq 'RefreshIcon' "$UPDATES_CARD"; then
	fail 'update card must not mix legacy loading or refresh icons'
fi
grep -Fq '업데이트 설치' "$UPDATES_CARD" || \
	fail 'update card must provide an explicit install action'

# Busy update work should have persistent visual feedback rather than relying on hover text.
grep -Fq "const installing = action === 'install' || data?.phase === 'installing';" "$UPDATES_CARD" || \
	fail 'update card must track installing state explicitly'
grep -Fq 'function updatePhaseIcon(data: SoftwareUpdateStatus)' "$UPDATES_CARD" || \
	fail 'update card must provide an explicit status icon for each update phase'
grep -Fq 'ReloadIcon class="size-3.5 shrink-0 animate-spin"' "$UPDATES_CARD" || \
	fail 'checking/installing status badge must spin the shared reload icon'
grep -Fq "{installing ? '설치 중...' : '업데이트 설치'}" "$UPDATES_CARD" || \
	fail 'install button must expose an installing label'
grep -Fq 'aria-busy="true"' "$UPDATES_CARD" || \
	fail 'installing update panel must expose busy state to assistive technology'
grep -Fq 'ssh-update-progress-track' "$UPDATES_CARD" || \
	fail 'installing update panel must include indeterminate progress feedback'
grep -Fq '설치가 완료되면 이 화면이 자동으로 갱신됩니다.' "$UPDATES_CARD" || \
	fail 'installing copy must explain automatic status refresh'
grep -Fq '@keyframes ssh-update-progress' "$APP_CSS" || \
	fail 'update progress indicator must define an indeterminate animation'
if grep -Fq '완료 후 화면을 새로고침해 주세요.' "$UPDATES_HOOK"; then
	fail 'install start feedback must not ask the user to refresh manually'
fi

# Repository and install failures should show product-friendly summaries while preserving raw details.
grep -Fq "error.code === 'UPDATES_INDEX_REFRESH_FAILED'" "$UPDATES_CARD" || \
	fail 'repository refresh errors must have a dedicated product summary'
grep -Fq '패키지 저장소를 확인하지 못했습니다.' "$UPDATES_CARD" || \
	fail 'repository errors must render a user-facing summary'
grep -Fq '상세 정보 보기' "$UPDATES_CARD" || \
	fail 'raw updater failure details must stay available behind a disclosure'
grep -Fq 'phase, lastError: null' "$UPDATES_HOOK" || \
	fail 'starting a new update action must clear stale failure feedback immediately'
grep -Fq '{data.lastError.message}' "$UPDATES_CARD" || \
	fail 'raw updater error must remain available in the details disclosure'

# An unchecked repository state must stay neutral and must not be presented as current.
grep -Fq "return data.lastCheckAt ? '최신 상태' : '확인 전';" "$UPDATES_CARD" || \
	fail 'update badge must distinguish unchecked state from current state'
grep -Fq "if (!data.lastCheckAt)" "$UPDATES_CARD" || \
	fail 'unchecked update badge must use a dedicated neutral style'
grep -Fq "? '미확인'" "$UPDATES_CARD" || \
	fail 'available version must remain unknown before the first successful check'
grep -Fq "data.lastError?.code === 'UPDATES_INDEX_REFRESH_FAILED'" "$UPDATES_CARD" || \
	fail 'repository refresh failure must keep unavailable version information explicitly unknown'
grep -Fq "repositoryCheckFailed && !currentPackage?.updateAvailable" "$UPDATES_CARD" || \
	fail 'failed repository refresh must not present an unknown available version as current'
grep -Fq ') : data.lastCheckAt ? (' "$UPDATES_CARD" || \
	fail 'current-version success notice must require a completed update check'
grep -Fq '업데이트 상태를 아직 확인하지 않았습니다.' "$UPDATES_CARD" || \
	fail 'unchecked update state must render a neutral explanatory notice'
grep -Fq 'ReloadIcon class="size-5"' "$UPDATES_CARD" || \
	fail 'unchecked update state notice must use the shared reload icon'
grep -Fq '지금 확인' "$UPDATES_CARD" || \
	fail 'unchecked update state must offer an explicit check action'

# Scheduled update controls use the same emphasized form-control surface as Wi-Fi/rules.
grep -Fq 'cursor-pointer rounded-xl border-2 border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-semibold' "$UPDATES_CARD" || \
	fail 'update interval select must use the emphasized form-control surface'
grep -Fq 'rounded-xl border-2 border-slate-300 bg-slate-50 py-2.5 pr-4 pl-11 text-sm font-semibold' "$UPDATES_CARD" || \
	fail 'auto-install time input must use the emphasized form-control surface'
grep -Fq 'focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-100' "$UPDATES_CARD" || \
	fail 'update form controls must use the shared teal focus treatment'

# Switches should have an explicit right/left thumb position rather than a browser checkbox.
grep -Fq 'role="switch"' "$UPDATES_CARD" || \
	fail 'automatic update settings must use switch controls'
grep -Fq "checked ? 'left-6' : 'left-1'" "$UPDATES_CARD" || \
	fail 'update switch thumb must use explicit left positioning'
grep -Fq 'ssh-switch-control' "$UPDATES_CARD" || \
	fail 'update switches must use fixed shared geometry on narrow screens'
grep -Fq 'ssh-switch-thumb' "$UPDATES_CARD" || \
	fail 'update switch thumbs must use the theme-safe shared circle style'
if grep -Fq 'type="checkbox"' "$UPDATES_CARD"; then
	fail 'legacy checkbox controls must not remain in the update settings panel'
fi

# The current update channel should be visible without exposing repository implementation details.
grep -Fq '업데이트 채널' "$UPDATES_CARD" || \
	fail 'update settings must show the current update channel'
grep -Fq 'updateChannelLabel(data.settings.channel)' "$UPDATES_CARD" || \
	fail 'update channel display must use the channel returned by updates_status'
grep -Fq "return 'Stable';" "$UPDATES_CARD" || \
	fail 'stable update channel must have a product label'
grep -Fq "return 'Beta';" "$UPDATES_CARD" || \
	fail 'beta update channel must have a product label'

# Internal package/repository implementation details should not be rendered as product UI text.
if grep -Fq '저장소:' "$UPDATES_CARD"; then
	fail 'repository host must not be exposed in the product update UI'
fi
if grep -Fq '<p class="mt-1 mb-0 break-all text-xs text-slate-500">{item.name}</p>' "$UPDATES_CARD"; then
	fail 'internal package name must not be rendered in the product update UI'
fi


# Update status polling should be conservative while idle, pause in hidden tabs,
# refresh when the UI becomes active again, and poll active checks/installations until they finish.
grep -Fq 'const BACKGROUND_POLL_INTERVAL_MS = 5 * 60_000;' "$UPDATES_HOOK" || \
	fail 'software update background polling must use a five-minute interval'
grep -Fq 'const CHECK_POLL_INTERVAL_MS = 1_000;' "$UPDATES_HOOK" || \
	fail 'software update checking polling must use a one-second interval'
grep -Fq 'const INSTALL_POLL_INTERVAL_MS = 3_000;' "$UPDATES_HOOK" || \
	fail 'software update installation polling must use a three-second interval'
grep -Fq "if (data?.phase === 'checking')" "$UPDATES_HOOK" || \
	fail 'software update checking must use active polling until the phase changes'
grep -Fq 'return CHECK_POLL_INTERVAL_MS;' "$UPDATES_HOOK" || \
	fail 'software update checking must return the short checking poll interval'
grep -Fq "data?.phase === 'installing'" "$UPDATES_HOOK" || \
	fail 'software update installation must keep using active polling until completion'
grep -Fq 'refreshOnFocus: true' "$UPDATES_HOOK" || \
	fail 'software updates must refresh when the browser window regains focus'
grep -Fq "document.addEventListener('visibilitychange', handleVisibilityChange);" "$ASYNC_RESOURCE" || \
	fail 'async polling must react to document visibility changes'
grep -Fq "window.addEventListener('focus', handleFocus);" "$ASYNC_RESOURCE" || \
	fail 'async polling must support focus-based refresh'
grep -Fq "window.removeEventListener('focus', handleFocus);" "$ASYNC_RESOURCE" || \
	fail 'focus refresh listener must be removed during cleanup'
grep -Fq "document.visibilityState === 'hidden'" "$ASYNC_RESOURCE" || \
	fail 'async polling must avoid scheduling requests while the document is hidden'
grep -Fq 'const millisecondsUntilStale = () =>' "$ASYNC_RESOURCE" || \
	fail 'visibility/focus refresh must be gated by the polling staleness interval'
grep -Fq 'if (millisecondsUntilStale() > 0)' "$ASYNC_RESOURCE" || \
	fail 'focus refresh must reschedule instead of reloading fresh data'
if grep -Fq "resource.error?.trim().toLowerCase() === 'access denied'" "$UPDATES_HOOK"; then
	fail 'update polling must rely on global session-expiry handling instead of page reload loops'
fi
grep -Fq 'installedVersion !== loadedAssetVersion' "$UPDATES_HOOK" || \
	fail 'completed self-updates must detect when the browser is running stale assets'
grep -Fq 'window.location.reload();' "$UPDATES_HOOK" || \
	fail 'self-update completion must reload the SmartSafeHub entry once for fresh assets'
grep -Fq 'const lastObservedInstallAt = useRef<number | null | undefined>(undefined);' "$UPDATES_HOOK" || \
	fail 'self-update reload must track the install completion timestamp per mounted page'
grep -Fq 'if (reloadRequested.current || !resource.data)' "$UPDATES_HOOK" || \
	fail 'empty initial update data must not seed the self-update reload baseline'
grep -Fq 'const lastInstallAt = resource.data.lastInstallAt ?? null;' "$UPDATES_HOOK" || \
	fail 'self-update baseline must be derived only from a real update-status response'
grep -Fq 'if (previousLastInstallAt === undefined)' "$UPDATES_HOOK" || \
	fail 'the first real update state must establish a baseline without reloading'
grep -Fq 'lastObservedInstallAt.current = lastInstallAt;' "$UPDATES_HOOK" || \
	fail 'self-update reload must remember the latest observed install timestamp'
grep -Fq 'lastInstallAt === previousLastInstallAt' "$UPDATES_HOOK" || \
	fail 'unchanged install timestamps must not trigger another automatic reload'
grep -Fq "resource.data.phase !== 'idle'" "$UPDATES_HOOK" || \
	fail 'asset reload must only happen after the updater returns to idle'
if grep -Fq 'resource.data?.lastInstallAt ?? null' "$UPDATES_HOOK"; then
	fail 'data=null must not be converted into a fake lastInstallAt baseline'
fi

# Software and OpenWrt firmware updates share the product update page while remaining separate subsystems.
grep -Fq '<SoftwareUpdatesCard' "$UPDATE_PAGE" || \
	fail 'update page must render the software update experience'
grep -Fq '<FirmwareUpdatesCard' "$UPDATE_PAGE" || \
	fail 'update page must render the OpenWrt firmware update experience'
grep -Fq 'OpenWrt 펌웨어' "$FIRMWARE_CARD" || \
	fail 'firmware card must expose a dedicated OpenWrt firmware heading'
grep -Fq '다운로드 및 검증' "$FIRMWARE_CARD" || \
	fail 'online firmware updates must download and verify before installation'
grep -Fq '펌웨어 파일 직접 업로드' "$FIRMWARE_CARD" || \
	fail 'firmware card must support manual sysupgrade image upload'
grep -Fq '현재 설정 유지' "$FIRMWARE_CARD" || \
	fail 'firmware install confirmation must expose the keep-settings choice'
grep -Fq '강제 설치는 제공하지 않으며' "$FIRMWARE_CARD" || \
	fail 'firmware UI must clearly avoid force-upgrade behavior'
grep -Fq "const FIRMWARE_UPLOAD_PATH = '/tmp/smartsafehub-firmware.bin';" "$FIRMWARE_UPLOAD" || \
	fail 'manual firmware upload must use the dedicated temporary image path'
grep -Fq "request.open('POST', luciUrl('/cgi-upload'));" "$FIRMWARE_UPLOAD" || \
	fail 'manual firmware upload must use LuCI cgi-upload with the active session'
grep -Fq 'const ACTIVE_POLL_INTERVAL_MS = 1_000;' "$FIRMWARE_HOOK" || \
	fail 'firmware check/download/validation phases must be actively polled'
grep -Fq 'const RECONNECT_INITIAL_DELAY_MS = 15_000;' "$FIRMWARE_HOOK" || \
	fail 'firmware install must wait for sysupgrade reboot before probing the router'
grep -Fq 'window.location.reload();' "$FIRMWARE_HOOK" || \
	fail 'firmware install must reload the UI after the router becomes reachable again'
if grep -Fq '시스템 상태' "$UPDATE_PAGE" || grep -Fq '시스템 관리' "$UPDATE_PAGE"; then
	fail 'update page must not mix system status or management controls'
fi
grep -Fq '시스템 상태' "$SETTINGS_PAGE" || \
	fail 'settings page must own system status'
grep -Fq '시스템 관리' "$SETTINGS_PAGE" || \
	fail 'settings page must own system management actions'

echo 'PASS: product update summary, actions, form controls, switches and page separation are consistent'
