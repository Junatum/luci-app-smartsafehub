# 변경 기록

SmartSafeHub LuCI 애플리케이션의 정식 배포 변경 사항을 기록합니다.

버전은 애플리케이션 버전과 OpenWrt 패키지 릴리스를 함께 표기합니다. 예를 들어 `0.2.0-r1`은 애플리케이션 버전 `0.2.0`, 패키지 릴리스 `1`을 의미합니다.

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
