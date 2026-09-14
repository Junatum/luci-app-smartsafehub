#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-or-later
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
APP="$ROOT_DIR/frontend/src/app/App.tsx"
ROUTES="$ROOT_DIR/frontend/src/app/routes.ts"
SETTINGS_PAGE="$ROOT_DIR/frontend/src/pages/SettingsPage.tsx"
UPDATE_PAGE="$ROOT_DIR/frontend/src/pages/UpdatePage.tsx"
NAVIGATION="$ROOT_DIR/frontend/src/components/ProductNavigation.tsx"
TIME_HOOK="$ROOT_DIR/frontend/src/hooks/useSystemTimeSettings.ts"

fail() {
	echo "FAIL: $*" >&2
	exit 1
}

for file in "$APP" "$ROUTES" "$SETTINGS_PAGE" "$UPDATE_PAGE" "$NAVIGATION" "$TIME_HOOK"; do
	[ -f "$file" ] || fail "missing settings split source: ${file#$ROOT_DIR/}"
done

grep -Fq "const status = useStatus(route === 'home' || route === 'settings');" "$APP" || \
	fail 'system status polling must remain active on settings'
grep -Fq "const systemTime = useSystemTimeSettings(route === 'settings');" "$APP" || \
	fail 'settings route must load dedicated timezone settings'
grep -Fq "case 'system':" "$APP" || fail 'update route must remain registered in App'
grep -Fq '<UpdatePage' "$APP" || fail 'system/update route must render UpdatePage'
grep -Fq "case 'settings':" "$APP" || fail 'settings route must be registered in App'
grep -Fq '<SettingsPage' "$APP" || fail 'settings route must render SettingsPage'
grep -Fq "if (route === 'system')" "$APP" || fail 'update refresh branch must exist'
grep -Fq 'void Promise.all([updates.refresh(), firmware.refresh()]);' "$APP" || fail 'update refresh must refresh software and firmware updater state together'
grep -Fq "if (route === 'settings')" "$APP" || fail 'settings refresh branch must exist'
grep -Fq 'void Promise.all([status.refresh(), systemTime.refresh()]);' "$APP" || \
	fail 'settings refresh must refresh both system state and timezone settings'

grep -Fq "label: '설정'" "$ROUTES" || fail 'settings route must be visible in product navigation'
grep -Fq "description: '기기의 펌웨어와 관리 소프트웨어 업데이트를 관리합니다.'" "$ROUTES" || \
	fail 'update route description must remain update-only'
grep -Fq "description: '시스템 상태와 시간대를 확인하고 장치 관리 및 진단 기능을 설정합니다.'" "$ROUTES" || \
	fail 'settings route description must describe timezone and device management'

if grep -Fq 'title="업데이트 관리"' "$SETTINGS_PAGE"; then
	fail 'settings page must not duplicate the dedicated update-page navigation card'
fi
if grep -Fq 'href="#system"' "$SETTINGS_PAGE"; then
	fail 'settings page must not retain a redundant update-page shortcut'
fi
grep -Fq 'title="시간 및 시간대"' "$SETTINGS_PAGE" || \
	fail 'settings page must expose time and timezone controls'
grep -Fq "'지금 동기화'" "$SETTINGS_PAGE" || \
	fail 'settings page must expose immediate NTP synchronization'
grep -Fq 'title="진단 및 지원"' "$SETTINGS_PAGE" || \
	fail 'diagnostic download must be grouped as diagnostic and support functionality'
grep -Fq 'title="공유기 재부팅"' "$SETTINGS_PAGE" || \
	fail 'router reboot must remain a first-class system management action'
grep -Fq 'title="고급 설정"' "$SETTINGS_PAGE" || \
	fail 'legacy advanced settings entry must remain inside SettingsPage'
grep -Fq "luciAdminUrl('/admin/system')" "$SETTINGS_PAGE" || \
	fail 'SettingsPage must retain the LuCI advanced-settings fallback'
grep -Fq 'LuCI 고급 설정 열기' "$SETTINGS_PAGE" || \
	fail 'LuCI fallback must be explicitly presented as an advanced action'
grep -Fq 'SmartSafeHub에서 아직 제공하지 않는' "$SETTINGS_PAGE" || \
	fail 'settings page must explain why LuCI fallback still exists'
if grep -Fq "luciAdminUrl('/admin/system/flash')" "$SETTINGS_PAGE"; then
	fail 'settings page must not send firmware upgrades to the stock LuCI flash page'
fi
if grep -Fq '고급 설정' "$NAVIGATION"; then
	fail 'navigation chrome must not keep the old standalone advanced-settings menu'
fi
if grep -Fq 'SoftwareUpdatesCard' "$SETTINGS_PAGE"; then
	fail 'settings page must not embed the software update experience'
fi

grep -Fq 'Device settings' "$SETTINGS_PAGE" || \
	fail 'settings page must visually separate device settings from system management'
grep -Fq 'System management' "$SETTINGS_PAGE" || \
	fail 'settings page must retain a dedicated system management section'
grep -Fq 'grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2' "$SETTINGS_PAGE" || \
	fail 'settings action groups must use responsive two-column layout on desktop'

echo 'PASS: settings page keeps timezone-focused device settings with immediate NTP synchronization'
