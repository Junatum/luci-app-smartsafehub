#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-or-later
set -eu
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
MANAGER="$ROOT/root/usr/libexec/smartsafehub-apps-manager"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT HUP INT TERM
fail() { echo "FAIL: $*" >&2; exit 1; }
mkdir -p "$TMP/bin" "$TMP/runtime" "$TMP/owned" "$TMP/repo" "$TMP/overlay"
# Linux /proc is unavailable on macOS. A fixture keeps the production check enabled.
printf 'MemTotal:       262144 kB\n' > "$TMP/meminfo"
printf 'signed immutable package-index test fixture\n' > "$TMP/repo/packages.adb"
printf 'signed mock package payload\n' > "$TMP/repo/nlbwmon-2025.06.02~29236be6-r1.apk"
INDEX_SHA="$(sha256sum "$TMP/repo/packages.adb" | cut -d ' ' -f 1)"
ARCHIVE_SHA="$(sha256sum "$TMP/repo/nlbwmon-2025.06.02~29236be6-r1.apk" | cut -d ' ' -f 1)"
cat > "$TMP/catalog.json" <<EOF
{"schema":1,"device_code":"iptime-ax3000sm","firmware_build_id":"mock-build-1","channel":"stable","apps":[{"id":"network-usage-monitor","name":"네트워크 사용량 모니터","runtime":"router","installer":"apk","package_arch":"aarch64_cortex-a53","repository_index_sha256":"$INDEX_SHA","packages":[{"name":"nlbwmon","version":"2025.06.02~29236be6-r1","sha256":"$ARCHIVE_SHA"}],"requirements":{"min_memory_mb":1,"min_storage_mb":1}}]}
EOF
cat > "$TMP/bin/jsonfilter" <<'PY'
#!/usr/bin/env python3
import json, re, sys
args=sys.argv
obj=json.load(open(args[args.index('-i')+1]))
expression=args[args.index('-e')+1]
if expression == '@.apps[*].id':
    for app in obj.get('apps',[]): print(app['id'])
else:
    try:
        for part in re.findall(r'[^.\[\]]+|\[\d+\]', expression[2:]):
            obj = obj[int(part[1:-1])] if part.startswith('[') else obj[part]
        if isinstance(obj,(str,int,float)): print(obj)
    except (KeyError,IndexError,TypeError): pass
PY
cat > "$TMP/bin/fetch-catalog" <<'SH2'
#!/bin/sh
cp "$APPS_TEST_CATALOG" "$SMARTSAFEHUB_APPS_RUNTIME_DIR/apps-catalog.json"
SH2
cat > "$TMP/bin/uclient-fetch" <<'SH2'
#!/bin/sh
while [ "$#" -gt 0 ]; do
 case "$1" in
 -O) dest="$2"; shift 2;;
 -q|-T) [ "$1" != -T ] || shift; shift;;
 *) url="$1"; shift;;
 esac
done
case "$url" in
 https://repo.smartsafehub.com/stable/packages/aarch64_cortex-a53/smartsafehub/packages.adb)
   cp "$APPS_TEST_REPO/packages.adb" "$dest";;
 https://repo.smartsafehub.com/stable/packages/aarch64_cortex-a53/smartsafehub/nlbwmon-2025.06.02~29236be6-r1.apk)
   cp "$APPS_TEST_REPO/nlbwmon-2025.06.02~29236be6-r1.apk" "$dest";;
 *) exit 2;;
esac
printf '%s\n' "$url" >> "$APPS_TEST_URL_LOG"
SH2
cat > "$TMP/bin/apk" <<'SH2'
#!/bin/sh
case "$1" in
 --print-arch) echo aarch64_cortex-a53; exit 0;;
 info)
   [ "$2" = -e ] || exit 2
   grep -qxF "$3" "$APPS_TEST_INSTALLED" 2>/dev/null; exit $?;;
 -X)
   [ "$2" = 'https://repo.smartsafehub.com/stable/packages/aarch64_cortex-a53/smartsafehub/packages.adb' ] || exit 2
   [ "$3" = -U ] && [ "$4" = add ] || exit 2
   shift 4;;
 del)
   if [ "$2" = --simulate ]; then
     [ "${APPS_TEST_DEL_CORE:-0}" = 1 ] && echo 'Purging kmod-nf-conntrack-netlink (mock)'
     exit 0
   fi
   shift
   for item in "$@"; do grep -vxF "$item" "$APPS_TEST_INSTALLED" > "$APPS_TEST_INSTALLED.new" || :; mv "$APPS_TEST_INSTALLED.new" "$APPS_TEST_INSTALLED"; done
   exit 0;;
 *) exit 2;;
esac
[ "${1:-}" = --simulate ] && exit 0
for file in "$@"; do
 item="${file##*/}"
 [ "$item" = 'nlbwmon-2025.06.02~29236be6-r1.apk' ] || exit 2
 printf '%s\n' nlbwmon >> "$APPS_TEST_INSTALLED"
done
SH2
cat > "$TMP/bin/start-stop-daemon" <<'SH2'
#!/bin/sh
[ "$1" = -S ] && [ "$2" = -b ] && [ "$3" = -x ] && [ "$5" = -- ] || exit 2
"$4" "$6" "$7" "$8"
SH2
chmod +x "$TMP/bin/"*
export SMARTSAFEHUB_APPS_MANAGER_BIN="$MANAGER"
export SMARTSAFEHUB_APPS_HELPER_BIN="$TMP/bin/fetch-catalog"
export SMARTSAFEHUB_APPS_RUNTIME_DIR="$TMP/runtime"
export SMARTSAFEHUB_APPS_OWNED_DIR="$TMP/owned"
export SMARTSAFEHUB_APPS_UCLIENT_BIN="$TMP/bin/uclient-fetch"
export APPS_TEST_URL_LOG="$TMP/fetched-urls"
export SMARTSAFEHUB_APPS_OVERLAY_PATH="$TMP/overlay"
export SMARTSAFEHUB_APPS_MEMINFO_PATH="$TMP/meminfo"
export SMARTSAFEHUB_APPS_JSONFILTER_BIN="$TMP/bin/jsonfilter"
export SMARTSAFEHUB_APPS_APK_BIN="$TMP/bin/apk"
export SMARTSAFEHUB_APPS_DAEMON_BIN="$TMP/bin/start-stop-daemon"
export APPS_TEST_CATALOG="$TMP/catalog.json"
export APPS_TEST_REPO="$TMP/repo"
export APPS_TEST_INSTALLED="$TMP/installed"
: > "$APPS_TEST_INSTALLED"
# Invalid and unapproved input is never interpreted as an APK command.
if "$MANAGER" start install '../../../../etc/passwd' >/dev/null 2>&1; then fail 'path traversal accepted'; fi
# start queues an operation successfully; the worker must reject the unapproved
# app with E22. Use a literal tab rather than grep's non-portable \t escape.
"$MANAGER" start install 'not-approved' >/dev/null 2>&1 || fail 'unknown app request was not queued'
grep -Fqx "$(printf 'code\tE22')" "$TMP/runtime/apps-operation.state" || fail 'unknown app not rejected with E22'
[ ! -f "$TMP/owned/not-approved" ] || fail 'unknown app was owned'
# Memory limits must still reject installations even with the portable fixture.
printf 'MemTotal:         512 kB\n' > "$TMP/meminfo"
"$MANAGER" start install network-usage-monitor || fail 'low-memory request was not queued'
grep -Fqx "$(printf 'code\tE26')" "$TMP/runtime/apps-operation.state" || fail 'low-memory install was not rejected'
[ ! -s "$APPS_TEST_INSTALLED" ] || fail 'low-memory install changed packages'
# An unreadable or missing memory source also fails closed.
rm -f "$TMP/meminfo"
"$MANAGER" start install network-usage-monitor || fail 'missing-memory request was not queued'
grep -Fqx "$(printf 'code\tE26')" "$TMP/runtime/apps-operation.state" || fail 'missing memory information was not rejected'
printf 'MemTotal:       262144 kB\n' > "$TMP/meminfo"
# Signed/index-pinned happy path, local ownership, status and uninstall.
"$MANAGER" start install network-usage-monitor || fail 'installation start failed'
if ! grep -q 'phase.*success' "$TMP/runtime/apps-operation.state"; then
  code="$(awk -F "$(printf '\t')" '$1=="code" {print $2}' "$TMP/runtime/apps-operation.state")"
  fail "approved package not installed (worker code: ${code:-unknown})"
fi
grep -qxF nlbwmon "$APPS_TEST_INSTALLED" || fail 'apk add did not run'
[ -f "$TMP/owned/network-usage-monitor" ] || fail 'ownership not recorded'
grep -Fqx 'https://repo.smartsafehub.com/stable/packages/aarch64_cortex-a53/smartsafehub/packages.adb' "$APPS_TEST_URL_LOG" || fail 'approved index URL not fetched'
grep -Fqx 'https://repo.smartsafehub.com/stable/packages/aarch64_cortex-a53/smartsafehub/nlbwmon-2025.06.02~29236be6-r1.apk' "$APPS_TEST_URL_LOG" || fail 'pinned APK URL not fetched'
"$MANAGER" status
grep -Fq "$(printf 'network-usage-monitor\t1\t1\t1')" "$TMP/runtime/apps-status.tsv" || fail 'installation status invalid'
"$MANAGER" start remove network-usage-monitor || fail 'removal start failed'
[ ! -s "$APPS_TEST_INSTALLED" ] || fail 'apk del did not run'
[ ! -f "$TMP/owned/network-usage-monitor" ] || fail 'ownership not cleared'
# Refuse a removal simulation that would also delete a protected module.
"$MANAGER" start install network-usage-monitor || fail 'reinstall failed before removal safety test'
export APPS_TEST_DEL_CORE=1
"$MANAGER" start remove network-usage-monitor || fail 'unsafe removal job was not started'
grep -q 'E44' "$TMP/runtime/apps-operation.state" || fail 'protected module removal not rejected'
[ -f "$TMP/owned/network-usage-monitor" ] || fail 'rejected removal lost ownership'
grep -qxF nlbwmon "$APPS_TEST_INSTALLED" || fail 'rejected removal deleted app'
unset APPS_TEST_DEL_CORE
"$MANAGER" start remove network-usage-monitor || fail 'cleanup removal failed'
# No destructive removal of packages not installed through SmartSafeHub Apps.
printf 'nlbwmon\n' > "$APPS_TEST_INSTALLED"
"$MANAGER" start remove network-usage-monitor || :
grep -q 'E41' "$TMP/runtime/apps-operation.state" || fail 'external APK ownership was ignored'
: > "$APPS_TEST_INSTALLED"
# Digest mismatch denies an otherwise approved install.
printf 'tampered index' > "$TMP/repo/packages.adb"
"$MANAGER" start install network-usage-monitor || :
grep -q 'E25' "$TMP/runtime/apps-operation.state" || fail 'index mismatch allowed install'
[ ! -s "$APPS_TEST_INSTALLED" ] || fail 'index mismatch changed packages'
# Direct package archive checksum mismatch also fails closed.
printf 'signed immutable package-index test fixture\n' > "$TMP/repo/packages.adb"
printf 'tampered apk' > "$TMP/repo/nlbwmon-2025.06.02~29236be6-r1.apk"
"$MANAGER" start install network-usage-monitor || :
grep -q 'E33' "$TMP/runtime/apps-operation.state" || fail 'archive mismatch allowed install'
# Revocation must not trap SmartSafeHub-owned packages on the device.
printf 'nlbwmon\n' > "$APPS_TEST_INSTALLED"
printf 'nlbwmon\t2025.06.02~29236be6-r1\t%s\n' "$ARCHIVE_SHA" > "$TMP/owned/network-usage-monitor"
python3 - "$TMP/catalog.json" <<'PY'
import json,sys
p=sys.argv[1]; d=json.load(open(p)); d['apps']=[]; open(p,'w').write(json.dumps(d))
PY
"$TMP/bin/fetch-catalog"
"$MANAGER" status
grep -Fq "$(printf 'network-usage-monitor\t0\t1\t1')" "$TMP/runtime/apps-status.tsv" || fail 'revoked app missing from local inventory'
"$MANAGER" start remove network-usage-monitor || fail 'recalled app removal failed'
[ ! -s "$APPS_TEST_INSTALLED" ] || fail 'revoked app could not be removed'
printf 'PASS: Apps install/remove allowlist, pins, ownership, status, revocation\n'
