#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-or-later
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
RPC_ENTRY="$ROOT_DIR/root/usr/share/rpcd/ucode/smartsafehub.uc"
LAN_RPC_ENTRY="$ROOT_DIR/root/usr/share/rpcd/ucode/smartsafehub-network.uc"
LAN_MODULE="$ROOT_DIR/root/usr/share/rpcd/ucode/smartsafehub/network-management.uc"
ACL="$ROOT_DIR/root/usr/share/rpcd/acl.d/luci-app-smartsafehub.json"
API="$ROOT_DIR/frontend/src/api/smartsafehub.ts"
HOOK="$ROOT_DIR/frontend/src/hooks/useLan.ts"
PAGE="$ROOT_DIR/frontend/src/pages/LanPage.tsx"
ROUTES="$ROOT_DIR/frontend/src/app/routes.ts"
HASH_ROUTE="$ROOT_DIR/frontend/src/hooks/useHashRoute.ts"
NAVIGATION="$ROOT_DIR/frontend/src/components/ProductNavigation.tsx"
APP="$ROOT_DIR/frontend/src/app/App.tsx"

fail() {
	echo "FAIL: $*" >&2
	exit 1
}

assert_ucode_export_terminated() {
	function_name="$1"

	if ! awk -v function_name="$function_name" '
		BEGIN { found = 0; active = 0; depth = 0; complete = 0 }
		!active && $0 ~ ("^export function " function_name "\\(") {
			found = 1
			active = 1
		}
		active {
			line = $0
			opens = gsub(/\{/, "", line)
			line = $0
			closes = gsub(/\}/, "", line)
			depth += opens - closes

			if (depth == 0) {
				if ($0 !~ /^[[:space:]]*};[[:space:]]*$/) {
					exit 2
				}

				complete = 1
				exit 0
			}
		}
		END {
			if (!found) {
				exit 3
			}
			if (!complete && depth != 0) {
				exit 4
			}
		}
	' "$LAN_MODULE"; then
		fail "ucode export 함수는 }; 로 끝나야 합니다: $function_name"
	fi
}

for file in "$RPC_ENTRY" "$LAN_RPC_ENTRY" "$LAN_MODULE" "$ACL" "$API" "$HOOK" "$PAGE" "$ROUTES" "$HASH_ROUTE" "$NAVIGATION" "$APP"; do
	[ -f "$file" ] || fail "LAN 설정 계약 파일이 없습니다: ${file#$ROOT_DIR/}"
done

if grep -Fq "network-management.uc" "$RPC_ENTRY" || grep -Fq "network_management.uc" "$RPC_ENTRY"; then
	fail '공개 smartsafehub RPC entry가 LAN 구현 모듈을 직접 import하면 안 됩니다.'
fi
if grep -Fq 'smartsafehub_network' "$RPC_ENTRY"; then
	fail 'smartsafehub RPC가 같은 rpcd 프로세스의 LAN 객체를 동기 ubus 호출하면 안 됩니다.'
fi
grep -Fq "from './smartsafehub/network-management.uc';" "$LAN_RPC_ENTRY" || \
	fail '격리된 LAN RPC entry가 기존 LAN 구현 모듈을 불러와야 합니다.'

for function_name in read_lan_settings update_lan_settings apply_recommended_lan; do
	assert_ucode_export_terminated "$function_name"
done

if command -v ucode >/dev/null 2>&1; then
	UCODE_OUTPUT="$(mktemp "${TMPDIR:-/tmp}/smartsafehub-lan-ucode.XXXXXX")"
	trap 'rm -f "$UCODE_OUTPUT"' EXIT HUP INT TERM
	ucode -c -o "$UCODE_OUTPUT" "$LAN_RPC_ENTRY" || \
		fail 'smartsafehub-network.uc와 LAN 구현 모듈이 ucode 컴파일을 통과해야 합니다.'
	rm -f "$UCODE_OUTPUT"
	trap - EXIT HUP INT TERM
fi
grep -Fq 'return { smartsafehub_network: methods };' "$LAN_RPC_ENTRY" || \
	fail '격리된 LAN backend ubus 객체가 등록되어야 합니다.'
for method in lan_settings lan_update lan_auto_subnet; do
	if grep -Eq "^[[:space:]]*${method}:[[:space:]]*\\{" "$RPC_ENTRY"; then
		fail "LAN RPC 메서드는 핵심 smartsafehub 객체에 중복 등록하면 안 됩니다: $method"
	fi
	grep -Eq "^[[:space:]]*${method}:[[:space:]]*\\{" "$LAN_RPC_ENTRY" || \
		fail "격리 LAN RPC 메서드가 등록되지 않았습니다: $method"
done

grep -Fq "import { root_password_configured } from './smartsafehub/security.uc';" "$LAN_RPC_ENTRY" || \
	fail '격리 LAN RPC가 자체적으로 관리자 비밀번호 설정 상태를 확인해야 합니다.'
grep -Fq 'call: require_root_password(function(request)' "$LAN_RPC_ENTRY" || \
	fail '격리 LAN RPC 메서드는 관리자 비밀번호 gate를 직접 적용해야 합니다.'

jq -e '."luci-app-smartsafehub".read.ubus.smartsafehub_network | index("lan_settings") != null' "$ACL" >/dev/null || \
	fail 'smartsafehub_network.lan_settings 읽기 ACL이 필요합니다.'
for method in lan_update lan_auto_subnet; do
	jq -e --arg method "$method" '."luci-app-smartsafehub".write.ubus.smartsafehub_network | index($method) != null' "$ACL" >/dev/null || \
		fail "smartsafehub_network.$method 쓰기 ACL이 필요합니다."
done

if jq -e '
	((."luci-app-smartsafehub".read.ubus.smartsafehub // []) | index("lan_settings") != null) or
	((."luci-app-smartsafehub".write.ubus.smartsafehub // []) | index("lan_update") != null) or
	((."luci-app-smartsafehub".write.ubus.smartsafehub // []) | index("lan_auto_subnet") != null)
' "$ACL" >/dev/null; then
	fail 'LAN 메서드를 핵심 smartsafehub 객체 ACL에 중복 노출하면 안 됩니다.'
fi

grep -Fq "const SAFE_LAN_CANDIDATES = [" "$LAN_MODULE" || \
	fail '자동 충돌 해결을 위한 안전한 LAN 후보 목록이 필요합니다.'
grep -Fq "safe_call('network.interface.wan', 'status', {})" "$LAN_MODULE" || \
	fail 'WAN runtime subnet을 기준으로 LAN 충돌을 검사해야 합니다.'
grep -Fq "safe_call('network.interface', 'dump', {})" "$LAN_MODULE" || \
	fail '자동 추천은 다른 활성 IPv4 인터페이스 대역도 피해야 합니다.'
grep -Fq 'subnets_overlap(lan_subnet, network.subnet)' "$LAN_MODULE" || \
	fail 'WAN/LAN subnet 겹침 검사가 필요합니다.'
grep -Fq "'LAN_WAN_SUBNET_CONFLICT'" "$LAN_MODULE" || \
	fail '수동 설정에서 WAN과 겹치는 LAN 대역을 거부해야 합니다.'
grep -Fq 'private_ipv4(ip)' "$LAN_MODULE" || \
	fail 'LAN 공유기 주소는 사설 IPv4로 제한해야 합니다.'
grep -Fq 'private_subnet(subnet)' "$LAN_MODULE" || \
	fail 'LAN subnet 전체가 RFC1918 사설 범위 안에 있어야 합니다.'
grep -Fq "'LAN_DHCP_RANGE_ROUTER_CONFLICT'" "$LAN_MODULE" || \
	fail 'DHCP pool이 공유기 IP를 포함하지 못하도록 검증해야 합니다.'
grep -Fq "prefix >= 8 && prefix <= 30" "$LAN_MODULE" || \
	fail '고급 subnet 설정은 /8~30 범위로 제한해야 합니다.'
grep -Fq "ctx.set('network', 'lan', 'ipaddr'" "$LAN_MODULE" || \
	fail 'LAN IP는 UCI network.lan에 저장해야 합니다.'
grep -Fq "ctx.set('dhcp', 'lan', 'start'" "$LAN_MODULE" || \
	fail 'DHCP 시작 주소는 UCI dhcp.lan에 저장해야 합니다.'
grep -Fq "ctx.set('dhcp', 'lan', 'limit'" "$LAN_MODULE" || \
	fail 'DHCP 종료 주소는 start/limit 계약으로 저장해야 합니다.'
grep -Fq "ctx.set('dhcp', 'lan', 'leasetime'" "$LAN_MODULE" || \
	fail '고급 DHCP 임대 시간 설정이 필요합니다.'
grep -Fq "ctx.set('dhcp', 'lan', 'ignore', target_ignore)" "$LAN_MODULE" || \
	fail 'DHCP 서버 사용 여부를 UCI ignore 옵션에 반영해야 합니다.'
grep -Fq "'( sleep 2; /sbin/reload_config ) >/dev/null 2>&1 </dev/null &'" "$LAN_MODULE" || \
	fail 'LAN 변경은 RPC 응답 뒤 지연된 reload_config로 적용해야 합니다.'
grep -Fq 'restore_snapshot(snapshot)' "$LAN_MODULE" || \
	fail 'LAN 설정 저장/적용 실패 시 이전 UCI 값으로 복구해야 합니다.'
grep -Fq "const LAN_UPDATE_LOCK = '/tmp/smartsafehub/lan-update.lock';" "$LAN_MODULE" || \
	fail '동시 LAN 설정 변경을 직렬화하는 잠금이 필요합니다.'

grep -Fq "const LAN_API_OBJECT = 'smartsafehub_network';" "$API" || \
	fail '프런트엔드 LAN API는 격리된 ubus 객체를 직접 사용해야 합니다.'
grep -Fq "return callApi(LAN_API_OBJECT, 'lan_settings');" "$API" || \
	fail '프런트엔드 LAN 조회 API가 격리된 ubus 객체를 호출해야 합니다.'
grep -Fq "'lan_update'" "$API" || fail '프런트엔드 LAN 저장 API가 필요합니다.'
grep -Fq "'lan_auto_subnet'" "$API" || fail '프런트엔드 추천 대역 적용 API가 필요합니다.'
grep -Fq "export function useLan(active: boolean)" "$HOOK" || \
	fail 'LAN 화면 전용 hook이 필요합니다.'
grep -Fq 'newAddress: result.newAddress ?? result.settings.lan.address' "$HOOK" || \
	fail 'LAN IP 변경 뒤 새 관리 주소를 사용자에게 전달해야 합니다.'

grep -Fq "route: 'lan'" "$ROUTES" || fail 'LAN route가 등록되어야 합니다.'
grep -Fq "hash: '#lan'" "$ROUTES" || fail 'LAN route는 #lan hash를 사용해야 합니다.'
grep -Fq "'#lan': 'lan'" "$HASH_ROUTE" || fail '#lan hash router 연결이 필요합니다.'
grep -Fq "{ label: 'Network', routes: ['lan', 'wifi', 'devices'] }" "$NAVIGATION" || \
	fail 'Network 메뉴에서 LAN이 Wi-Fi와 연결된 기기보다 먼저 표시되어야 합니다.'
grep -Fq "case 'lan':" "$APP" || fail 'App이 LAN 페이지를 렌더링해야 합니다.'
grep -Fq "const lan = useLan(route === 'lan');" "$APP" || fail 'LAN route에서만 LAN 데이터를 조회해야 합니다.'

grep -Fq '상위 네트워크' "$PAGE" || fail 'LAN 화면에 상위 네트워크 정보를 표시해야 합니다.'
grep -Fq '주소 대역이 겹칩니다' "$PAGE" || fail 'LAN 화면에 subnet 충돌 상태를 표시해야 합니다.'
grep -Fq '추천 대역으로 자동 변경' "$PAGE" || fail 'LAN 화면에 자동 충돌 해결 동작이 필요합니다.'
grep -Fq 'DHCP 시작 주소' "$PAGE" || fail 'DHCP 시작 주소 입력이 필요합니다.'
grep -Fq 'DHCP 종료 주소' "$PAGE" || fail 'DHCP 종료 주소 입력이 필요합니다.'
grep -Fq '고급 DHCP 설정' "$PAGE" || fail '고급 DHCP 설정 영역이 필요합니다.'
grep -Fq '서브넷 마스크' "$PAGE" || fail '고급 subnet 설정이 필요합니다.'
grep -Fq 'DHCP 임대 시간' "$PAGE" || fail 'DHCP 임대 시간 설정이 필요합니다.'
grep -Fq 'SmartSafeHub DHCP 서버 사용' "$PAGE" || fail 'DHCP 서버 ON/OFF 설정이 필요합니다.'
grep -Fq 'window.confirm(' "$PAGE" || fail 'LAN 적용 전 연결 중단 경고 확인이 필요합니다.'
grep -Fq '새 공유기 주소' "$PAGE" || fail 'LAN IP 변경 뒤 새 관리 주소 안내가 필요합니다.'

echo 'PASS: LAN/DHCP 관리, subnet 충돌 감지, 자동 추천과 고급 설정 계약이 일치합니다.'
