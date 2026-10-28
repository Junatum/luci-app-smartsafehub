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
printf 'all\naarch64_cortex-a53\n' > "$TMP/apk-arch"
printf 'signed immutable package-index test fixture\n' > "$TMP/repo/packages.adb"
printf 'signed mock package payload\n' > "$TMP/repo/nlbwmon-2025.06.02~29236be6-r1.apk"
printf 'approved LuCI mock package payload\n' > "$TMP/repo/luci-app-nlbwmon-26.288.56989~75a306d.apk"
printf 'approved chart mock package payload\n' > "$TMP/repo/luci-lib-chartjs-26.288.56989~75a306d.apk"
printf 'approved Retro Arcade mock package payload\n' > "$TMP/repo/smartsafehub-app-retro-arcade-1.0.0-r1.apk"
INDEX_SHA="$(sha256sum "$TMP/repo/packages.adb" | cut -d ' ' -f 1)"
ARCHIVE_SHA="$(sha256sum "$TMP/repo/nlbwmon-2025.06.02~29236be6-r1.apk" | cut -d ' ' -f 1)"
LUCISH="$(sha256sum "$TMP/repo/luci-app-nlbwmon-26.288.56989~75a306d.apk" | cut -d ' ' -f 1)"
CHARTSHA="$(sha256sum "$TMP/repo/luci-lib-chartjs-26.288.56989~75a306d.apk" | cut -d ' ' -f 1)"
RETROSHA="$(sha256sum "$TMP/repo/smartsafehub-app-retro-arcade-1.0.0-r1.apk" | cut -d ' ' -f 1)"
cat > "$TMP/catalog.json" <<EOF
{"schema":1,"device_code":"iptime-ax3000sm","firmware_build_id":"mock-build-1","channel":"stable","apps":[{"id":"network-usage-monitor","version":"2025.06.02-r1","name":"네트워크 사용량 모니터","runtime":"router","installer":"apk","package_arch":"aarch64_cortex-a53","repository_release_id":"20261027T123000","repository_index_sha256":"$INDEX_SHA","packages":[{"name":"nlbwmon","version":"2025.06.02~29236be6-r1","sha256":"$ARCHIVE_SHA"},{"name":"luci-app-nlbwmon","version":"26.288.56989~75a306d","sha256":"$LUCISH"},{"name":"luci-lib-chartjs","version":"26.288.56989~75a306d","sha256":"$CHARTSHA"}],"requirements":{"min_memory_mb":1,"min_storage_mb":1}}]}
EOF
# Use jq when available for faster field lookups; the Python fallback is portable.
cat > "$TMP/bin/jsonfilter" <<'SH2'
#!/bin/sh
if command -v jq >/dev/null 2>&1; then
 file=''; expr=''
 while [ "$#" -gt 0 ]; do
  case "$1" in
   -i) file="$2"; shift 2;;
   -e) expr="$2"; shift 2;;
   *) exit 2;;
  esac
 done
 case "$expr" in
  '@.apps[*].id') jq_expr='.apps[].id';;
  @.*) jq_expr="${expr#@}";;
  *) exit 2;;
 esac
 jq -r "($jq_expr) | select(. != null)" "$file" 2>/dev/null
else
 exec python3 "$0.py" "$@"
fi
SH2
cat > "$TMP/bin/jsonfilter.py" <<'PY'
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
 https://repo.smartsafehub.com/stable/packages/aarch64_cortex-a53/smartsafehub/20261027T123000/packages.adb)
   cp "$APPS_TEST_REPO/packages.adb" "$dest";;
 https://repo.smartsafehub.com/stable/packages/aarch64_cortex-a53/smartsafehub/20261027T123000/nlbwmon-2025.06.02~29236be6-r1.apk)
   cp "$APPS_TEST_REPO/nlbwmon-2025.06.02~29236be6-r1.apk" "$dest";;
 https://repo.smartsafehub.com/stable/packages/aarch64_cortex-a53/smartsafehub/20261027T123000/luci-app-nlbwmon-26.288.56989~75a306d.apk)
   cp "$APPS_TEST_REPO/luci-app-nlbwmon-26.288.56989~75a306d.apk" "$dest";;
 https://repo.smartsafehub.com/stable/packages/aarch64_cortex-a53/smartsafehub/20261027T123000/luci-lib-chartjs-26.288.56989~75a306d.apk)
   cp "$APPS_TEST_REPO/luci-lib-chartjs-26.288.56989~75a306d.apk" "$dest";;
 https://repo.smartsafehub.com/stable/packages/aarch64_cortex-a53/smartsafehub/20261027T123000/smartsafehub-app-retro-arcade-1.0.0-r1.apk)
   cp "$APPS_TEST_REPO/smartsafehub-app-retro-arcade-1.0.0-r1.apk" "$dest";;
 *) exit 2;;
esac
printf '%s\n' "$url" >> "$APPS_TEST_URL_LOG"
SH2
cat > "$TMP/bin/apk" <<'SH2'
#!/bin/sh
printf '%s\n' "$*" >> "$APPS_TEST_APK_LOG"
case "$1" in
 --print-arch) [ "${APPS_TEST_ARCH_CLI_FAIL:-0}" = 0 ] || exit 1; echo "${APPS_TEST_ARCH_CLI:-aarch64_cortex-a53}"; exit 0;;
 info)
   [ "$2" = -e ] || exit 2
   grep -qxF "$3" "$APPS_TEST_INSTALLED" 2>/dev/null; exit $?;;
 list)
   [ "$2" = -I ] || exit 2
   grep -qxF "$3" "$APPS_TEST_INSTALLED" 2>/dev/null || exit 0
   echo "$3-${APPS_TEST_SHARED_VERSION:-26.288.56989~75a306d} aarch64_cortex-a53 [installed]"
   exit 0;;
 --repositories-file)
   [ "$2" = /dev/null ] || exit 2
   [ "$3" = -X ] || exit 2
   case "$4" in
    file://*/apps-work.*/packages/packages.adb) repo=hub; local_index="${4#file://}";;
    *) exit 2;;
   esac
   [ -s "$local_index" ] || exit 2
   cmp -s "$local_index" "$APPS_TEST_REPO/packages.adb" || exit 2
   if [ -s "${local_index%/*}/smartsafehub-app-retro-arcade-1.0.0-r1.apk" ]; then
     [ "$(find "${local_index%/*}" -name '*.apk' | wc -l | tr -d ' ')" -eq 1 ] || exit 2
   else
     for name in nlbwmon-2025.06.02~29236be6-r1 \
         luci-app-nlbwmon-26.288.56989~75a306d \
         luci-lib-chartjs-26.288.56989~75a306d; do
       [ -s "${local_index%/*}/$name.apk" ] || exit 2
     done
   fi
   if [ "$5" = update ]; then
     if [ "${APPS_TEST_REPO_UPDATE_FAIL:-0}" = 1 ]; then
       echo 'ERROR: repository index update rejected' >&2
       exit 1
     fi
     touch "$APPS_TEST_INDEX_READY"
     exit 0
   fi
   [ "$5" = add ] || exit 2
   [ -f "$APPS_TEST_INDEX_READY" ] || {
     echo 'WARNING: opening from cache: No such file or directory' >&2
     exit 1
   }
   shift 5;;
 del)
   if [ "$2" = --simulate ]; then
     [ "${APPS_TEST_DEL_CORE:-0}" = 1 ] && echo 'Purging kmod-nf-conntrack-netlink (mock)'
     [ "${APPS_TEST_DEL_SHARED:-0}" = 1 ] && echo 'Purging luci-lib-chartjs (mock)'
     exit 0
   fi
   shift
   for item in "$@"; do grep -vxF "$item" "$APPS_TEST_INSTALLED" > "$APPS_TEST_INSTALLED.new" || :; mv "$APPS_TEST_INSTALLED.new" "$APPS_TEST_INSTALLED"; done
   exit 0;;
 *) exit 2;;
esac
if [ "${1:-}" = --simulate ]; then
 [ "${APPS_TEST_MISSING_DEP:-0}" = 1 ] && { echo 'ERROR: unable to select packages: missing dependency' >&2; exit 1; }
 shift
 for pin in "$@"; do
  name="${pin%%=*}"
  case "$repo:$name" in
   hub:nlbwmon|hub:luci-app-nlbwmon|hub:luci-lib-chartjs|hub:smartsafehub-app-retro-arcade) ;;
   *) exit 2;;
  esac
  if [ "${APPS_TEST_UPGRADE:-0}" = 1 ]; then
    echo '(1/3) Upgrading luci-base (mock)'
  else
    echo "(1/2) Installing $name (mock)"
  fi
 done
 exit 0
fi
for pin in "$@"; do
 name="${pin%%=*}"
 case "$repo:$name" in
  hub:nlbwmon|hub:luci-app-nlbwmon|hub:luci-lib-chartjs|hub:smartsafehub-app-retro-arcade) ;;
  *) exit 2;;
 esac
 grep -qxF "$name" "$APPS_TEST_INSTALLED" 2>/dev/null || printf '%s\n' "$name" >> "$APPS_TEST_INSTALLED"
done
SH2
cat > "$TMP/bin/start-stop-daemon" <<'SH2'
#!/bin/sh
[ "$1" = -S ] && [ "$2" = -b ] && [ "$3" = -x ] && [ "$5" = -- ] || exit 2
# Starting and final states must carry the same operation ID.
awk -F '\t' '$1 == "operation_id" { print $2; exit }' \
  "$SMARTSAFEHUB_APPS_RUNTIME_DIR/apps-operation.state" >> "$APPS_TEST_OPERATION_START_LOG"
"$4" "$6" "$7" "$8"
SH2
chmod +x "$TMP/bin/"*
cat > "$TMP/bin/metrics-hook" <<'METRICS'
#!/bin/sh
printf '%s
' "$*" >> "$APPS_TEST_METRICS_LOG"
METRICS
chmod +x "$TMP/bin/metrics-hook"
export APPS_TEST_METRICS_LOG="$TMP/install-events"
export SMARTSAFEHUB_APPS_METRICS_BIN="$TMP/bin/metrics-hook"
: > "$APPS_TEST_METRICS_LOG"
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
export SMARTSAFEHUB_APPS_ARCH_FILE="$TMP/apk-arch"
export SMARTSAFEHUB_APPS_DAEMON_BIN="$TMP/bin/start-stop-daemon"
export APPS_TEST_CATALOG="$TMP/catalog.json"
export APPS_TEST_REPO="$TMP/repo"
export APPS_TEST_INSTALLED="$TMP/installed"
export APPS_TEST_APK_LOG="$TMP/apk-commands"
export APPS_TEST_INDEX_READY="$TMP/index-ready"
export APPS_TEST_OPERATION_START_LOG="$TMP/operation-start-ids"
: > "$APPS_TEST_INSTALLED"
# A validated fixed release installs all three APKs from a single signed feed.
"$MANAGER" start install '../../../../etc/passwd' >/dev/null 2>&1 && fail 'invalid app ID accepted'
"$MANAGER" start install 'not-approved' || fail 'unknown app should queue'
grep -Fqx "$(printf 'code\tE22')" "$TMP/runtime/apps-operation.state" || fail 'unknown app was installed'
first_operation_id="$(awk -F '\t' '$1 == "operation_id" { print $2; exit }' "$TMP/runtime/apps-operation.state")"
[ -n "$first_operation_id" ] || fail 'first failed operation has no identity'
[ "$(sed -n '1p' "$APPS_TEST_OPERATION_START_LOG")" = "$first_operation_id" ] || fail 'operation identity changed during failure'
"$MANAGER" start install not-approved || fail 'repeated failed install did not queue'
repeat_operation_id="$(awk -F '\t' '$1 == "operation_id" { print $2; exit }' "$TMP/runtime/apps-operation.state")"
[ "$repeat_operation_id" != "$first_operation_id" ] || fail 'repeated E22 failure reused dismissed operation ID'
[ "$(sed -n '2p' "$APPS_TEST_OPERATION_START_LOG")" = "$repeat_operation_id" ] || fail 'repeated failure changed identity between phases'
"$MANAGER" start install network-usage-monitor || fail 'install did not queue'
grep -Fqx "$(printf 'phase\tsuccess')" "$TMP/runtime/apps-operation.state" || fail 'three APK installation failed'
second_operation_id="$(awk -F '\t' '$1 == "operation_id" { print $2; exit }' "$TMP/runtime/apps-operation.state")"
[ -n "$second_operation_id" ] && [ "$first_operation_id" != "$second_operation_id" ] || fail 'new operation reused old identity'
[ "$(sed -n '3p' "$APPS_TEST_OPERATION_START_LOG")" = "$second_operation_id" ] || fail 'operation identity changed during success'
[ "$(wc -l < "$APPS_TEST_INSTALLED")" -eq 3 ] || fail 'all three APKs were not installed'
[ "$(wc -l < "$APPS_TEST_METRICS_LOG" | tr -d ' ')" -eq 1 ] || fail 'successful installation not recorded exactly once'
grep -Eq '^enqueue network-usage-monitor 2025\.06\.02-r1 [0-9]+-[0-9]+-[a-f0-9]{16}$' "$APPS_TEST_METRICS_LOG" || fail 'invalid receipt fields'

grep -Eq '^--repositories-file /dev/null -X file://.*/packages/packages.adb update$' "$APPS_TEST_APK_LOG" || fail 'approved local index not loaded before simulation'
grep -Eq '^--repositories-file /dev/null -X file://.*/packages/packages.adb add --simulate nlbwmon=2025\.06\.02~29236be6-r1 luci-app-nlbwmon=26\.288\.56989~75a306d luci-lib-chartjs=26\.288\.56989~75a306d$' "$APPS_TEST_APK_LOG" || fail 'isolated signed repository simulation not used'
grep -Eq '^--repositories-file /dev/null -X file://.*/packages/packages.adb add nlbwmon=' "$APPS_TEST_APK_LOG" || fail 'isolated signed repository install not used'
"$MANAGER" status
grep -Fq "$(printf 'network-usage-monitor\t1\t1\t1\t1')" "$TMP/runtime/apps-status.tsv" || fail 'ready state missing'
"$MANAGER" start remove network-usage-monitor || fail 'remove did not queue'
[ ! -s "$APPS_TEST_INSTALLED" ] || fail 'new Apps uninstall did not remove owned packages'
[ "$(wc -l < "$APPS_TEST_METRICS_LOG" | tr -d ' ')" -eq 1 ] || fail 'removal counted as an installation'

cp "$TMP/catalog.json" "$TMP/catalog-good.json"
python3 - "$TMP/catalog.json" <<'PY_BAD'
import json,sys
path=sys.argv[1]; obj=json.load(open(path)); obj['apps'][0].pop('repository_release_id')
open(path,'w').write(json.dumps(obj))
PY_BAD
"$MANAGER" start install network-usage-monitor || fail 'missing release ID did not queue'
grep -Fqx "$(printf 'code\tE25')" "$TMP/runtime/apps-operation.state" || fail 'missing release ID accepted'
cp "$TMP/catalog-good.json" "$TMP/catalog.json"
python3 - "$TMP/catalog.json" <<'PY_BAD'
import json,sys
path=sys.argv[1]; obj=json.load(open(path)); obj['apps'][0]['packages'].pop()
open(path,'w').write(json.dumps(obj))
PY_BAD
"$MANAGER" start install network-usage-monitor || fail 'partial package set did not queue'
grep -Fqx "$(printf 'code\tE27')" "$TMP/runtime/apps-operation.state" || fail 'partial package set accepted'
cp "$TMP/catalog-good.json" "$TMP/catalog.json"
# A repository signature/index failure must fail closed before any install.
export APPS_TEST_REPO_UPDATE_FAIL=1
rm -f "$APPS_TEST_INDEX_READY"
"$MANAGER" start install network-usage-monitor || fail 'failed repository update did not queue'
grep -Fqx "$(printf 'code\tE34')" "$TMP/runtime/apps-operation.state" || fail 'failed repository update was accepted'
grep -Fq 'repository index update rejected' "$TMP/runtime/apps-last-error.log" || fail 'repository update error was not preserved'
[ ! -s "$APPS_TEST_INSTALLED" ] || fail 'failed repository update installed packages'
unset APPS_TEST_REPO_UPDATE_FAIL
cp "$TMP/catalog-good.json" "$TMP/catalog.json"
printf 'tampered APK\n' > "$TMP/repo/luci-lib-chartjs-26.288.56989~75a306d.apk"
"$MANAGER" start install network-usage-monitor || fail 'tampered APK did not queue'
grep -Fqx "$(printf 'code\tE33')" "$TMP/runtime/apps-operation.state" || fail 'modified APK accepted'
[ "$(wc -l < "$APPS_TEST_METRICS_LOG" | tr -d ' ')" -eq 1 ] || fail 'failed installation counted'

printf 'PASS: Apps install/remove signed immutable release, three APKs, ownership and hash checks\n'

# Self-built App publications must install from immutable signed releases.
if ! grep -Fq 'repo_url="$REPO_BASE/$channel/packages/$arch/smartsafehub/$publication"' "$MANAGER"; then
    echo 'FAIL: signed immutable Apps package publication is missing' >&2
    exit 1
fi

# Retro Arcade is a single APK from the same signed feed. Verify readiness of
# its static entry point independently of the package-manager install state.
: > "$APPS_TEST_INSTALLED"
export SMARTSAFEHUB_APPS_WEB_ROOT="$TMP/www"
cat > "$TMP/catalog.json" <<EOF_RETRO
{"schema":1,"device_code":"iptime-ax3000sm","firmware_build_id":"mock-build-1","channel":"stable","apps":[{"id":"retro-arcade","version":"1.0.0-r1","name":"Retro Arcade","runtime":"router","installer":"apk","package_arch":"aarch64_cortex-a53","repository_release_id":"20261027T123000","repository_index_sha256":"$INDEX_SHA","web_ui":{"type":"static","path":"/retro-arcade/","package":"smartsafehub-app-retro-arcade"},"packages":[{"name":"smartsafehub-app-retro-arcade","version":"1.0.0-r1","sha256":"$RETROSHA"}],"requirements":{"min_memory_mb":1,"min_storage_mb":1}}]}
EOF_RETRO
"$MANAGER" start install retro-arcade || fail 'Retro Arcade install did not queue'
grep -Fqx "$(printf 'phase\tsuccess')" "$TMP/runtime/apps-operation.state" || fail 'single Retro APK installation failed'
[ "$(cat "$APPS_TEST_INSTALLED")" = smartsafehub-app-retro-arcade ] || fail 'unexpected Retro APK installation set'
[ "$(wc -l < "$APPS_TEST_METRICS_LOG" | tr -d ' ')" -eq 2 ] || fail 'Retro install not counted'
grep -Eq '^enqueue retro-arcade 1\.0\.0-r1 [0-9]+-[0-9]+-[a-f0-9]{16}$' "$APPS_TEST_METRICS_LOG" || fail 'Retro receipt incorrect'

"$MANAGER" status
grep -Fq "$(printf 'retro-arcade\t1\t1\t1\t0')" "$TMP/runtime/apps-status.tsv" || fail 'Retro Arcade should not launch before its HTML exists'
mkdir -p "$TMP/www/retro-arcade"
printf 'retro entry\n' > "$TMP/www/retro-arcade/index.html"
"$MANAGER" status
grep -Fq "$(printf 'retro-arcade\t1\t1\t1\t1')" "$TMP/runtime/apps-status.tsv" || fail 'Retro Arcade entry point is not ready'
rm "$TMP/www/retro-arcade/index.html"
"$MANAGER" status
grep -Fq "$(printf 'retro-arcade\t1\t1\t1\t0')" "$TMP/runtime/apps-status.tsv" || fail 'removed Retro Arcade entry point still launches'
# A malformed catalog must not allow more than one approved Retro APK.
python3 - "$TMP/catalog.json" <<'PY_RETRO_BAD'
import json,sys
p=sys.argv[1]; data=json.load(open(p)); data['apps'][0]['packages'].append(data['apps'][0]['packages'][0]); open(p,'w').write(json.dumps(data))
PY_RETRO_BAD
"$MANAGER" start install retro-arcade || fail 'invalid multi-APK Retro install should queue'
grep -Fqx "$(printf 'code\tE27')" "$TMP/runtime/apps-operation.state" || fail 'multiple Retro packages not rejected'
# Restore the catalog for safe removal of the original installed APK.
python3 - "$TMP/catalog.json" <<'PY_RETRO_GOOD'
import json,sys
p=sys.argv[1]; data=json.load(open(p)); data['apps'][0]['packages'].pop(); open(p,'w').write(json.dumps(data))
PY_RETRO_GOOD
"$MANAGER" start remove retro-arcade || fail 'Retro Arcade removal did not queue'
[ ! -s "$APPS_TEST_INSTALLED" ] || fail 'Retro Arcade was not uninstalled'
printf 'PASS: Retro Arcade single APK, static entry point readiness and safe removal\n'

# Restore the mock file deliberately corrupted by the earlier hash test.
printf 'approved chart mock package payload\n' > "$TMP/repo/luci-lib-chartjs-26.288.56989~75a306d.apk"
# A catalog may contain multiple apps. Each app must be visible to the
# installer and status reporter regardless of its position in the list.
: > "$APPS_TEST_INSTALLED"
rm -f "$TMP/owned/retro-arcade" "$TMP/owned/network-usage-monitor"
printf '%s\n' smartsafehub-app-retro-arcade > "$APPS_TEST_INSTALLED"
cat > "$TMP/catalog.json" <<EOF_BOTH
{"schema":1,"device_code":"iptime-ax3000sm","firmware_build_id":"mock-build-1","channel":"stable","apps":[{"id":"retro-arcade","version":"1.0.0-r1","name":"Retro Arcade","runtime":"router","installer":"apk","package_arch":"aarch64_cortex-a53","repository_release_id":"20261027T123000","repository_index_sha256":"$INDEX_SHA","web_ui":{"type":"static","path":"/retro-arcade/","package":"smartsafehub-app-retro-arcade"},"packages":[{"name":"smartsafehub-app-retro-arcade","version":"1.0.0-r1","sha256":"$RETROSHA"}],"requirements":{"min_memory_mb":1,"min_storage_mb":1}},{"id":"network-usage-monitor","version":"2025.06.02-r1","name":"네트워크 사용량 모니터","runtime":"router","installer":"apk","package_arch":"aarch64_cortex-a53","repository_release_id":"20261027T123000","repository_index_sha256":"$INDEX_SHA","packages":[{"name":"nlbwmon","version":"2025.06.02~29236be6-r1","sha256":"$ARCHIVE_SHA"},{"name":"luci-app-nlbwmon","version":"26.288.56989~75a306d","sha256":"$LUCISH"},{"name":"luci-lib-chartjs","version":"26.288.56989~75a306d","sha256":"$CHARTSHA"}],"requirements":{"min_memory_mb":1,"min_storage_mb":1}}]}
EOF_BOTH
# Retro Arcade was installed manually; testing the other app must not adopt it.
"$TMP/bin/fetch-catalog"
"$MANAGER" status
[ "$(wc -l < "$TMP/runtime/apps-status.tsv" | tr -d ' ')" -eq 2 ] || fail 'status lost the second approved app'
grep -Fqx "$(printf 'retro-arcade\t1\t1\t0\t0')" "$TMP/runtime/apps-status.tsv" || fail 'manual Retro Arcade status incorrect'
grep -Fqx "$(printf 'network-usage-monitor\t0\t0\t0\t0')" "$TMP/runtime/apps-status.tsv" || fail 'second app omitted from status'
"$MANAGER" start install network-usage-monitor || fail 'second app installation did not queue'
grep -Fqx "$(printf 'phase\tsuccess')" "$TMP/runtime/apps-operation.state" || fail 'second app install unexpectedly failed E22'
[ "$(wc -l < "$APPS_TEST_INSTALLED" | tr -d ' ')" -eq 4 ] || fail 'install changed unrelated packages'
grep -Fqx smartsafehub-app-retro-arcade "$APPS_TEST_INSTALLED" || fail 'manual Retro Arcade was modified'
[ ! -e "$TMP/owned/retro-arcade" ] || fail 'manual Retro Arcade was adopted'
"$MANAGER" status
grep -Fqx "$(printf 'network-usage-monitor\t1\t1\t1\t1')" "$TMP/runtime/apps-status.tsv" || fail 'second app installed state missing'
"$MANAGER" start remove network-usage-monitor || fail 'second app removal did not queue'
[ "$(cat "$APPS_TEST_INSTALLED")" = smartsafehub-app-retro-arcade ] || fail 'remove touched manual Retro Arcade'
# Reverse the catalog to verify lookup and status for the other second app.
python3 - "$TMP/catalog.json" <<'PY_BOTH_REVERSED'
import json
import sys
from pathlib import Path
path = Path(sys.argv[1])
data = json.loads(path.read_text())
data['apps'].reverse()
path.write_text(json.dumps(data))
PY_BOTH_REVERSED
"$TMP/bin/fetch-catalog"
"$MANAGER" status
[ "$(wc -l < "$TMP/runtime/apps-status.tsv" | tr -d ' ')" -eq 2 ] || fail 'reversed catalog lost an app'
grep -Fqx "$(printf 'retro-arcade\t1\t1\t0\t0')" "$TMP/runtime/apps-status.tsv" || fail 'second Retro Arcade status missing'
"$MANAGER" start install retro-arcade || fail 'second Retro Arcade installation did not queue'
grep -Fqx "$(printf 'code\tE29')" "$TMP/runtime/apps-operation.state" || fail 'second app did not reach manual ownership check'
printf 'PASS: multi-app lookup, E22 regression and manual package protection\n'
