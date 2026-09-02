#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-or-later
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
PAGE="$ROOT_DIR/frontend/src/pages/SafeShieldPage.tsx"
PANEL="$ROOT_DIR/frontend/src/components/SafeShieldStatisticsPanel.tsx"
NAVIGATION="$ROOT_DIR/frontend/src/components/ProductNavigation.tsx"

fail() {
	echo "FAIL: $*" >&2
	exit 1
}

for file in "$PAGE" "$PANEL" "$NAVIGATION"; do
	[ -f "$file" ] || fail "missing SafeShield product UI source: ${file#$ROOT_DIR/}"
done

grep -Fq 'SafeShield 보호 상태' "$PAGE" || \
	fail 'SafeShield page must lead with the protection status'
grep -Fq 'eyebrow="Protection details"' "$PAGE" || \
	fail 'SafeShield page must provide a dedicated protection details section'
grep -Fq 'title="보호 구성"' "$PAGE" || \
	fail 'SafeShield page must group runtime, blocklist, refresh and health details'
grep -Fq 'eyebrow="Settings"' "$PAGE" || \
	fail 'SafeShield page must provide a dedicated settings section'
grep -Fq 'title="SafeShield 설정"' "$PAGE" || \
	fail 'SafeShield settings section must be clearly labeled'
grep -Fq '라이선스' "$PAGE" || fail 'SafeShield settings must retain license management'
grep -Fq 'Custom rules' "$PAGE" || fail 'SafeShield settings must expose product-facing custom rules'
grep -Fq 'href="#rules"' "$PAGE" || fail 'SafeShield settings must link to the user rules page'
if grep -Fq 'data.localOverrides.allowlistPath' "$PAGE" || grep -Fq 'data.localOverrides.blocklistPath' "$PAGE"; then
	fail 'SafeShield product UI must not expose internal local rule file paths'
fi

grep -Fq 'px-5 pb-5 sm:px-6 sm:pb-6' "$PAGE" || \
	fail 'SafeShield summary facts must remain visually inside the protection card'
grep -Fq 'gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200' "$PAGE" || \
	fail 'SafeShield summary facts must use an inset segmented surface'
grep -Fq 'class="bg-white px-5 py-4 sm:px-6"' "$PAGE" || \
	fail 'SafeShield summary fact cells must use the protection card surface color'
grep -Fq 'border-2 border-slate-300 bg-slate-50' "$PAGE" || \
	fail 'SafeShield license key field must remain visually recognizable as an input'
grep -Fq 'border border-slate-300 bg-slate-100' "$PAGE" || \
	fail 'SafeShield current license key action must remain recognizable as a button'
grep -Fq 'border border-teal-700 bg-teal-700' "$PAGE" || \
	fail 'SafeShield custom rules action must remain recognizable as a primary button'

grep -Fq 'const DISPLAY_HOURS = 24;' "$PANEL" || \
	fail 'SafeShield activity must continue to use 24 hourly buckets'
grep -Fq 'const recentTotals = buckets.reduce(' "$PANEL" || \
	fail 'SafeShield activity must derive recent totals from the displayed 24-hour buckets'
grep -Fq '최근 24시간 DNS 요청' "$PANEL" || \
	fail 'SafeShield activity must label recent DNS query totals accurately'
grep -Fq '최근 24시간 차단' "$PANEL" || \
	fail 'SafeShield activity must label recent blocked totals accurately'
grep -Fq '최근 24시간 차단율' "$PANEL" || \
	fail 'SafeShield activity must expose the recent block rate'
grep -Fq '수집 누적 DNS 요청' "$PANEL" || \
	fail 'SafeShield activity must preserve collector lifetime totals as secondary metadata'
grep -Fq "targetEnabled ? 'left-6' : 'left-1'" "$PANEL" || \
	fail 'SafeShield statistics switch thumb must use explicit left positioning for reliable alignment'
if grep -Fq "targetEnabled ? 'translate-x-6' : 'translate-x-1'" "$PANEL"; then
	fail 'SafeShield statistics switch thumb must not rely on translate positioning'
fi

echo 'PASS: SafeShield product page hierarchy and subdued sidebar toggle contract are present'
