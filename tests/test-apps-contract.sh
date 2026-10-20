#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-or-later
set -eu
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
ROUTES="$ROOT/frontend/src/app/routes.ts"
NAV="$ROOT/frontend/src/components/ProductNavigation.tsx"
UCODE="$ROOT/root/usr/share/rpcd/ucode/smartsafehub/apps.uc"
RPC="$ROOT/root/usr/share/rpcd/ucode/smartsafehub.uc"
HELPER="$ROOT/root/usr/libexec/smartsafehub-apps"
ACL="$ROOT/root/usr/share/rpcd/acl.d/luci-app-smartsafehub.json"

fail() { echo "FAIL: $*" >&2; exit 1; }
for file in "$ROUTES" "$NAV" "$UCODE" "$RPC" "$HELPER" "$ACL" \
  "$ROOT/frontend/src/pages/AppsPage.tsx" "$ROOT/frontend/src/types/apps.ts"; do
 [ -f "$file" ] || fail "missing ${file##*/}"
done
[ -x "$HELPER" ] || fail 'helper not executable'
sh -n "$HELPER" || fail 'invalid helper shell syntax'
python3 - "$ROUTES" "$NAV" "$ROOT/frontend/src/hooks/useHashRoute.ts" <<'PY' || exit 1
from pathlib import Path
import sys
routes, nav, hash_route = map(lambda p: Path(p).read_text(), sys.argv[1:])
assert "route: 'apps'" in routes and "hash: '#apps'" in routes
assert routes.index("route: 'account'") < routes.index("route: 'apps'") < routes.index("route: 'system'")
assert "['account', 'apps', 'system', 'settings']" in nav
assert "case 'apps':" in nav and '<AppsIcon' in nav
assert "'#apps': 'apps'" in hash_route
PY

grep -Fq 'apps_catalog: {' "$RPC" || fail 'RPC method missing'
grep -Fq 'require_root_password(function(request)' "$RPC" || fail 'RPC password guard missing'
grep -Fq '"apps_catalog"' "$ACL" || fail 'read permission missing'
grep -Fq "'apps_catalog'" "$ROOT/frontend/src/api/smartsafehub.ts" || fail 'frontend RPC missing'
grep -Fq "active: route === 'apps'" "$ROOT/frontend/src/app/App.tsx" || fail 'catalog must be loaded only on Apps route'
grep -Fq "item.runtime != 'router' || item.installer != 'apk'" "$UCODE" || fail 'unknown runtimes must stay hidden'
if grep -E 'apps_(install|remove)|apk add|apk del' "$RPC" "$UCODE" "$HELPER" "$ROOT/frontend/src/pages/AppsPage.tsx" >/dev/null; then
 fail 'read-only initial Apps delivery must not contain installation operations'
fi

# Fake only the HTTP/JSON filter utilities: no external calls or OpenWrt runtime
# are needed to verify identity pinning and mismatch/failure handling.
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT HUP INT TERM
mkdir -p "$TMP/bin" "$TMP/runtime"
cat > "$TMP/firmware.json" <<'EOF'
{"device_code":"iptime-ax3000sm","build_id":"2026.10.20-123","channel":"stable"}
EOF
cat > "$TMP/response.json" <<'EOF'
{"schema":1,"device_code":"iptime-ax3000sm","firmware_build_id":"2026.10.20-123","channel":"stable","apps":[]}
EOF
cat > "$TMP/bin/jsonfilter" <<'PY'
#!/usr/bin/env python3
import json,sys
args=sys.argv
obj=json.load(open(args[args.index('-i')+1],encoding='utf-8'))
for key in args[args.index('-e')+1].removeprefix('@.').split('.'):
    obj=obj[key]
print(obj if not isinstance(obj,bool) else str(obj).lower())
PY
cat > "$TMP/bin/uclient-fetch" <<'SH2'
#!/bin/sh
[ "${APPS_TEST_FAIL:-0}" = 0 ] || exit 1
while [ "$#" -gt 0 ]; do
 case "$1" in -O) dest="$2"; shift 2;; *) url="$1"; shift;; esac
done
printf '%s\n' "$url" > "$APPS_TEST_URL_FILE"
cp "$APPS_TEST_RESPONSE" "$dest"
SH2
chmod +x "$TMP/bin/jsonfilter" "$TMP/bin/uclient-fetch"
export SMARTSAFEHUB_APPS_ROM_METADATA="$TMP/firmware.json"
export SMARTSAFEHUB_APPS_METADATA="$TMP/firmware.json"
export SMARTSAFEHUB_APPS_RUNTIME_DIR="$TMP/runtime"
export SMARTSAFEHUB_APPS_JSONFILTER_BIN="$TMP/bin/jsonfilter"
export SMARTSAFEHUB_APPS_UCLIENT_BIN="$TMP/bin/uclient-fetch"
export APPS_TEST_RESPONSE="$TMP/response.json"
export APPS_TEST_URL_FILE="$TMP/url"
"$HELPER" || fail 'valid pinned catalog fetch failed'
grep -Fq 'firmware_build_id=2026.10.20-123&channel=stable' "$TMP/url" || fail 'local identity missing in request'
grep -Fq '"apps":[]' "$TMP/runtime/apps-catalog.json" || fail 'catalog not stored'

# Wrong firmware builds must never be treated as approved.
sed 's/2026.10.20-123/2026.10.20-999/' "$TMP/response.json" > "$TMP/mismatch.json"
export APPS_TEST_RESPONSE="$TMP/mismatch.json"
if "$HELPER"; then fail 'mismatched firmware catalog accepted'; fi
export APPS_TEST_FAIL=1
if "$HELPER"; then fail 'offline catalog fetch accepted'; fi
unset APPS_TEST_FAIL
cat > "$TMP/firmware.json" <<'EOF'
{"device_code":"iptime-ax3000sm","build_id":"../../bad","channel":"stable"}
EOF
if "$HELPER"; then fail 'invalid firmware identity accepted'; fi
printf 'PASS: Apps navigation, read-only catalog and firmware pinning\n'
