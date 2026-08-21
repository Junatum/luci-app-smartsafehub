# 변경 기록

SmartSafeHub LuCI 애플리케이션의 정식 배포 변경 사항을 기록합니다.

버전은 애플리케이션 버전과 OpenWrt 패키지 릴리스를 함께 표기합니다. 예를 들어 `0.2.0-r4`는 애플리케이션 버전 `0.2.0`, 패키지 릴리스 `4`를 의미합니다.

## [Unreleased]

### Added

- SafeShield 라이선스 키 등록/변경 UI와 `safeshield.license_update` 연동을 추가했습니다.
- `safeshield.license_get`을 사용해 현재 키를 명시적으로 보기/숨기기 할 수 있고, 빈 키 업데이트 계약으로 라이선스를 제거할 수 있게 했습니다.

### Removed

- Removed the package-time `Build/Prepare` string and file contract checks.
- Removed the duplicated rpcd/source/dist contract-check scripts and simplified the frontend build to TypeScript plus Vite.
- Removed unused SafeShield config mutation client code and the unused `safeshield.config_update` LuCI write permission.

## [0.2.0-r10] - 2026-08-21

- Fixed the unauthenticated `403 Forbidden` regression introduced by the r9 optional-auth route design.
- Made `/cgi-bin/luci/smartsafehub` a true public Preact shell with `auth: {}` so the dispatcher never blocks the custom login UI before JavaScript loads.
- Added `/cgi-bin/luci/smartsafehub/session` as the dedicated protected LuCI cookie/session bootstrap endpoint.
- Moved session probing and password submission to the protected session endpoint while keeping password verification, cookie issuance and additional-auth policy in LuCI.
- Render `LoginApp` on a 403 session probe and switch directly to the authenticated `App` after receiving a valid session id, without navigating away from the public SmartSafeHub URL.
- Made the legacy `/admin/smartsafehub` child route a public shell override and normalize it to the official public URL in the browser.
- Removed template-side optional session bootstrap and the obsolete LuCI view lifecycle globals; the public template no longer exposes session data.
- Added source, dist and package-time regression checks for the public-shell/protected-session split.

## [0.2.0-r9] - 2026-08-21

- Unified the login and authenticated product shell under `/cgi-bin/luci/smartsafehub`, keeping `#home` and other client routes on the same URL after login.
- Changed the SmartSafeHub public route to optional LuCI cookie authentication (`login: false`) so a valid session can be discovered without invoking the stock LuCI login template.
- Render `LoginApp` when no LuCI session exists and render the authenticated Preact `App` from the same server template when a valid session exists.
- Bootstrap `/admin/ubus` directly from the session id exposed by the authenticated template, removing the need for the legacy LuCI view loader.
- Kept `/admin/smartsafehub` as a compatibility template and normalize old bookmarks to the public SmartSafeHub URL in the browser.
- Use `/admin/` only as the LuCI credential submission endpoint; successful login returns to `/cgi-bin/luci/smartsafehub#home`.
- Removed the redundant login-time session probe and the obsolete `htdocs/luci-static/resources/view/smartsafehub/app.js` loader.

## [0.2.0-r8] - 2026-08-20

- Added the public SmartSafeHub login route at `/cgi-bin/luci/smartsafehub`.
- Implemented the branded login screen as a Preact component instead of a standalone imperative JavaScript page.
- Reused the existing Preact/Vite `app.js` and Shadow DOM stylesheet runtime for both the public login page and the authenticated SmartSafeHub application.
- Kept LuCI as the only password/session authority by submitting `luci_username` and `luci_password` to the protected SmartSafeHub route.
- Added session probing, password visibility, Caps Lock feedback, responsive mobile layout and a fallback to the stock LuCI login flow.
- Added source/dist/package checks that reject stale bundles without the Preact login entry.

## [0.2.0-r7] - 2026-08-19

- Use SafeShield's engine-side cached-artifact local-rule apply path instead of requesting a full Hub refresh from the UI.
- Poll the authoritative `last_local_apply` / `last_local_apply_failure` timestamps for DNS apply completion.
- Remove the frontend refresh queue because serialization, debounce and duplicate suppression now belong to the SafeShield engine.
- Keep rule persistence feedback separate from confirmed DNS apply completion.

## [0.2.0-r6] - 2026-08-19

- Queue and debounce SafeShield local rule application so rapid rule edits share one full refresh instead of starting one refresh per mutation.
- Save rule mutations with `refresh=false`, then explicitly refresh after the latest saved generation and verify completion through `safeshield.status`.
- If a refresh is already running, wait for it to release the lock and request a follow-up refresh so a newly saved local rule cannot miss the merge window.
- Distinguish successful rule persistence from confirmed DNS application and surface timeout/failure feedback.

## [0.2.0-r5] - 2026-08-19

SafeShield 공식 ubus API가 추가된 버전에 맞춰 SmartSafeHub의 SafeShield 통합 경계를 정리한 릴리스입니다.

### 아키텍처 변경

- SmartSafeHub rpcd에서 SafeShield UCI, init script, status 파일과 local rule 파일을 직접 다루던 `smartsafehub/safeshield.uc`를 제거했습니다.
- `safeshield_set_enabled`, `safeshield_refresh`, `safeshield_rules_list`, `safeshield_rule_add`, `safeshield_rule_delete` 프록시 RPC를 제거했습니다.
- 프런트엔드가 `safeshield.status`, `config`, `config_update`, `set_enabled`, `refresh`, `rules_list`, `rule_add`, `rule_delete`, `license_update` 공식 API를 직접 사용하도록 변경했습니다.
- LuCI ACL도 SmartSafeHub 자체 권한과 SafeShield 공식 API 권한을 분리해 선언하도록 변경했습니다.
- SafeShield 규칙 수 제한과 임시 잠금 같은 정책을 SmartSafeHub에서 중복 소유하지 않고 SafeShield API를 authoritative source로 사용하도록 정리했습니다.

### 수정

- `set_enabled`의 비동기 lifecycle 계약에 맞춰 mutation 응답으로 최종 runtime 상태를 추정하지 않고 `safeshield.status`를 재조회하도록 변경했습니다.
- `boot_delay`와 refresh 진행 단계에서도 상태 polling이 이어지도록 SafeShield 상태 훅을 보완했습니다.
- 규칙 변경 후 공식 `rules_list`와 `config`를 다시 읽어 전체 규칙과 활성 상태를 authoritative API 기준으로 갱신합니다.

## [0.2.0-r4] - 2026-08-05

SmartSafeHub 전용 사용자 화면과 rpcd 백엔드를 처음으로 함께 배포하는 릴리스입니다. 개발 과정에서 수행한 구조 정리, 성능 개선과 진단 다운로드 수정도 이 릴리스에 통합했습니다.

### 추가

- Preact와 TypeScript 기반의 SmartSafeHub 전용 LuCI 사용자 화면을 추가했습니다.
- 홈, Wi-Fi, 연결된 기기, SafeShield, 사용자 규칙, 업데이트 및 시스템 화면을 추가했습니다.
- 데스크톱 제품 내비게이션과 모바일 햄버거 메뉴를 추가했습니다.
- 모바일 최소 44px 터치 영역, iPhone 안전 영역과 `viewport-fit=cover`를 지원합니다.
- 장치 모델, OpenWrt 버전, 커널, 부팅 시각, 부하, 메모리와 WAN 상태를 표시하는 대시보드를 추가했습니다.
- 각 무선 장치에서 관리 대상 기본 LAN AP를 선택하고 SSID, 보안 방식, 비밀번호와 사용 여부를 변경하는 기능을 추가했습니다.
- Wi-Fi 적용 실패 시 이전 UCI 설정을 복원하고 무선 네트워크를 다시 불러오는 롤백 처리를 추가했습니다.
- DHCP 임대, ARP 테이블, `network.wireless`와 hostapd 클라이언트 정보를 결합하는 연결 기기 조회 기능을 추가했습니다.
- 연결 기기의 호스트명, MAC 주소, IPv4 주소, 연결 방식, SSID, 라디오, 주파수 대역, 신호 세기와 접속 시간을 표시합니다.
- SafeShield 사용 여부 변경, 차단 목록 수동 갱신과 상세 상태 표시 기능을 추가했습니다.
- `/etc/safeshield/allowlist`와 `/etc/safeshield/blocklist`를 관리하는 사용자 허용·차단 규칙 기능을 추가했습니다.
- 사용자 규칙의 도메인 정규화, 중복·충돌 방지, 파일 잠금, 파일 크기와 개수 제한을 추가했습니다.
- 장치, Wi-Fi와 SafeShield 상태를 JSON 파일로 저장하는 진단 정보 다운로드 기능을 추가했습니다.
- 명시적인 확인 값을 요구하는 공유기 재부팅 기능을 추가했습니다.
- 기존 LuCI의 펌웨어 관리, 고급 시스템 설정, 시스템 로그와 로그아웃 화면으로 이동하는 안전한 진입점을 추가했습니다.
- LuCI 세션으로 `/admin/ubus` JSON-RPC를 호출하는 공통 프런트엔드 API 계층을 추가했습니다.
- 읽기와 쓰기 권한을 분리한 LuCI rpcd ACL을 추가했습니다.

### 아키텍처 변경

- SmartSafeHub를 기존 LuCI 카드 안이 아닌 전체 폭 제품 화면으로 표시하도록 구성했습니다.
- SmartSafeHub 화면에서 기존 LuCI 상단·하단 chrome을 숨기고, 다른 화면으로 이동하면 원래 레이아웃을 복원합니다.
- Shadow DOM에 마운트해 LuCI 테마와 제품 스타일의 충돌을 줄였습니다.
- LuCI 화면을 벗어날 때 Preact 트리를 명시적으로 unmount하고 이벤트 리스너와 폴링 타이머를 정리하도록 생명주기 계약을 추가했습니다.
- 공통 UI를 `AppShell`, `ProductHeader`, `ProductNavigation`으로 분리했습니다.
- rpcd 백엔드를 `core`, `devices`, `wifi`, `wifi-management`, `safeshield`, `system` 기능 모듈로 분리했습니다.
- `smartsafehub.uc`는 공개 RPC 메서드 등록만 담당하는 작은 composition root로 정리했습니다.
- SafeShield 상세 상태는 불필요한 프록시를 거치지 않고 기존 `safeshield.status` API에서 직접 읽습니다.
- 시스템 상태 수집은 rpcd 이벤트 루프를 막지 않도록 `ubus.defer()`와 `request.reply()`를 사용하는 비동기 흐름으로 변경했습니다.
- 별도 프런트엔드 build ID를 제거하고 패키지 버전 `0.2.0-r4`를 정적 자산 캐시 키로 사용합니다.
- 프런트엔드 자산 로드 실패 화면과 재시도 동작을 LuCI 로더에 추가했습니다.

### 성능 및 안정성

- 공통 비동기 리소스 훅에서 동일한 RPC 요청이 동시에 중복 실행되지 않도록 single-flight 처리를 추가했습니다.
- 폴링은 이전 요청이 끝난 뒤 다음 `setTimeout()`을 예약하므로 느린 장치에서도 요청이 겹치지 않습니다.
- 브라우저 탭이 숨겨진 동안 폴링을 중단하고 다시 표시될 때 즉시 갱신하도록 했습니다.
- 화면이 비활성화됐다가 다시 열리면 해당 리소스를 새로 조회하고, 홈·시스템 상태는 활성 상태에서 60초 간격으로 갱신합니다.
- 모든 프런트엔드 RPC에 기본 20초 타임아웃과 JSON-RPC 응답 구조 검증을 추가하고 Wi-Fi 변경에는 35초 제한을 적용했습니다.
- 사용자 규칙 화면도 공통 비동기 리소스 훅을 사용하도록 통합해 중복 상태 관리 코드를 줄였습니다.
- 진단 정보 생성 시 시스템 화면에 이미 로드된 상태를 재사용하고 Wi-Fi와 SafeShield만 `Promise.allSettled()`로 병렬 조회합니다.
- Wi-Fi 또는 SafeShield 상태 조회 하나가 실패해도 해당 섹션만 안전한 기본값으로 기록하고 진단 파일 다운로드를 계속합니다.
- Wi-Fi 변경 대상 검증 시 전체 무선 런타임과 hostapd 상태를 다시 수집하지 않고 UCI 설정만 검사하도록 최적화했습니다.
- Wi-Fi 변경 작업을 잠금 파일로 직렬화하고 reload 성공 뒤 2초·5초 시점에 런타임 상태를 다시 조회하도록 했습니다.
- 연결 기기 조회에서 `network.wireless` 응답에 station 정보가 있으면 같은 인터페이스의 hostapd 클라이언트 조회를 생략합니다.
- LuCI 제품 화면 DOM 감시는 `requestAnimationFrame()` 단위로 합치고 화면을 벗어나면 observer를 해제합니다.
- 숫자, 날짜와 정렬용 `Intl` 객체를 모듈 단위로 재사용합니다.
- ucode 모듈 캐시를 이용해 기능 모듈들이 하나의 ubus 연결을 공유합니다.

### 수정

- SafeShield가 실행 중인데 화면에 계속 대기 상태로 표시되던 상태 매핑을 수정했습니다.
- 시스템 실행 시간을 부팅 시각으로 잘못 표시하던 문제를 수정하고 실제 부팅 시각을 계산하도록 했습니다.
- 패키지 업그레이드 후 LuCI JavaScript 컨텍스트에 이전 프런트엔드와 CSS URL이 남는 캐시 문제를 수정했습니다.
- 진단 다운로드에서 `system_diagnostics` 복합 RPC가 `UBUS_STATUS_UNKNOWN_ERROR`를 반환하던 문제를 수정했습니다.
- 진단 전용 복합 RPC를 제거하고 프런트엔드에서 기존 상태와 선택적 상세 조회를 안전하게 결합하도록 변경했습니다.
- 최초 `system.board` deferred 요청을 시작하지 못한 경우 명시적인 오류 응답을 반환하도록 수정했습니다.
- 기존 Wi-Fi 비밀번호를 재사용할 때 WPA2/WPA3 형식에 맞는지 검증하도록 수정했습니다.
- 홈과 시스템 화면의 메모리 사용량 계산 기준을 통일했습니다.
- `exactOptionalPropertyTypes` 환경에서 선택적 전역 속성 처리 때문에 TypeScript 빌드가 실패하던 문제를 수정했습니다.
- ucode named import 마지막 항목의 trailing comma 때문에 rpcd 플러그인이 컴파일되지 않던 문제를 수정했습니다.
- ucode의 exported function이 `};`로 끝나지 않아 모듈 컴파일이 실패하던 문제를 수정했습니다.
- `devices.uc`의 `wifi_band()` import 누락을 수정했습니다.
- rpcd 객체가 등록되지 않아 화면에 리소스 없음 오류가 표시되던 모듈 계약 문제를 수정했습니다.
- Makefile의 다중 확장 과정에서 셸 변수 검사가 손상되던 문제를 별도 검사 스크립트로 대체했습니다.

### 정리

- 사용하지 않는 `system_diagnostics` RPC 등록, ACL 권한, 프런트엔드 API와 백엔드 진단 전용 코드를 제거했습니다.
- 사용하지 않는 아이콘, 불필요한 public export와 0바이트 `entry.uc` 파일을 실제 패키지 트리에서 제거했습니다.
- 파일명 정규화의 불필요한 locale 변환을 제거했습니다.
- 제거된 RPC가 소스나 배포 번들에 다시 포함되면 검사가 실패하도록 회귀 방지 조건을 추가했습니다.

### 검증

- `scripts/check-rpcd-imports.sh`에서 필수 ucode 모듈, import 문법, exported function 종료 문법과 10개 공개 RPC 메서드를 검사합니다.
- `frontend/scripts/check-source.mjs`에서 프런트엔드 composition root, 공통 훅, 진단 흐름과 rpcd 모듈 계약을 검사합니다.
- `frontend/scripts/check-dist.mjs`에서 생성된 `app.js`, `app.css`, Shadow DOM, unmount, RPC 타임아웃, 모바일 메뉴, 로그아웃과 필수 API 문자열을 검사합니다.
- GitHub Actions에서 Node.js 24로 의존성 설치, rpcd 계약 검사, 프런트엔드 빌드, 배포 산출물 계약과 `git diff --check`를 자동 검증합니다.
- OpenWrt 장치에서는 `ucode -c`, rpcd 재시작, `ubus -v list smartsafehub`와 주요 RPC 호출로 최종 확인합니다.
