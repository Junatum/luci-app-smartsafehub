#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-or-later
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
RPC_ENTRY="$ROOT_DIR/root/usr/share/rpcd/ucode/smartsafehub.uc"
SYSTEM_RPC="$ROOT_DIR/root/usr/share/rpcd/ucode/smartsafehub/system.uc"
ACTIVITY_RPC="$ROOT_DIR/root/usr/share/rpcd/ucode/smartsafehub/activity.uc"
ACL="$ROOT_DIR/root/usr/share/rpcd/acl.d/luci-app-smartsafehub.json"
APP="$ROOT_DIR/frontend/src/app/App.tsx"
ROUTES="$ROOT_DIR/frontend/src/app/routes.ts"
HASH_ROUTE="$ROOT_DIR/frontend/src/hooks/useHashRoute.ts"
NAVIGATION="$ROOT_DIR/frontend/src/components/ProductNavigation.tsx"
HOME="$ROOT_DIR/frontend/src/pages/HomePage.tsx"
PAGE="$ROOT_DIR/frontend/src/pages/ActivityPage.tsx"
TIMELINE="$ROOT_DIR/frontend/src/components/ActivityTimeline.tsx"
HOOK="$ROOT_DIR/frontend/src/hooks/useActivityHistory.ts"
API="$ROOT_DIR/frontend/src/api/smartsafehub.ts"
EVENTS="$ROOT_DIR/root/usr/libexec/smartsafehub-events"

fail() {
	printf 'FAIL: %s\n' "$*" >&2
	exit 1
}

for file in "$RPC_ENTRY" "$SYSTEM_RPC" "$ACTIVITY_RPC" "$ACL" "$APP" "$ROUTES" "$HASH_ROUTE" "$NAVIGATION" "$HOME" "$PAGE" "$TIMELINE" "$HOOK" "$API" "$EVENTS"; do
	[ -f "$file" ] || fail "missing activity history source: ${file#$ROOT_DIR/}"
done

grep -Fq 'include_activity_history: false' "$RPC_ENTRY" || \
	fail 'existing status RPC must expose the optional activity-history flag'
grep -Fq 'activity_limit: 128' "$RPC_ENTRY" || \
	fail 'existing status RPC must expose the bounded activity-history limit'
if grep -Eq '^[[:space:]]*activity_history:[[:space:]]*\{' "$RPC_ENTRY"; then
	fail 'recent activity must not add a standalone RPC method that requires a new session ACL'
fi
if jq -e '."luci-app-smartsafehub".read.ubus.smartsafehub | index("activity_history") != null' "$ACL" >/dev/null; then
	fail 'recent activity must reuse the existing status ACL instead of adding a new ACL method'
fi
grep -Fq "import { read_activity_history } from './activity.uc';" "$SYSTEM_RPC" || \
	fail 'system status module must compose the local activity history'
grep -Fq 'result.data.activityHistory = activity_result.data;' "$SYSTEM_RPC" || \
	fail 'status RPC must attach activity history only when requested'

grep -Fq "const ACTIVITY_HISTORY_FILE = '/tmp/smartsafehub/activity-history.jsonl';" "$ACTIVITY_RPC" || \
	fail 'RPC must read the dedicated volatile local history'
grep -Fq "const LEGACY_EVENTS_FILE = '/tmp/smartsafehub/events.jsonl';" "$ACTIVITY_RPC" || \
	fail 'RPC must retain an r8 outbox fallback during upgrade'
grep -Fq "scope: 'current_boot'" "$ACTIVITY_RPC" || \
	fail 'RPC must describe the local history as current-boot scope'
grep -Fq 'volatile: true' "$ACTIVITY_RPC" || \
	fail 'RPC must tell the UI that local activity history is volatile'
grep -Fq 'MAX_ACTIVITY_EVENTS = 128' "$ACTIVITY_RPC" || \
	fail 'RPC must cap the local activity response to 128 events'
grep -Fq 'for (let index = length(history) - 1;' "$ACTIVITY_RPC" || \
	fail 'RPC must return newest activity first'

grep -Fq 'HISTORY_FILE="${SMARTSAFEHUB_EVENTS_HISTORY_FILE:-$RUNTIME_DIR/activity-history.jsonl}"' "$EVENTS" || \
	fail 'event writer must keep a local history separate from the Cloud outbox'
grep -Fq 'append_bounded_event "$HISTORY_FILE"' "$EVENTS" || \
	fail 'every normalized event must be appended to local history'
grep -Fq 'append_bounded_event "$EVENTS_FILE"' "$EVENTS" || \
	fail 'every normalized event must continue to enter the Cloud outbox'
grep -Fq 'awk -v needle="$needle"' "$EVENTS" || \
	fail 'ack must continue to operate on the Cloud outbox'
if grep -A18 '^ack_event()' "$EVENTS" | grep -Fq '"$HISTORY_FILE"'; then
	fail 'outbox ack must never delete local UI history'
fi

grep -Fq "| 'activity'" "$ROUTES" || fail 'activity route must be part of AppRoute'
grep -Fq "route: 'activity'" "$ROUTES" || fail 'recent activity route must be registered'
grep -Fq "hash: '#activity'" "$ROUTES" || fail 'recent activity route must use #activity'
grep -Fq "'#activity': 'activity'" "$HASH_ROUTE" || fail 'hash router must resolve #activity'
grep -Fq "{ label: 'Overview', routes: ['home', 'activity'] }" "$NAVIGATION" || \
	fail 'recent activity must sit directly below Dashboard in Overview'
grep -Fq "case 'activity':" "$NAVIGATION" || fail 'recent activity navigation item must have its own icon'

grep -Fq "const activity = useActivityHistory(route === 'home' || route === 'activity');" "$APP" || \
	fail 'activity data must load on both Dashboard and the full recent-activity page'
grep -Fq '<ActivityPage' "$APP" || fail 'App must render the full recent-activity page'
grep -Fq 'activity={activity.data}' "$APP" || fail 'Dashboard must receive local activity data'
grep -Fq 'activity.refresh()' "$APP" || fail 'global/dashboard refresh must include recent activity'
grep -Fq 'activity.refreshing ||' "$APP" || fail 'Dashboard refresh indicator must include recent activity'

grep -Fq 'title="최근 활동"' "$HOME" || fail 'Dashboard must expose a recent activity section'
grep -Fq 'href="#activity"' "$HOME" || fail 'Dashboard recent activity must link to the full page'
grep -Fq '<ActivityTimeline compact events={(activity?.events ?? []).slice(0, 3)} />' "$HOME" || \
	fail 'Dashboard must show only the latest three activity entries'
grep -Fq '현재 부팅 이후의 최근 활동' "$PAGE" || \
	fail 'full page must clearly describe current-boot scope'
grep -Fq '재부팅하면 초기화됩니다' "$PAGE" || \
	fail 'full page must explain volatile local retention'
grep -Fq '상태가 실제로 변경된 경우에만 새 활동을 추가합니다' "$PAGE" || \
	fail 'full page must explain transition-only event recording'
grep -Fq '<ActivityTimeline events={data?.events ?? []} />' "$PAGE" || \
	fail 'full page must render the complete local activity response'

for event_type in \
	system.booted \
	network.internet.disconnected \
	network.internet.recovered \
	safeshield.protection.enabled \
	safeshield.protection.disabled \
	safeshield.blocklist.updated \
	safeshield.blocklist.update_failed \
	software.update.completed \
	software.update.failed \
	firmware.update.started \
	firmware.update.failed \
	license.activated \
	license.changed \
	license.cleared \
	health.issue.started \
	health.issue.changed \
	health.issue.resolved; do
	grep -Fq "case '$event_type':" "$TIMELINE" || fail "UI renderer missing event type: $event_type"
done

grep -Fq "title: 'SmartSafeHub 활동'" "$TIMELINE" || \
	fail 'unknown future event types must keep a safe UI fallback'
grep -Fq 'formatNumber(domainCount)' "$TIMELINE" || \
	fail 'SafeShield domain counts must use the shared locale number formatter'
grep -Fq "bg-rose-50 text-rose-700 ring-rose-200" "$TIMELINE" || \
	fail 'error events must use the shared rose dark/light theme tokens'
grep -Fq "bg-amber-50 text-amber-800 ring-amber-200" "$TIMELINE" || \
	fail 'warning events must use the shared amber dark/light theme tokens'
grep -Fq "bg-emerald-50 text-emerald-700 ring-emerald-200" "$TIMELINE" || \
	fail 'success events must use the shared emerald dark/light theme tokens'
grep -Fq "bg-slate-100 text-slate-600 ring-slate-200" "$TIMELINE" || \
	fail 'info events must use the shared neutral dark/light theme tokens'

grep -Fq "export async function fetchActivityHistory(limit = 128)" "$API" || \
	fail 'frontend API must expose local Recent Activity'
grep -Fq "callApi<SmartSafeHubStatusWithActivity>(API_OBJECT, 'status'" "$API" || \
	fail 'frontend activity API must reuse the long-lived status RPC authorization'
grep -Fq 'include_activity_history: true' "$API" || \
	fail 'frontend activity request must explicitly opt into status activity history'
grep -Fq 'const ACTIVITY_REFRESH_INTERVAL_MS = 60_000;' "$HOOK" || \
	fail 'recent activity may refresh at a lightweight one-minute interval'
grep -Fq 'refreshOnFocus: true' "$HOOK" || \
	fail 'recent activity must refresh when the user returns to the page'

printf '%s\n' 'PASS: local recent activity via existing status RPC, r8 event migration, outbox/history separation and UI contracts are valid'
