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
printf 'signed mock package payload\n' > "$TMP/repo/etherwake-1.09-r4.apk"
INDEX_SHA="$(sha256sum "$TMP/repo/packages.adb" | cut -d ' ' -f 1)"
ARCHIVE_SHA="$(sha256sum "$TMP/repo/etherwake-1.09-r4.apk" | cut -d ' ' -f 1)"
cat > "$TMP/catalog.json" <<EOF
{"schema":1,"device_code":"iptime-ax3000sm","firmware_build_id":"mock-build-1","channel":"stable","apps":[{"id":"wake-on-lan","name":"Wake on LAN","runtime":"router","installer":"apk","package_arch":"aarch64_cortex-a53","repository_index_sha256":"$INDEX_SHA","packages":[{"name":"etherwake","version":"1.09-r4","sha256":"$ARCHIVE_SHA"}],"requirements":{"min_memory_mb":1,"min_storage_mb":1}}]}
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
cat > "$TMP/bin/apk" <<'SH2'
#!/bin/sh
case "$1" in
 --print-arch) echo aarch64_cortex-a53;;
 info)
   [ "$2" = -e ] || exit 2
   grep -qxF "$3" "$APPS_TEST_INSTALLED" 2>/dev/null;;
 fetch)
   [ "$2" = --output ] || exit 2
   dest="$3"; spec="$4"; pkg="${spec%%=*}"; ver="${spec#*=}"
   cp "$APPS_TEST_REPO/$pkg-$ver.apk" "$dest/";;
 add)
   [ "$2" = --simulate ] && exit 0
   shift
   for file in "$@"; do
     item="${file##*/}"; item="${item%.apk}"; name="${item%%-*}"
     printf '%s\n' "$name" >> "$APPS_TEST_INSTALLED"
   done;;
 del)
   [ "$2" = --simulate ] && exit 0
   shift
   for item in "$@"; do grep -vxF "$item" "$APPS_TEST_INSTALLED" > "$APPS_TEST_INSTALLED.new" || :; mv "$APPS_TEST_INSTALLED.new" "$APPS_TEST_INSTALLED"; done;;
 *) exit 2;;
esac
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
export SMARTSAFEHUB_APPS_REPO_INDEX="$TMP/repo/packages.adb"
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
"$MANAGER" start install wake-on-lan || fail 'low-memory request was not queued'
grep -Fqx "$(printf 'code\tE26')" "$TMP/runtime/apps-operation.state" || fail 'low-memory install was not rejected'
[ ! -s "$APPS_TEST_INSTALLED" ] || fail 'low-memory install changed packages'
# An unreadable or missing memory source also fails closed.
rm -f "$TMP/meminfo"
"$MANAGER" start install wake-on-lan || fail 'missing-memory request was not queued'
grep -Fqx "$(printf 'code\tE26')" "$TMP/runtime/apps-operation.state" || fail 'missing memory information was not rejected'
printf 'MemTotal:       262144 kB\n' > "$TMP/meminfo"
# Signed/index-pinned happy path, local ownership, status and uninstall.
"$MANAGER" start install wake-on-lan || fail 'installation start failed'
if ! grep -q 'phase.*success' "$TMP/runtime/apps-operation.state"; then
  code="$(awk -F "$(printf '\t')" '$1=="code" {print $2}' "$TMP/runtime/apps-operation.state")"
  fail "approved package not installed (worker code: ${code:-unknown})"
fi
grep -qxF etherwake "$APPS_TEST_INSTALLED" || fail 'apk add did not run'
[ -f "$TMP/owned/wake-on-lan" ] || fail 'ownership not recorded'
"$MANAGER" status
grep -Fq "$(printf 'wake-on-lan\t1\t1\t1')" "$TMP/runtime/apps-status.tsv" || fail 'installation status invalid'
"$MANAGER" start remove wake-on-lan || fail 'removal start failed'
[ ! -s "$APPS_TEST_INSTALLED" ] || fail 'apk del did not run'
[ ! -f "$TMP/owned/wake-on-lan" ] || fail 'ownership not cleared'
# No destructive removal of packages not installed through SmartSafeHub Apps.
printf 'etherwake\n' > "$APPS_TEST_INSTALLED"
"$MANAGER" start remove wake-on-lan || :
grep -q 'E41' "$TMP/runtime/apps-operation.state" || fail 'external APK ownership was ignored'
: > "$APPS_TEST_INSTALLED"
# Digest mismatch denies an otherwise approved install.
printf 'tampered index' > "$TMP/repo/packages.adb"
"$MANAGER" start install wake-on-lan || :
grep -q 'E25' "$TMP/runtime/apps-operation.state" || fail 'index mismatch allowed install'
[ ! -s "$APPS_TEST_INSTALLED" ] || fail 'index mismatch changed packages'
# Direct package archive checksum mismatch also fails closed.
printf 'signed immutable package-index test fixture\n' > "$TMP/repo/packages.adb"
printf 'tampered apk' > "$TMP/repo/etherwake-1.09-r4.apk"
"$MANAGER" start install wake-on-lan || :
grep -q 'E33' "$TMP/runtime/apps-operation.state" || fail 'archive mismatch allowed install'
# Revocation must not trap SmartSafeHub-owned packages on the device.
printf 'etherwake\n' > "$APPS_TEST_INSTALLED"
printf 'etherwake\t1.09-r4\t%s\n' "$ARCHIVE_SHA" > "$TMP/owned/wake-on-lan"
python3 - "$TMP/catalog.json" <<'PY'
import json,sys
p=sys.argv[1]; d=json.load(open(p)); d['apps']=[]; open(p,'w').write(json.dumps(d))
PY
"$TMP/bin/fetch-catalog"
"$MANAGER" status
grep -Fq "$(printf 'wake-on-lan\t0\t1\t1')" "$TMP/runtime/apps-status.tsv" || fail 'revoked app missing from local inventory'
"$MANAGER" start remove wake-on-lan || fail 'recalled app removal failed'
[ ! -s "$APPS_TEST_INSTALLED" ] || fail 'revoked app could not be removed'
printf 'PASS: Apps install/remove allowlist, pins, ownership, status, revocation\n'
