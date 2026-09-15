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
SCHEDULE_HOOK="$ROOT_DIR/frontend/src/hooks/useScheduledRebootSettings.ts"
BACKUP_HOOK="$ROOT_DIR/frontend/src/hooks/useConfigurationBackup.ts"
BACKUP_API="$ROOT_DIR/frontend/src/api/configurationBackup.ts"

fail() {
	echo "FAIL: $*" >&2
	exit 1
}

for file in "$APP" "$ROUTES" "$SETTINGS_PAGE" "$UPDATE_PAGE" "$NAVIGATION" "$TIME_HOOK" "$SCHEDULE_HOOK" "$BACKUP_HOOK" "$BACKUP_API"; do
	[ -f "$file" ] || fail "missing settings split source: ${file#$ROOT_DIR/}"
done

grep -Fq "const status = useStatus(route === 'home' || route === 'settings');" "$APP" || \
	fail 'system status polling must remain active on settings'
grep -Fq "const systemTime = useSystemTimeSettings(route === 'settings');" "$APP" || \
	fail 'settings route must load dedicated timezone settings'
grep -Fq "const scheduledReboot = useScheduledRebootSettings(route === 'settings');" "$APP" || \
	fail 'settings route must load scheduled reboot settings'
grep -Fq 'const configurationBackup = useConfigurationBackup();' "$APP" || \
	fail 'settings route must wire configuration backup and restore actions'
grep -Fq "case 'system':" "$APP" || fail 'update route must remain registered in App'
grep -Fq '<UpdatePage' "$APP" || fail 'system/update route must render UpdatePage'
grep -Fq "case 'settings':" "$APP" || fail 'settings route must be registered in App'
grep -Fq '<SettingsPage' "$APP" || fail 'settings route must render SettingsPage'
grep -Fq "if (route === 'system')" "$APP" || fail 'update refresh branch must exist'
grep -Fq 'void Promise.all([updates.refresh(), firmware.refresh()]);' "$APP" || fail 'update refresh must refresh software and firmware updater state together'
grep -Fq "if (route === 'settings')" "$APP" || fail 'settings refresh branch must exist'
grep -Fq 'scheduledReboot.refresh(),' "$APP" || \
	fail 'settings refresh must refresh scheduled reboot settings together with system/time state'

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
grep -Fq 'title="설정 백업 및 복원"' "$SETTINGS_PAGE" || \
	fail 'settings page must expose first-class configuration backup and restore management'
grep -Fq '설정 백업 다운로드' "$SETTINGS_PAGE" || \
	fail 'settings page must expose native configuration backup download'
grep -Fq '업로드 및 검증' "$SETTINGS_PAGE" || \
	fail 'restore flow must upload and validate an archive before confirmation'
grep -Fq '설정 복원 및 재부팅' "$SETTINGS_PAGE" || \
	fail 'restore flow must clearly communicate the reboot side effect'
grep -Fq 'Wi-Fi 비밀번호, 관리자 설정, VPN 키나 라이선스 정보' "$SETTINGS_PAGE" || \
	fail 'backup UI must warn that preserved configuration can contain secrets'
grep -Fq 'title="예약 재부팅"' "$SETTINGS_PAGE" || \
	fail 'settings page must expose scheduled reboot management'
grep -Fq 'title="공유기 재부팅"' "$SETTINGS_PAGE" || \
	fail 'router reboot must remain a first-class system management action'
grep -Fq 'title="고급 설정"' "$SETTINGS_PAGE" || \
	fail 'legacy advanced settings entry must remain inside SettingsPage'
grep -Fq "luciAdminUrl('/admin/system')" "$SETTINGS_PAGE" || \
	fail 'SettingsPage must retain the LuCI advanced-settings fallback'
grep -Fq 'LuCI 고급 설정 열기' "$SETTINGS_PAGE" || \
	fail 'LuCI fallback must be explicitly presented as an advanced action'
grep -Fq 'SmartSafeHub에서 아직 제공하지 않는 상세 시스템 설정이나 원본 로그' "$SETTINGS_PAGE" || \
	fail 'settings page must explain why LuCI fallback still exists'
if grep -Fq '설정 백업·복원 등 아직 SmartSafeHub에서 제공하지 않는' "$SETTINGS_PAGE"; then
	fail 'settings page must not send backup and restore users back to stock LuCI'
fi
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

grep -Fq "const BACKUP_DOWNLOAD_ENDPOINT = '/cgi-backup';" "$BACKUP_API" || \
	fail 'backup downloads must use the authenticated cgi-backup endpoint'
grep -Fq "const BACKUP_UPLOAD_PATH = '/tmp/smartsafehub-config-backup.tar.gz';" "$BACKUP_API" || \
	fail 'restore uploads must target the dedicated temporary archive path'
grep -Fq 'await requestConfigurationBackupValidation(file.name);' "$BACKUP_HOOK" || \
	fail 'uploaded backups must be validated by the backend before restore is enabled'
grep -Fq 'if (!validated)' "$BACKUP_HOOK" || \
	fail 'restore hook must reject attempts without a validated archive'

echo 'PASS: settings page keeps backup/restore, timezone and device management with safe system controls'
