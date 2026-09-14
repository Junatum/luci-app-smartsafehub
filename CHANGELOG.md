# 변경 기록

## [0.2.14-r10] - 2026-09-14

### 수정

- 수동 펌웨어 업로드가 LuCI dispatcher 경로인 `/cgi-bin/luci/cgi-upload`로 잘못 전송되던 문제를 수정했습니다. `cgi-upload`는 dispatcher route가 아닌 CGI endpoint이므로 이제 `/cgi-bin/cgi-upload`로 요청합니다.
- `/cgi-bin/luci`가 경로 prefix 아래에 배치된 환경에서도 동일한 prefix를 유지하면서 CGI base를 계산하도록 `cgiBaseUrl()`/`cgiUrl()` URL helper를 분리했습니다.

### 개선

- 펌웨어 업로드의 네트워크 오류, HTTP 오류, 올바르지 않은 JSON 응답을 브라우저 콘솔에 endpoint·destination·파일명·파일 크기·HTTP 상태와 함께 기록해 현장 장애 원인을 구분하기 쉽게 했습니다. 사용자 오류 메시지에도 실제 업로드 endpoint와 HTTP 상태를 포함합니다.

### 테스트

- 수동 펌웨어 업로드가 `luciUrl('/cgi-upload')`를 다시 사용하지 않는지, `/cgi-bin` CGI base를 통해 업로드하는지와 업로드 실패 진단 로그가 유지되는지 update UI contract 테스트를 보강했습니다.

## [0.2.14-r9] - 2026-09-14

### 기능

- 설정의 `시스템 관리` 영역에 `예약 재부팅` 기능을 추가했습니다. 기본값은 비활성화이며, 필요할 때 `매일` 또는 `매주` 주기와 요일·시각을 선택해 공유기의 로컬 시간대 기준으로 자동 재부팅할 수 있습니다.
- 예약 재부팅은 별도 `smartsafehub-maintenance` procd daemon에서 실행되며 관리 소프트웨어 업데이트와 펌웨어 확인·다운로드·검증·설치 작업이 진행 중이면 재부팅을 즉시 수행하지 않고 15분 단위로 최대 2시간 연기합니다.
- 펌웨어가 설치 준비(`ready`) 상태인 경우에도 사용자가 준비한 이미지를 잃지 않도록 예약 재부팅을 연기합니다.
- 예약 시각 직전에 장치가 다시 부팅된 경우 최소 10분의 uptime 보호를 적용하고 같은 예약 key를 중복 실행하지 않아 재부팅 루프를 방지합니다.

### 개선

- 시간대 변경 시 관리 소프트웨어 updater뿐 아니라 maintenance daemon도 즉시 다시 시작해 예약 재부팅이 새 로컬 시간대를 바로 따르도록 했습니다.
- 기존 설정 파일에 `maintenance` section이 없는 업그레이드 장치는 maintenance init script가 안전한 기본값(꺼짐, 매주 일요일 04:00)으로 section을 한 번 생성합니다.
- 시스템 관리 UI에서 예약 재부팅을 전체 폭 카드로 배치하고 현재 시간대, 주기, 요일, 재부팅 시각과 업데이트 작업 충돌 시 연기 정책을 한 화면에서 확인하도록 구성했습니다.

### 테스트

- 예약 재부팅 비활성화 기본값, due schedule 실행, 동일 minute 중복 실행 방지, 최근 부팅 보호, 관리 소프트웨어/펌웨어 작업 중 연기, 연기 후 재시도, 2시간 timeout, UCI 입력 검증을 mock 기반 shell 테스트로 추가했습니다.
- scheduled reboot RPC/ACL, frontend hook/API, 시스템 관리 UI, maintenance init/helper 실행 권한과 시간대 변경 연동을 기존 contract 테스트에 추가했습니다.

## [0.2.14-r8] - 2026-09-14

### 기능

- 설정의 `시간 및 시간대` 카드에 `지금 동기화` 동작을 추가했습니다. NTP 자동 동기화가 활성화된 경우 OpenWrt `sysntpd`를 재시작해 설정된 NTP 서버로 즉시 새 동기화 요청을 보내고, 잠시 뒤 공유기 시간을 다시 조회해 화면에 반영합니다.
- 시간 설정 RPC 응답에 현재 공유기 epoch를 포함해 시간대 저장이나 수동 NTP 동기화 직후 별도의 전체 시스템 상태 갱신 없이 최신 장치 시간을 표시할 수 있도록 했습니다.

### 개선

- 시간대, Wi-Fi 보안 방식, 관리 소프트웨어 업데이트 주기 등 SmartSafeHub의 모든 `<select>`에 공통 드롭다운 화살표 스타일을 적용했습니다. 브라우저 기본 화살표 대신 오른쪽에서 `1rem` 안쪽에 고정하고 텍스트와 겹치지 않도록 우측 여백을 확보했습니다.
- NTP 동기화 또는 시간대 저장 중에는 다른 시간 설정 변경을 잠가 동시에 실행되는 시간 변경 요청을 방지합니다.

### 테스트

- `system_time_sync` RPC/ACL, NTP 비활성화 차단, `sysntpd restart`, 동기화 후 장치 시간 재조회와 UI 동작을 검증하도록 시스템 시간 contract를 확장했습니다.
- 공통 select 스타일이 native appearance를 제거하고 일관된 우측 inset 화살표와 padding을 유지하는지 네트워크/시간 설정 contract에 회귀 검증을 추가했습니다.

## [0.2.14-r7] - 2026-09-14

### 기능

- 설정 페이지에 `시간 및 시간대` 카드를 추가해 현재 장치 시간, IANA 시간대와 NTP 자동 동기화 사용 상태를 확인하고 시간대를 SmartSafeHub에서 직접 변경할 수 있도록 했습니다.
- 장치의 LuCI `getTimezones` 데이터베이스를 기준으로 선택 가능한 시간대를 제공하고, 브라우저 시간대가 지원되는 경우 빠르게 선택할 수 있는 동작을 추가했습니다.
- 시간대 저장 시 OpenWrt `system` UCI의 `zonename`과 대응 POSIX `timezone`을 함께 갱신하고 `/etc/init.d/system reload`로 즉시 적용합니다. 적용 실패 시 이전 값을 복원합니다.
- 시간대가 변경되면 관리 소프트웨어 자동 설치 marker와 재시도 시각을 초기화하고 updater를 재시작해 예약 설치가 새 로컬 날짜와 시각을 기준으로 다시 계산되도록 했습니다.

### 개선

- 설정 페이지의 중복 `업데이트 관리` 카드를 제거하고 `장치 설정`과 `시스템 관리` 두 영역으로 재구성했습니다.
- `장치 설정`에는 시간 및 시간대와 진단/지원 기능을, `시스템 관리`에는 공유기 재부팅과 LuCI 고급 설정 fallback을 배치해 각 기능의 목적을 명확하게 구분했습니다.
- 설정 라우트 설명을 시스템 상태·시간대·진단 중심으로 정리하고 카드 헤더에 기능별 아이콘을 적용해 다른 SmartSafeHub 화면과 시각적 계층을 맞췄습니다.

### 테스트

- 시간대 목록 조회, 지원하지 않는 시간대 차단, `zonename`/`timezone` 동시 저장, 시스템 reload, 실패 시 rollback, 자동 업데이트 일정 marker 초기화와 updater 재시작을 검증하는 전용 contract 테스트를 추가했습니다.
- 설정 페이지에서 중복 업데이트 진입점이 제거되고 시간대/진단/재부팅/고급 설정 영역이 유지되는지 검증하도록 UI contract와 RPC/ACL 검증을 보강했습니다.

## [0.2.14-r6] - 2026-09-14

### 개선

- 수동 펌웨어 설치의 브라우저 기본 파일 입력 UI를 SmartSafeHub 전용 파일 선택 행으로 교체해 `Browse...`/`No file selected.` 같은 브라우저·언어별 기본 문구와 깨진 정렬이 노출되지 않도록 개선했습니다.
- 선택 전에는 지원 이미지 안내와 `파일 선택` 버튼을 표시하고, 선택 후에는 파일명·크기와 `다른 파일 선택`, `업로드 및 검증` 동작을 한 행에서 확인할 수 있도록 정리했습니다.
- 업로드 진행률은 파일 선택 행 아래의 구분된 진행 영역에 표시해 작은 화면에서도 파일 정보와 동작 버튼이 자연스럽게 줄바꿈되도록 조정했습니다.

### 테스트

- 수동 펌웨어 입력이 시각적으로 숨겨진 실제 file input과 별도의 SmartSafeHub 파일 선택 컨트롤을 사용하는지, 한국어 파일 선택 상태와 업로드 검증 동작이 유지되는지 UI contract 테스트를 추가했습니다.

## [0.2.14-r5] - 2026-09-14

### 개선

- 업데이트 페이지를 `펌웨어 업데이트`와 `관리 소프트웨어 업데이트`의 두 제품 영역으로 단순화해 SmartSafeHub라는 제품명이 별도의 업데이트 종류처럼 보이는 혼동을 줄였습니다.
- 기존 `SmartSafeHub 업데이트`와 `SmartSafeHub 자동 업데이트` 명칭을 각각 `관리 소프트웨어 업데이트`, `자동 업데이트`로 정리하고, 자동 업데이트 설정을 관리 소프트웨어 카드 내부에 배치해 적용 범위를 구조 자체로 드러내도록 변경했습니다.
- 관리 소프트웨어의 현재 상태와 자동 업데이트 설정을 하나의 카드 내부 2열 영역으로 통합하고, 모바일에서는 한 열로 자연스럽게 쌓이도록 유지했습니다.
- 펌웨어 영역 제목을 `펌웨어 업데이트`로 명확히 하고, 설정/라우트 설명에서도 `SmartSafeHub 소프트웨어` 대신 `관리 소프트웨어` 용어를 사용하도록 통일했습니다.

### 테스트

- 관리 소프트웨어가 하나의 카드로 렌더링되는지, 현재 상태와 자동 업데이트 설정이 그 카드 내부에 함께 존재하는지, 이전 범위 경고와 `SmartSafeHub 자동 업데이트` 명칭이 다시 노출되지 않는지 contract 테스트를 보강했습니다.
- 펌웨어와 관리 소프트웨어의 고객용 제목 및 업데이트 페이지 설명 용어를 회귀 검증하도록 관련 UI contract를 갱신했습니다.

## [0.2.14-r4] - 2026-09-14

### 개선

- 수동 펌웨어 설치 영역을 펌웨어 카드의 내부 여백을 가진 하위 패널로 다시 배치해 온라인 펌웨어 상태와 같은 기능군이라는 점이 시각적으로 명확하게 보이도록 조정했습니다.
- `SmartSafeHub 소프트웨어` 제목을 `SmartSafeHub 업데이트`로 정리하고, 설정 카드 제목을 `SmartSafeHub 자동 업데이트`로 명시해 펌웨어 자동 업데이트로 오해하지 않도록 범위를 분명히 했습니다.
- 자동 업데이트 설정에 `SmartSafeHub 업데이트에만 적용되며 펌웨어는 자동 설치되지 않는다`는 범위 안내를 추가했습니다.
- SmartSafeHub가 최신 상태이거나 아직 확인 전인 상태 안내를 별도 카드로 분리하지 않고 SmartSafeHub 업데이트 카드 내부에 포함해 카드 간 관계와 정보 계층을 단순화했습니다.

### 테스트

- 수동 펌웨어 설치가 펌웨어 카드 내부의 inset subsection으로 유지되는지, SmartSafeHub 자동 업데이트 범위 문구가 존재하는지, 최신/미확인 상태 안내가 SmartSafeHub 업데이트 카드 밖으로 분리되지 않는지 contract 테스트를 보강했습니다.

## [0.2.14-r3] - 2026-09-14

### 개선

- 업데이트 페이지의 정보 계층을 재구성해 기기 펌웨어를 최상단의 주요 업데이트 영역으로 이동하고, 사용자용 명칭을 `OpenWrt 펌웨어` 대신 `펌웨어`로 단순화했습니다.
- 온라인 펌웨어 업데이트와 수동 `.bin` 업로드를 하나의 펌웨어 카드 안에 묶고, 수동 설치는 기본적으로 접힌 보조 영역으로 배치해 관련 기능의 맥락은 유지하면서 화면 밀도를 낮췄습니다.
- SmartSafeHub 소프트웨어 상태와 자동 업데이트 설정은 넓은 화면에서 2열로 배치하고 모바일에서는 기존처럼 1열로 쌓이도록 조정해 불필요한 전체 폭 카드 반복을 줄였습니다.
- 펌웨어 build ID 메타데이터가 없는 기존 이미지의 경고는 사용자 친화적인 설명을 먼저 보여주고, 파일 경로와 build ID 같은 구현 상세는 펼쳐보기 안으로 이동했습니다.

### 수정

- 이전 펌웨어 업데이트 UI 변경 과정에서 SmartSafeHub 소프트웨어 설명에 남은 중복 JSX 닫힘 태그를 정리했습니다.
- 업데이트/설정 페이지의 사용자용 설명에서 `OpenWrt 펌웨어` 표현을 `펌웨어`로 통일했습니다.

### 테스트

- 펌웨어 카드가 소프트웨어 카드보다 먼저 렌더링되는지, 수동 펌웨어 설치가 같은 카드 내부의 접이식 영역인지, 넓은 화면에서 소프트웨어 상태와 자동 업데이트 설정이 2열로 구성되는지 contract 테스트를 추가했습니다.
- 고객용 펌웨어 제목에 `OpenWrt 펌웨어` 표현이 다시 노출되지 않고, build ID 누락 시 기술 상세가 disclosure 안에 유지되는지 회귀 검증을 추가했습니다.

## [0.2.14-r2] - 2026-09-13

### 기능

- SmartSafeHub 업데이트 페이지에 OpenWrt 펌웨어 업데이트 영역을 추가했습니다. Hub의 `POST /api/v1/firmware/resolve`를 이용해 현재 장치·채널·빌드 기준 최신 Sysupgrade를 확인하고, 온라인 다운로드 또는 `.bin` 파일 직접 업로드 후 자체 화면에서 설치할 수 있습니다.
- 펌웨어 확인 전용 `smartsafehub-firmware` helper와 procd daemon, rpcd ucode API를 추가했습니다. 펌웨어 자동 확인은 기본 활성화하고 6시간 간격으로 실행하지만 펌웨어 자동 설치는 제공하지 않습니다.
- 신규 Stable 설치에서 SmartSafeHub 애플리케이션 자동 설치를 기본 활성화하고 Beta에서는 기본 비활성화했습니다. 기존 장치에 명시적으로 저장된 `auto_install` 값은 그대로 유지합니다.
- 업데이트 페이지에서 소프트웨어 업데이트와 펌웨어 업데이트를 함께 새로고침하도록 통합하고, 설정 페이지의 기존 LuCI 펌웨어 화면 링크는 자체 업데이트 페이지 링크로 교체했습니다.

### 보안 및 안정성

- 온라인 펌웨어는 Hub의 장치 코드·채널·빌드 식별자를 재검증하고 HTTPS 다운로드, 정확한 파일 크기, SHA-256, `system.validate_firmware_image`, `sysupgrade --test`를 모두 통과한 경우에만 설치할 수 있습니다. 설치 직전에도 SHA-256과 OpenWrt 검증을 다시 수행합니다. 펌웨어 확인이 실패하면 이전 resolve 응답을 즉시 폐기해 오래된 배포 정보를 재사용하지 않습니다.
- 수동 업로드도 온라인 이미지와 같은 OpenWrt 검증 경로를 사용하며, 강제 `sysupgrade` 옵션은 UI와 helper에서 제공하지 않습니다.
- 검증 결과가 설정 보존을 허용하는 경우에만 현재 설정 유지 설치를 허용하고, 펌웨어 설치 시작 뒤에는 공유기가 다시 응답할 때까지 현재 주소를 안전하게 재확인한 후 화면을 새로고침합니다.
- 지원 장치 식별을 `iptime-ax3000sm`, `gl-mt300n-v2`, `xiaomi-ax3000t`로 제한하고 `/usr/share/smartsafehub/firmware.json`의 `device_code`와 `build_id`를 우선 사용하도록 했습니다.

### 테스트

- Hub resolve 요청, 온라인 다운로드 무결성 검증, OpenWrt 이미지 검증, 수동 업로드, 준비 파일 정리와 강제 업그레이드 금지 동작을 mock 기반 shell 테스트로 추가했습니다.
- firmware RPC/ACL, 패키지 의존성, 업데이트 UI, 재부팅 후 reconnect/reload 안전성, Stable/Beta 자동 설치 기본값을 contract 테스트에 추가했습니다.

## [0.2.14-r1] - 2026-09-13

### 개선

- SafeShield 업그레이드 시 UI를 개선하여 진행 사항을 쉽게 파악할 수 있도록 하였습니다.
- 기타 사용성 개선을 하였습니다.

### 수정

- 업그레이드 시에 잘못된 로직을 수정하였습니다.

## [0.2.13-r8] - 2026-09-13

### 개선

- SafeShield 보호 요약의 유료 플랜 badge 옆에 중복으로 표시되던 `멤버십 활성` 상태 문구를 제거했습니다. PRO/ULTIMATE 등 유료 플랜은 premium badge의 아이콘과 색상만으로 상태를 인지하도록 단순화했습니다.
- FREE 플랜의 `기본 플랜` 보조 문구는 유지하여 무료 플랜과 유료 멤버십의 정보 계층을 구분했습니다.
- 유료 플랜에서 더 이상 사용하지 않는 tier별 status-caption CSS를 제거했습니다.

### 테스트

- SafeShield 페이지와 체크인된 `app.js`/`app.css`에서 유료 플랜의 `멤버십 활성` 문구와 관련 status-caption 스타일이 다시 노출되지 않는지 회귀 검증을 추가했습니다.

## [0.2.13-r7] - 2026-09-13

### 개선

- SafeShield 설정의 라이선스 요약 영역을 상단 멤버십 표시와 같은 디자인 언어로 다시 정리했습니다. FREE/유료 badge는 유지하면서, 미설정 상태는 `unlicensed` 같은 원문 대신 사용자용 문구로만 표시합니다.
- 라이선스가 등록되지 않은 경우에만 `라이선스 미설정` 보조 텍스트를 보여주고, 등록된 경우에는 불필요한 `active` 상태 문구를 제거해 상단 요약과 하단 설정 표현을 통일했습니다.
- 라이선스 키 입력/변경 영역을 별도 editor 카드로 정리하고 입력창, 현재 키 불러오기, 등록/변경, 제거 버튼의 시각적 계층과 여백을 함께 다듬었습니다.
- 라이트/다크 테마와 모바일 레이아웃에서 라이선스 요약·입력 UI의 시인성과 정렬을 개선했습니다.

### 테스트

- SafeShield 페이지 계약 테스트에 refined 라이선스 summary/editor 클래스와 정적 자산 반영 여부를 추가하고, `unlicensed`/`active` 같은 raw 상태 텍스트가 다시 노출되지 않도록 회귀 검증을 강화했습니다.

## [0.2.13-r6] - 2026-09-12

### 개선

- SafeShield 유료 멤버십 badge를 고대비 premium 스타일로 재설계했습니다. `ULTIMATE`는 dark-gold 기반 metallic gradient, 밝은 gold border/glow, jewel-style mark와 은은한 shine 효과를 적용해 라이트·다크 테마 모두에서 즉시 눈에 띄도록 개선했습니다.
- `PRO`와 기타 유료 플랜도 각각 teal 및 blue jewel-tone gradient로 대비를 강화하고, `멤버십 활성` 상태를 tier 색상의 작은 status pill로 표시해 유료 상태를 badge와 함께 명확하게 인지할 수 있도록 했습니다.
- 모션 감소 설정에서는 ULTIMATE shine 애니메이션을 비활성화하여 접근성을 유지합니다.

### 테스트

- SafeShield 페이지 계약 테스트에 premium badge의 high-contrast 색상, ULTIMATE shine keyframe, tier별 활성 caption 및 reduced-motion 대응이 소스와 체크인된 CSS에 유지되는지 검증을 추가했습니다.

## [0.2.13-r5] - 2026-09-12

### 수정

- 로컬 APK 설치로 `/etc/apk/world`에 남은 SmartSafeHub·SafeShield identity pin을 해제할 때 `apk add --upgrade --latest`를 실행하던 공격적인 정규화 경로를 제거했습니다. 이제 해당 두 패키지의 정확한 identity hash 항목만 일반 패키지 항목으로 직접 정규화합니다.
- identity pin 정규화 뒤에는 항상 `apk upgrade luci-app-smartsafehub` 한 번만 실행하도록 업데이트 경로를 단순화했습니다. SafeShield가 실제로 더 높은 최소 버전을 요구하는 경우에만 APK dependency resolver가 필요한 범위에서 함께 갱신합니다.
- SmartSafeHub 업데이트 때문에 관계없는 OpenWrt 패키지나 현재 펌웨어와 ABI가 다른 `kmod-*` 후보까지 불필요하게 해석되는 위험을 줄였습니다.

### 테스트

- SmartSafeHub와 SafeShield가 각각 로컬 APK identity pin 상태여도 `apk add --upgrade --latest`를 호출하지 않고 world 항목만 정규화한 뒤 target-only 업그레이드가 수행되는지 검증합니다.
- unrelated package의 버전 constraint와 identity pin이 그대로 보존되는지, updater 소스에 광범위한 `--latest`/`--available` 업그레이드 경로가 다시 추가되지 않는지 회귀 테스트를 강화했습니다.

## [0.2.13-r4] - 2026-09-12

### 개선

- SafeShield 보호 요약의 `PLAN` 값을 일반 텍스트 대신 멤버십 badge로 표시하도록 개선했습니다. `ULTIMATE`는 gold 계열, `PRO`는 teal 계열로 강조하고 기타 유료 플랜도 별도의 paid 스타일로 표시합니다.
- FREE 플랜에서는 보호 카드 하단에 SmartSafeHub 멤버십 안내 CTA를 표시하고 `https://www.smartsafehub.com/pricing/` 요금제 페이지를 새 탭으로 열 수 있도록 했습니다. 아직 출시 전인 유료 기능을 과장하지 않도록 `COMING SOON` 상태와 준비 중 안내 문구를 함께 표시합니다.
- 라이선스 설정 카드에서도 동일한 플랜 badge를 재사용하여 상단 요약과 플랜 표현을 일관되게 맞췄습니다.
- 라이트/다크 테마와 모바일 화면에 맞춘 유료 플랜 badge 및 FREE 업그레이드 CTA 스타일을 추가했습니다.

### 테스트

- SafeShield UI 계약 테스트에 전용 플랜 컴포넌트, FREE 전용 CTA 조건, pricing URL, 안전한 새 탭 링크 속성, 체크인된 `app.js`/`app.css` 멤버십 UI 포함 여부를 추가했습니다.

## [0.2.13-r3] - 2026-09-12

### 수정

- SafeShield 상태 재조회와 통계 재조회가 하나의 timeout 목록을 공유하던 구조를 분리했습니다. 상태 갱신 예약과 통계 갱신 예약이 서로의 지연 작업을 취소하지 않도록 각각 독립적으로 관리합니다.
- SafeShield의 보호 활성화/비활성화, 통계 설정, 라이선스 저장·제거 성공 안내는 4.5초 뒤 자동으로 사라지도록 변경했습니다. 오류 메시지는 기존처럼 사용자가 직접 닫을 때까지 유지합니다.
- 새 SafeShield 작업을 시작하거나 사용자가 피드백을 닫을 때 기존 성공 메시지 자동 닫기 timer를 정리하여 이전 작업의 timer가 이후 상태를 건드리지 않도록 했습니다.
- README의 SafeShield 최소 버전 설명을 실제 패키지 의존성인 `>= 0.3.20`과 일치시켰습니다.

### 테스트

- SafeShield UI 계약 테스트에 상태/통계 timer 독립성, 성공 메시지 자동 닫기, 오류 지속 정책, README 최소 버전 일치 여부를 추가했습니다.

## [0.2.13-r2] - 2026-09-12

### 수정

- SafeShield 차단 목록 수동 갱신을 시작했을 때 표시되던 성공 안내 배너를 제거했습니다. 갱신 진행 상태는 보호 카드의 단계별 진행 UI에서만 표시하여, 실제 갱신이 완료된 뒤에도 과거의 `갱신 작업을 시작했습니다` 메시지가 남아 있는 오해를 방지합니다.
- 이미 갱신 중인 경우를 포함해 차단 목록 갱신 요청의 비오류 안내 메시지는 유지하지 않습니다. 갱신 실패는 기존처럼 오류 피드백으로 계속 표시합니다.

### 테스트

- SafeShield UI 계약 테스트에서 수동 갱신의 일시적인 시작/진행 안내 문구가 소스와 배포 `app.js`에 다시 포함되지 않는지 검증합니다.

## [0.2.13-r1] - 2026-09-10

### 개선

- 자동 업데이트 관련 UI 및 사용성을 개선하였습니다.
- 로그인 세션이 만료 되었을때, 사용자에게 안내를 하고 로그인 페이지로 이동하도록 하였습니다.
- 일부 UI에 대한 시인성을 개선하였습니다.

## [0.2.12-r13] - 2026-09-10

### 개선

- SafeShield 갱신 진행 도넛에 진행률 링과 별도로 얇은 외곽 흰색 진행 띠를 추가했습니다. 갱신 중에는 외곽 띠가 부드럽게 회전하여 현재 작업이 계속 진행 중임을 더 직관적으로 전달합니다.
- 오류 상태에서는 외곽 회전 띠를 노출하지 않아 진행 중 상태와 실패 상태를 더 명확하게 구분합니다.
- `prefers-reduced-motion` 환경에서는 외곽 회전 애니메이션을 비활성화하여 접근성과 저사양 환경을 함께 고려했습니다.

### 테스트

- SafeShield 페이지 계약 테스트를 보강해 외곽 진행 띠 마크업, 회전 애니메이션 스타일, reduced-motion 대응이 체크인된 소스와 `app.css`에 모두 존재하는지 검증합니다.

## [0.2.12-r12] - 2026-09-10

### 수정

- 로컬 APK로 설치된 SafeShield가 `/etc/apk/world`의 `><Q...` identity hash로 고정된 경우 SmartSafeHub 업데이트의 의존성 해결이 실패하던 문제를 수정했습니다. SmartSafeHub 설치 전에 SafeShield의 identity pin만 선택적으로 정상화하여 최신 저장소 버전으로 전환할 수 있게 했습니다.
- 기존 SmartSafeHub 자체 identity pin 처리와 동일하게 `apk upgrade --available` 같은 전체 시스템 업그레이드 경로는 사용하지 않고, SmartSafeHub가 관리하는 `safeshield`와 `luci-app-smartsafehub`만 대상으로 처리합니다.

### 테스트

- SafeShield가 identity pin된 상태에서 최신 SmartSafeHub가 더 새로운 SafeShield를 요구하는 실제 실패 조건을 회귀 테스트로 추가했습니다. pin이 제거되고 SafeShield 의존성이 갱신된 뒤 SmartSafeHub 설치가 완료되는지 검증합니다.
- SafeShield identity pin 해제가 실패하면 `UPDATES_INSTALL_FAILED`로 남고 SmartSafeHub 설치를 진행하지 않는지, 다른 패키지의 world constraint 및 identity pin은 변경되지 않는지 검증합니다.

## [0.2.12-r11] - 2026-09-10

### 테스트

- 브라우저 전체 문서 reload/navigation 경로를 별도 안전 계약으로 고정했습니다. `frontend/src`에서 전체 페이지 이동은 self-update 완료 후의 단일 `window.location.reload()` 경로만 허용하며, RPC·세션·공통 polling·엔트리 부트스트랩 오류 경로에서 `reload/replace/assign/location.href`가 추가되면 테스트가 즉시 실패합니다.
- 과거에 발생했던 치명적인 무한 reload 회귀를 실제 `useSoftwareUpdates`의 `useEffect` 본문을 소스에서 추출해 실행하는 시나리오 테스트로 보강했습니다. 초기 `data=null`, 첫 실제 상태의 과거 `lastInstallAt`, stale asset/version mismatch, 정상적인 새 설치 완료, reload 후 새 document의 동일 완료 상태, 반복 관찰, 비-idle phase, 누락된 패키지/asset version, 동일 버전 등을 각각 검증합니다.
- self-update reload latch가 `window.location.reload()`보다 먼저 설정되고, 첫 실제 update state가 baseline만 구성하며, 설치 완료 시각이 바뀌지 않은 상태에서는 다시 reload하지 않는 제어 흐름의 순서도 검증합니다.
- 세션 만료 경로는 `Access denied`의 UBus/JSON-RPC/HTTP 401·403/문자열 변형을 실제 RPC 판별 함수 본문으로 검증하고, stale RPC가 새 세션을 만료시키지 않는지와 RPC 계층이 별도 session probe를 다시 시작하지 않는지를 회귀 테스트로 고정했습니다.
- LuCI session endpoint의 401/403, `X-LuCI-Login-Required`, plain `Access denied`, HTML 로그인 응답, redirect, 올바른 session ID, HTTP 500 및 잘못된 payload를 각각 실행해 인증/만료/통신 오류가 혼동되지 않도록 검증합니다. 같은 세션에서 동시에 여러 RPC가 실패해도 session-expired 이벤트가 한 번만 발생하고, 새 로그인 lifecycle에서는 다시 정상적으로 발생할 수 있는지도 실제 `sessionEvents.ts` 모듈로 검증합니다.
- ShellSpec 계약에 reload/session 안전 회귀 테스트를 추가하고, 정적 검증 및 패키지 계약에서 새 테스트 실행 파일의 존재와 실행 권한도 확인하도록 보강했습니다.

## [0.2.12-r10] - 2026-09-10

### 개선

- SafeShield 보호 카드 상단의 `보호 중` 상태 배지는 빠른 상태 인지를 위해 그대로 유지하면서, 하단 요약의 중복된 `PROTECTION / 보호 중` 항목을 `SAFESHIELD / <설치 버전>` 정보로 변경했습니다.
- 설명문 아래에 작게 단독 표시되던 SafeShield 버전 텍스트를 제거하고 요약 영역으로 이동해 버전 가독성과 정보 계층을 개선했습니다.

### 테스트

- 상단 상태 배지가 유지되고 하단 요약에는 중복 보호 상태 대신 SafeShield 버전이 표시되며, 설명 영역에 중복 버전 텍스트가 남지 않는지 UI contract를 보강했습니다.

## [0.2.12-r9] - 2026-09-10

### 수정

- 업데이트 상태 hook이 첫 렌더의 `data=null`을 `lastInstallAt=null` 기준값으로 저장한 뒤, 첫 실제 응답에 남아 있는 과거 `lastInstallAt`을 새 설치 완료로 오인하던 문제를 수정했습니다. 설치 버전과 로드된 asset 버전이 다른 상태에서는 이 오인이 매 페이지 로드마다 `window.location.reload()`를 실행해 `연결 확인 → Dashboard/Access denied → 연결 확인`이 반복될 수 있었습니다.
- 이제 첫 **실제** 업데이트 상태 응답의 `lastInstallAt`을 기준값으로만 저장하고 자동 새로고침하지 않습니다. 같은 페이지가 이후 updater의 새로운 설치 완료 시각을 실제로 관찰한 경우에만 한 번 새로고침하므로, 과거 update state와 asset version 불일치만으로는 reload loop가 발생하지 않습니다.

### 테스트

- 초기 `data=null`이 self-update reload 기준값으로 사용되지 않는지, 첫 실제 update state는 기준값만 설정하는지, 이후 새로운 `lastInstallAt` 변화에만 자동 새로고침 조건이 열리는지 update UI contract를 보강했습니다.

## [0.2.12-r8] - 2026-09-10

### 수정

- 세션 만료 후 SmartSafeHub RPC가 `Access denied`를 반환할 때 별도의 LuCI 세션 probe 결과를 기다리지 않고 해당 bootstrap 세션을 즉시 만료 처리하도록 변경했습니다. 보호된 session endpoint가 오래된 세션 ID를 다시 반환하는 경우 인증된 화면과 로그인 화면 사이를 반복하던 복구 루프를 제거했습니다.
- 소프트웨어 업데이트 화면이 `updates.state`의 설치 버전과 현재 asset version이 다르다는 이유만으로 매 페이지 로드마다 `window.location.reload()`를 실행하던 무한 새로고침 문제를 수정했습니다. 수동 APK 설치 뒤 남은 오래된 update state나 LuCI template cache로 버전 값이 일시적으로 어긋나도 reload하지 않고, 현재 탭에서 `lastInstallAt`이 새 값으로 바뀌어 실제 updater 설치 완료를 관찰한 경우에만 한 번 새로고침합니다.
- 세션 만료 이벤트는 기존처럼 로그인 화면과 만료 안내 toast로 즉시 전환하며, 이미 시작된 이전 화면의 polling은 App unmount와 함께 정리됩니다.

### 테스트

- RPC `Access denied`가 추가 session probe 없이 즉시 `SESSION_EXPIRED`로 전환되는지 contract를 보강했습니다.
- 초기 로드의 단순 asset/version mismatch는 reload하지 않고, 새 `lastInstallAt`을 관찰한 updater 완료 시점에만 한 번 reload하는 contract를 추가했습니다.

## [0.2.12-r7] - 2026-09-10

### 수정

- 세션 만료 후 RPC가 `Access denied`를 반환할 때 세션 확인 API가 `Access denied` 일반 텍스트를 돌려주는 경우 이를 잘못된 응답으로 처리해 기존 화면의 polling이 계속되던 무한 반복 문제를 수정했습니다. 해당 응답은 이제 즉시 비로그인 상태로 판정합니다.
- 세션 확인 API가 다른 새 세션 ID를 반환해도 기존 코드가 단순히 “세션 있음”으로 판단하면서 오래된 bootstrap session ID로 RPC를 계속 재시도할 수 있던 문제도 수정했습니다. 이제 세션 확인 결과가 현재 RPC에 사용한 session ID와 정확히 일치할 때만 세션이 유효한 것으로 판단합니다.
- 동시에 여러 RPC가 `Access denied`를 반환하는 경우 세션 확인 요청을 하나로 합쳐 불필요한 중복 probe를 방지하고, 이미 만료 처리가 시작된 세션은 추가 probe 없이 즉시 `SESSION_EXPIRED`로 처리합니다.
- 재로그인이 완료된 뒤 이전 세션에서 늦게 도착한 실패 응답이 새 로그인 세션을 다시 만료 처리하지 않도록 현재 bootstrap session ID를 재확인하는 race-condition 방어 로직을 추가했습니다.

### 테스트

- Access denied 처리 시 probe된 session ID와 bootstrap session ID를 정확히 비교하는지, 동시 probe deduplication과 stale-session race guard가 유지되는지 로그인 UI contract를 보강했습니다.

## [0.2.12-r6] - 2026-09-10

### 수정

- SafeShield 차단 목록 갱신 중 `resolve_api` 같은 내부 stage 값을 사용자 화면에 직접 노출하지 않고, 갱신 준비 → 최신 차단 목록 확인 → 다운로드 → 사용자 규칙 적용 → 보호 규칙 적용 → 보호 상태 확인의 6단계 사용자용 진행 상태로 묶어 표시하도록 개선했습니다.
- 갱신 단계는 작은 도넛형 진행 표시에서 `1/6`부터 `6/6`까지 실제 stage 변화에 맞춰 채워지며, 현재 단계 이름과 설명을 함께 표시합니다. 갱신 중에도 하단 `PROTECTION` 요약은 DNS 런타임 상태를 기준으로 `보호 중`을 유지해 작업 상태와 보호 상태가 중복되지 않도록 분리하고, 갱신 도중 API가 차단 규칙 수를 일시적으로 0으로 반환하면 직전에 확인한 적용 규칙 수를 유지해 불필요한 0개 표시를 피합니다.
- 갱신 실패 시 도넛을 오류 상태로 전환하고 다운로드, API 확인, 사용자 규칙, dnsmasq 재시작, 검증, 버전/라이선스 문제 등 오류 코드와 실패 단계를 사용자 친화적인 안내 문구로 변환해 표시합니다. 원본 오류 코드는 진단용 보조 정보로만 작게 유지합니다.

### 테스트

- 6단계 갱신 stage 매핑, 사용자용 진행 도넛, 내부 stage 비노출, 갱신 중 보호 상태 분리, 오류 코드의 사용자용 설명 contract를 추가했습니다.

## [0.2.12-r5] - 2026-09-10

### 수정

- 모바일 공통 터치 영역 규칙인 `.ssh-app button { min-height: 44px; }`가 SafeShield 통계 및 업데이트 설정의 switch track 높이까지 44px로 강제해 작은 화면에서 토글이 세로로 늘어나던 문제를 수정했습니다. switch 전용 selector의 우선순위를 높이고 width/height의 최소·최대값을 모두 고정해 화면 크기와 관계없이 48x28 geometry를 유지합니다.
- switch thumb도 20x20의 최소·최대 크기를 모두 고정해 flex, responsive 스타일 또는 브라우저 기본 button 스타일의 영향을 받아 원형이 찌그러지지 않도록 보강했습니다.

### 테스트

- 모바일 `button` 최소 높이 규칙보다 switch 전용 geometry selector가 우선하도록 CSS contract를 보강하고, track/thumb에 최대 크기 제한까지 존재하는지 검증합니다.

## [0.2.12-r4] - 2026-09-10

### 수정

- 장시간 미사용으로 LuCI 세션이 만료된 뒤 RPC 요청이 `Access denied`를 반환해도 오류 화면에서 재시도만 반복되던 문제를 수정했습니다. RPC 접근 거부가 발생하면 공개 세션 확인 경로로 실제 세션 만료 여부를 확인하고, 만료된 경우 SmartSafeHub 로그인 화면으로 즉시 전환합니다.
- 세션 만료로 로그인 화면으로 전환될 때 `로그인 세션이 만료되었습니다. 계속하려면 다시 로그인해 주세요.` 안내 toast를 표시하고 7초 후 자동으로 닫히도록 했습니다. 동시에 여러 RPC가 실패해도 같은 만료 세션에서는 전환 이벤트를 한 번만 발생시킵니다.
- 유효한 세션에서 ACL 권한 부족으로 발생한 접근 거부는 세션 만료로 오인하지 않고 기존 오류로 유지합니다. 업데이트 화면에만 있던 `Access denied` 강제 reload 처리는 제거하고 모든 SmartSafeHub RPC에 동일한 전역 세션 만료 처리를 적용했습니다.

### 테스트

- RPC 접근 거부 시 세션을 재확인한 뒤에만 만료 이벤트를 발생시키는지, 로그인 화면 전환 및 toast 표시가 연결되는지 UI contract를 추가했습니다.
- 업데이트 polling이 더 이상 `Access denied`를 별도로 reload하지 않고 전역 세션 만료 처리에 맡기는지 검증합니다.

## [0.2.12-r3] - 2026-09-09

### 수정

- 작은 화면에서 SafeShield 통계 수집 토글의 원형 thumb가 찌그러지거나 어둡게 보일 수 있던 문제를 수정했습니다. 토글 track/thumb 크기를 공용 고정 치수 스타일로 분리해 화면 폭과 flex 레이아웃에 관계없이 원형을 유지합니다.
- 다크 모드의 `bg-white` 유틸리티 색상 재매핑이 토글 thumb까지 적용되지 않도록 전용 `ssh-switch-thumb` 스타일을 사용해 밝은 원형 thumb가 일관되게 표시되도록 했습니다. 같은 형태를 사용하는 업데이트 설정 토글에도 공용 스타일을 적용했습니다.

### 테스트

- SafeShield 통계 및 업데이트 설정 토글이 공용 고정 geometry와 theme-safe thumb 스타일을 사용하는지 UI contract를 추가했습니다.

## [0.2.12-r2] - 2026-09-09

### 수정

- 기기별 SafeShield 통계가 많아져도 한 화면이 과도하게 길어지지 않도록 10개 단위의 페이지네이션을 추가했습니다.
- 통계가 갱신되어 전체 페이지 수가 줄어드는 경우 현재 페이지를 자동으로 유효한 범위로 보정합니다.

### 테스트

- 기기별 통계가 10개 단위로 분할되고 이전/다음 페이지 컨트롤을 제공하는 UI contract를 추가했습니다.

## [0.2.12-r1] - 2026-09-09

### 수정

- 업데이트 기능을 개선하였습니다.
- 성능 개선이 포함되었습니다.

## [0.2.11-r3] - 2026-09-09

### 추가

- 업데이트 설정 화면에 현재 SmartSafeHub 패키지 저장소의 배포 채널을 `Stable` 또는 `Beta`로 표시하도록 추가했습니다. `/etc/apk/repositories.d/smartsafehub.list`의 실제 저장소 경로를 기준으로 채널을 판별해 현재 업데이트 확인 대상과 UI 표시가 일치하도록 했습니다.
- 현재는 채널을 읽기 전용으로 표시하며, frontend의 업데이트 설정 모델에 `channel` 필드를 분리해 추후 Stable/Beta 선택 기능을 추가하기 쉽게 구성했습니다. 인식할 수 없는 저장소 경로는 `미확인`으로 표시합니다.

### 테스트

- `updates_status`가 SmartSafeHub 저장소 파일에서 업데이트 채널을 읽어 반환하는 contract를 추가했습니다.
- 업데이트 화면이 `Stable`/`Beta` 채널을 표시하면서 저장소 hostname 같은 내부 구현 정보는 노출하지 않는지 UI contract로 검증합니다.

## [0.2.11-r2] - 2026-09-08

### 수정

- SmartSafeHub 자체 업데이트 완료 후 `rpcd restart`로 기존 LuCI 세션이 사라져 업데이트 화면의 상태 polling이 `Access denied`를 반복하던 문제를 수정했습니다. 업데이트 후에는 `rpcd reload`를 사용해 RPC plugin/ACL을 다시 읽으면서 기존 세션을 유지합니다.
- 설치 중 기존 세션이 예외적으로 무효화되어 LuCI가 `Access denied`를 반환하면 무한 polling을 계속하지 않고 페이지를 다시 로드해 SmartSafeHub의 세션 확인/로그인 흐름으로 복구하도록 보강했습니다.
- 업데이트 상태의 실제 설치 버전과 현재 브라우저가 로드한 asset version이 달라지면 페이지를 한 번 자동으로 다시 로드해 새 `app.js`와 `app.css`를 즉시 사용하도록 했습니다. 자동 설치가 polling 사이에 완료된 경우에도 다음 상태 조회에서 버전 불일치를 감지합니다.

### 테스트

- self-update 완료 경로가 `rpcd restart`를 사용하지 않고 `rpcd reload`만 예약하는지 검증합니다.
- 업데이트 설치 중 `Access denied`가 발생하면 페이지 reload 복구 경로가 존재하고, 설치 완료 후 package/asset version 불일치에서도 새 frontend asset을 위한 reload가 수행되는지 UI contract로 검증합니다.

## [0.2.11-r1] - 2026-09-08

### 수정

- SafeShield의 최소 버전을 0.3.20 이상으로 설정하였습니다.

## [0.2.10-r5] - 2026-09-08

### 수정

- 내부에서 사용하는 패키지를 업데이트 하였습니다.

## [0.2.10-r4] - 2026-09-08

### 수정

- 로컬 `.apk` 파일로 SmartSafeHub를 설치해 `/etc/apk/world`에 `luci-app-smartsafehub><Q...` identity hash constraint가 남은 경우, 자동/수동 업데이트가 저장소 버전으로 전환되지 못하고 `UPDATES_INSTALL_VERSION_UNCHANGED`가 발생하던 문제를 수정했습니다.
- SmartSafeHub 자체에 identity pin이 있을 때만 `apk add --upgrade --latest luci-app-smartsafehub`로 해당 패키지의 world constraint를 저장소 기반 constraint로 정상화하고, 일반 상태에서는 기존 `apk upgrade luci-app-smartsafehub` 경로를 유지하도록 했습니다.
- 전체 world의 version constraint를 초기화해 OpenWrt의 다른 패키지까지 갱신할 수 있는 `apk upgrade --available`은 updater에서 사용하지 않도록 했습니다.
- identity pin 정상화 후에도 해당 pin이 남아 있으면 설치 성공으로 처리하지 않고 기존 `UPDATES_INSTALL_FAILED` 경로로 오류를 반환하도록 보강했습니다.

### 테스트

- 일반 repository 설치 상태에서는 기존 target-only `apk upgrade` 경로가 유지되는지 검증합니다.
- 로컬 APK identity pin이 있는 경우 SmartSafeHub 하나에 대해서만 `apk add --upgrade --latest`를 사용해 pin을 제거하고 목표 버전으로 올라가는지 검증합니다.
- updater가 `apk upgrade --available`을 사용하지 않는 contract를 추가해 다른 OpenWrt 패키지의 광범위한 업그레이드가 다시 도입되지 않도록 방지합니다.

## [0.2.10-r3] - 2026-09-08

### 수정

- 수동 업데이트 확인을 시작한 뒤 백엔드가 `checking` 상태인 동안 1초 간격으로 상태를 다시 조회하고, 확인 작업이 `idle` 또는 `error`로 끝나는 즉시 화면에 최종 상태와 버전 정보를 반영하도록 수정했습니다.
- 평상시에는 기존 5분 background polling을 유지하고 실제 설치 중에는 기존 3초 polling을 유지해, 업데이트 확인 중에만 짧은 polling이 추가되도록 했습니다.

### 테스트

- 업데이트 확인 단계가 1초 polling을 사용하고 설치 단계의 3초 polling 및 idle 상태의 5분 polling과 구분되는지 UI contract에서 검증합니다.

## [0.2.10-r2] - 2026-09-08

### 수정

- SmartSafeHub 자동/수동 패키지 설치에서 `apk add --upgrade` 대신 설치된 패키지를 실제로 갱신하는 `apk upgrade luci-app-smartsafehub`를 사용하도록 수정했습니다.
- APK 명령이 성공 코드(`0`)를 반환하더라도 설치 후 버전이 확인된 목표 버전과 일치하지 않으면 `UPDATES_INSTALL_VERSION_UNCHANGED` 오류로 처리하고 `last_install_at`을 갱신하지 않도록 보강했습니다.
- 자동 설치가 실패한 경우에는 해당 날짜의 완료 marker를 기록하지 않고 15분 cooldown 후 다시 시도하도록 수정해 일시적인 저장소/네트워크 오류에서는 복구하면서도 매 daemon tick마다 APK 작업을 반복하지 않도록 했습니다. lock 경합은 완료/재시도 marker를 소비하지 않습니다.
- 자동 설치 실패 재시도를 15분 간격으로 유지하면서 하루 최대 3회로 제한했습니다. 첫 예약 시도를 포함해 3회 모두 실패하면 해당 날짜에는 더 이상 APK 설치를 시도하지 않고 다음날 예약 시간부터 다시 시작합니다.
- updater lock 경합(`75`)은 실제 설치 시도로 계산하지 않으며, 성공 시에는 재시도 횟수/시간 marker를 함께 정리하도록 했습니다.
- 재시도 횟수 marker에 날짜를 함께 기록하고 날짜가 바뀌면 stale retry 상태를 정리해 다음날 재시도 횟수가 0부터 시작되도록 했습니다.

### 테스트

- `apk upgrade`가 exit code `0`을 반환하면서 실제 설치 버전을 변경하지 않는 no-op 상황을 회귀 테스트로 추가하고, 실패 상태/오류 코드/`last_install_at` 보존을 검증합니다.
- updater가 자동 설치 성공 시에만 날짜 marker를 기록하고 실패 재시도에는 15분 cooldown marker를 사용하는 contract를 검증합니다.
- 자동 설치 최대 시도 횟수(`3`), 15분 retry cooldown, lock 경합 제외, 성공 시 retry marker 정리, 날짜 변경 시 retry count 초기화 contract를 검증합니다.

## [0.2.10-r1] - 2026-09-07

### 변경

- 새로고침 아이콘을 개선하고 전체적으로 통일성 있게 적용하였습니다.
- 업데이트를 확인하는 로직을 수정하였습니다.

## [0.2.9-r9] - 2026-09-07

### 수정

- OpenWrt/APK 인덱스 갱신이 실패해도 `INSTALLED` 값은 캐시된 updater state가 아니라 로컬 APK 데이터베이스의 실제 `luci-app-smartsafehub` 설치 버전으로 다시 동기화하도록 수정했습니다.
- 수동 APK 설치 등으로 실제 설치 버전이 마지막 확인 시점과 달라졌을 때는 이전 `AVAILABLE` 버전과 릴리즈 노트를 재사용하지 않아 오래된 업데이트 대상을 현재 버전처럼 표시하지 않도록 보강했습니다.
- 업데이트 설치 시작 단계에서 인덱스 갱신이 실패하는 경우에도 동일하게 로컬 설치 버전을 state에 반영하도록 통일했습니다.
- 헤더, 업데이트 확인/설치, 공통 로딩 패널, SafeShield 통계 토글과 로그인 진행 상태의 로딩 표현을 동일한 원형 새로고침 아이콘으로 통일하고 진행 중에는 해당 아이콘 자체를 회전하도록 정리했습니다.

### 테스트

- 마지막 업데이트 확인 이후 로컬 패키지 버전이 변경된 상태에서 APK 인덱스 갱신이 실패해도 `INSTALLED`가 실제 로컬 버전으로 갱신되고 이전 릴리즈 노트 캐시는 제거되는지 검증합니다.
- 새로고침/로딩 상태가 공통 `ReloadIcon`을 사용하고 기존 `LoaderIcon`/`RefreshIcon` 변형이 다시 섞이지 않는지 UI contract에서 검증합니다.

## [0.2.9-r8] - 2026-09-07

### 수정

- OpenWrt/APK 인덱스 갱신이 일시적으로 실패해도 마지막으로 확인한 SmartSafeHub 설치/업데이트 버전 범위가 있으면 해당 정보를 사용해 릴리즈 노트 갱신을 계속 시도하도록 변경했습니다.
- 릴리즈 노트 재조회가 실패한 경우 설치 버전과 사용 가능 버전 범위가 동일한 마지막 정상 캐시는 유지하고, 범위가 달라진 오래된 캐시는 재사용하지 않도록 보강했습니다.

### 테스트

- APK 인덱스 갱신 실패 경로에서도 기존 package state로 beta/stable 릴리즈 노트를 다시 생성할 수 있는지 검증합니다.
- 릴리즈 노트 서버의 일시적인 장애에서는 같은 버전 범위의 정상 캐시가 유지되고, 버전 범위가 달라진 캐시는 제거되는지 검증합니다.

## [0.2.9-r7] - 2026-09-07

### 개선

- 업데이트 확인/설치 진행 중에는 상태 배지와 액션 버튼에 회전 spinner를 표시하고, 설치 단계에는 실제 진행률을 추정하지 않는 indeterminate progress bar를 추가해 작업이 계속 진행 중임을 명확하게 표시합니다.
- 설치 시작 직후의 안내를 수동 새로고침 요청 대신 `완료되면 화면이 자동으로 갱신됩니다`로 변경해 3초 상태 polling 동작과 UI 문구를 일치시켰습니다.
- 업데이트 실패 시 원본 APK/OpenWrt 저장소 오류 문자열을 바로 노출하지 않고 오류 코드별 사용자용 요약을 먼저 보여주며, URL과 원본 메시지는 `상세 정보 보기`에서 확인하도록 정리했습니다.

### 테스트

- 설치 중 spinner/indeterminate progress, 자동 갱신 안내, repository 오류 요약/상세 정보 분리와 기존 수동 새로고침 문구 제거를 update UI contract에서 검증합니다.

## [0.2.9-r6] - 2026-09-07

### 수정

- 소프트웨어 업데이트를 한 번도 확인하지 않은 상태에서 `최신 버전` 또는 성공 안내를 표시하지 않고 `미확인` 상태로 유지하도록 수정했습니다.
- `확인 전` 배지는 중립적인 색상으로 표시하고, 첫 확인 전에는 별도의 안내와 `지금 확인` 액션을 제공하도록 정리했습니다.

### 테스트

- 첫 업데이트 확인 전에는 최신 상태 success UI가 표시되지 않고 `AVAILABLE` 값이 `미확인`으로 유지되는 contract를 추가했습니다.

## [0.2.9-r5] - 2026-09-07

### 수정

- 대시보드 시스템 상태의 메모리 사용률 progress bar를 메모리 요약 카드 내부로 이동해 동일한 사용률 정보를 별도 영역에서 중복 표시하지 않도록 정리했습니다.
- 메모리 사용량 텍스트(`사용량 / 전체 용량`)는 그대로 유지하고 progress bar에 접근성용 progressbar 속성을 추가했습니다.

### 테스트

- 대시보드 contract에서 메모리 progress bar가 메모리 카드 내부에 존재하고 별도의 `메모리 사용률` 블록이 다시 추가되지 않는지 검증합니다.

## [0.2.9-r4] - 2026-09-07

### 수정

- 릴리즈 노트 채널을 전체 APK repository 목록의 탐색 순서로 결정하지 않고 SmartSafeHub 설정에 저장 된 channel URL에서 직접 결정하도록 수정했습니다.
- stable에서 beta로 전환한 뒤 다른 repository 파일에 stable URL이 남아 있어도 beta 채널의 릴리즈 인덱스와 릴리즈 노트만 조회하도록 수정했습니다.

### 테스트

- 별도의 repository 파일에 stable URL이 먼저 존재하고 `smartsafehub.list`는 beta를 가리키는 전환 시나리오에서 beta 릴리즈 노트 경로만 사용하는 회귀 테스트를 추가했습니다.

## [0.2.9-r3] - 2026-09-06

### 변경

- 소프트웨어 업데이트 상태의 일반 polling 주기를 60초에서 5분으로 늘리고, 실제 설치 진행 중에만 3초 간격으로 상태를 확인하도록 조정했습니다.
- 업데이트 상태 polling은 브라우저 탭이 숨겨져 있는 동안 중단하고, 다시 보이거나 창이 포커스를 얻었을 때 마지막 조회가 polling 주기보다 오래된 경우에만 즉시 최신 상태를 확인하도록 visibility/focus 기반 갱신을 보강했습니다.
- 수동 새로고침이나 짧은 탭 전환 직후에는 남은 polling 시간만 다시 예약해 focus/visibility 이벤트로 인한 불필요한 중복 RPC를 줄였습니다.

### 테스트

- 업데이트 polling 주기, 설치 단계 전용 3초 polling, visibility/focus 갱신과 이벤트 listener cleanup을 update UI contract에서 검증합니다.

## [0.2.9-r2] - 2026-09-06

### 테스트

- Shell 기반 contract 테스트를 ShellSpec suite로 통합하고 별도 `tests/run.sh` runner를 제거했습니다.
- 로컬과 GitHub Actions 모두 프로젝트 루트에서 `shellspec`을 직접 실행해 동일한 테스트 진입점을 사용합니다.
- 기존 package, navigation, document, login, dashboard, network input, update, settings, ucode import, RPC, rules, SafeShield, statistics, updater contract를 개별 ShellSpec example로 유지합니다.
- GitHub Actions에서는 ShellSpec 0.28.1을 고정 설치해 테스트 프레임워크 업데이트에 따른 비결정적 실패를 방지합니다.

## [0.2.9-r1] - 2026-09-03

### 변경

- 전체 레이아웃 구조를 변경하여 사용성과 메뉴 접근성을 향상시켰습니다.
- 다크 모드에 대한 지원을 추가하였습니다.

## [0.2.8-r16] - 2026-09-03

### 변경

- 업데이트 화면에서 시스템 상태와 시스템 관리 영역을 분리하고 SmartSafeHub 소프트웨어 업데이트와 자동 업데이트 설정만 남겼습니다.
- 사이드바의 System 그룹에 `설정` 메뉴를 업데이트 바로 아래 추가하고 시스템 상태, 펌웨어 관리, 진단 정보, 재부팅과 LuCI 보조 진입점을 새 설정 화면으로 이동했습니다.
- 사이드바와 모바일 drawer의 독립 `고급 설정` 링크를 제거해 제품 UI에서 LuCI로 바로 이탈하지 않도록 하고, 아직 SmartSafeHub가 제공하지 않는 항목만 설정 화면의 `LuCI 고급 설정 열기` 보조 액션으로 접근하도록 정리했습니다.
- 설정 화면의 설명을 SmartSafeHub 안에서 자주 사용하는 관리 기능을 우선 제공하고 LuCI 의존 범위를 점진적으로 줄이는 방향으로 명확히 했습니다.

### 테스트

- 업데이트/설정 route 분리, 메뉴 순서, 시스템 상태/관리 이동, 사이드바의 독립 고급 설정 링크 제거와 설정 화면 내부 LuCI fallback을 검증하는 UI contract를 보강했습니다.

## [0.2.8-r15] - 2026-09-03

### 변경

- 데스크톱 상단의 새로고침 액션을 텍스트 버튼에서 테마 전환과 동일한 크기의 아이콘 버튼으로 정리해 헤더의 전역 액션 밀도를 낮췄습니다.
- 모바일 상단에는 테마 전환, 새로고침, 햄버거 메뉴 순서로 액션을 배치해 현재 화면을 메뉴 진입 없이 즉시 갱신할 수 있도록 했습니다.
- 새로고침 중에는 Refresh 아이콘을 회전시키고 중복 요청을 방지하도록 버튼을 비활성화하며 `aria-busy`, `aria-label`, `title`로 상태를 전달합니다.

### 테스트

- 데스크톱/모바일 새로고침 버튼의 위치, 아이콘 전용 표현, loading/refreshing 비활성화와 회전 상태를 navigation contract에서 검증합니다.

## [0.2.8-r14] - 2026-09-03

### 변경

- Light/Dark Mode 전환을 사이드바 시스템 메뉴에서 제거하고 데스크톱 상단 새로고침 액션 옆의 아이콘 버튼으로 이동해 전역 화면 설정이라는 의미를 명확하게 했습니다.
- 모바일에서는 테마 전환 아이콘을 햄버거 메뉴 바로 왼쪽에 배치해 메뉴를 열지 않고도 테마를 즉시 변경할 수 있도록 개선했습니다.
- 테마 전환은 텍스트 없이 Sun/Moon 아이콘만 표시하되 `aria-label`, `title`을 유지해 접근성을 보존합니다.

### 테스트

- 데스크톱 헤더와 모바일 상단 내비게이션의 테마 토글 위치, 사이드바/모바일 drawer 내부의 중복 테마 액션 제거를 navigation contract에서 검증합니다.

## [0.2.8-r13] - 2026-09-03

### 변경

- 로그인 화면을 현재 SmartSafeHub Dashboard/SafeShield와 동일한 surface, form-control, teal focus 중심의 제품 디자인으로 정리했습니다.
- 사용자 이름과 비밀번호를 모두 입력할 수 있는 LuCI 인증 흐름을 유지하고, 향후 관리자 계정명이 변경되어도 별도 인증 로직 수정 없이 사용할 수 있도록 했습니다.
- 비밀번호 표시/숨김을 텍스트 액션에서 아이콘 버튼으로 개선하고, 빈 사용자 이름/비밀번호 제출 시 올바른 입력 필드로 포커스를 복원하도록 보강했습니다.
- 로그인 화면에 Light/Dark Mode 전환을 추가하고 인증 후 App Shell과 동일한 `smartsafehub.theme` 설정을 공유하도록 테마 상태 관리를 공통 유틸리티로 정리했습니다.
- 모바일에서는 제품 로고와 로그인 폼을 하나의 full-height surface로 표시하고, 로그인 중/세션 확인/오류/기본 LuCI fallback 상태가 Light/Dark Mode에서 일관되게 표시되도록 정리했습니다.

### 테스트

- 사용자 이름/비밀번호 필드, autocomplete, form submit, 비밀번호 표시 토글, 공통 theme 저장/복원, 로그인 Dark Mode와 form-control 스타일을 검증하는 로그인 UI contract 테스트를 추가했습니다.

## [0.2.8-r12] - 2026-09-03

### 추가

- Dashboard에 SafeShield 최근 24시간 차단 활동 차트를 추가해 보호 동작 추이를 첫 화면에서 바로 확인할 수 있도록 했습니다.
- 차트와 함께 최근 24시간 DNS 요청, 차단 수와 차단율을 요약하고 현재 WAN/연결 기기 구성을 나란히 표시하는 네트워크 보호 활동 영역을 추가했습니다.

### 변경

- Dashboard의 SafeShield statistics 조회는 진입 시 한 번만 수행하고 사용자가 새로고침할 때만 다시 조회하도록 구성해 상세 SafeShield 페이지의 60초 polling이 Dashboard로 확장되지 않도록 했습니다.
- 연결 기기 one-shot 조회가 `exactOptionalPropertyTypes` 설정과 호환되도록 polling 비활성화 시 `pollInterval` 프로퍼티 자체를 생략하도록 정리했습니다.

### 테스트

- Dashboard 차트 재사용, SafeShield statistics one-shot 조회, 통합 새로고침과 polling 비활성화 계약을 검증하도록 Dashboard UI contract 테스트를 보강했습니다.

## [0.2.8-r11] - 2026-09-03

### 변경

- Dashboard를 다른 제품 페이지와 동일한 eyebrow, 한글 제목/설명, 흰색 rounded surface 중심의 시각 언어로 재구성했습니다.
- 첫 화면에서 인터넷 연결, SafeShield 보호 상태, 현재 연결 기기 수와 SmartSafeHub 업데이트 상태를 함께 확인할 수 있도록 핵심 운영 정보를 보강했습니다.
- 시스템 리소스 영역에 메모리 사용량, 1/5/15분 부하와 실행 시간을 정리하고 장치 정보에 커널, WAN IP와 보드 정보를 추가했습니다.
- SafeShield 최근 차단 목록 갱신, 연결 기기 목록 생성, 소프트웨어 업데이트 확인 시각을 별도 상태 freshness 영역에서 확인할 수 있도록 추가했습니다.
- Dashboard의 연결 기기 목록은 진입 시 한 번만 조회하고, 기존 15초 polling은 연결된 기기 상세 페이지에서만 유지해 Dashboard 추가 정보로 인한 주기 부하를 제한했습니다.

### 테스트

- Dashboard의 SafeShield/연결 기기/업데이트 요약, 일회성 기기 조회와 통합 새로고침 동작을 검증하는 UI contract 테스트를 추가했습니다.

## [0.2.8-r10] - 2026-09-03

### 추가

- 브라우저 탭과 북마크에서 SmartSafeHub를 식별할 수 있도록 제품 로고의 shield/check 디자인을 재사용한 SVG favicon을 추가했습니다.
- 로그인 전/후 동일한 SmartSafeHub 문서에서 favicon이 적용되도록 public entry template의 `<head>`에 favicon을 등록하고 패키지 revision 기반 cache key를 적용했습니다.

### 변경

- `LoadingPanel`을 spinner 위주의 세로 레이아웃에서 compact 가로 레이아웃으로 변경해 로딩 문구 위에 과도한 공간이 생기던 문제를 수정했습니다.
- public entry template에 SmartSafeHub 설명, application name, 검색 엔진 비노출 정책과 light/dark color scheme 메타데이터를 추가했습니다.
- 브라우저의 주소창/탭 UI가 현재 SmartSafeHub 테마와 자연스럽게 어울리도록 `theme-color`를 추가하고 앱의 Light/Dark Mode 전환과 동기화했습니다.

### 테스트

- LoadingPanel의 compact layout과 필수 document metadata 및 theme-color 동기화를 contract 테스트로 검증합니다.

## [0.2.8-r9] - 2026-09-03

### 변경

- 업데이트 화면을 현재 상태, 설치/사용 가능 버전, 마지막 확인과 자동 설치 상태를 한눈에 확인할 수 있는 제품형 요약 카드로 재구성했습니다.
- 업데이트 확인과 설치 액션을 상단에 배치하고, 릴리즈 노트와 자동 업데이트 설정을 별도 surface로 분리해 정보 계층을 명확하게 정리했습니다.
- 자동 업데이트 확인 주기와 설치 시각 입력에 Wi-Fi/사용자 규칙과 동일한 2px 테두리, 배경 대비, inset shadow와 teal focus 상태를 적용했습니다.
- 자동 확인/자동 설치 설정을 명확한 switch control로 변경하고 내부 저장소/패키지 이름 같은 구현 세부 정보는 제품 화면에서 숨겼습니다.
- 업데이트를 페이지의 첫 번째 주요 영역으로 이동하고 시스템 상태와 시스템 관리 기능을 후속 섹션으로 구분했습니다.

### 테스트

- 업데이트 요약 카드, 명확한 update action, form control, switch와 페이지 정보 계층을 검증하는 UI contract 테스트를 추가했습니다.

## [0.2.8-r8] - 2026-09-03

### 수정

- Wi-Fi 보안 방식 선택 상자에도 SSID/비밀번호 입력과 동일한 2px 테두리, 배경 대비, inset shadow와 teal focus 상태를 적용해 form control 표현을 통일했습니다.
- Wi-Fi의 SSID/비밀번호 입력 필드와 연결된 기기 검색창에도 사용자 규칙과 동일한 2px 테두리, 배경 대비, inset shadow와 teal focus 상태를 적용해 text input 표현을 통일했습니다.
- 연결된 기기 검색창의 돋보기 아이콘을 transform 기반 위치 계산 대신 고정 폭 flex 래퍼로 수직 중앙 정렬했습니다.
- 사용자 규칙의 새 도메인 입력 필드에 SafeShield 라이선스 입력과 동일한 2px 테두리, 배경 대비, inset shadow와 focus 상태를 적용해 입력 필드임을 더 명확하게 표시합니다.
- 허용/차단 목록 검색창의 돋보기 아이콘을 transform 기반 위치 계산 대신 고정 폭 flex 래퍼로 수직 중앙 정렬해 LuCI 환경에서 아이콘이 비뚤어져 보이던 문제를 수정했습니다.
- 검색 입력 필드도 새 도메인 입력과 동일한 제품형 input surface로 통일했습니다.

## [0.2.8-r7] - 2026-09-02

### 변경

- SafeShield 페이지를 보호 상태, 최근 24시간 핵심 통계, 활동 차트, 보호 구성, 설정 순서의 제품형 정보 구조로 재구성했습니다.
- 시간별 통계 bucket을 기준으로 최근 24시간 DNS 요청, 차단 요청과 차단율을 계산해 현재 통계의 의미를 더 명확하게 표시합니다.
- DNS 런타임, 차단 목록, 갱신 일정과 health 정보를 2열 보호 구성 카드로 정리하고 라이선스, 아티팩트, 로컬 규칙을 별도 설정 영역으로 분리했습니다.
- 기존 SafeShield status/statistics RPC와 polling 주기는 변경하지 않아 UI 개편으로 추가 장비 부하가 발생하지 않습니다.
- 사이드바 접기/펼치기 버튼을 브랜드 헤더 하단 경계에 유지하면서 기본 색상과 shadow를 낮추고 hover 시에만 teal로 강조하도록 조정했습니다.

### 테스트

- SafeShield 제품형 페이지 계층과 최근 24시간 통계 표시 계약, 사이드바 경계 토글의 위치와 저강도 기본 스타일을 검증합니다.

## [0.2.8-r6] - 2026-09-02

### 수정

- 데스크톱 사이드바 접기/펼치기 버튼을 화면 중앙에서 브랜드 헤더 하단과 사이드바 오른쪽 경계선이 만나는 위치로 이동했습니다.
- 토글 버튼에 SmartSafeHub 포인트 컬러 배경과 흰색 아이콘, 강조 shadow를 적용해 라이트/다크 모드 모두에서 더 쉽게 식별할 수 있도록 개선했습니다.

## [0.2.8-r5] - 2026-09-02

### 수정

- 데스크톱 사이드바 접기/펼치기 버튼을 확장/축소 상태와 관계없이 오른쪽 경계선 중앙에 걸쳐 표시하도록 변경했습니다.
- 경계형 토글을 원형 버튼으로 통일해 사이드바 너비 전환 동작을 더 명확하게 표시합니다.

## [0.2.8-r4] - 2026-09-02

### 추가

- 데스크톱 좌측 사이드바를 16rem 확장 상태와 5rem 축소 상태로 전환하는 접기/펼치기 기능을 추가했습니다.
- 축소 상태에서도 SmartSafeHub 로고 마크를 항상 유지하고, 메뉴는 아이콘 중심의 compact navigation으로 표시합니다.
- 라이트/다크 모드 전환 기능을 추가하고 선택한 테마를 브라우저 `localStorage`에 저장합니다.
- 저장된 테마가 없으면 브라우저의 `prefers-color-scheme` 설정을 초기값으로 사용합니다.
- 모바일 메뉴에도 동일한 테마 전환 기능을 제공합니다.

## [0.2.8-r3] - 2026-09-02

### 추가

- 데스크톱 좌측 사이드바를 16rem 확장 상태와 5rem 축소 상태로 전환하는 접기/펼치기 버튼을 추가했습니다.
- 축소 상태에서는 메뉴 그룹명과 텍스트를 숨기고 아이콘 중심의 compact navigation으로 표시합니다.
- 축소 상태의 메뉴에는 `title`과 `aria-label`을 유지하고 업데이트 개수 badge를 아이콘 우측 상단에 표시합니다.
- 사용자가 선택한 사이드바 상태를 브라우저 `localStorage`에 저장해 페이지 이동과 다음 접속에서도 유지합니다.
- 모바일 navigation drawer는 기존 동작을 그대로 유지합니다.

## [0.2.8-r2] - 2026-09-02

### 수정

- 데스크톱 AppShell에서 좌측 사이드바와 콘텐츠 영역을 2열 grid로 배치하도록 수정했습니다.
- ProductNavigation이 콘텐츠 `<main>` 내부에서 전체 너비를 차지해 Dashboard가 아래로 밀리던 레이아웃 회귀를 수정했습니다.
- 헤더와 Dashboard를 우측 workspace에 함께 배치해 사이드바가 화면 왼쪽에 고정되는 구조를 복원했습니다.

## [0.2.8-r1] - 2026-09-02

### 변경

- 데스크톱 제품 내비게이션을 상단 탭 구조에서 고정 좌측 사이드바 구조로 변경했습니다.
- 메뉴를 Overview, Network, Security, System 영역으로 그룹화해 기능이 늘어나도 확장 가능한 정보 구조를 적용했습니다.
- 모바일에서는 기존 햄버거 흐름을 유지하면서 같은 메뉴 그룹과 제품 브랜딩을 사용하는 drawer 형태로 정리했습니다.
- 페이지 상단의 대형 hero를 compact header로 변경해 콘텐츠 밀도를 높이고 관리 콘솔 형태를 강화했습니다.
- Dashboard를 KPI 중심 System overview, System health, Device details 구조로 재설계했습니다.
- 기존 상태/업데이트 RPC 계약은 변경하지 않고 현재 로드되는 데이터만 재구성해 저사양 장비의 추가 호출을 만들지 않습니다.

## [0.2.7-r1] - 2026-09-02

safeshield의 최소 버전을 0.3.19 이상으로 설정하였습니다.

## [0.2.6-r3] - 2026-08-30

### 변경

- backend CI에서 개별적으로 실행하던 shell syntax, JSON, package/RPC/ucode/statistics/updater 검증을 `tests/run.sh` 하나로 통합했습니다.
- 로컬에서도 `./tests/run.sh`로 GitHub Actions backend job과 동일한 테스트 흐름을 실행할 수 있습니다.

## [0.2.6-r2] - 2026-08-30

safeshield의 최소 버전을 0.3.17 이상으로 설정하였습니다.

## [0.2.6-r1] - 2026-08-30

safeshield의 최소 버전을 0.3.15 이상으로 설정하였습니다.

## [0.2.5-r5] - 2026-08-30

### 변경

- SafeShield `0.3.14-r8`의 statistics-only runtime reconciliation에 맞춰 통계 토글 후 전체 SafeShield 상태를 장시간 재조회하지 않고 통계 상태만 짧게 확인합니다.
- 통계 설정 RPC와 첫 통계 재조회가 끝날 때까지 토글의 busy 상태를 유지해 변경이 진행 중임을 명확하게 표시합니다.
- 통계 수집 활성화/비활성화 중 스위치 knob에 spinner를 표시하고 통계 카드에 wait cursor를 적용합니다.
- 토글 직후에는 목표 상태를 스위치에 즉시 반영하고 `활성화하는 중…` 또는 `비활성화하는 중…` 상태 문구를 표시합니다.
- SafeShield 최소 의존성을 `0.3.14-r8`로 올려 통계 토글이 refresh daemon을 재시작하지 않는 backend 동작을 요구합니다.

### 테스트

- statistics reconciliation 응답, spinner/wait cursor, 목표 상태 표시와 statistics-only 후속 polling 계약을 테스트합니다.

## [0.2.5-r4] - 2026-08-29

### 추가

- SafeShield 차단 통계 카드에 통계 수집 활성화/비활성화 스위치를 추가했습니다.
- 통계 수집 상태와 collector 실행 상태를 함께 표시하고, 비활성화 상태에서는 로컬 집계 방식 안내를 표시합니다.

### 변경

- 통계 설정 변경은 SafeShield 공식 `config_update` RPC에서 `statistics_enabled` 옵션만 갱신하며, 변경 후 상태와 통계를 즉시 다시 조회합니다.

### 테스트

- 통계 토글의 ACL, RPC payload, collector 상태 정규화와 접근성 switch 계약을 테스트에 추가합니다.

## [0.2.5-r3] - 2026-08-29

### 추가

- SafeShield 통계 화면에 기기별 DNS 요청, 차단 수와 차단율을 표시합니다.
- DHCP lease로 식별된 기기는 hostname, 현재 IP와 MAC 주소를 함께 보여주고, lease가 없는 기기는 IP 임시 식별 상태로 표시합니다.
- SafeShield가 개별 기기 추적 한도를 초과한 경우 `기타 기기` 합산과 추적 한도 안내를 표시합니다.

### 변경

- 기기별 통계와 AWK array 초기화 안정성 수정이 포함된 SafeShield `0.3.14-r7` 이상을 최소 의존성으로 요구합니다.

### 테스트

- 통계 RPC의 `devices`, `device_limit`, `devices_truncated` 정규화와 기기별 통계 UI 연결을 계약 테스트에 추가합니다.

## [0.2.5-r2] - 2026-08-29

### 변경

- SafeShield 최근 24시간 시간대별 차단 요청 그래프를 CSS 높이 계산 방식에서 Chart.js 4.5.1 기반 Bar 차트로 변경했습니다.
- `chart.js/auto` 대신 Bar 차트에 필요한 controller, element, scale, tooltip만 등록하여 불필요한 차트 기능이 번들에 포함되지 않도록 했습니다.
- 60초 통계 갱신 시 기존 Chart.js 인스턴스의 데이터를 갱신해 막대 높이가 자연스럽게 전환되도록 했습니다.
- 운영체제의 `prefers-reduced-motion` 설정을 존중하여 모션 감소 사용자는 차트 애니메이션을 사용하지 않습니다.
- 기존 24시간 범위, 3시간 간격 시간 라벨과 차단/DNS 요청 tooltip 정보를 유지하면서 Y축 눈금을 추가했습니다.

## [0.2.5-r1] - 2026-08-29

### 추가

- SafeShield 페이지에 로컬 DNS 통계 카드를 추가해 전체 DNS 요청, 차단 요청, 차단율, 현재 시간 차단 수를 표시합니다.
- 최근 24시간의 시간대별 차단 요청을 외부 차트 라이브러리 없이 경량 막대 그래프로 표시합니다.
- `safeshield statistics` RPC를 60초 간격으로 별도 polling하고 브라우저 탭이 숨겨져 있을 때는 기존 resource hook 정책에 따라 polling을 중지합니다.
- SafeShield 통계 RPC 읽기 ACL과 UI/RPC 연결 계약 테스트를 추가합니다.

### 변경

- 통계 collector lifecycle 수정이 포함된 SafeShield `0.3.14-r2` 이상을 최소 의존성으로 요구합니다.
- APK dependency 문법에 맞게 `EXTRA_DEPENDS`의 버전 조건에서 연산자 뒤 공백을 제거합니다.

## [0.2.4-r2] - 2026-08-30

빌드 오류를 수정하였습니다.

## [0.2.4-r1] - 2026-08-28

safeshield의 성능 개선 버전인 0.3.13 버전을 기본 버전으로 설정하였습니다.

### 성능

- safeshield의 최소 버전을 0.3.13로 올렸습니다.

## [0.2.3-r2] - 2026-08-28

설치된 SmartSafeHub가 여러 릴리즈를 건너뛰어 업데이트될 때 그 사이의 릴리즈 노트를 함께 확인할 수 있도록 누적 릴리즈 노트 표시를 추가했습니다.

### 추가

- 저장소의 `releases/luci-app-smartsafehub/index.json`에서 릴리즈 순서를 확인하고 현재 설치 버전 이후부터 최신 버전까지 필요한 릴리즈 노트만 내려받습니다.
- 여러 릴리즈를 건너뛰는 경우 업데이트 화면에서 최신 릴리즈부터 순서대로 버전, 배포일, 요약과 상세 변경 사항을 함께 표시합니다.
- 홈 업데이트 배너는 실제 최신 업데이트 버전과 일치하는 릴리즈 노트 요약을 우선 표시합니다.

### 안전성

- 릴리즈 index와 개별 릴리즈 노트는 계속 화면 표시용 보조 정보로만 사용하며 APK 업데이트 판단과 설치에는 영향을 주지 않습니다.
- index를 가져오지 못하면 최신 버전의 릴리즈 노트 하나만 시도하고, 일부 중간 릴리즈 노트 다운로드가 실패하면 가져온 노트는 표시하면서 불완전 상태를 함께 전달합니다.
- 장치에서는 한 번에 최대 32개 릴리즈와 최대 1 MiB bundle만 캐시하여 비정상적인 메타데이터가 과도한 자원을 사용하지 않도록 제한합니다.
- safeshield의 최소 버전을 0.3.11로 올렸습니다.

### 테스트

- mock release index를 기준으로 `0.2.1-r1`에서 최신 버전으로 업데이트할 때 중간 릴리즈 노트를 모두 선택하는지 검증합니다.
- 릴리즈 메타데이터 전체 다운로드 실패가 업데이트 확인과 설치를 막지 않는 기존 fail-open 계약을 유지합니다.

## [0.2.3-r1] - 2026-08-28

SmartSafeHub 업데이트 화면에서 새 버전의 릴리즈 노트를 함께 확인할 수 있도록 저장소 릴리즈 메타데이터 연동을 추가했습니다.

### 추가

- `packages.adb`에서 `luci-app-smartsafehub` 새 버전을 확인한 뒤 같은 release channel의 `releases/luci-app-smartsafehub/<version>.json`을 표시용 메타데이터로 가져옵니다.
- 릴리즈 노트는 `/tmp/smartsafehub-release-note.json`에 atomic cache하며 업데이트 버전과 일치하는 JSON만 rpcd가 반환합니다.
- 업데이트 화면에 릴리즈 요약, 배포일과 섹션별 변경 사항을 표시하고 홈 업데이트 배너에도 요약을 노출합니다.
- SmartSafeHub가 직접 릴리즈 메타데이터를 내려받으므로 `uclient-fetch`를 runtime dependency로 추가했습니다.

### 안전성

- 릴리즈 노트 JSON은 화면 표시용 보조 정보이며 업데이트 가능 여부와 설치 대상은 계속 APK 저장소 메타데이터를 기준으로 결정합니다.
- 릴리즈 노트 다운로드나 JSON 파싱이 실패해도 업데이트 확인과 `apk add --upgrade luci-app-smartsafehub` 설치 흐름은 계속 동작합니다.
- rpcd는 schema, package, version을 검증하고 문자열·섹션·항목 길이를 제한한 뒤 프런트엔드에 전달합니다.
- updater는 등록된 `repo.smartsafehub.com/<channel>/packages/.../smartsafehub/packages.adb` URL에서 channel base를 유도하므로 stable과 beta를 별도 설정하지 않습니다.

### 테스트

- mock `uclient-fetch`를 추가해 저장소 URL에서 릴리즈 노트 URL을 올바르게 유도하는지 검증합니다.
- 릴리즈 노트 다운로드 실패가 업데이트 확인 실패로 전파되지 않는 fail-open 동작을 검증합니다.
- 설치 완료 후 이전 릴리즈 노트 cache가 제거되는지 검증합니다.

## [0.2.2-r1] - 2026-08-28

GitHub Actions CI에서 SmartSafeHub 패키지 계약과 배포 산출물 회귀를 더 일찍 감지하도록 자동 검증 범위를 확장했습니다.

### 추가

- `tests/test-package-contract.sh`를 추가해 실행 권한, `PKG_VERSION`과 frontend package 버전 동기화, SafeShield dependency 형식, `/etc/config/smartsafehub` conffile 선언을 검증합니다.
- `tests/test-rpc-contract.sh`를 추가해 updater RPC 등록과 ACL 권한, 단일 `luci-app-smartsafehub` 업데이트 대상, 전체 시스템 `apk upgrade` 금지 계약을 검증합니다.
- `tests/test-ucode-imports.sh`를 추가해 분리된 rpcd ucode 모듈의 상대 import 대상이 실제 파일로 존재하는지 검증합니다.
- frontend production build 후 커밋된 `app.js`와 `app.css`가 실제 소스 빌드 결과와 일치하는지 확인하는 CI 검사를 추가했습니다.
- updater init script를 포함한 shell syntax 검사와 JSON 구문 검사를 보강했습니다.

### CI

- CI에서 `chmod`로 실행 권한을 보정하지 않고 저장소의 executable bit 자체를 검증합니다.
- `npm run build`가 이미 TypeScript typecheck를 포함하므로 중복된 별도 typecheck step을 제거했습니다.
- Vite production output에 `app.js`와 `app.css`가 존재하고 배포용 `index.html`이 생성되지 않는 계약을 검증합니다.

## [0.2.1-r1] - 2026-08-28

`luci-app-smartsafehub` 업데이트를 감지하고, 사용자가 선택한 경우 공유기에서 예약 자동 설치할 수 있는 SmartSafeHub 업데이트 관리 기능을 추가했습니다.

### 추가

- `repo.smartsafehub.com`이 등록된 APK 저장소를 갱신하고 `luci-app-smartsafehub`의 업데이트를 확인하는 updater를 추가했습니다.
- 업데이트 감지·설치 대상은 `luci-app-smartsafehub` 하나이며 `safeshield`는 `EXTRA_DEPENDS:=safeshield (>= 0.3.10)` 버전 제약을 통해 함께 관리합니다.
- 홈 화면 업데이트 알림, 데스크톱·모바일 업데이트 메뉴 badge, SmartSafeHub 현재/신규 버전 표시를 추가했습니다.
- 수동 업데이트 확인과 명시적 확인이 필요한 수동 설치 기능을 추가했습니다.
- 자동 확인 주기와 자동 설치 여부·시각을 `/etc/config/smartsafehub`에 저장하고 `smartsafehub-updater` procd 서비스가 브라우저와 독립적으로 실행하도록 구성했습니다.
- 업데이트 상태는 `/tmp/smartsafehub-updates.state`에 atomic write하여 rpcd가 네트워크 작업 없이 즉시 조회합니다.
- `updates_status`, `updates_check`, `updates_install`, `updates_settings_update` rpcd API와 ACL을 추가했습니다.
- mock `apk`/`uci`를 사용하는 `tests/test-updater.sh` 회귀 테스트를 추가했습니다.
- Github Actions CI를 추가하였습니다.

### 안전성

- 전체 시스템 `apk upgrade`는 실행하지 않으며, 업데이트가 확인된 경우에만 `apk add --upgrade luci-app-smartsafehub`를 실행합니다. 설치된 `safeshield`가 최소 `0.3.10` 조건을 만족하지 않으면 APK dependency resolver가 함께 갱신합니다.
- 패키지 저장소 작업은 rpcd 프로세스에서 직접 수행하지 않고 별도 updater 프로세스에서 실행해 LuCI API 이벤트 루프 차단을 방지합니다.
- updater는 PID 기반 잠금으로 수동 확인, 수동 설치와 예약 작업의 동시 실행을 방지합니다.
- 자동 설치는 기본적으로 꺼져 있으며 기본 예약 시각은 `03:00`, 자동 확인 기본 주기는 6시간입니다.
- OpenWrt 펌웨어 업그레이드는 기존 LuCI 펌웨어 관리 화면에 계속 위임합니다.

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
- Vite production entry를 `frontend/src/main.tsx`로 직접 지정하고, 사용하지 않는 배포용 `root/www/luci-static/smartsafehub/index.html` 생성을 제거했습니다. `frontend/index.html`은 개발 서버용 shell로만 유지합니다.

### 검증

- 프런트엔드는 Node.js 24 이상에서 `npm run typecheck`와 `npm run build`로 검증합니다.
- OpenWrt buildroot에서 패키지 clean/compile을 수행합니다.
- 실제 장치에서는 `ucode -c`, rpcd 재시작, `ubus -v list smartsafehub`와 주요 RPC 호출로 최종 확인합니다.
