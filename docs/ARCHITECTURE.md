# SmartSafeHub 아키텍처

이 문서는 SmartSafeHub LuCI 애플리케이션 **`0.2.0-r10`**의 구조, 런타임 흐름, 성능·안정성 설계와 확장 원칙을 설명합니다.

## 1. 설계 목표

SmartSafeHub는 일반 사용자가 OpenWrt의 복잡한 설정 전체를 직접 다루지 않고도 자주 사용하는 기능을 안전하게 관리할 수 있도록 설계되었습니다.

핵심 목표:

- 저사양 OpenWrt 장치에서도 동작하는 작은 Preact 프런트엔드
- LuCI 인증과 rpcd ACL을 그대로 사용하는 권한 모델
- 기능별로 분리된 ucode 백엔드
- Wi-Fi 변경 작업의 입력 검증과 실패 복구, SafeShield는 공식 API 계약 사용
- 일부 데이터 소스 실패를 전체 기능 실패로 확대하지 않는 best-effort 조회
- 데스크톱과 모바일에서 동일한 핵심 기능 제공
- 중복 RPC, 겹치는 폴링과 불필요한 hostapd 조회 최소화
- 빌드 단계에서 소스·배포 산출물·RPC 계약 오류 차단

SmartSafeHub는 OpenWrt의 모든 고급 설정을 대체하지 않습니다. 게스트 Wi-Fi, VLAN, mesh, 방화벽, 패키지와 세부 시스템 설정은 기존 LuCI 화면으로 연결합니다.

## 2. 전체 구성

```text
브라우저
  │
  │ /cgi-bin/luci/smartsafehub
  ▼
LuCI public Preact shell (auth: {})
root/usr/share/ucode/luci/template/smartsafehub/login.ut
  │
  ├─ #smartsafehub-entry-root
  └─ 버전이 포함된 app.js 로드
       │
       ├─ GET /cgi-bin/luci/smartsafehub/session
       │      ├─ 403: LoginApp
       │      └─ 200 + session id: App
       │
       └─ POST /cgi-bin/luci/smartsafehub/session
              └─ LuCI password/session authentication
       │
       ▼
Preact 애플리케이션 · Shadow DOM
root/www/luci-static/smartsafehub/app.js + app.css
       │
       │ JSON-RPC /admin/ubus
       ├─────────────────────────────┐
       ▼                             ▼
rpcd ucode: smartsafehub       rpcd ucode: safeshield
       │                             │
       ├─ system / network           ├─ status / config
       ├─ wireless / hostapd         ├─ enable / refresh
       ├─ DHCP leases / ARP          ├─ local rules
       └─ reboot / wifi reload       └─ license

SmartSafeHub backend는 SafeShield의 UCI, 규칙 파일, init script를 직접 다루지 않습니다.
SafeShield 관련 읽기·변경은 `safeshield` 패키지가 제공하는 공식 ubus API만 호출합니다.
```

## 3. LuCI 통합 계층

### 3.1 메뉴

메뉴 정의:

```text
root/usr/share/luci/menu.d/luci-app-smartsafehub.json
```

공식 사용자 경로 `smartsafehub`는 `auth: {}`인 공개 shell입니다. 따라서 비로그인 요청도 dispatcher 인증 단계에서 막히지 않고 항상 `smartsafehub/login` 템플릿과 Preact 번들을 로드합니다.

`smartsafehub/session`은 cookie authentication과 `login: true`를 사용하는 별도 보호 endpoint입니다. Preact는 이 endpoint를 GET하여 세션 유무를 확인하고, 로그인 폼 제출 시 같은 endpoint에 `luci_username` / `luci_password`를 POST합니다. 세션이 없으면 GET probe는 403으로 끝나지만 이는 background fetch이므로 stock 로그인 화면이 사용자 UI를 덮지 않습니다.

`admin/smartsafehub`는 이전 북마크 호환을 위해 child node에서 `auth: {}`를 명시한 공개 shell로 유지합니다. LuCI의 `admin` parent가 인증 노드여도 child auth가 public shell로 override되며, 프런트엔드는 즉시 `history.replaceState()`로 `/cgi-bin/luci/smartsafehub` 주소로 정규화합니다.

### 3.2 ACL

ACL 정의:

```text
root/usr/share/rpcd/acl.d/luci-app-smartsafehub.json
```

읽기 권한:

- `smartsafehub.status`
- `smartsafehub.connected_devices`
- `smartsafehub.wifi_summary`
- `safeshield.status`
- `safeshield.config`
- `safeshield.rules_list`

쓰기 권한:

- `smartsafehub.wifi_update`
- `smartsafehub.system_reboot`
- `safeshield.set_enabled`
- `safeshield.refresh`
- `safeshield.rule_add`
- `safeshield.rule_delete`

진단 다운로드용 별도 `system_diagnostics` RPC는 사용하지 않습니다. 진단 파일은 읽기 권한이 있는 기존 API 응답을 프런트엔드에서 결합해 생성합니다.

### 3.3 Public Preact shell과 보호된 session bootstrap

`root/usr/share/ucode/luci/template/smartsafehub/login.ut`는 인증 상태와 무관하게 같은 `#smartsafehub-entry-root`를 제공하는 공개 서버 shell입니다. 이 템플릿은 session ID를 HTML에 직접 넣지 않습니다.

`root/usr/share/ucode/luci/template/smartsafehub/session.ut`는 보호된 `smartsafehub/session` route에서만 실행되며 인증에 성공한 요청의 `ctx.authsession`만 반환합니다.

주요 흐름:

1. `/cgi-bin/luci/smartsafehub`는 `auth: {}`로 항상 Preact shell을 렌더링
2. `main.tsx`가 `/cgi-bin/luci/smartsafehub/session`을 GET
3. 403이면 `LoginApp`, 유효한 32자리 session ID면 제품 `App` 렌더링
4. 로그인 폼은 같은 session endpoint에 credentials를 POST
5. LuCI dispatcher가 비밀번호 검증, cookie 발급 및 추가 인증 정책을 처리
6. fetch가 redirect를 따라 보호 template에서 session ID를 받으면 페이지 reload 없이 `App`으로 전환
7. 제품 API는 받은 session ID를 `/admin/ubus` JSON-RPC에 사용

이 분리로 public UI route에는 dispatcher authentication을 걸지 않으면서도 실제 관리 API와 session ID bootstrap은 LuCI 인증 경계 뒤에 유지합니다.

기존 `htdocs/luci-static/resources/view/smartsafehub/app.js` LuCI view loader는 사용하지 않습니다. 인증 상태 전환과 bootstrap은 `frontend/src/main.tsx`와 `frontend/src/auth/session.ts`가 담당합니다.

현재 자산 버전:

```text
0.2.0-r10
```

별도 `SMARTSAFEHUB_FRONTEND_BUILD_ID` 또는 `FRONTEND_BUILD_ID`는 사용하지 않습니다.

## 4. 프런트엔드 아키텍처

### 4.1 기술 구성

- Preact 10
- TypeScript
- Vite
- Tailwind CSS
- 브라우저 `fetch()` 기반 JSON-RPC
- hash route 기반 단일 페이지 애플리케이션

Vite 출력:

```text
root/www/luci-static/smartsafehub/app.js
root/www/luci-static/smartsafehub/app.css
```

### 4.2 Shadow DOM

`frontend/src/main.tsx`는 public entry template이 만든 `#smartsafehub-entry-root`에 open Shadow DOM을 생성하고, session probe 결과에 따라 같은 mount point에서 `LoginApp`과 제품 `App`을 전환합니다.

사용 목적:

- LuCI 테마 CSS가 SmartSafeHub 컴포넌트에 미치는 영향 최소화
- SmartSafeHub 스타일이 다른 LuCI 화면으로 새는 현상 방지
- 제품 UI의 반응형 레이아웃 독립 유지

Shadow root에는 버전이 포함된 `app.css` 링크와 Preact mount point가 생성됩니다. 이미 Shadow DOM이 존재하더라도 CSS URL의 버전이 다르면 새 URL로 교체합니다. r10부터 legacy LuCI view loader용 전역 mount/unmount hook은 제거했으며 public shell의 단일 Preact lifecycle만 사용합니다.

### 4.3 화면과 route

| route | hash | 화면 |
|---|---|---|
| `home` | `#home` | 장치 대시보드 |
| `wifi` | `#wifi` | Wi-Fi |
| `devices` | `#devices` | 연결된 기기 |
| `safeshield` | `#safeshield` | SafeShield |
| `rules` | `#rules` | 사용자 규칙 |
| `system` | `#system` | 업데이트 및 시스템 |

`App.tsx`는 route와 데이터 hook을 조합하는 composition root입니다.

```text
AppShell.tsx
├── ProductHeader.tsx
└── ProductNavigation.tsx
```

- `ProductHeader`: 제품명, 화면 제목, 설명, 새로고침 버튼
- `ProductNavigation`: 데스크톱·모바일 메뉴, 고급 설정, 로그아웃
- `AppShell`: 공통 제품 chrome과 페이지 콘텐츠 조합

### 4.4 데이터 계층

```text
페이지 컴포넌트
  ↓
hooks/use*.ts
  ↓
api/smartsafehub.ts 또는 api/safeshield.ts
  ↓
api/rpc.ts
  ↓
/admin/ubus JSON-RPC
```

`api/rpc.ts`의 책임:

- LuCI bootstrap에서 session ID와 RPC URL 읽기
- JSON-RPC 요청 ID 관리
- HTTP 오류, JSON 파싱 오류, ubus 상태 코드와 애플리케이션 오류 통합
- JSON-RPC 버전, 요청 ID, error 객체, result 배열과 정수 상태 코드 검증
- 기본 20초 타임아웃과 호출별 제한 지원; Wi-Fi 변경은 35초 사용
- 사용자에게 표시할 한국어 오류 메시지 생성

SmartSafeHub 백엔드 공통 응답:

```json
{
  "ok": true,
  "data": {},
  "error": null
}
```

오류 응답:

```json
{
  "ok": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "사용자 메시지"
  }
}
```

SafeShield 상세 상태는 기존 `safeshield.status`의 원시 응답을 프런트엔드에서 화면용 모델로 정규화합니다. 객체 없음과 일부 ubus 오류는 `available: false` 상태로 변환합니다.

### 4.5 비동기 리소스와 폴링

공통 훅 `useAsyncResource()`는 읽기 화면의 로딩, 새로고침, 오류와 폴링을 관리합니다.

핵심 계약:

- `inFlight` Promise가 있으면 같은 loader를 다시 실행하지 않고 기존 Promise 반환
- active 상태에 진입할 때 초기 로드 실행; 비활성화 뒤 재진입하면 다시 조회
- `setInterval()`을 사용하지 않음
- 이전 요청이 완료된 뒤 다음 `setTimeout()` 예약
- `document.visibilityState === 'hidden'`이면 타이머 중단
- 탭이 다시 표시되면 즉시 한 번 갱신한 뒤 폴링 재개
- unmount 후 상태 변경 방지
- 홈·시스템 상태는 활성 상태에서 60초 간격으로 갱신

이 구조는 CPU와 네트워크가 느린 공유기에서 요청이 누적되는 문제를 방지합니다.

### 4.6 진단 정보 생성

진단은 프런트엔드 `useSystemActions()`에서 생성합니다.

```text
SystemPage에 이미 로드된 smartsafehub.status
        │
        ├─ Promise.allSettled(smartsafehub.wifi_summary)
        └─ Promise.allSettled(safeshield.status)
                    │
                    ▼
        브라우저에서 SystemDiagnostics 조합
                    │
                    ▼
             JSON Blob 다운로드
```

설계 이유:

- 시스템 상태를 중복 조회하지 않음
- 독립적인 두 상세 요청을 병렬 실행
- 선택적 서비스 한쪽이 실패해도 전체 다운로드 유지
- rpcd 안에서 다시 ubus를 중첩 호출하는 복합 진단 RPC 제거
- Wi-Fi 비밀번호와 라이선스 키를 수집하지 않음
- 호스트명, WAN IPv4와 Wi-Fi SSID는 진단 목적의 식별 정보로 포함될 수 있음을 화면에 안내

### 4.7 반응형 UI

- `md` 이상에서는 가로 제품 메뉴
- 768px 미만에서는 sticky 모바일 메뉴
- route 변경과 `Escape` 입력 시 메뉴 닫힘
- 주요 버튼과 링크에 최소 44px 터치 영역
- LuCI 경고 배너도 모바일에서 전체 폭 버튼 사용
- 긴 문자열은 화면 폭 안에서 줄바꿈

## 5. rpcd 백엔드 아키텍처

### 5.1 composition root

```text
root/usr/share/rpcd/ucode/smartsafehub.uc
```

진입점은 기능 구현을 포함하지 않고 하위 모듈의 public function을 RPC 메서드에 연결합니다.

```ucode
return { smartsafehub: methods };
```

rpcd는 이 반환값으로 `smartsafehub` ubus 객체를 등록합니다.

### 5.2 모듈 구성

```text
root/usr/share/rpcd/ucode/smartsafehub/
├── core.uc
├── devices.uc
├── system.uc
├── wifi.uc
└── wifi-management.uc
```

#### `core.uc`

공통 런타임 기능:

- 공유 ubus 연결
- 동기 안전 호출과 deferred 호출
- 공통 성공·실패 응답
- 문자열·숫자·메모리 값 정규화
- UCI cursor 생성
- 제한 시간이 있는 시스템 명령 실행

ucode module loader가 모듈을 캐시하므로 기능 모듈은 하나의 ubus 연결을 공유합니다.

#### `wifi.uc`

읽기 전용 Wi-Fi 도메인 로직:

- 주파수 대역 판별
- 보안 방식 정규화
- 비밀번호 필요 여부 판별
- 무선 장치별 기본 AP 선택
- `network.wireless`와 hostapd 상태 결합
- 클라이언트 수, 채널과 런타임 상태 계산
- 변경 대상 section이 SmartSafeHub 관리 대상인지 UCI 기준 검증

각 radio에서는 LAN 네트워크에 연결된 AP를 우선하고 활성 상태와 격리 여부를 점수화해 하나의 기본 AP를 선택합니다.

#### `wifi-management.uc`

Wi-Fi 조회 RPC와 변경 작업:

- SSID UTF-8 1~32바이트 검증
- 지원 보안 방식 검증
- 비밀번호 8~63자 또는 64자리 16진수 검증
- 관리 대상 기본 AP만 변경 허용
- 변경 전 UCI snapshot 저장
- UCI commit
- `/sbin/wifi reload`
- 적용 실패 시 snapshot 복원과 reload 재시도
- `/tmp/smartsafehub-wifi-update.lock`으로 동시 변경 직렬화
- 잠금은 120초 뒤 stale 상태로 판단해 복구 가능
- 기존 키 재사용 시 WPA2/WPA3 비밀번호 형식 재검증

지원 보안 값:

- `keep`
- `none`
- `psk2`
- `sae-mixed`
- `sae`

변경 대상 검증에서는 무선 런타임 전체를 다시 조회하지 않고 UCI 설정을 사용합니다. 고급 또는 알 수 없는 보안 방식은 조회할 수 있지만, 해당 방식을 변경하려면 기존 LuCI를 사용합니다.

#### `devices.uc`

연결 기기 정보를 다음 소스에서 결합합니다.

1. dnsmasq DHCP lease 파일
2. `/proc/net/arp`
3. `network.wireless.status`
4. station 정보가 없는 인터페이스에 한해 `hostapd.<ifname>.get_clients`

MAC 주소를 기본 키로 병합해 다음 값을 생성합니다.

- hostname
- IPv4 address
- connection: `wifi`, `ethernet`, `unknown`
- online / leaseActive
- lease 만료 시각
- interface
- SSID, radio, band
- signal dBm, inactive time, connected time

개별 데이터 소스 실패는 빈 결과로 처리하고 다른 소스의 정보는 계속 반환합니다.

#### SafeShield 공식 API 소비

`smartsafehub/safeshield.uc` 같은 프록시·컨트롤러 모듈은 두지 않습니다. 프런트엔드의 `src/api/safeshield.ts`가 LuCI 세션으로 공식 `safeshield` ubus 객체를 직접 호출합니다.

SafeShield가 소유하는 기능:

- 상태와 health
- UCI 공개 설정 조회·변경
- enable/disable lifecycle
- 수동 refresh
- local allow/block 규칙
- 라이선스 키 변경
- 규칙 파일, dnsmasq, procd와 refresh scheduling

SmartSafeHub는 API 응답을 화면 모델로 정규화할 뿐 SafeShield의 UCI, `/etc/safeshield/*`, `/tmp/dnsmasq.d/*` 또는 `/etc/init.d/safeshield`를 직접 수정하지 않습니다. `set_enabled`는 비동기 요청이므로 mutation 응답으로 최종 상태를 추정하지 않고 `safeshield.status`를 다시 조회해 runtime 수렴을 확인합니다.

#### `system.uc`

시스템 상태와 재부팅을 담당합니다.

상태 수집 객체:

- `system.board`
- `system.info`
- `network.interface.wan.status`

rpcd handler에서 중첩 동기 ubus 호출을 수행하면 이벤트 루프가 막힐 수 있으므로 `ubus.defer()`로 순차 호출하고 마지막 콜백에서 `request.reply()`를 실행합니다. 최초 `system.board` 요청을 시작하지 못하면 `SYSTEM_BOARD_REQUEST_FAILED` 오류를 즉시 반환하며, WAN 조회 실패는 장치·런타임 정보 전체 실패로 처리하지 않습니다.

재부팅은 요청 인자 `confirm: "reboot"`를 확인한 뒤 2초 후 실행합니다.

## 6. 공개 RPC 계약

SmartSafeHub 자체가 등록하는 메서드는 총 **5개**입니다.

| 메서드 | 유형 | 인자 | 설명 |
|---|---|---|---|
| `status` | 읽기 | 없음 | 장치, 소프트웨어, 런타임과 WAN 상태 |
| `connected_devices` | 읽기 | 없음 | 연결 기기 목록과 집계 |
| `wifi_summary` | 읽기 | 없음 | 관리 대상 기본 Wi-Fi 요약 |
| `wifi_update` | 쓰기 | `section`, `ssid`, `security`, `password`, `enabled` | Wi-Fi 설정 변경과 reload |
| `system_reboot` | 쓰기 | `confirm` | 확인 후 재부팅 예약 |

SafeShield 기능은 아래 공식 API를 직접 소비합니다.

| SafeShield API | 유형 | 설명 |
|---|---|---|
| `safeshield.status` | 읽기 | 상태, runtime, artifact, health |
| `safeshield.config` | 읽기 | 공개 설정과 마스킹된 라이선스 상태 |
| `safeshield.set_enabled` | 쓰기 | 비동기 enable/disable lifecycle 요청 |
| `safeshield.refresh` | 쓰기 | 비동기 refresh 요청 |
| `safeshield.rules_list` | 읽기 | 사용자 허용·차단 규칙 조회 |
| `safeshield.rule_add` | 쓰기 | 사용자 규칙 추가 |
| `safeshield.rule_delete` | 쓰기 | 사용자 규칙 삭제 |

## 7. 주요 데이터 흐름

### 7.1 장치 상태

```text
HomePage 또는 SystemPage
  → useStatus
  → fetchStatus
  → smartsafehub.status
  → system.uc read_status
  → system.board
  → system.info
  → network.interface.wan.status
  → request.reply(ApiResponse)
```

### 7.2 Wi-Fi 변경

```text
WifiPage form
  → useWifi.update
  → smartsafehub.wifi_update
  → 입력 검증
  → UCI 기반 관리 대상 검증
  → 현재 UCI snapshot 저장
  → UCI 변경 및 commit
  → Wi-Fi 변경 lock 획득
  → /sbin/wifi reload
      ├─ 성공: 새 summary 반환 및 2초·5초 지연 재조회
      └─ 실패: snapshot 복원 후 reload 재시도
  → lock 해제
```

### 7.3 연결 기기

```text
ConnectedDevicesPage
  → smartsafehub.connected_devices
  → DHCP leases + ARP + network.wireless
  → station 누락 인터페이스만 hostapd fallback
  → MAC 기준 병합·분류·집계
```

### 7.4 SafeShield 사용자 규칙

```text
SafeShieldRulesPage
  → add/delete API
  → 규칙 lock 획득
  → allowlist/blocklist 읽기
  → 정규화·중복·충돌·제한 검사
  → 임시 파일 작성 및 원자적 교체
  → lock 해제
  → SafeShield 갱신 요청
```

### 7.5 진단 파일

```text
SystemPage의 기존 system snapshot
  → wifi_summary와 safeshield.status 병렬 호출
  → fulfilled 결과만 사용
  → 실패 섹션은 unavailable 기본값
  → 비밀 정보가 없는 JSON 다운로드
```

### 7.6 프런트엔드 자산 갱신

```text
PKG_VERSION + PKG_RELEASE
  → data-asset-version = 0.2.0-r10
  → app.js?v=0.2.0-r10
  → app.css?v=0.2.0-r10
```

통합 진입 템플릿은 패키지 릴리스를 정적 자산 query version으로 사용합니다. 로그인과 제품 화면은 동일한 `app.js` / `app.css`를 재사용하며, Shadow DOM의 stylesheet URL도 host의 `data-asset-version`을 따릅니다.

## 8. 보안과 안정성

### 8.1 권한 경계

- 브라우저는 LuCI session ID를 사용합니다.
- 모든 원격 호출은 `/admin/ubus`를 통과합니다.
- ACL에 등록하지 않은 메서드는 호출할 수 없습니다.
- 읽기와 쓰기 메서드를 분리합니다.
- 진단 파일은 비밀번호와 라이선스 키를 요청하거나 저장하지 않습니다.
- 진단 파일에 포함될 수 있는 호스트명, WAN IPv4와 Wi-Fi SSID를 사용자에게 사전 안내합니다.

### 8.2 입력 검증

- Wi-Fi section과 device가 실제 AP인지 확인
- 새 비밀번호뿐 아니라 재사용할 기존 키도 대상 WPA 보안 방식에 맞는지 확인
- SmartSafeHub 관리 대상 AP만 변경
- SSID, 보안 방식, 비밀번호와 bool 타입 검증
- 재부팅 확인 문자열 검증
- SafeShield action과 domain 검증
- 규칙 파일 크기와 개수 제한

### 8.3 실패 격리

- 연결 기기 데이터 소스 하나가 실패해도 전체 목록 조회 유지
- WAN 인터페이스를 읽지 못해도 장치와 런타임 상태 반환
- SafeShield API가 없으면 사용 불가 상태로 정규화
- 진단 상세 조회 하나가 실패해도 JSON 다운로드 유지
- Wi-Fi 적용 실패 시 원래 UCI 설정 복원 시도
- SafeShield 갱신과 규칙 변경에 별도 lock 사용
- Wi-Fi 변경에도 별도 lock을 사용해 여러 탭의 동시 commit과 reload 방지
- deferred ubus 요청 시작 실패를 명시적인 애플리케이션 오류로 변환

### 8.4 요청량 제어

- 동일 loader 중복 실행 방지
- 완료 기반 폴링으로 요청 중첩 방지
- 숨겨진 탭에서 폴링 중단
- station 정보가 있을 때 hostapd 중복 조회 생략
- 시스템 진단에서 이미 로드된 상태 재사용
- 비활성 화면은 폴링하지 않고 재진입 시 최신 상태 조회
- 모든 RPC에 제한 시간을 둬 영구 대기와 single-flight 고착 방지
- DOM observer 콜백을 animation frame으로 병합

## 9. 빌드와 검증

### 9.1 프런트엔드 검사

프런트엔드는 문자열 기반 계약 검사 대신 TypeScript와 Vite 자체 검증에 의존합니다.

```bash
cd frontend
npm ci
npm run typecheck
npm run build
```

`npm run build`는 TypeScript 검사를 통과한 뒤 `root/www/luci-static/smartsafehub/`에 배포 자산을 생성합니다. 프런트엔드 변경 시 생성된 `app.js`와 `app.css`도 함께 갱신합니다.

### 9.2 OpenWrt 패키지 빌드

Makefile에는 별도의 `Build/Prepare` 검증 hook을 두지 않습니다. 패키지는 `luci.mk`의 기본 흐름으로 구성합니다.

```bash
make package/luci-app-smartsafehub/clean
make package/luci-app-smartsafehub/compile V=s
```

### 9.3 실제 장치 검사

정적 검사는 ucode parser와 실제 rpcd 런타임 전체를 대신하지 않습니다.

```bash
ucode -c \
  -o /tmp/smartsafehub.ucb \
  /usr/share/rpcd/ucode/smartsafehub.uc

/etc/init.d/rpcd restart
ubus -v list smartsafehub
ubus call smartsafehub status '{}'
ubus call smartsafehub wifi_summary '{}'
ubus call smartsafehub connected_devices '{}'
```

브라우저에서는 진단 JSON 다운로드를 포함한 각 화면의 동작을 별도로 확인합니다.

## 10. 확장 원칙

1. `smartsafehub.uc`에는 기능 구현을 넣지 않고 RPC 등록만 추가합니다.
2. 여러 기능에서 실제로 공유하는 처리만 `core.uc`에 배치합니다.
3. 읽기 전용 도메인 로직과 변경 작업을 가능한 한 분리합니다.
4. ucode named import 마지막 항목에는 쉼표를 넣지 않습니다.
5. exported function은 반드시 `};`로 종료합니다.
6. 새 RPC를 추가하면 ACL, 프런트엔드 API와 타입을 함께 수정합니다.
7. 프런트엔드 페이지는 직접 JSON-RPC를 호출하지 않고 hook과 API 계층을 사용합니다.
8. 독립된 선택적 조회는 병렬 실행하되 부분 실패를 명시적으로 처리합니다.
9. 폴링 기능은 중복 요청과 숨겨진 탭을 고려해야 합니다.
10. 프런트엔드 소스를 변경하면 `npm run build`로 배포 산출물을 갱신합니다.
11. 패키지 릴리스를 변경하면 통합 진입 템플릿의 `data-asset-version`과 `app.js?v=`도 함께 변경합니다.
12. 배포 전 TypeScript 검사, 프런트엔드 빌드, OpenWrt 패키지 빌드와 실제 ubus 호출을 확인합니다.

## 11. 현재 제약

- Wi-Fi 화면은 각 radio에서 선택한 기본 LAN AP 하나만 관리합니다.
- WAN 상태는 `network.interface.wan` 객체를 기준으로 합니다.
- SafeShield 기능은 별도 `safeshield` 패키지와 해당 API·파일·init script에 의존합니다.
- 진단 파일은 현재 시점의 상태 snapshot이며 장기간의 로그 수집 기능은 아닙니다.
- 프런트엔드 개발 서버만으로는 LuCI ACL과 실제 ubus 동작을 완전히 재현할 수 없습니다.
- ucode module 문법은 JavaScript·TypeScript와 차이가 있으므로 실제 `ucode -c` 검사가 필요합니다.
