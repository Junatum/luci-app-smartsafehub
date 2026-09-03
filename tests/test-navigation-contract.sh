#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-or-later
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
APP_SHELL="$ROOT_DIR/frontend/src/components/AppShell.tsx"
NAVIGATION="$ROOT_DIR/frontend/src/components/ProductNavigation.tsx"
HEADER="$ROOT_DIR/frontend/src/components/ProductHeader.tsx"
ICONS="$ROOT_DIR/frontend/src/components/Icons.tsx"
STYLES="$ROOT_DIR/frontend/src/styles/app.css"
THEME="$ROOT_DIR/frontend/src/utils/theme.ts"

fail() {
	echo "FAIL: $*" >&2
	exit 1
}

for file in "$APP_SHELL" "$NAVIGATION" "$HEADER" "$ICONS" "$STYLES" "$THEME"; do
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
[ "$(grep -Fc 'onClick={onToggleTheme}' "$NAVIGATION")" -eq 1 ] || \
	fail 'mobile navigation must expose exactly one top-level theme toggle'
grep -Fq 'class="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600' "$NAVIGATION" || \
	fail 'mobile theme toggle must be an icon button next to the hamburger menu'
grep -Fq 'aria-controls="smartsafehub-mobile-menu"' "$NAVIGATION" || \
	fail 'mobile hamburger menu control must remain available'
[ "$(grep -Fc 'onClick={onToggleTheme}' "$HEADER")" -eq 1 ] || \
	fail 'desktop product header must expose exactly one theme toggle'
grep -Fq 'md:inline-flex' "$HEADER" || \
	fail 'desktop header theme toggle must be hidden below the desktop breakpoint'
grep -Fq "theme === 'dark' ? <SunIcon" "$HEADER" || \
	fail 'desktop header theme toggle must switch between sun and moon icons'
grep -Fq "onToggleTheme={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}" "$APP_SHELL" || \
	fail 'AppShell must wire the desktop header theme action'
[ "$(grep -Fc 'onRefresh={onRefresh}' "$APP_SHELL")" -eq 2 ] || \
	fail 'AppShell must wire refresh actions into both mobile navigation and desktop header'
grep -Fq 'loading={loading}' "$APP_SHELL" || \
	fail 'AppShell must pass loading state to mobile refresh control'
grep -Fq 'refreshing={refreshing}' "$APP_SHELL" || \
	fail 'AppShell must pass refreshing state to mobile refresh control'
[ "$(grep -Fc 'aria-label={`${themeLabel}로 전환`}' "$NAVIGATION")" -eq 1 ] || \
	fail 'theme action must not remain duplicated inside sidebar or mobile drawer menus'
[ "$(grep -Fc 'onClick={onRefresh}' "$HEADER")" -eq 1 ] || \
	fail 'desktop product header must expose exactly one refresh action'
grep -Fq 'class={`hidden size-10 shrink-0 items-center justify-center rounded-xl' "$HEADER" || \
	fail 'desktop refresh action must be an icon-only header button'
grep -Fq "size-4.5 \${refreshing ? 'animate-spin' : ''}" "$HEADER" || \
	fail 'desktop refresh icon must animate while refreshing'
if grep -Fq '<span class="hidden sm:inline">' "$HEADER"; then
	fail 'desktop refresh action must not restore a visible text label'
fi
[ "$(grep -Fc 'onClick={onRefresh}' "$NAVIGATION")" -eq 1 ] || \
	fail 'mobile top navigation must expose exactly one refresh action'
grep -Fq 'disabled={loading || refreshing}' "$NAVIGATION" || \
	fail 'mobile refresh action must prevent duplicate requests while loading or refreshing'
grep -Fq "size-5 \${refreshing ? 'animate-spin' : ''}" "$NAVIGATION" || \
	fail 'mobile refresh icon must animate while refreshing'
theme_action_line="$(grep -n 'onClick={onToggleTheme}' "$NAVIGATION" | cut -d: -f1)"
refresh_action_line="$(grep -n 'onClick={onRefresh}' "$NAVIGATION" | cut -d: -f1)"
menu_action_line="$(grep -n 'aria-controls="smartsafehub-mobile-menu"' "$NAVIGATION" | head -n 1 | cut -d: -f1)"
[ "$theme_action_line" -lt "$refresh_action_line" ] && [ "$refresh_action_line" -lt "$menu_action_line" ] || \
	fail 'mobile header actions must remain ordered as theme, refresh, then hamburger menu'
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

echo 'PASS: collapsible sidebar, header theme actions and dark theme contracts are present'
