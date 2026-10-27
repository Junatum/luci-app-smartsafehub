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
INDEX_SHA="$(sha256sum "$TMP/repo/packages.adb" | cut -d ' ' -f 1)"
ARCHIVE_SHA="$(sha256sum "$TMP/repo/nlbwmon-2025.06.02~29236be6-r1.apk" | cut -d ' ' -f 1)"
LUCISH="$(sha256sum "$TMP/repo/luci-app-nlbwmon-26.288.56989~75a306d.apk" | cut -d ' ' -f 1)"
CHARTSHA="$(sha256sum "$TMP/repo/luci-lib-chartjs-26.288.56989~75a306d.apk" | cut -d ' ' -f 1)"
cat > "$TMP/catalog.json" <<EOF
{"schema":1,"device_code":"iptime-ax3000sm","firmware_build_id":"mock-build-1","channel":"stable","apps":[{"id":"network-usage-monitor","name":"네트워크 사용량 모니터","runtime":"router","installer":"apk","package_arch":"aarch64_cortex-a53","repository_release_id":"20261027T123000","repository_index_sha256":"$INDEX_SHA","packages":[{"name":"nlbwmon","version":"2025.06.02~29236be6-r1","sha256":"$ARCHIVE_SHA"},{"name":"luci-app-nlbwmon","version":"26.288.56989~75a306d","sha256":"$LUCISH"},{"name":"luci-lib-chartjs","version":"26.288.56989~75a306d","sha256":"$CHARTSHA"}],"requirements":{"min_memory_mb":1,"min_storage_mb":1}}]}
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
 https://repo.smartsafehub.com/releases/stable/20261027T123000/packages/aarch64_cortex-a53/smartsafehub/packages.adb)
   cp "$APPS_TEST_REPO/packages.adb" "$dest";;
 https://repo.smartsafehub.com/releases/stable/20261027T123000/packages/aarch64_cortex-a53/smartsafehub/nlbwmon-2025.06.02~29236be6-r1.apk)
   cp "$APPS_TEST_REPO/nlbwmon-2025.06.02~29236be6-r1.apk" "$dest";;
 https://repo.smartsafehub.com/releases/stable/20261027T123000/packages/aarch64_cortex-a53/smartsafehub/luci-app-nlbwmon-26.288.56989~75a306d.apk)
   cp "$APPS_TEST_REPO/luci-app-nlbwmon-26.288.56989~75a306d.apk" "$dest";;
 https://repo.smartsafehub.com/releases/stable/20261027T123000/packages/aarch64_cortex-a53/smartsafehub/luci-lib-chartjs-26.288.56989~75a306d.apk)
   cp "$APPS_TEST_REPO/luci-lib-chartjs-26.288.56989~75a306d.apk" "$dest";;
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
    https://repo.smartsafehub.com/releases/stable/20261027T123000/packages/aarch64_cortex-a53/smartsafehub/packages.adb) repo=hub;;
    *) exit 2;;
   esac
   [ "$5" = -U ] && [ "$6" = add ] || exit 2
   shift 6;;
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
   hub:nlbwmon|hub:luci-app-nlbwmon|hub:luci-lib-chartjs) ;;
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
  hub:nlbwmon|hub:luci-app-nlbwmon|hub:luci-lib-chartjs) ;;
  *) exit 2;;
 esac
 grep -qxF "$name" "$APPS_TEST_INSTALLED" 2>/dev/null || printf '%s\n' "$name" >> "$APPS_TEST_INSTALLED"
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
export SMARTSAFEHUB_APPS_ARCH_FILE="$TMP/apk-arch"
export SMARTSAFEHUB_APPS_DAEMON_BIN="$TMP/bin/start-stop-daemon"
export APPS_TEST_CATALOG="$TMP/catalog.json"
export APPS_TEST_REPO="$TMP/repo"
export APPS_TEST_INSTALLED="$TMP/installed"
export APPS_TEST_APK_LOG="$TMP/apk-commands"
: > "$APPS_TEST_INSTALLED"
# A validated fixed release installs all three APKs from a single signed feed.
"$MANAGER" start install '../../../../etc/passwd' >/dev/null 2>&1 && fail 'invalid app ID accepted'
"$MANAGER" start install 'not-approved' || fail 'unknown app should queue'
grep -Fqx "$(printf 'code\tE22')" "$TMP/runtime/apps-operation.state" || fail 'unknown app was installed'
"$MANAGER" start install network-usage-monitor || fail 'install did not queue'
grep -Fqx "$(printf 'phase\tsuccess')" "$TMP/runtime/apps-operation.state" || fail 'three APK installation failed'
[ "$(wc -l < "$APPS_TEST_INSTALLED")" -eq 3 ] || fail 'all three APKs were not installed'
grep -Fqx -- '--repositories-file /dev/null -X https://repo.smartsafehub.com/releases/stable/20261027T123000/packages/aarch64_cortex-a53/smartsafehub/packages.adb -U add --simulate nlbwmon=2025.06.02~29236be6-r1 luci-app-nlbwmon=26.288.56989~75a306d luci-lib-chartjs=26.288.56989~75a306d' "$APPS_TEST_APK_LOG" || fail 'single signed repository not used'
"$MANAGER" status
grep -Fq "$(printf 'network-usage-monitor\t1\t1\t1\t1')" "$TMP/runtime/apps-status.tsv" || fail 'ready state missing'
"$MANAGER" start remove network-usage-monitor || fail 'remove did not queue'
[ ! -s "$APPS_TEST_INSTALLED" ] || fail 'new Apps uninstall did not remove owned packages'
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
printf 'tampered APK\n' > "$TMP/repo/luci-lib-chartjs-26.288.56989~75a306d.apk"
"$MANAGER" start install network-usage-monitor || fail 'tampered APK did not queue'
grep -Fqx "$(printf 'code\tE33')" "$TMP/runtime/apps-operation.state" || fail 'modified APK accepted'
printf 'PASS: Apps install/remove signed immutable release, three APKs, ownership and hash checks\n'

# Self-built App publications must install from immutable signed releases.
if ! grep -Fq 'repo_url="$REPO_BASE/releases/$channel/$publication/packages/$arch/smartsafehub"' "$MANAGER"; then
    echo 'FAIL: signed immutable Apps package publication is missing' >&2
    exit 1
fi
