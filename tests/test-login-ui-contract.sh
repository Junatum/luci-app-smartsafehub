#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-or-later
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
LOGIN="$ROOT_DIR/frontend/src/login/LoginApp.tsx"
THEME="$ROOT_DIR/frontend/src/utils/theme.ts"
APP_SHELL="$ROOT_DIR/frontend/src/components/AppShell.tsx"
ICONS="$ROOT_DIR/frontend/src/components/Icons.tsx"
STYLES="$ROOT_DIR/frontend/src/styles/app.css"

fail() {
	echo "FAIL: $*" >&2
	exit 1
}

for file in "$LOGIN" "$THEME" "$APP_SHELL" "$ICONS" "$STYLES"; do
	[ -f "$file" ] || fail "missing login UI source: ${file#$ROOT_DIR/}"
done

grep -Fq "const [username, setUsername] = useState('root');" "$LOGIN" || \
	fail 'login must keep an editable default LuCI username'
grep -Fq 'autoComplete="username"' "$LOGIN" || \
	fail 'username field must expose browser username autocomplete'
grep -Fq 'name="username"' "$LOGIN" || \
	fail 'username field must expose a stable form name for password managers'
grep -Fq 'autoComplete="current-password"' "$LOGIN" || \
	fail 'password field must expose current-password autocomplete'
grep -Fq 'name="password"' "$LOGIN" || \
	fail 'password field must expose a stable form name for password managers'
grep -Fq 'onSubmit={submit}' "$LOGIN" || \
	fail 'login credentials must be submitted through a form for Enter-key support'
grep -Fq 'usernameInput.current?.focus()' "$LOGIN" || \
	fail 'empty username validation must restore focus to the username field'
grep -Fq 'aria-label={showPassword ? '\''비밀번호 숨기기'\'' : '\''비밀번호 표시'\''}' "$LOGIN" || \
	fail 'password visibility control must remain accessible'
grep -Fq '<EyeOffIcon /> : <EyeIcon />' "$LOGIN" || \
	fail 'password visibility control must use a clear icon affordance'
grep -Fq 'data-theme={theme}' "$LOGIN" || \
	fail 'public login must expose its selected color theme'
grep -Fq 'class="ssh-login-theme-toggle"' "$LOGIN" || \
	fail 'public login must provide a light/dark theme toggle'
grep -Fq 'persistColorTheme(theme);' "$LOGIN" || \
	fail 'public login must persist the shared theme preference'
grep -Fq 'applyDocumentTheme(theme);' "$LOGIN" || \
	fail 'public login must update document theme metadata'
grep -Fq 'applyDocumentTheme(readColorTheme());' "$ROOT_DIR/frontend/src/main.tsx" || \
	fail 'public entry must apply the saved theme before session probing/rendering'

grep -Fq "export const THEME_STORAGE_KEY = 'smartsafehub.theme';" "$THEME" || \
	fail 'login and authenticated app must share one theme preference key'
grep -Fq "window.matchMedia('(prefers-color-scheme: dark)')" "$THEME" || \
	fail 'theme utility must fall back to the system color preference'
grep -Fq 'persistColorTheme(theme);' "$APP_SHELL" || \
	fail 'authenticated AppShell must use the shared theme persistence helper'
grep -Fq 'applyDocumentTheme(theme);' "$APP_SHELL" || \
	fail 'authenticated AppShell must use the shared document theme helper'

grep -Fq 'export function EyeIcon' "$ICONS" || \
	fail 'login password control must provide an eye icon'
grep -Fq 'export function EyeOffIcon' "$ICONS" || \
	fail 'login password control must provide an eye-off icon'
grep -Fq 'border: 2px solid var(--ssh-login-border-strong);' "$STYLES" || \
	fail 'login text inputs must use the same strong product form-control border'
grep -Fq ".ssh-login-page[data-theme='dark']" "$STYLES" || \
	fail 'public login must provide a dark theme palette'
grep -Fq '.ssh-login-theme-toggle {' "$STYLES" || \
	fail 'public login must style its theme toggle as a secondary control'

echo 'PASS: login account, password and theme contracts are consistent'
