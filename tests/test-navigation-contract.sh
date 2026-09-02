#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-or-later
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
APP_SHELL="$ROOT_DIR/frontend/src/components/AppShell.tsx"
NAVIGATION="$ROOT_DIR/frontend/src/components/ProductNavigation.tsx"
ICONS="$ROOT_DIR/frontend/src/components/Icons.tsx"
STYLES="$ROOT_DIR/frontend/src/styles/app.css"

fail() {
	echo "FAIL: $*" >&2
	exit 1
}

for file in "$APP_SHELL" "$NAVIGATION" "$ICONS" "$STYLES"; do
	[ -f "$file" ] || fail "missing frontend navigation source: ${file#$ROOT_DIR/}"
done

grep -Fq "const SIDEBAR_COLLAPSED_STORAGE_KEY = 'smartsafehub.sidebar.collapsed';" "$APP_SHELL" || \
	fail 'AppShell must define the persistent sidebar preference key'
grep -Fq "const THEME_STORAGE_KEY = 'smartsafehub.theme';" "$APP_SHELL" || \
	fail 'AppShell must define the persistent theme preference key'
grep -Fq "window.matchMedia('(prefers-color-scheme: dark)')" "$APP_SHELL" || \
	fail 'AppShell must use the system color preference as the initial theme'
grep -Fq 'data-theme={theme}' "$APP_SHELL" || \
	fail 'AppShell must expose the active color theme'
grep -Fq "'md:grid-cols-[5rem_minmax(0,1fr)]'" "$APP_SHELL" || \
	fail 'AppShell must provide a compact desktop sidebar column'
grep -Fq "'md:grid-cols-[16rem_minmax(0,1fr)]'" "$APP_SHELL" || \
	fail 'AppShell must provide the expanded desktop sidebar column'

grep -Fq "title={collapsed ? 'SmartSafeHub' : undefined}" "$NAVIGATION" || \
	fail 'collapsed sidebar must retain the SmartSafeHub logo mark'
grep -Fq "aria-label={collapsed ? '사이드바 펼치기' : '사이드바 접기'}" "$NAVIGATION" || \
	fail 'desktop navigation must expose an accessible sidebar toggle'
grep -Fq 'onClick={onToggleTheme}' "$NAVIGATION" || \
	fail 'navigation must expose the theme toggle'
grep -Fq 'export function MoonIcon' "$ICONS" || fail 'dark mode must provide a moon icon'
grep -Fq 'export function SunIcon' "$ICONS" || fail 'dark mode must provide a sun icon'
grep -Fq ".ssh-app[data-theme='dark']" "$STYLES" || \
	fail 'authenticated application must provide dark theme styles'

echo 'PASS: collapsible sidebar and dark theme contracts are present'
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
