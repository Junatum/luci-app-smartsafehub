#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-or-later
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
APP_SHELL="$ROOT_DIR/frontend/src/components/AppShell.tsx"
NAVIGATION="$ROOT_DIR/frontend/src/components/ProductNavigation.tsx"
ICONS="$ROOT_DIR/frontend/src/components/Icons.tsx"
STYLES="$ROOT_DIR/frontend/src/styles/app.css"
THEME="$ROOT_DIR/frontend/src/utils/theme.ts"

fail() {
	echo "FAIL: $*" >&2
	exit 1
}

for file in "$APP_SHELL" "$NAVIGATION" "$ICONS" "$STYLES" "$THEME"; do
	[ -f "$file" ] || fail "missing frontend navigation source: ${file#$ROOT_DIR/}"
done

grep -Fq "const SIDEBAR_COLLAPSED_STORAGE_KEY = 'smartsafehub.sidebar.collapsed';" "$APP_SHELL" || \
	fail 'AppShell must define the persistent sidebar preference key'
grep -Fq 'window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY)' "$APP_SHELL" || \
	fail 'AppShell must restore the collapsed sidebar preference'
grep -Fq 'window.localStorage.setItem(' "$APP_SHELL" || \
	fail 'AppShell must persist the collapsed sidebar preference'
grep -Fq "export const THEME_STORAGE_KEY = 'smartsafehub.theme';" "$THEME" || \
	fail 'theme utility must define the persistent theme preference key'
grep -Fq "window.matchMedia('(prefers-color-scheme: dark)')" "$THEME" || \
	fail 'theme utility must use the system color preference as the initial theme'
grep -Fq 'data-theme={theme}' "$APP_SHELL" || \
	fail 'AppShell must expose the active color theme'
grep -Fq "'md:grid-cols-[5rem_minmax(0,1fr)]'" "$APP_SHELL" || \
	fail 'AppShell must provide a compact desktop sidebar column'
grep -Fq "'md:grid-cols-[16rem_minmax(0,1fr)]'" "$APP_SHELL" || \
	fail 'AppShell must provide the expanded desktop sidebar column'
grep -Fq 'collapsed={sidebarCollapsed}' "$APP_SHELL" || \
	fail 'AppShell must pass collapsed state into ProductNavigation'
grep -Fq 'onToggleCollapsed={() => setSidebarCollapsed((collapsed) => !collapsed)}' "$APP_SHELL" || \
	fail 'AppShell must wire the desktop sidebar toggle'

grep -Fq "title={collapsed ? 'SmartSafeHub' : undefined}" "$NAVIGATION" || \
	fail 'collapsed sidebar must retain the SmartSafeHub logo mark'
grep -Fq "aria-label={collapsed ? '사이드바 펼치기' : '사이드바 접기'}" "$NAVIGATION" || \
	fail 'desktop navigation must expose an accessible sidebar toggle'
grep -Fq 'class="ssh-sidebar-toggle absolute right-0 top-20 z-20 inline-flex size-7 translate-x-1/2 -translate-y-1/2' "$NAVIGATION" || \
	fail 'sidebar toggle must stay on the brand-header/right-boundary intersection in both states'
grep -Fq 'title={collapsed ? item.label : undefined}' "$NAVIGATION" || \
	fail 'collapsed navigation items must retain hover labels'
grep -Fq 'data-collapsed={collapsed ? '\''true'\'' : '\''false'\''}' "$NAVIGATION" || \
	fail 'desktop sidebar must expose its collapsed state'
grep -Fq 'onClick={onToggleTheme}' "$NAVIGATION" || \
	fail 'navigation must expose the theme toggle'
grep -Fq 'class="ssh-mobile-navigation' "$NAVIGATION" || \
	fail 'mobile navigation drawer must remain available'

grep -Fq 'export function PanelLeftCloseIcon' "$ICONS" || \
	fail 'collapsed navigation must provide a collapse icon'
grep -Fq 'export function PanelLeftOpenIcon' "$ICONS" || \
	fail 'collapsed navigation must provide an expand icon'
grep -Fq 'export function MoonIcon' "$ICONS" || fail 'dark mode must provide a moon icon'
grep -Fq 'export function SunIcon' "$ICONS" || fail 'dark mode must provide a sun icon'

grep -Fq '.ssh-sidebar-toggle {' "$STYLES" || \
	fail 'sidebar toggle must use a dedicated low-emphasis style'
grep -Fq ".ssh-app[data-theme='dark'] .ssh-sidebar-toggle" "$STYLES" || \
	fail 'sidebar toggle must provide a dark-theme style'
grep -Fq ".ssh-app[data-theme='dark']" "$STYLES" || \
	fail 'authenticated application must provide dark theme styles'

echo 'PASS: collapsible sidebar boundary toggle and dark theme contracts are present'
