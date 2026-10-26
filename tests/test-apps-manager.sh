#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-or-later
set -eu
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
MANAGER="$ROOT/root/usr/libexec/smartsafehub-apps-manager"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT HUP INT TERM
fail() { echo "FAIL: $*" >&2; exit 1; }
mkdir -p "$TMP/bin" "$TMP/runtime" "$TMP/owned" "$TMP/repo" "$TMP/official" "$TMP/overlay"
# Linux /proc is unavailable on macOS. A fixture keeps the production check enabled.
printf 'MemTotal:       262144 kB\n' > "$TMP/meminfo"
printf 'all\naarch64_cortex-a53\n' > "$TMP/apk-arch"
printf 'signed immutable package-index test fixture\n' > "$TMP/repo/packages.adb"
printf 'signed mock package payload\n' > "$TMP/repo/nlbwmon-2025.06.02~29236be6-r1.apk"
printf 'approved LuCI mock package payload\n' > "$TMP/repo/luci-app-nlbwmon-26.288.56989~75a306d.apk"
printf 'approved LuCI mock package payload\n' > "$TMP/official/luci-app-nlbwmon-26.288.56989~75a306d.apk"
printf 'approved chart mock package payload\n' > "$TMP/official/luci-lib-chartjs-26.288.56989~75a306d.apk"
printf 'signed OpenWrt LuCI index mock\n' > "$TMP/official/packages.adb"
printf 'https://downloads.openwrt.org/releases/25.12-SNAPSHOT/packages/aarch64_cortex-a53/luci/packages.adb\n' > "$TMP/distfeeds.list"
INDEX_SHA="$(sha256sum "$TMP/repo/packages.adb" | cut -d ' ' -f 1)"
ARCHIVE_SHA="$(sha256sum "$TMP/repo/nlbwmon-2025.06.02~29236be6-r1.apk" | cut -d ' ' -f 1)"
LUCISH="$(sha256sum "$TMP/repo/luci-app-nlbwmon-26.288.56989~75a306d.apk" | cut -d ' ' -f 1)"
CHARTSHA="$(sha256sum "$TMP/official/luci-lib-chartjs-26.288.56989~75a306d.apk" | cut -d ' ' -f 1)"
OFFICIAL_INDEX_SHA="$(sha256sum "$TMP/official/packages.adb" | cut -d ' ' -f 1)"
cat > "$TMP/catalog.json" <<EOF
{"schema":1,"device_code":"iptime-ax3000sm","firmware_build_id":"mock-build-1","channel":"stable","apps":[{"id":"network-usage-monitor","name":"네트워크 사용량 모니터","runtime":"router","installer":"apk","package_arch":"aarch64_cortex-a53","repository_index_sha256":"$INDEX_SHA","packages":[{"name":"nlbwmon","version":"2025.06.02~29236be6-r1","sha256":"$ARCHIVE_SHA"}],"requirements":{"min_memory_mb":1,"min_storage_mb":1}}]}
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
 https://repo.smartsafehub.com/stable/packages/aarch64_cortex-a53/smartsafehub/packages.adb)
   cp "$APPS_TEST_REPO/packages.adb" "$dest";;
 https://repo.smartsafehub.com/stable/packages/aarch64_cortex-a53/smartsafehub/nlbwmon-2025.06.02~29236be6-r1.apk)
   cp "$APPS_TEST_REPO/nlbwmon-2025.06.02~29236be6-r1.apk" "$dest";;
 https://repo.smartsafehub.com/stable/packages/aarch64_cortex-a53/smartsafehub/luci-app-nlbwmon-26.288.56989~75a306d.apk)
   cp "$APPS_TEST_REPO/luci-app-nlbwmon-26.288.56989~75a306d.apk" "$dest";;
 https://downloads.openwrt.org/releases/25.12-SNAPSHOT/packages/aarch64_cortex-a53/luci/packages.adb)
   cp "$APPS_TEST_OFFICIAL/packages.adb" "$dest";;
 https://downloads.openwrt.org/releases/25.12-SNAPSHOT/packages/aarch64_cortex-a53/luci/luci-app-nlbwmon-26.288.56989~75a306d.apk)
   cp "$APPS_TEST_OFFICIAL/luci-app-nlbwmon-26.288.56989~75a306d.apk" "$dest";;
 https://downloads.openwrt.org/releases/25.12-SNAPSHOT/packages/aarch64_cortex-a53/luci/luci-lib-chartjs-26.288.56989~75a306d.apk)
   cp "$APPS_TEST_OFFICIAL/luci-lib-chartjs-26.288.56989~75a306d.apk" "$dest";;
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
    https://repo.smartsafehub.com/stable/packages/aarch64_cortex-a53/smartsafehub/packages.adb) repo=hub;;
    https://downloads.openwrt.org/releases/25.12-SNAPSHOT/packages/aarch64_cortex-a53/luci/packages.adb) repo=official;;
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
   hub:nlbwmon|hub:luci-app-nlbwmon|official:luci-app-nlbwmon|official:luci-lib-chartjs) ;;
   *) exit 2;;
  esac
  if [ "${APPS_TEST_UPGRADE:-0}" = 1 ] && [ "$repo" = official ]; then
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
  hub:nlbwmon|hub:luci-app-nlbwmon|official:luci-app-nlbwmon|official:luci-lib-chartjs) ;;
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
export APPS_TEST_OFFICIAL="$TMP/official"
export SMARTSAFEHUB_APPS_DISTFEEDS_FILE="$TMP/distfeeds.list"
export APPS_TEST_INSTALLED="$TMP/installed"
export APPS_TEST_APK_LOG="$TMP/apk-commands"
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
# apk CLI compatibility: installed config is authoritative, even when
# --print-arch is unavailable or supplies a different value.
export APPS_TEST_ARCH_CLI_FAIL=1
"$MANAGER" start install network-usage-monitor || fail 'configured architecture not accepted without CLI support'
grep -q 'phase.*success' "$TMP/runtime/apps-operation.state" || fail 'configured architecture rejected with E24'
"$MANAGER" start remove network-usage-monitor || fail 'architecture test cleanup failed'
unset APPS_TEST_ARCH_CLI_FAIL
# Unapproved architecture must fail closed, even when the CLI claims it matches.
printf 'all\nmipsel_24kc\n' > "$TMP/apk-arch"
"$MANAGER" start install network-usage-monitor || fail 'mismatched architecture job was not queued'
grep -Fqx "$(printf 'code\tE24')" "$TMP/runtime/apps-operation.state" || fail 'mismatched native architecture accepted'
[ ! -s "$APPS_TEST_INSTALLED" ] || fail 'mismatched native architecture installed packages'
# Older builds without an arch config can still use the apk CLI.
rm -f "$TMP/apk-arch"
"$MANAGER" start install network-usage-monitor || fail 'missing arch config fallback job was not queued'
grep -q 'phase.*success' "$TMP/runtime/apps-operation.state" || fail 'apk CLI architecture fallback rejected'
"$MANAGER" start remove network-usage-monitor || fail 'arch fallback cleanup failed'
printf 'all\naarch64_cortex-a53\n' > "$TMP/apk-arch"
# Signed/index-pinned happy path, local ownership, status and uninstall.
"$MANAGER" start install network-usage-monitor || fail 'installation start failed'
if ! grep -q 'phase.*success' "$TMP/runtime/apps-operation.state"; then
  code="$(awk -F "$(printf '\t')" '$1=="code" {print $2}' "$TMP/runtime/apps-operation.state")"
  fail "approved package not installed (worker code: ${code:-unknown})"
fi
grep -qxF nlbwmon "$APPS_TEST_INSTALLED" || fail 'apk add did not run'
grep -Fqx -- '--repositories-file /dev/null -X https://repo.smartsafehub.com/stable/packages/aarch64_cortex-a53/smartsafehub/packages.adb -U add --simulate nlbwmon=2025.06.02~29236be6-r1' "$APPS_TEST_APK_LOG" || fail 'signed remote repository preflight not isolated'
grep -Fqx -- '--repositories-file /dev/null -X https://repo.smartsafehub.com/stable/packages/aarch64_cortex-a53/smartsafehub/packages.adb -U add nlbwmon=2025.06.02~29236be6-r1' "$APPS_TEST_APK_LOG" || fail 'signed remote repository installation not isolated'
! grep -E '^.* -U add( --simulate)? /tmp/' "$APPS_TEST_APK_LOG" >/dev/null || fail 'local APK path used for install'
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
# Fail closed when the signed Hub repository cannot satisfy dependencies;
# never silently select a same-name APK from a different repository.
export APPS_TEST_MISSING_DEP=1
"$MANAGER" start install network-usage-monitor || fail 'missing dependency request not started'
grep -Fqx "$(printf 'code\tE34')" "$TMP/runtime/apps-operation.state" || fail 'missing dependency not rejected'
grep -Fq 'missing dependency' "$TMP/runtime/apps-last-error.log" || fail 'dependency error not retained'
[ ! -s "$APPS_TEST_INSTALLED" ] || fail 'dependency failure installed app'
unset APPS_TEST_MISSING_DEP
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
cp "$TMP/catalog.json" "$TMP/catalog-approved.json"
python3 - "$TMP/catalog.json" <<'PY'
import json,sys
p=sys.argv[1]; d=json.load(open(p)); d['apps']=[]; open(p,'w').write(json.dumps(d))
PY
"$TMP/bin/fetch-catalog"
"$MANAGER" status
grep -Fq "$(printf 'network-usage-monitor\t0\t1\t1')" "$TMP/runtime/apps-status.tsv" || fail 'revoked app missing from local inventory'
"$MANAGER" start remove network-usage-monitor || fail 'recalled app removal failed'
[ ! -s "$APPS_TEST_INSTALLED" ] || fail 'revoked app could not be removed'
# Additive approval: existing Apps-owned daemon receives an approved LuCI package.
cp "$TMP/catalog-approved.json" "$TMP/catalog.json"
"$TMP/bin/fetch-catalog"
printf 'signed mock package payload\n' > "$TMP/repo/nlbwmon-2025.06.02~29236be6-r1.apk"
"$MANAGER" start install network-usage-monitor || fail 'daemon reinstall was not queued'
[ -f "$TMP/owned/network-usage-monitor" ] || fail 'daemon ownership missing before extension'
python3 - "$TMP/catalog.json" "$LUCISH" <<'PY'
import json,sys
p=sys.argv[1]
d=json.load(open(p)); app=d['apps'][0]
app['packages'].append({'name':'luci-app-nlbwmon','version':'26.288.56989~75a306d','sha256':sys.argv[2]})
app['web_ui']={'type':'luci','path':'/cgi-bin/luci/admin/services/nlbw/display','package':'luci-app-nlbwmon'}
open(p,'w').write(json.dumps(d))
PY
"$TMP/bin/fetch-catalog"
"$MANAGER" status
grep -Fq "$(printf 'network-usage-monitor\t0\t1\t1\t0')" "$TMP/runtime/apps-status.tsv" || fail 'partial app must not expose missing web UI'
# An externally installed LuCI package may never be adopted into ownership.
printf 'luci-app-nlbwmon\n' >> "$APPS_TEST_INSTALLED"
"$MANAGER" start install network-usage-monitor || fail 'external UI rejection did not queue'
grep -Fqx "$(printf 'code\tE29')" "$TMP/runtime/apps-operation.state" || fail 'external LuCI ownership incorrectly adopted'
[ "$(wc -l < "$TMP/owned/network-usage-monitor")" -eq 1 ] || fail 'old owned manifest changed on rejection'
grep -vxF 'luci-app-nlbwmon' "$APPS_TEST_INSTALLED" > "$APPS_TEST_INSTALLED.tmp" || :
mv "$APPS_TEST_INSTALLED.tmp" "$APPS_TEST_INSTALLED"
# A change to an existing owned pin is not an additive approval.
cp "$TMP/catalog.json" "$TMP/catalog-extended.json"
python3 - "$TMP/catalog.json" <<'PY'
import json,sys
p=sys.argv[1]; d=json.load(open(p)); d['apps'][0]['packages'][0]['sha256']='0'*64
open(p,'w').write(json.dumps(d))
PY
"$TMP/bin/fetch-catalog"
"$MANAGER" start install network-usage-monitor || fail 'changed old pin did not queue'
grep -Fqx "$(printf 'code\tE28')" "$TMP/runtime/apps-operation.state" || fail 'changed previously owned pin accepted'
cp "$TMP/catalog-extended.json" "$TMP/catalog.json"
"$TMP/bin/fetch-catalog"
"$MANAGER" start install network-usage-monitor || fail 'approved UI extension did not queue'
grep -Fqx "$(printf 'phase\tsuccess')" "$TMP/runtime/apps-operation.state" || fail 'approved UI extension failed'
grep -qxF luci-app-nlbwmon "$APPS_TEST_INSTALLED" || fail 'approved UI was not installed'
grep -Fqx "$(printf 'luci-app-nlbwmon\t26.288.56989~75a306d\t%s' "$LUCISH")" "$TMP/owned/network-usage-monitor" || fail 'new UI package not owned'
"$MANAGER" status
grep -Fq "$(printf 'network-usage-monitor\t1\t1\t1\t1')" "$TMP/runtime/apps-status.tsv" || fail 'approved UI ready state incorrect'
"$MANAGER" start remove network-usage-monitor || fail 'complete app removal did not queue'
[ ! -s "$APPS_TEST_INSTALLED" ] || fail 'complete app removal left verified packages behind'
[ ! -f "$TMP/owned/network-usage-monitor" ] || fail 'complete app ownership not removed'
# New Hub approval format: SmartSafeHub core package plus OpenWrt-signed UI
# and Chart.js dependency, both pinned to the official LuCI index.
cp "$TMP/catalog-approved.json" "$TMP/catalog.json"
"$MANAGER" start install network-usage-monitor || fail 'fresh core for official extension failed'
python3 - "$TMP/catalog.json" "$LUCISH" "$CHARTSHA" "$OFFICIAL_INDEX_SHA" <<'PY'
import json,sys
path=sys.argv[1]
obj=json.load(open(path)); app=obj['apps'][0]
app['packages']=app['packages'][:1]
app['external_packages']=[
 {'name':'luci-app-nlbwmon','version':'26.288.56989~75a306d','sha256':sys.argv[2],'repository':'luci'},
 {'name':'luci-lib-chartjs','version':'26.288.56989~75a306d','sha256':sys.argv[3],'repository':'luci'}]
app['external_repository_index_sha256']=sys.argv[4]
app['web_ui']={'type':'luci','path':'/cgi-bin/luci/admin/services/nlbw/display','package':'luci-app-nlbwmon'}
open(path,'w').write(json.dumps(obj))
PY
cp "$TMP/catalog.json" "$TMP/catalog-official.json"
"$TMP/bin/fetch-catalog"
"$MANAGER" status
grep -Fq "$(printf 'network-usage-monitor	0	1	1	0')" "$TMP/runtime/apps-status.tsv" || fail 'official pair not detected as incomplete'
"$MANAGER" start install network-usage-monitor || fail 'official packages install did not queue'
grep -Fqx "$(printf 'phase	success')" "$TMP/runtime/apps-operation.state" || fail 'official UI install failed'
grep -qxF luci-app-nlbwmon "$APPS_TEST_INSTALLED" || fail 'official UI package missing'
grep -qxF luci-lib-chartjs "$APPS_TEST_INSTALLED" || fail 'official chart dependency missing'
grep -Fqx -- '--repositories-file /dev/null -X https://downloads.openwrt.org/releases/25.12-SNAPSHOT/packages/aarch64_cortex-a53/luci/packages.adb -U add --simulate luci-app-nlbwmon=26.288.56989~75a306d luci-lib-chartjs=26.288.56989~75a306d' "$APPS_TEST_APK_LOG" || fail 'official signed feed was not isolated'
grep -Fqx -- '--repositories-file /dev/null -X https://downloads.openwrt.org/releases/25.12-SNAPSHOT/packages/aarch64_cortex-a53/luci/packages.adb -U add luci-app-nlbwmon=26.288.56989~75a306d luci-lib-chartjs=26.288.56989~75a306d' "$APPS_TEST_APK_LOG" || fail 'approved official packages not installed'
"$MANAGER" status
grep -Fq "$(printf 'network-usage-monitor	1	1	1	1')" "$TMP/runtime/apps-status.tsv" || fail 'complete official app not marked launchable'
"$MANAGER" start remove network-usage-monitor || fail 'official owned packages cleanup failed'
[ ! -s "$APPS_TEST_INSTALLED" ] || fail 'owned official UI remains after cleanup'
printf 'luci-lib-chartjs\n' > "$APPS_TEST_INSTALLED"
"$MANAGER" start install network-usage-monitor || fail 'preinstalled shared library install did not queue'
grep -Fqx "$(printf 'phase	success')" "$TMP/runtime/apps-operation.state" || fail 'compatible preinstalled library rejected'
! grep -q '^luci-lib-chartjs' "$TMP/owned/network-usage-monitor" || fail 'shared library ownership was stolen'
export APPS_TEST_DEL_SHARED=1
"$MANAGER" start remove network-usage-monitor || fail 'unsafe dependency removal not queued'
grep -Fqx "$(printf 'code	E44')" "$TMP/runtime/apps-operation.state" || fail 'shared dependency removal not blocked'
unset APPS_TEST_DEL_SHARED
"$MANAGER" start remove network-usage-monitor || fail 'owned UI removal was not queued'
grep -qxF luci-lib-chartjs "$APPS_TEST_INSTALLED" || fail 'shared library was removed'
[ "$(wc -l < "$APPS_TEST_INSTALLED")" -eq 1 ] || fail 'extra package remained after removal'
export APPS_TEST_SHARED_VERSION='26.287.1'
"$MANAGER" start install network-usage-monitor || fail 'wrong shared dependency version not queued'
grep -Fqx "$(printf 'code	E38')" "$TMP/runtime/apps-operation.state" || fail 'shared dependency version mismatch accepted'
unset APPS_TEST_SHARED_VERSION
: > "$APPS_TEST_INSTALLED"
printf 'tampered index\n' > "$TMP/official/packages.adb"
"$MANAGER" start install network-usage-monitor || fail 'tampered official repository not queued'
grep -Fqx "$(printf 'code	E37')" "$TMP/runtime/apps-operation.state" || fail 'tampered official index accepted'
printf 'signed OpenWrt LuCI index mock\n' > "$TMP/official/packages.adb"
# Validate the hash of each individual official APK as well as the index.
printf 'substituted unofficial archive\n' > "$TMP/official/luci-app-nlbwmon-26.288.56989~75a306d.apk"
"$MANAGER" start install network-usage-monitor || fail 'tampered official archive not queued'
grep -Fqx "$(printf 'code\tE33')" "$TMP/runtime/apps-operation.state" || fail 'tampered official APK accepted'
printf 'approved LuCI mock package payload\n' > "$TMP/official/luci-app-nlbwmon-26.288.56989~75a306d.apk"
# Reject additional packages not on the reviewed allowlist.
python3 - "$TMP/catalog.json" <<'PY_BAD'
import json,sys
path=sys.argv[1]; obj=json.load(open(path))
obj['apps'][0]['external_packages'][1]['name']='luci-app-commands'
open(path,'w').write(json.dumps(obj))
PY_BAD
"$MANAGER" start install network-usage-monitor || fail 'unapproved package not queued'
grep -Fqx "$(printf 'code\tE27')" "$TMP/runtime/apps-operation.state" || fail 'unreviewed official package accepted'
cp "$TMP/catalog-official.json" "$TMP/catalog.json"
export APPS_TEST_UPGRADE=1
"$MANAGER" start install network-usage-monitor || fail 'upgrade simulation not queued'
grep -Fqx "$(printf 'code	E34')" "$TMP/runtime/apps-operation.state" || fail 'unapproved luci-base upgrade accepted'
unset APPS_TEST_UPGRADE
"$MANAGER" start remove network-usage-monitor || fail 'cleanup after official upgrade rejection failed'
[ ! -s "$APPS_TEST_INSTALLED" ] || fail 'old daemon not cleaned up'
printf 'https://attacker.invalid/repo/packages.adb\n' > "$TMP/distfeeds.list"
"$MANAGER" start install network-usage-monitor || fail 'unapproved distfeed request not queued'
grep -Fqx "$(printf 'code	E37')" "$TMP/runtime/apps-operation.state" || fail 'untrusted official repository accepted'
printf 'PASS: Apps install/remove allowlist, pins, ownership, status, revocation, official LuCI\n'
