#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-or-later
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
APP_SHELL="$ROOT_DIR/frontend/src/components/AppShell.tsx"
NAVIGATION="$ROOT_DIR/frontend/src/components/ProductNavigation.tsx"
ICONS="$ROOT_DIR/frontend/src/components/Icons.tsx"

fail() {
	echo "FAIL: $*" >&2
	exit 1
}

for file in "$APP_SHELL" "$NAVIGATION" "$ICONS"; do
	[ -f "$file" ] || fail "missing frontend navigation source: ${file#$ROOT_DIR/}"
done

grep -Fq "const SIDEBAR_COLLAPSED_STORAGE_KEY = 'smartsafehub.sidebar.collapsed';" "$APP_SHELL" || \
	fail 'AppShell must define the persistent sidebar preference key'
grep -Fq 'window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)' "$APP_SHELL" || \
	fail 'AppShell must restore the collapsed sidebar preference'
grep -Fq 'window.localStorage.setItem(' "$APP_SHELL" || \
	fail 'AppShell must persist the collapsed sidebar preference'
grep -Fq "'md:grid-cols-[5rem_minmax(0,1fr)]'" "$APP_SHELL" || \
	fail 'AppShell must provide a compact desktop sidebar column'
grep -Fq "'md:grid-cols-[16rem_minmax(0,1fr)]'" "$APP_SHELL" || \
	fail 'AppShell must provide the expanded desktop sidebar column'
grep -Fq 'collapsed={sidebarCollapsed}' "$APP_SHELL" || \
	fail 'AppShell must pass collapsed state into ProductNavigation'
grep -Fq 'onToggleCollapsed={() => setSidebarCollapsed((collapsed) => !collapsed)}' "$APP_SHELL" || \
	fail 'AppShell must wire the desktop sidebar toggle'

grep -Fq "aria-label={collapsed ? '사이드바 펼치기' : '사이드바 접기'}" "$NAVIGATION" || \
	fail 'desktop navigation must expose an accessible sidebar toggle'
grep -Fq 'title={collapsed ? item.label : undefined}' "$NAVIGATION" || \
	fail 'collapsed navigation items must retain hover labels'
grep -Fq 'data-collapsed={collapsed ? '\''true'\'' : '\''false'\''}' "$NAVIGATION" || \
	fail 'desktop sidebar must expose its collapsed state'
grep -Fq 'class="ssh-mobile-navigation' "$NAVIGATION" || \
	fail 'mobile navigation drawer must remain available'

grep -Fq 'export function PanelLeftCloseIcon' "$ICONS" || \
	fail 'collapsed navigation must provide a collapse icon'
grep -Fq 'export function PanelLeftOpenIcon' "$ICONS" || \
	fail 'collapsed navigation must provide an expand icon'

echo 'PASS: collapsible sidebar navigation contract is present'
