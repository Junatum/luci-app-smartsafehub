#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-or-later
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
UPDATES_CARD="$ROOT_DIR/frontend/src/components/SoftwareUpdatesCard.tsx"
UPDATE_PAGE="$ROOT_DIR/frontend/src/pages/UpdatePage.tsx"
SETTINGS_PAGE="$ROOT_DIR/frontend/src/pages/SettingsPage.tsx"

fail() {
	echo "FAIL: $*" >&2
	exit 1
}

for file in "$UPDATES_CARD" "$UPDATE_PAGE" "$SETTINGS_PAGE"; do
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
grep -Fq '업데이트 설치' "$UPDATES_CARD" || \
	fail 'update card must provide an explicit install action'

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
if grep -Fq 'type="checkbox"' "$UPDATES_CARD"; then
	fail 'legacy checkbox controls must not remain in the update settings panel'
fi

# Internal package/repository implementation details should not be rendered as product UI text.
if grep -Fq '저장소:' "$UPDATES_CARD"; then
	fail 'repository host must not be exposed in the product update UI'
fi
if grep -Fq '<p class="mt-1 mb-0 break-all text-xs text-slate-500">{item.name}</p>' "$UPDATES_CARD"; then
	fail 'internal package name must not be rendered in the product update UI'
fi

# Update and device/system management are separate product pages.
grep -Fq '<SoftwareUpdatesCard' "$UPDATE_PAGE" || \
	fail 'update page must render the software update experience'
if grep -Fq '시스템 상태' "$UPDATE_PAGE" || grep -Fq '시스템 관리' "$UPDATE_PAGE"; then
	fail 'update page must not mix system status or management controls'
fi
grep -Fq '시스템 상태' "$SETTINGS_PAGE" || \
	fail 'settings page must own system status'
grep -Fq '시스템 관리' "$SETTINGS_PAGE" || \
	fail 'settings page must own system management actions'

echo 'PASS: product update summary, actions, form controls, switches and page separation are consistent'
