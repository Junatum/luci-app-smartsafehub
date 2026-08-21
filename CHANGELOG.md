# 변경 기록

SmartSafeHub LuCI 애플리케이션의 정식 배포 변경 사항을 기록합니다.

버전은 애플리케이션 버전과 OpenWrt 패키지 릴리스를 함께 표기합니다. 예를 들어 `0.2.0-r1`은 애플리케이션 버전 `0.2.0`, 패키지 릴리스 `1`을 의미합니다.

## [0.2.0-r1] - 2026-08-21

SmartSafeHub 전용 사용자 화면과 rpcd 백엔드를 처음 정식 배포하는 릴리스입니다. `0.2.0` 개발 과정에서 사용한 중간 package revision은 정식 배포 기준점인 `r1`으로 squash했습니다.

### 추가

- Preact, TypeScript, Vite와 Tailwind CSS 기반의 SmartSafeHub 전용 LuCI 사용자 화면을 추가했습니다.
- 홈, Wi-Fi, 연결된 기기, SafeShield, 사용자 규칙, 업데이트 및 시스템 화면을 추가했습니다.
- 데스크톱 내비게이션과 모바일 햄버거 메뉴, 최소 44px 터치 영역, iPhone 안전 영역을 지원합니다.
- `/cgi-bin/luci/smartsafehub` 공개 Preact shell과 `/cgi-bin/luci/smartsafehub/session` 보호 세션 endpoint를 추가했습니다.
- LuCI가 비밀번호 검증과 cookie session 발급을 담당하고, Preact는 같은 URL에서 로그인 화면과 인증된 제품 화면을 전환합니다.
- 장치 모델, OpenWrt 버전, 커널, 부팅 시각, 부하, 메모리와 WAN 상태를 표시하는 대시보드를 추가했습니다.
- 관리 대상 기본 LAN AP의 SSID, 보안 방식, 비밀번호와 사용 여부를 변경하는 Wi-Fi 관리 기능을 추가했습니다.
- DHCP lease, ARP, `network.wireless`와 hostapd 정보를 결합하는 연결 기기 조회 기능을 추가했습니다.
- SafeShield 사용 여부, 상태, 차단 목록 수동 갱신, 아티팩트와 차단 통계를 표시합니다.
- SafeShield 라이선스 키 등록·변경·제거를 지원하고, 사용자가 명시적으로 요청한 경우에만 `safeshield.license_get`으로 현재 키를 불러옵니다.
- 사용자 허용·차단 도메인 규칙을 조회·추가·삭제하고 SafeShield 엔진의 local apply 완료 상태를 확인합니다.
- 장치, Wi-Fi와 SafeShield 상태를 결합한 JSON 진단 정보 다운로드를 추가했습니다.
- 명시적인 확인 절차가 포함된 공유기 재부팅과 기존 LuCI의 펌웨어 관리, 고급 설정, 시스템 로그 진입점을 추가했습니다.

### 아키텍처

- SmartSafeHub 제품 화면을 Shadow DOM에 마운트해 LuCI 테마와 제품 스타일의 충돌을 줄였습니다.
- `smartsafehub.uc`는 RPC 등록만 담당하고 `core`, `devices`, `system`, `wifi`, `wifi-management` ucode 모듈로 기능을 분리했습니다.
- 공통 프런트엔드 API 계층과 hook 계층을 두고 페이지가 직접 JSON-RPC를 호출하지 않도록 구성했습니다.
- SmartSafeHub는 SafeShield의 UCI, 규칙 파일과 init script를 직접 다루지 않고 공식 `safeshield` ubus API를 직접 사용합니다.
- `safeshield.config_update`는 SmartSafeHub에서 사용하지 않으며 ACL에도 부여하지 않습니다.
- 평문 라이선스 키를 반환하는 `safeshield.license_get`은 일반 상태 polling과 분리하고 민감 권한으로 취급해 write ACL에 포함했습니다.
- 사용자 규칙의 저장, 직렬화, debounce, cached-artifact merge와 dnsmasq 적용은 SafeShield 엔진이 authoritative source로 담당합니다.
- 시스템 상태 수집은 rpcd 이벤트 루프를 막지 않도록 deferred ubus 호출과 `request.reply()` 흐름을 사용합니다.
- 별도 프런트엔드 build ID 없이 패키지 버전 `0.2.0-r1`을 JavaScript와 CSS 캐시 무효화 키로 사용합니다.

### 성능 및 안정성

- 동일 리소스의 중복 요청을 single-flight 방식으로 합치고 완료 기반 `setTimeout()` 폴링으로 요청 중첩을 방지합니다.
- 브라우저 탭이 숨겨진 동안 폴링을 중단하고 다시 표시될 때 즉시 갱신합니다.
- 모든 프런트엔드 RPC에 기본 20초 타임아웃과 응답 형식 검증을 적용하고 Wi-Fi 변경에는 35초 제한을 사용합니다.
- Wi-Fi 변경 작업은 잠금 파일로 직렬화하고 적용 실패 시 이전 UCI 설정으로 롤백합니다.
- 연결 기기 조회는 `network.wireless`에 station 정보가 있을 때 불필요한 hostapd 조회를 생략합니다.
- 진단 생성은 이미 로드된 시스템 상태를 재사용하고 Wi-Fi와 SafeShield 상태를 병렬 조회하며 부분 실패를 허용합니다.
- SafeShield 규칙 변경 후 `last_local_apply` / `last_local_apply_failure`를 확인해 실제 DNS 적용 결과를 구분합니다.
- 라이선스 키는 기본 상태·진단 흐름에 평문으로 포함하지 않고 사용자의 명시적 조회에서만 가져옵니다.

### 수정

- SafeShield가 실행 중인데 화면에 대기 상태로 표시되던 상태 매핑을 수정했습니다.
- 시스템 실행 시간을 부팅 시각으로 잘못 표시하던 문제를 수정했습니다.
- Wi-Fi 변경 시 기존 WPA2/WPA3 비밀번호를 재사용하는 경우에도 형식을 검증하도록 수정했습니다.
- Wi-Fi 적용 실패 시 이전 설정 복원과 reload 재시도를 수행하도록 보강했습니다.
- 시스템 진단의 복합 RPC 오류를 제거하고 프런트엔드에서 기존 API 응답을 안전하게 결합하도록 변경했습니다.
- 공개 SmartSafeHub route에서 stock LuCI 로그인이나 `403 Forbidden`이 제품 로그인 UI보다 먼저 노출되는 문제를 해결했습니다.
- 로그인 성공 후 페이지를 이동하지 않고 같은 SmartSafeHub URL에서 인증된 Preact 애플리케이션으로 전환하도록 정리했습니다.
- 프런트엔드와 ucode 모듈의 TypeScript/ucode 컴파일 오류와 누락된 import를 수정했습니다.

### 제거 및 정리

- SmartSafeHub 내부의 SafeShield UCI/init script/local rule 직접 제어 코드와 obsolete SafeShield proxy RPC를 제거했습니다.
- 사용하지 않는 `system_diagnostics` RPC, ACL 권한과 진단 전용 백엔드 코드를 제거했습니다.
- 사용하지 않는 `safeshield.config_update` 프런트엔드 코드와 LuCI write 권한을 제거했습니다.
- 기존 LuCI view loader와 중복된 로그인/session bootstrap 코드를 제거했습니다.
- package-time `Build/Prepare` 문자열·파일 계약 검사와 중복 source/dist/rpcd 검사 스크립트를 제거했습니다.
- 프런트엔드 빌드는 `tsc --noEmit`과 Vite 빌드로 단순화했습니다.

### 검증

- 프런트엔드는 Node.js 24 이상에서 `npm run typecheck`와 `npm run build`로 검증합니다.
- OpenWrt buildroot에서 패키지 clean/compile을 수행합니다.
- 실제 장치에서는 `ucode -c`, rpcd 재시작, `ubus -v list smartsafehub`와 주요 RPC 호출로 최종 확인합니다.
