#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-or-later
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
WIFI_PAGE="$ROOT_DIR/frontend/src/pages/WifiPage.tsx"
DEVICES_PAGE="$ROOT_DIR/frontend/src/pages/ConnectedDevicesPage.tsx"
APP_STYLE="$ROOT_DIR/frontend/src/styles/app.css"

fail() {
	echo "FAIL: $*" >&2
	exit 1
}

# Wi-Fi SSID and password inputs should use the same emphasized text-input surface.
count="$(grep -Fc 'border-2 border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-semibold' "$WIFI_PAGE")"
[ "$count" -ge 2 ] || \
	fail 'Wi-Fi SSID and password inputs must use the emphasized text-input surface'

grep -Fq 'shadow-inner' "$WIFI_PAGE" || \
	fail 'Wi-Fi text inputs must retain inset affordance'

grep -Fq 'focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-100' "$WIFI_PAGE" || \
	fail 'Wi-Fi text inputs must use the shared teal focus treatment'

# Wi-Fi security select should use the same visual surface as text inputs.
grep -Fq 'cursor-pointer rounded-xl border-2 border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-semibold' "$WIFI_PAGE" || \
	fail 'Wi-Fi security select must use the emphasized form-control surface'

grep -Fq 'focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-100' "$WIFI_PAGE" || \
	fail 'Wi-Fi security select must use the shared teal focus treatment'

grep -Fq '.ssh-app select {' "$APP_STYLE" || \
	fail 'all product select controls must share one normalized native-arrow override'
grep -Fq 'background-position: right 1rem center;' "$APP_STYLE" || \
	fail 'select disclosure arrow must sit farther inside the right edge'
grep -Fq 'padding-right: 3rem;' "$APP_STYLE" || \
	fail 'select controls must reserve text space for the inset disclosure arrow'

# Connected-device search follows the same search-input and icon alignment contract as custom rules.
grep -Fq 'absolute inset-y-0 left-0 flex w-11 items-center justify-center' "$DEVICES_PAGE" || \
	fail 'connected-device search icon must use a vertically centered flex wrapper'

grep -Fq 'border-2 border-slate-300 bg-slate-50 py-2.5 pr-4 pl-11 text-sm font-semibold' "$DEVICES_PAGE" || \
	fail 'connected-device search must use the emphasized text-input surface'

grep -Fq 'shadow-inner' "$DEVICES_PAGE" || \
	fail 'connected-device search must retain inset affordance'

if grep -Fq 'absolute top-1/2 left-3.5 size-5 -translate-y-1/2' "$DEVICES_PAGE"; then
	fail 'connected-device search icon must not use transform-based vertical positioning'
fi

echo 'PASS: Wi-Fi, shared select-arrow and connected-device input contracts are present'
