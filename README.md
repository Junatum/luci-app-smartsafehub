# SmartSafeHub LuCI 애플리케이션

[![Lint](https://github.com/Junatum/luci-app-smartsafehub/actions/workflows/ci.yml/badge.svg)](https://github.com/Junatum/luci-app-smartsafehub/actions/workflows/ci.yml)
![OpenWrt](https://img.shields.io/badge/OpenWrt-Compatible-blue)
![License](https://img.shields.io/github/license/Junatum/luci-app-smartsafehub?label=License)

SmartSafeHub는 OpenWrt 공유기에서 장치 상태, 기본 Wi-Fi, 연결된 기기와 SafeShield DNS 보호 기능을 일반 사용자 중심의 화면에서 관리하기 위한 LuCI 애플리케이션입니다.

- OpenWrt: **25.12 버전 이상**
- 백엔드: rpcd ucode 모듈
- 프런트엔드: Preact, TypeScript, Vite, Tailwind CSS
- 라이선스: GPL-3.0-or-later

변경 내역은 [CHANGELOG.md](CHANGELOG.md), 내부 구조와 데이터 흐름은 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)를 참고하세요.

## 패키지 버전

아래 표는 SmartSafeHub 관련 패키지가 Stable 및 Beta 채널에 현재 배포되어 있는 버전을 보여줍니다.

| 패키지 | Stable | Beta |
| --- | --- | --- |
| SmartSafeHub | [![Stable SmartSafeHub](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Frepo.smartsafehub.com%2Fstable%2Fversions.json&query=%24.packages%5B%22luci-app-smartsafehub%22%5D&label=&color=brightgreen&cacheSeconds=300)](https://repo.smartsafehub.com/stable/versions.json) | [![Beta SmartSafeHub](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Frepo.smartsafehub.com%2Fbeta%2Fversions.json&query=%24.packages%5B%22luci-app-smartsafehub%22%5D&label=&color=orange&cacheSeconds=300)](https://repo.smartsafehub.com/beta/versions.json) |
| SafeShield | [![Stable SafeShield](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Frepo.smartsafehub.com%2Fstable%2Fversions.json&query=%24.packages%5B%22safeshield%22%5D&label=&color=brightgreen&cacheSeconds=300)](https://repo.smartsafehub.com/stable/versions.json) | [![Beta SafeShield](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Frepo.smartsafehub.com%2Fbeta%2Fversions.json&query=%24.packages%5B%22safeshield%22%5D&label=&color=orange&cacheSeconds=300)](https://repo.smartsafehub.com/beta/versions.json) |
| LuCI SafeShield | [![Stable LuCI SafeShield](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Frepo.smartsafehub.com%2Fstable%2Fversions.json&query=%24.packages%5B%22luci-app-safeshield%22%5D&label=&color=brightgreen&cacheSeconds=300)](https://repo.smartsafehub.com/stable/versions.json) | [![Beta LuCI SafeShield](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Frepo.smartsafehub.com%2Fbeta%2Fversions.json&query=%24.packages%5B%22luci-app-safeshield%22%5D&label=&color=orange&cacheSeconds=300)](https://repo.smartsafehub.com/beta/versions.json) |

## 주요 기능

### 내비게이션

- 데스크톱 사이드바는 접기/펼치기를 지원하며 사용자 선택을 브라우저에 저장합니다.
- 데스크톱 application shell의 상단 제품 헤더와 사이드바 브랜드 영역은 `72px` 높이를 공통으로 사용합니다. 하단 경계선과 사이드바 토글 중심선을 같은 기준에 맞추면서도 `SMARTSAFEHUB` eyebrow, 굵은 페이지 제목, 한 줄 설명, `40x40px` 상단 액션과 `40px` 브랜드 아이콘은 유지해 현재 위치와 제품 정체성을 빠르게 인지할 수 있도록 합니다. 모바일 내비게이션 높이와 터치 영역은 기존 동작을 유지합니다.
- 사이드바 토글은 패널 외곽선 없이 좌/우 방향만 표현하는 공통 chevron 아이콘을 사용하고, 두 상태 모두 동일한 아이콘 크기를 유지합니다.
- 데스크톱 상단의 테마 전환/새로고침 버튼은 공유기 웹사이트 고유의 크기·아이콘·배치를 유지하고, 테두리 색상만 Cloud Console과 동일하게 사용합니다. 라이트 모드는 `slate-200`, 다크 모드는 `slate-700`, hover는 각각 `teal-300`/`teal-700`입니다.
- 데스크톱 본문은 최대 `1600px` 폭을 유지하되 가용 영역이 그보다 넓어지면 더 이상 가운데로 이동하지 않고 사이드바 다음의 왼쪽 gutter를 기준으로 정렬합니다. 상단 헤더는 전체 가용 폭을 사용하여 페이지 제목은 같은 왼쪽 기준선에, 테마·새로고침 액션은 오른쪽 gutter에 배치합니다.
- 데스크톱 상단의 테마·새로고침은 Cloud Console과 같은 `40x40px` 둥근 사각형 버튼과 `20px` 아이콘을 사용하며, 다크 모드에서도 버튼 경계가 헤더 배경과 구분되도록 별도 대비를 유지합니다.

### 로컬 프론트엔드 개발

실제 공유기에 패키지를 반복 설치하지 않고 UI와 API 연동을 빠르게 확인하려면 Vite 개발 서버가 `/cgi-bin/*` 요청만 테스트 공유기로 프록시하도록 실행할 수 있습니다. 공유기 주소는 소스에 고정하지 않고 `SMARTSAFEHUB_DEV_ROUTER` 환경 변수로 지정합니다.

```bash
cd frontend
SMARTSAFEHUB_DEV_ROUTER=http://192.168.1.1 npm run dev
```

매번 환경 변수를 입력하고 싶지 않다면 `frontend/.env.example`을 참고해 Git에서 제외되는 `frontend/.env.local`을 만들 수 있습니다.

```dotenv
SMARTSAFEHUB_DEV_ROUTER=http://192.168.1.1
```

이 경우에는 `frontend` 디렉터리에서 `npm run dev`만 실행하면 됩니다. 브라우저에서는 Vite가 출력한 `http://localhost:5173/` 주소로 접속합니다. 프론트엔드 소스와 Shadow DOM용 Tailwind CSS는 로컬 Vite 서버에서 제공하고, `/cgi-bin/luci/...` RPC·세션 요청과 `/cgi-bin/cgi-upload` 업로드 요청은 실제 공유기로 전달합니다. `https://` 장치를 지정했을 때 개발용 자체 서명 인증서도 사용할 수 있도록 proxy의 TLS 검증은 개발 환경에서만 비활성화합니다.

로컬 SmartSafeHub 화면은 LuCI 세션 API가 필요하므로 `SMARTSAFEHUB_DEV_ROUTER`가 없으면 Vite 개발 서버가 즉시 오류를 내고 시작하지 않습니다. 이렇게 해서 proxy가 비활성화된 채 `/cgi-bin/luci/smartsafehub/session` 요청이 localhost의 Vite 서버로 들어가 404가 되는 상태를 방지합니다. 환경 변수에는 `http://` 또는 `https://`를 포함한 절대 URL을 사용해야 합니다. 이 값은 `npm run dev`처럼 Vite가 `serve` 모드일 때만 읽고 검증하며, production `vite build`에서는 환경 변수가 존재하거나 잘못된 값이어도 읽지 않습니다. 개발 proxy와 Vite `server` 설정도 production build 설정에는 포함되지 않으므로 기존 `/luci-static/smartsafehub/` asset base와 OpenWrt 런타임 동작은 유지됩니다. 펌웨어 설치, Wi-Fi reload, 재부팅, uHTTPd root rewrite처럼 장치 런타임 자체가 관여하는 기능은 최종적으로 실제 패키지를 설치한 공유기에서 확인합니다.

Tailwind CSS v4는 border, ring/shadow, transform 등의 내부 기본값을 `@property`로 등록하지만 현재 브라우저의 ShadowRoot 안에서는 해당 등록이 안정적으로 적용되지 않습니다. SmartSafeHub는 UI 전체를 Shadow DOM에 격리하므로 `frontend/src/styles/app.css`의 가장 낮은 `properties` layer에서 Tailwind 자체 fallback과 같은 custom property 기본값을 명시합니다. 이 fallback을 제거하면 로컬 Vite에서는 정상이어도 실제 공유기 production asset에서 `border-r`가 `border-style: none`으로 계산되는 등 환경별 차이가 다시 발생할 수 있습니다. 관련 Tailwind 이슈는 `tailwindlabs/tailwindcss#15005`와 그 duplicate인 `#16025`입니다.

### 로그인과 단일 진입 URL

- 공식 사용자 URL은 공유기 루트 `/#home`이며 일반 접속은 `http://192.168.1.1/`처럼 `/cgi-bin/luci`를 노출하지 않음
- `/etc/uhttpd/smartsafehub-root.json`의 uHTTPd `json_script`가 **정확히 `/` 요청만** `/cgi-bin/luci/`로 내부 rewrite하며 HTTP redirect를 사용하지 않으므로 브라우저 주소는 `/`로 유지
- `uhttpd.main.index_page`와 OpenWrt가 소유하는 `/www/index.html`은 변경하지 않음. `/cgi-bin/cgi-upload`, `/ubus`, `/luci-static/...`, 다른 디렉터리 index 등 기존 uHTTPd 경로는 rewrite 대상이 아님
- 기존 `uhttpd.main.json_script` handler가 있으면 순서를 보존하고 SmartSafeHub handler를 뒤에 추가하며, 패키지 제거 시 SmartSafeHub 항목만 제거
- `/cgi-bin/luci/`, `/cgi-bin/luci/smartsafehub`, `/cgi-bin/luci/admin/smartsafehub`는 호환 진입 경로로 유지하되 shell이 로드되면 History API로 `/` 주소로 정규화
- `/#settings`, `/#system` 같은 hash route는 별도 저장소에 복제하지 않고 브라우저 fragment를 그대로 사용합니다. exact-root 내부 rewrite가 활성화된 상태에서는 새 HTTP navigation이 발생하지 않으므로 일반 새로고침에서도 현재 hash가 유지됩니다.
- 공개 shell은 `auth: {}`로 항상 로드되므로 비로그인 상태에서도 LuCI dispatcher가 stock 로그인 화면이나 403을 먼저 반환하지 않음
- Preact가 보호된 `/cgi-bin/luci/smartsafehub/session` endpoint를 조회해 현재 LuCI cookie session을 확인
- 세션이 없으면 `LoginApp`, 유효한 세션 ID를 받으면 제품 `App`을 같은 Shadow DOM에서 렌더링
- 로그인 폼은 `luci_username` / `luci_password`를 보호된 session endpoint에 POST하며 실제 비밀번호 검증, cookie 발급과 추가 인증 정책은 LuCI dispatcher가 담당
- 로그인 성공 후 페이지 이동 없이 받은 session ID로 `/admin/ubus` bootstrap을 구성하고 같은 `/#home` URL에서 제품 화면으로 전환
- ubus `Access denied`를 세션 만료로 처리하기 전 동일 session ID로 기존 `system_root_password_status` RPC를 짧게 확인합니다. 새 패키지가 RPC/ACL을 추가한 직후 기존 세션에 해당 메서드 권한만 아직 반영되지 않은 경우에는 설정 화면을 강제로 로그아웃시키지 않고 권한 오류로 표시하며, 실제 기존 RPC 접근까지 거부될 때만 로그인 화면으로 전환합니다.
- 비밀번호 표시/숨김, Caps Lock 안내, 모바일 안전 영역 지원
- 추가 인증 등 특수 LuCI 구성에서는 보호된 session endpoint의 기본 LuCI 로그인 화면으로 계속할 수 있는 fallback 제공

루트 URL 등록은 `/usr/libexec/smartsafehub-root-entry`가 담당합니다. 실행 중인 공유기에 패키지를 설치/업그레이드하면 `postinst`가 handler 설정과 실제 uHTTPd 실행 인자를 함께 확인합니다. UCI에는 handler가 있는데 실행 중 프로세스에 `-H /etc/uhttpd/smartsafehub-root.json`이 없거나, 제거 후에도 해당 `-H`가 남아 있는 경우에만 uHTTPd를 restart해 runtime을 설정과 동기화합니다. 이미 일치하면 웹 서버를 건드리지 않습니다. 펌웨어 이미지에 기본 포함된 경우 `uci-defaults`는 첫 부팅 설정에 handler만 등록하고, 제거 시에는 기존 다른 `json_script` 항목은 보존한 채 SmartSafeHub handler만 해제합니다. helper는 패치 적용 방식에 따른 executable bit 차이에 의존하지 않도록 `/bin/sh`로 명시 실행합니다.

내부 LuCI/RPC/펌웨어 업로드 endpoint는 계속 기존 경로를 직접 사용합니다. 특히 펌웨어 업로드의 `/cgi-bin/cgi-upload` 등 `/`이 아닌 요청은 root rewrite와 무관합니다.

### 장치 대시보드

- 호스트명, 장치 모델과 보드 이름
- 대시보드 장치 정보와 설정 페이지 시스템 상태 모두 SmartSafeHub 커스텀 펌웨어가 설치된 이미지에서는 Hub가 resolve한 제품 릴리즈 버전과 immutable build ID를 우선 표시하고, 메타데이터가 없는 기존 이미지만 OpenWrt 배포판/버전/리비전으로 대체 표시. 커널은 현재 실제 실행 중인 커널 버전을 표시
- 실제 부팅 시각, 실행 시간, 시스템 부하와 메모리 사용량
- WAN 연결 상태, 프로토콜과 IPv4 주소
- 대시보드 `INTERNET` 개요 카드는 WAN 주소/프로토콜과 함께 `smartsafehub_network.lan_settings`의 WAN/LAN subnet 충돌 여부를 표시합니다. 정상일 때는 `네트워크 충돌 없음`과 다른 개요 카드와 동일한 `자세히 보기` 링크를 표시하고, 충돌 시에는 `네트워크 충돌`과 `해결하기` 링크를 표시해 `네트워크 > LAN`으로 바로 이동할 수 있습니다.
- `네트워크 보호 활동 > 연결 상태` 상세 카드는 상위 WAN 네트워크, SmartSafeHub LAN 네트워크와 대역 충돌 상태를 함께 보여주며, RFC1918 사설 WAN 주소는 `사설 네트워크`로 표시해 상위 NAT 환경임을 구분할 수 있게 합니다.
- 사설 WAN IPv4 판별 코드는 TypeScript `noUncheckedIndexedAccess` 계약을 따르며, `split()` 결과의 배열 인덱스를 직접 비교하지 않고 존재 여부를 확인한 octet 변수만 사용합니다. 프런트엔드 CI의 `npm run build`/`tsc --noEmit`가 이 타입 안전성을 검증합니다.
- SafeShield 차단 목록, 연결 기기 목록, 관리 소프트웨어 업데이트의 최근 확인 시각은 별도 하단 섹션 대신 각 개요 카드에서 `차단 목록 갱신: 41분 전`처럼 `항목: 상대 시간` 형식으로 표시하며, 마우스를 올리면 정확한 시각을 확인할 수 있음
- 연결 기기의 `목록 확인` 시각은 정보성 메타데이터로만 표시하며 오래되었다는 이유만으로 카드 상태를 주의(노란색)로 변경하지 않음. 연결 기기 조회 자체가 실패한 경우에만 확인 필요 상태를 표시함
- SafeShield/관리 소프트웨어가 각 설정 주기의 2배 이상 확인되지 않으면 해당 개요 카드에서 지연 상태를 경고하고, 정상 상태에서는 별도 freshness 영역을 표시하지 않음
- `시스템 상태 > 리소스 사용량` 카드 아래에서 최신 로컬 장치 진단을 함께 요약해 표시. 정상일 때는 전체 상태와 마지막 진단 시각/검사 항목 수를 간결하게 보여주고, 주의·이상 항목이 있으면 최대 2건을 바로 노출하며 상세 진단은 설정 페이지에서 확인
- 장치 진단 요약의 정상/주의/이상 배경과 세부 항목은 라이트/다크 테마에 각각 맞는 대비를 사용하며, 다크 모드에서 반투명 밝은 배경이 남지 않도록 전용 테마 매핑을 적용

### LAN 및 DHCP 관리

- SmartSafeHub 내부 IPv4 주소와 DHCP 할당 시작/종료 주소를 `네트워크 > LAN`에서 관리
- OpenWrt 25.12 기본 형식인 `list ipaddr '192.168.1.1/24'`와 이전 `option ipaddr + option netmask` 형식을 모두 읽을 수 있으며, 25.12 list 형식으로 저장된 경우 CIDR/list 표현을 유지해 변경
- WAN과 LAN IPv4 subnet이 겹치면 충돌 상태와 상위 네트워크 대역을 표시하고, 활성 인터페이스와 겹치지 않는 안전한 `/24` 사설 대역을 자동 추천
- 추천 대역 자동 변경 시 공유기 주소는 `.1`, DHCP pool은 `.100~.249`를 기본으로 구성하고 기존 DHCP 사용 여부와 임대 시간은 유지
- 수동 저장 시 사설 IPv4, network/broadcast 주소, DHCP pool 범위, 공유기 주소 포함 여부와 WAN subnet 중복을 backend에서 재검증
- 고급 설정에서 `/8~30` CIDR, DHCP 서버 사용 여부와 임대 시간을 관리하며 일반 가정용 네트워크는 `/24` 권장
- LAN 주소 변경은 RPC 응답 뒤 지연 적용하고 새 공유기 주소를 UI에 안내해 현재 세션이 끊긴 뒤 다시 접속할 수 있도록 처리
- 공유기 주소, DHCP 범위, 서브넷, 임대 시간 또는 DHCP 사용 여부를 편집해 저장값과 달라지면 카드 헤더에 amber 경고 아이콘과 `저장되지 않음` 상태를 표시하고, 원래 값으로 되돌리거나 저장에 성공하면 즉시 해제. 편집 중에는 상태 갱신이 로컬 입력값을 덮어쓰지 않으며 `설정 저장`은 실제 변경사항이 있을 때만 활성화
- 게스트/VLAN/다중 LAN과 방화벽 zone 구성 자체는 기존 LuCI에서 계속 관리

### Wi-Fi 관리

- 무선 장치별 관리 대상 기본 LAN AP 표시
- SSID와 사용 여부 변경
- 개방형, WPA2-PSK, WPA2/WPA3 혼합, WPA3-SAE 보안 지원
- 비밀번호를 비워 두면 기존 값 유지
- 저장된 비밀번호를 화면이나 API에 다시 노출하지 않음
- 설정 적용 실패 시 이전 UCI 설정으로 자동 롤백
- 동시에 들어온 Wi-Fi 변경 요청은 잠금 파일로 직렬화
- reload 성공 뒤 지연 재조회로 실제 무선 런타임 상태 갱신
- 각 무선 네트워크 카드에서 SSID, 사용 여부, 보안 방식 또는 새 비밀번호가 저장 상태와 달라지면 amber 경고 아이콘과 `저장되지 않음` 상태를 표시하고, 값을 원래 상태로 되돌리거나 저장 성공 후 서버 상태가 반영되면 자동으로 해제. `설정 저장`은 실제 변경사항이 있을 때만 활성화
- 게스트, VLAN, mesh, 추가 BSS와 고급 무선 옵션은 기존 LuCI에서 관리

### IPTV (Beta)

- 네트워크 메뉴의 `IPTV` 항목에서 **SK Broadband**와 **LG U+**의 일반적인 멀티캐스트 IPTV 구성을 실험 기능으로 제공합니다. 메뉴와 화면에 `Beta` 배지를 표시해 아직 설치 환경별 검증이 필요한 기능임을 명확히 안내합니다. 특히 접힌 데스크톱 사이드바에서는 공간을 과도하게 차지하지 않도록 단일 `β` 문자를 유지하되, `20x20px` 원형 배지와 더 큰 글꼴·명확한 대비를 사용해 뭉개지지 않도록 표시합니다. 통신사 provider 선택 구조는 유지하되 현재 두 provider에는 동일한 IGMP Proxy/IGMP Snooping 프로파일을 적용하며, KT처럼 별도 네트워크 방식이 필요한 provider는 추후 확장합니다.
- IPTV 사용 여부 또는 통신사 provider가 저장된 값과 달라지면 Wi-Fi/LAN/설정 화면과 동일한 amber 경고 아이콘과 `저장되지 않음` 상태를 표시합니다. 저장 전 런타임 정보는 마지막으로 적용된 설정 기준임을 별도 안내해 사용자가 화면의 상태를 새 설정으로 오해하지 않도록 합니다.
- 활성화하면 OpenWrt `igmpproxy`를 `wan` upstream / `lan` downstream으로 구성하고 `quickleave=1`, upstream `altnet=0.0.0.0/0`을 적용합니다. 동시에 LAN bridge의 `igmp_snooping=1`을 활성화해 IPTV 멀티캐스트가 필요하지 않은 LAN 포트와 Wi-Fi로 불필요하게 flooding되는 것을 줄입니다.
- 현재 OpenWrt의 `igmpproxy` 서비스가 시작 시 필요한 multicast firewall 연동을 처리하므로 SmartSafeHub는 별도의 firewall UCI 규칙을 중복 생성하지 않습니다.
- 비활성화하면 `igmpproxy`를 stop/disable하고 IPTV를 켜기 전 LAN bridge의 IGMP snooping 값을 복원합니다. 설정 commit 또는 runtime 적용이 실패하면 `/etc/config/smartsafehub`, `/etc/config/network`, `/etc/config/igmpproxy` 스냅샷과 이전 서비스 상태로 rollback합니다.
- 기존 `igmpproxy`가 WAN 이외의 upstream을 사용하거나 upstream이 여러 개인 커스텀 구성인 경우에는 해당 설정을 덮어쓰지 않고 충돌 오류를 반환합니다.
- **KT IPTV와 통신사별 VLAN 구성은 이번 Beta 범위에 포함하지 않습니다.** 설치 환경이나 셋톱박스 세대에 따라 SKB/LG U+도 별도 VLAN이 필요할 수 있으므로 실제 회선 검증이 필요합니다.

### 연결된 기기

- DHCP 임대, ARP, `network.wireless`와 hostapd 클라이언트 정보 통합
- 호스트명, MAC 주소와 IPv4 주소 표시
- Wi-Fi, 유선 또는 알 수 없음으로 연결 방식 분류
- Wi-Fi SSID, 라디오, 주파수 대역, 신호 세기와 접속 시간 표시
- 온라인, 오프라인, 무선과 유선 기기 수 집계
- 일부 데이터 소스가 실패해도 나머지 정보로 목록을 구성하는 best-effort 처리

### SafeShield

- SafeShield 사용 여부와 실행 상태 표시
- 차단 목록 수동 갱신
- 수동 갱신 요청의 성공 안내 배너는 유지하지 않고 실제 진행 상태를 보호 카드의 단계 UI로 표시하며, 실패한 경우에만 오류 피드백을 유지
- 갱신 데몬, dnsmasq와 DNS 런타임 상태 표시
- 라이선스, 플랜, 아티팩트와 차단 목록 상태 표시
- 유료 플랜은 PRO(teal), ULTIMATE(bronze), PLUS 등 기타 유료 플랜(blue)의 정적인 premium chip으로 구분합니다. 외부 glow와 shine 애니메이션은 사용하지 않고 얕은 그림자와 1px 테두리만 유지하며, FREE 플랜은 `https://www.smartsafehub.com/pricing/` 요금제 안내 CTA를 보호 카드에 표시
- 로컬 DNS 요청·차단 수, 차단율과 최근 24시간 시간대별 차단 통계 표시
- 대시보드와 SafeShield의 최근 24시간 통계에서는 제품이 실제로 처리한 결과인 `차단` 수치를 동일한 teal 강조색으로 표시하고, DNS 요청 수와 차단율은 기본 텍스트 색상으로 유지해 지표의 우선순위를 일관되게 표현
- DHCP 식별 정보를 이용한 기기별 DNS 요청·차단 수·차단율과 IP/MAC 표시. 차단 수 기준 상위 3개 기기를 기본 미리보기로 보여주며 `차단 TOP 3` 배지와 `전체 N개 기기 중 차단 수 기준 상위 3개` 안내로 현재 표시 범위를 명확히 표현. 필요할 때 전체 목록을 펼쳐 10개 단위 페이지네이션으로 확인
- 통계 RPC는 SafeShield 화면에서만 60초 간격으로 조회하며 숨겨진 브라우저 탭에서는 polling 중지
- 새 라이선스 등록·변경은 `smartsafehub.license_activate`가 키만 private request로 넘기고 즉시 반환한 뒤 detached `smartsafehub-license activate` helper가 SafeShield 장치 identity를 조회해 Hub `/api/v1/licenses/activate`에서 검증합니다. Hub 성공 뒤에만 SafeShield 공식 `license_update` API로 로컬 저장하며 rpcd 안에서 nested ubus 호출을 수행하지 않습니다.
- 라이선스 등록·조회·제거의 진행/성공/오류 피드백은 SafeShield 페이지 상단이 아니라 라이선스 입력 카드 안에 표시합니다. activation 상태 조회는 1초 간격, 5초 RPC timeout을 사용하고 일시적인 통신 오류를 제한적으로 재시도합니다.
- `smartsafehub-license` daemon이 기본 5분마다 Hub `/api/v1/licenses/status`를 확인하고, 서버가 명시적으로 `clear_license`를 반환한 경우에만 SafeShield 공식 API로 로컬 키 제거
- Hub 상태 확인 실패만으로는 로컬 라이선스를 제거하지 않는 fail-open 동작을 사용하며, 활성화와 주기 확인은 single-flight 경계로 직렬화
- 현재 라이선스 키는 사용자가 `현재 키 불러오기`를 선택했을 때만 `safeshield.license_get`으로 평문 조회
- 사용자 허용 목록과 차단 목록 관리
- 규칙 저장과 유효성 검사는 SafeShield 공식 API가 담당
- 규칙 변경은 SafeShield 엔진의 cached-artifact local apply 경로로 즉시 반영
- full Hub refresh와의 직렬화, debounce, 중복 apply 억제는 SafeShield 엔진이 담당
- `safeshield.status.timestamps.last_local_apply`를 확인한 뒤 DNS 적용 완료로 표시

### 업데이트

- 하나의 업데이트 페이지에서 `펌웨어 업데이트`와 `관리 소프트웨어 업데이트`를 독립된 두 영역으로 관리하며, 펌웨어를 최상단의 주요 업데이트 영역으로 표시
- 관리 소프트웨어 업데이트는 하나의 카드 안에서 현재 상태와 자동 업데이트 설정을 데스크톱 2열·모바일 1열로 구성해 펌웨어 업데이트와의 범위를 시각적으로 구분하며, 두 업데이트 카드의 소개 문구는 충분한 폭이 있는 데스크톱에서 한 줄로 유지해 짧은 마지막 문장 조각만 다음 줄로 떨어지지 않도록 표시
- `luci-app-smartsafehub`의 설치 버전과 저장소 업데이트 버전, 새 버전의 릴리즈 요약과 배포일 표시
- 홈 알림 배너와 업데이트 메뉴 badge로 설치 가능한 SmartSafeHub 애플리케이션 업데이트 표시
- 관리 소프트웨어는 1·6·12·24시간 자동 확인 주기와 지정 시각 자동 설치를 지원하고, 명시적 설정이 없는 신규 설치에서는 Stable 채널만 자동 설치를 기본 활성화하고 Beta 채널은 비활성화. 펌웨어는 별도의 업데이트 영역에서 확인하며 자동 설치하지 않음
- 자동 업데이트의 확인 여부·주기·자동 설치 여부·설치 시각을 변경해 저장값과 달라지면 설정 영역 헤더에 amber 경고 아이콘과 `저장되지 않음` 상태를 표시하고, 모든 값을 원래 상태로 되돌리거나 저장이 성공하면 경고를 제거
- 데몬 시작 시 펌웨어는 10초 뒤, 관리 소프트웨어는 20초 뒤 최초 업데이트 확인을 수행합니다. 초기 네트워크가 아직 준비되지 않아 실패하면 60초 간격으로 최대 3회까지만 재시도하며, 이후에는 설정된 일반 확인 주기로 돌아갑니다. 관리 소프트웨어는 실패한 확인 시도 시각도 별도로 기록해 저장소 장애 중 `apk update`가 1분마다 반복되지 않도록 제한합니다.
- 관리 소프트웨어 자동 확인이 켜져 있는데 마지막 성공 확인이 설정 주기의 2배 이상 지연되면 대시보드와 업데이트 페이지 모두 amber `업데이트 확인 지연` 상태로 표시합니다. 패키지 설치·업그레이드 시 `smartsafehub-updater` 부팅 시작 링크를 다시 활성화해 기존 설치에서 자동 확인 데몬이 비활성 상태로 남는 경우를 복구합니다. updater가 자기 자신을 설치하는 중일 수 있으므로 post-install hook에서는 서비스를 강제 재시작하지 않습니다.
- `luci-app-smartsafehub`를 실제 공유기에 설치하거나 업그레이드할 때마다 `smartsafehub-firmware` 서비스를 강제로 enable합니다. 기존 설치에서 신규 펌웨어 데몬의 `S96smartsafehub-firmware` 링크가 없던 경우도 다음 패키지 업데이트 시 자동 복구되며, 사용자가 이전에 수동으로 disable했더라도 패키지 업데이트 정책이 다시 활성화합니다.
- 예약 재부팅을 담당하는 `smartsafehub-maintenance`도 패키지 설치·업그레이드 시 강제로 enable합니다. 기존 장치가 maintenance 서비스 도입 이전 버전에서 업그레이드되어 rc.d 시작 링크가 없는 경우에도 다음 재부팅부터 예약 재부팅 데몬이 정상 시작되도록 복구합니다.
- 기존 장치에 `auto_install` 값이 이미 저장되어 있으면 그 사용자의 선택을 그대로 유지
- 애플리케이션 자동 설치는 `luci-app-smartsafehub`만 대상으로 수행하며 `safeshield`의 최소 버전은 패키지 dependency로 함께 관리
- 로컬 APK 설치로 SmartSafeHub 또는 SafeShield가 `/etc/apk/world`의 identity hash에 고정된 경우 해당 두 항목만 일반 패키지 항목으로 정규화한 뒤 `apk upgrade luci-app-smartsafehub`를 실행합니다. identity pin 해제를 위해 `apk add --upgrade --latest`나 전역 `apk upgrade --available`을 사용하지 않아 관계없는 OpenWrt 패키지와 커널 모듈을 갱신 범위에 포함시키지 않습니다.
- 애플리케이션 릴리즈 노트는 같은 SmartSafeHub 저장소 channel의 `releases/luci-app-smartsafehub/index.json`에서 릴리즈 순서를 확인한 뒤 현재 설치 버전 이후의 `<version>.json`을 표시용으로 사용하며, 일부 또는 전체 조회 실패가 업데이트 설치를 막지 않음
- 펌웨어는 현재 패키지 저장소 channel과 장치 코드를 사용해 Hub의 `POST /api/v1/firmware/resolve` API에서 이 장치용 최신 Sysupgrade 배포를 확인
- 펌웨어 제품 버전은 `1.0.2` 같은 `X.Y.Z` 릴리즈 버전을 사용하며, 이미지 빌드 후 관리자가 검증·게시할 때 Hub의 `OpenWrtBuild.release_version`에 지정합니다. 공유기 이미지의 `firmware.json`에는 릴리즈 버전을 넣지 않고 immutable `build_id`만 유지합니다.
- 공유기는 `firmware.json`의 `build_id`를 resolve API에 보내고 Hub가 이를 현재 `release_version`으로 역조회합니다. 업데이트 가능 여부는 Hub가 현재/최신 릴리즈 버전을 비교해 결정하며, 공유기 UI는 `current_version`과 `release.version`을 제품 펌웨어 버전으로 표시하고 OpenWrt 버전과 build ID는 진단 정보로 구분합니다.
- 펌웨어 업데이트 확인은 비활성화 옵션 없이 항상 수행하며 기본 6시간 간격으로 최신 버전을 확인합니다. 기존 설치에 남아 있는 `smartsafehub.firmware.check_enabled` 값은 패키지 설치/업그레이드 시 정리합니다. 관리 소프트웨어의 업데이트 확인 여부는 기존처럼 사용자가 선택할 수 있으며, 실제 펌웨어 자동 설치는 제공하지 않고 사용자의 명시적인 최종 확인이 있어야 설치
- 온라인 펌웨어는 Hub가 제공한 파일 크기와 SHA-256을 검증한 뒤 OpenWrt `system.validate_firmware_image`와 `sysupgrade --test`를 모두 통과한 경우에만 설치 준비 완료로 표시
- `.bin` Sysupgrade 파일을 SmartSafeHub 화면에서 직접 수동 업로드할 수 있으며 온라인 이미지와 동일한 OpenWrt 검증 경로를 사용. 수동 설치는 온라인 펌웨어 업데이트와 같은 카드 안에서 접이식 보조 영역으로 제공하고, 브라우저 기본 file input 대신 파일명·크기와 선택/검증 동작을 일관되게 표시하는 전용 파일 선택 UI를 사용. 안전 안내 문구는 충분한 폭이 있는 데스크톱에서 영역 전체 폭을 활용해 한 줄로 표시하고 작은 화면에서는 자연스럽게 줄바꿈하며, 펼친 본문은 제목 영역과 과도하게 벌어지지 않도록 컴팩트한 상단 여백을 사용
- 수동 업로드 검증은 비동기 firmware helper의 실제 상태를 `ready` 또는 `error`까지 추적하며, 이전 작업의 stale error를 새 검증 결과로 오인하지 않습니다. 검증이 `ready`로 완료되면 backend `prepared` 정보를 기준으로 설정 유지 옵션과 펌웨어 설치 동작을 즉시 표시합니다.
- 수동 펌웨어 파일은 LuCI dispatcher(`/cgi-bin/luci`)가 아니라 전용 CGI endpoint인 `/cgi-bin/cgi-upload`로 전송하며, 업로드 실패 시 브라우저 콘솔에 endpoint·HTTP 상태·destination·파일 정보를 기록해 ACL/HTTP/네트워크 오류를 구분할 수 있도록 함
- 설정 유지가 가능한 이미지에서는 기본적으로 현재 설정을 유지하고, 검증 결과가 설정 보존을 허용하지 않는 이미지는 해당 선택을 비활성화
- 강제 `sysupgrade`는 SmartSafeHub UI와 helper에서 제공하지 않음
- 지원 장치 코드는 `iptime-ax3000sm`, `gl-mt300n-v2`, `xiaomi-ax3000t`이며 빌드 이미지에는 정확한 현재 빌드를 식별할 수 있도록 `/usr/share/smartsafehub/firmware.json`을 포함하는 것을 권장

권장 펌웨어 메타데이터 예시는 다음과 같습니다. `build_id`는 Hub의 펌웨어 배포 `build_id`와 동일해야 하며, 관리자가 게시 시점에 결정하는 `release_version`은 이 파일에 기록하지 않습니다. 메타데이터가 없는 기존 이미지는 보드 이름으로 장치 종류를 식별할 수 있지만 현재 빌드와 릴리즈 버전 매핑 정확도가 낮아질 수 있습니다.

```json
{
  "schema": 1,
  "device_code": "iptime-ax3000sm",
  "build_id": "20260913T070000Z-abcdef123456",
  "channel": "stable",
  "openwrt_version": "25.12.4"
}
```

### 설정

- 공장 초기화나 새 설치 후 root 관리자 비밀번호가 비어 있으면 SmartSafeHub의 다른 관리 기능을 열기 전에 초기 보안 설정 화면을 강제로 표시합니다. 최초 비밀번호는 8자 이상이며 영문자와 숫자를 각각 하나 이상 포함해야 합니다. 초기 설정 UI에서는 시스템 계정명을 별도로 노출하지 않고 사용자에게 `관리자 비밀번호`로 안내합니다.
- 초기 비밀번호 설정은 OpenWrt/LuCI의 `luci.setPassword` 경로를 통해 root 계정에 적용합니다. OpenWrt 25.12와의 호환성을 위해 `username`과 `password`만 전달하며, 성공 직후 기존 빈 비밀번호 인증 세션을 종료해 새 비밀번호로 다시 로그인하도록 합니다. root 비밀번호가 이미 설정된 장치에서는 이 초기 설정 RPC로 기존 비밀번호를 덮어쓸 수 없습니다.
- 현재 펌웨어, 실행 시간, 메모리와 부하 표시
- 장치의 현재 시간, IANA 시간대와 NTP 자동 동기화 사용 상태 표시
- NTP 자동 동기화가 활성화된 장치에서 `지금 동기화`를 눌러 `sysntpd`의 새 동기화 요청을 즉시 시작하고 최신 장치 시간을 다시 확인
- OpenWrt/LuCI의 실제 시간대 데이터베이스를 사용해 `system.@system[0].zonename`과 대응하는 `timezone` 값을 함께 저장하고 즉시 적용
- 브라우저 시간대가 장치에서 지원되는 경우 `브라우저 시간대 사용`으로 빠르게 선택 가능
- 시간대, Wi-Fi 보안 방식, LAN 서브넷/DHCP 임대 시간, 업데이트 확인 주기, 예약 재부팅 주기/요일 등 선택 컨트롤은 운영체제 native `<select>` 대신 SmartSafeHub 공통 커스텀 드롭다운을 사용합니다. 팝업은 트리거에 맞춰 같은 위치와 폭으로 열리고 화면 하단 공간이 부족하면 위쪽으로 자동 전환하며, 라이트/다크 모드 surface와 현재 선택 표시를 동일하게 유지합니다.
- 시간대 변경 시 관리 소프트웨어 자동 설치의 날짜·시각 marker를 초기화하고 updater와 예약 재부팅 maintenance daemon을 다시 시작해 새 로컬 시간 기준으로 일정을 재계산
- 기본 비활성화된 예약 재부팅을 `매일` 또는 `매주` 주기, 요일과 로컬 시각으로 설정 가능. 기본 제안값은 매주 일요일 04:00
- 예약 재부팅 설정은 시간대와 같은 기준 시각을 사용하므로 설정 화면의 `시간 및 시간대` 카드 하단에 함께 배치해 관련 시간 설정을 한 곳에서 관리하고 불필요한 세로 스크롤을 줄임
- 예약 재부팅 토글·주기·요일·시각을 변경해 저장된 값과 달라지면 헤더에 amber 경고 아이콘과 `저장되지 않음` 상태를 표시하며, 저장 성공 또는 원래 값으로 되돌리면 즉시 사라져 토글 조작 자체가 저장 완료로 오인되지 않도록 함
- 예약 재부팅 시 관리 소프트웨어 또는 펌웨어 작업이 진행 중이면 15분 단위로 최대 2시간 연기하고, 설치 준비된 펌웨어가 있는 경우에도 사용자의 pending 작업을 보존하기 위해 재부팅을 미룸
- 부팅 후 10분 이내에는 예약 재부팅을 건너뛰고 동일 예약 key의 중복 실행을 막아 재부팅 루프를 방지
- 모든 사용자를 대상으로 메모리, 시스템 부하, `/overlay` 저장 공간, WAN, dnsmasq, SafeShield, 업데이트 상태와 시스템 시간을 5분 주기로 로컬 진단하고 설정 화면에서 정상/준비 중/주의/이상 결과와 `지금 진단` 기능 제공
- 부팅 후 기본 120초(`smartsafehub.health.startup_grace_s`) 동안 SafeShield가 첫 갱신 중이거나 상태 API가 아직 준비되지 않은 경우에는 장애가 아닌 `준비 중`으로 처리합니다. 이 동안 warning/critical issue와 원격 Health 보고를 만들지 않으며, 정규 5분 주기 대신 daemon tick에서 다시 확인합니다. grace 이후에도 준비되지 않으면 실제 주의/이상 판정으로 전환합니다.
- 유료 멤버십 또는 Trial 장치에서는 사용자가 명시적으로 opt-in한 경우에만 Health Reporter를 사용할 수 있습니다. 기본값은 OFF이며 정상 상태는 30분 heartbeat, 이상 상태 fingerprint가 바뀌면 정기 주기 전에도 한 번 보고합니다. 사용자가 OFF로 변경하면 이후 자동 상태 보고 네트워크 요청을 수행하지 않습니다.
- Reporter 토글은 사용자 입력 즉시 화면에 `켜짐/꺼짐` 상태를 반영하고, 서버 보고가 아직 한 번도 완료되지 않은 활성 상태는 `꺼짐`이 아니라 `첫 보고 준비 중/대기 중`으로 표시합니다. 설정 저장 뒤에는 짧은 확인 조회로 첫 서버 보고 결과를 빠르게 갱신하며, 실패하면 토글을 이전 상태로 되돌립니다.
- Health Reporter는 서버 전송용 payload를 whitelist 방식으로 별도 생성해 메모리/부하/저장 공간 수치, 전체 진단 상태와 이상 코드만 전송합니다. 호스트명, WAN IP, Wi-Fi SSID/MAC, DNS 요청 내용과 시스템 로그 원문은 자동 보고에 포함하지 않습니다.
- 장치, Wi-Fi, SafeShield와 로컬 Health 상태를 JSON 진단 파일로 다운로드
- 진단 파일에 Wi-Fi 비밀번호와 SafeShield 라이선스 키를 포함하지 않음
- 진단 파일에는 호스트명, WAN IPv4와 Wi-Fi SSID가 포함될 수 있으므로 외부 전달 전 확인 필요
- OpenWrt 표준 `sysupgrade` 설정 백업을 SmartSafeHub에서 직접 다운로드하고, SmartSafeHub 또는 기본 LuCI에서 만든 `.tar.gz` 백업을 업로드·검증한 뒤 복원 가능
- 복원 archive는 16MB로 제한하고 gzip/tar 구조, `/etc/config` 포함 여부와 위험한 경로를 검사하며, 업데이트나 펌웨어 작업 중에는 복원을 차단
- 설정 복원 후 현재 펌웨어 이미지의 `firmware.json`을 기준으로 `current_build_id`를 다시 동기화하고 자동 재부팅해 이전 백업의 펌웨어 identity가 남지 않도록 처리
- 설정 백업에는 Wi-Fi 비밀번호, 관리자 설정, VPN 키와 라이선스 정보 등 민감한 설정이 포함될 수 있으므로 안전한 위치에 보관해야 하며, 펌웨어 이미지와 설치 패키지 자체는 포함하지 않음
- 데스크톱의 시스템 관리 영역은 `설정 백업 및 복원`과 `시스템 도구`를 1:1 두 열로 배치하고, 모바일에서는 한 열로 쌓아 불필요한 세로 스크롤을 줄임
- 백업/복원 카드는 절반 폭에서도 읽기 쉽도록 `현재 설정 백업`과 `설정 복원`을 compact 세로 섹션으로 표시
- 공유기 재부팅은 명시적인 확인 절차를 유지하면서 `시스템 도구` 안의 compact action으로 제공
- 업데이트 관리는 전용 `업데이트` 메뉴에만 두고 설정 화면의 중복 업데이트 진입점은 제공하지 않음
- SmartSafeHub에서 아직 제공하지 않는 상세 시스템 기능과 원본 로그는 `시스템 도구` 카드의 LuCI 고급 설정과 시스템 로그 진입점으로 제공

시간대 설정은 로그와 통계뿐 아니라 관리 소프트웨어의 예약 설치 시각과 예약 재부팅 시각에도 영향을 줍니다. 저장 시 LuCI가 제공하는 시간대 목록에서 선택 값을 검증하고 IANA `zonename`과 POSIX `timezone`을 함께 기록합니다. 런타임 적용에 실패하면 이전 UCI 값을 복원합니다. NTP가 활성화되어 있으면 설정 화면에서 `지금 동기화`를 실행해 OpenWrt `sysntpd`를 즉시 다시 시작하고 잠시 뒤 장치 시간을 재조회할 수 있습니다.

예약 재부팅은 `/usr/libexec/smartsafehub-maintenance`와 `smartsafehub-maintenance` procd service가 담당합니다. 단순 cron reboot를 사용하지 않고 SmartSafeHub updater와 firmware updater의 상태/lock을 확인한 뒤 안전한 경우에만 재부팅합니다. 업데이트 작업과 겹치면 15분 뒤 재시도하며 최대 2시간이 지나도 안전하지 않으면 해당 예약은 건너뜁니다. 패키지 postinst는 서비스가 새로 추가된 업그레이드 경로에서도 rc.d 시작 링크가 보장되도록 maintenance 서비스를 명시적으로 enable합니다.

설정 UI에서는 예약 재부팅을 별도 시스템 관리 카드로 분리하지 않고 `시간 및 시간대` 카드의 하위 섹션으로 표시합니다. 시간대 변경과 예약 시각의 관계를 한 화면에서 확인할 수 있고, 데스크톱에서는 주기·요일·시각을 한 행에 배치하며 모바일에서는 세로로 자연스럽게 쌓입니다.

설정 백업 다운로드는 LuCI의 인증된 `/cgi-bin/cgi-backup` 경로를 통해 OpenWrt `sysupgrade --create-backup` 형식을 그대로 사용합니다. 복원은 `/cgi-bin/cgi-upload`로 전용 `/tmp/smartsafehub/config-backup.tar.gz` 경로에만 업로드한 뒤 `/usr/libexec/smartsafehub-backup`이 archive 구조와 업데이트 충돌 여부를 확인하고 `sysupgrade --restore-backup`을 실행합니다. 따라서 SmartSafeHub 백업은 기본 LuCI/CLI와 상호 호환되며 별도의 독자 백업 포맷을 만들지 않습니다.

SmartSafeHub가 생성하는 휘발성 런타임 상태와 임시 파일은 `/tmp/smartsafehub/` 한 디렉터리에 모읍니다. 업데이트 상태와 릴리즈 노트, 펌웨어 상태·다운로드 이미지, Health 진단/Reporter 상태, 예약 재부팅 상태, Wi-Fi 변경 lock, 설정 백업 업로드 파일이 이 경로를 공유하며 `updater/`나 `firmware/` 같은 추가 하위 분류 디렉터리는 만들지 않습니다. `/tmp` 기반이므로 재부팅 시 함께 초기화되고 flash 저장 공간에는 기록하지 않습니다. 각 helper와 init script가 필요할 때 디렉터리를 다시 생성합니다.

진단 파일은 설정 화면에 이미 로드된 시스템/Health 상태를 재사용하고 Wi-Fi와 SafeShield 상세 정보만 병렬로 조회합니다. 선택적 상세 조회 하나가 실패해도 다운로드 전체를 중단하지 않습니다. Health Reporter는 이 다운로드 JSON을 전송하지 않으며 `/usr/libexec/smartsafehub-health`가 개인정보가 배제된 별도 최소 payload를 생성합니다.

### 모바일 지원

- 768px 미만에서 햄버거 메뉴 사용
- 메뉴 이동 후 자동 닫기와 `Escape` 키 지원
- 주요 터치 영역 최소 44px 적용
- iPhone 노치와 홈 인디케이터 안전 영역 지원
- 긴 장치명, MAC 주소와 버전 문자열 줄바꿈 처리

## 성능과 안정성 설계

- 동일 리소스의 중복 RPC 요청을 single-flight 방식으로 합칩니다.
- 폴링은 이전 요청이 완료된 다음 예약해 느린 공유기에서 요청이 겹치지 않습니다.
- 숨겨진 브라우저 탭에서는 폴링을 멈추고 다시 보일 때 갱신합니다.
- 메뉴를 다시 열면 해당 리소스를 새로 조회하고 홈·설정의 시스템 상태는 활성 상태에서 60초마다 갱신합니다.
- RPC는 기본 20초, Wi-Fi 변경은 35초 후 중단하며 JSON-RPC ID·결과·상태 코드 형식을 검증합니다.
- 연결 기기 조회는 `network.wireless`에 station 정보가 없을 때만 hostapd를 추가 호출합니다.
- Wi-Fi 변경 검증은 UCI 설정을 기준으로 수행해 불필요한 런타임 전체 조회를 피합니다.
- SmartSafeHub는 공개 shell의 단일 Preact lifecycle을 사용하며 legacy LuCI view loader나 DOM observer를 두지 않습니다.
- SafeShield, 연결 기기와 진단 수집은 일부 소스 실패를 전체 기능 실패로 확대하지 않습니다.
- 저사양 장비의 통계 성능 검증 절차는 [`docs/STATISTICS_TESTING.md`](docs/STATISTICS_TESTING.md)를 따릅니다.

## 지원 환경과 의존성

OpenWrt 패키지 의존성은 Makefile에 다음과 같이 선언합니다.

```text
luci-base
rpcd-mod-ucode
ucode
ucode-mod-ubus
ucode-mod-fs
ucode-mod-uci
procd
uclient-fetch
jsonfilter
igmpproxy
safeshield (>= 0.3.24)
```

`LUCI_DEPENDS`의 `+igmpproxy`는 IPTV Beta의 멀티캐스트 proxy runtime을 함께 설치하고, `+safeshield`는 빌드 시 SafeShield 패키지 선택 관계를 유지합니다. `LUCI_EXTRA_DEPENDS:=safeshield (>=0.3.24)`는 설치·업데이트 시 필요한 최소 SafeShield 버전을 강제합니다.

프런트엔드 빌드에는 **Node.js 24 이상**이 필요합니다.

```bash
node --version
npm --version
```

## 저장소 구조

```text
luci-app-smartsafehub/
├── Makefile
├── README.md
├── CHANGELOG.md
├── docs/
│   └── ARCHITECTURE.md
├── frontend/
│   ├── index.html          # Vite 개발 서버용 shell (배포 입력 아님)
│   ├── src/
│   │   ├── api/
│   │   ├── app/
│   │   ├── auth/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── login/
│   │   ├── pages/            # IPTV Beta 포함
│   │   ├── styles/
│   │   ├── types/
│   │   └── utils/
│   ├── package.json
│   └── vite.config.ts
├── root/
│   ├── etc/config/smartsafehub
│   ├── etc/init.d/smartsafehub-updater
│   ├── etc/init.d/smartsafehub-firmware
│   ├── etc/init.d/smartsafehub-health
│   ├── etc/init.d/smartsafehub-license
│   ├── etc/init.d/smartsafehub-maintenance
│   ├── usr/libexec/smartsafehub-updater
│   ├── usr/libexec/smartsafehub-firmware
│   ├── usr/libexec/smartsafehub-health
│   ├── usr/libexec/smartsafehub-license
│   ├── usr/libexec/smartsafehub-maintenance
│   ├── usr/libexec/smartsafehub-backup
│   ├── usr/share/luci/menu.d/
│   ├── usr/share/rpcd/acl.d/
│   ├── usr/share/rpcd/ucode/
│   │   ├── smartsafehub.uc
│   │   └── smartsafehub/
│   │       ├── core.uc
│   │       ├── security.uc
│   │       ├── backup.uc
│   │       ├── devices.uc
│   │       ├── system.uc
│   │       ├── firmware.uc
│   │       ├── updates.uc
│   │       ├── license.uc
│   │       ├── network-management.uc
│   │       ├── wifi-management.uc
│   │       └── wifi.uc
│   └── www/luci-static/smartsafehub/
│       ├── app.js
│       └── app.css
```

`root/www/luci-static/smartsafehub/app.js`와 `app.css`는 Vite가 만드는 배포 산출물입니다. production build는 `frontend/src/main.tsx`를 직접 entry로 사용하므로 배포 디렉터리에 `index.html`을 생성하지 않습니다. `frontend/index.html`은 Vite 개발 서버에서만 사용하는 shell입니다. 프런트엔드 소스를 수정한 뒤 반드시 다시 빌드해야 합니다.

## 프런트엔드 개발

### 의존성 설치

```bash
cd frontend
npm ci
```

#
### LAN/DHCP 주소 입력 안전장치

LAN 설정 화면은 공유기 IPv4 주소를 4개의 octet 입력으로 분리해 받습니다. DHCP 시작/종료 주소는 공유기 주소의 앞 3개 octet을 고정해서 표시하고 마지막 octet만 수정할 수 있습니다. 공유기 주소의 앞 3개 octet을 변경하면 DHCP 범위도 같은 prefix로 즉시 동기화되어 서로 다른 대역을 실수로 저장하는 가능성을 줄입니다. 실제 저장 시에는 backend의 subnet/DHCP 범위 검증도 그대로 적용됩니다.

## 개발 서버

```bash
npm run dev
```

Vite 개발 서버는 컴포넌트 작업에 사용할 수 있지만 실제 LuCI 세션, ACL과 ubus 호출은 OpenWrt 장치에서 확인해야 합니다.

### 정적 검사

```bash
npm run typecheck
```

### 배포 빌드

```bash
npm run build
```

빌드 결과는 다음 위치에 생성됩니다.

```text
root/www/luci-static/smartsafehub/app.js
root/www/luci-static/smartsafehub/app.css
```

`npm run build`는 TypeScript 검사를 통과한 뒤 `frontend/src/main.tsx`를 production entry로 사용해 Vite 배포 자산을 생성합니다. HTML entry를 사용하지 않으므로 `root/www/luci-static/smartsafehub/index.html`은 생성되지 않습니다. 프런트엔드 소스를 변경한 경우 갱신된 `app.js`와 `app.css`도 함께 커밋합니다.

## OpenWrt 패키지 빌드

패키지를 OpenWrt 소스 트리의 `package/luci-app-smartsafehub` 또는 사용하는 feed에 배치한 뒤 실행합니다.

```bash
make package/luci-app-smartsafehub/clean
make package/luci-app-smartsafehub/compile V=s
```

별도의 `Build/Prepare` 검증 hook은 사용하지 않습니다. OpenWrt 패키지 빌드는 `luci.mk`의 기본 패키징 흐름을 사용하며, 프런트엔드 자산은 패키지 빌드 전에 `npm run build`로 갱신합니다.

별도의 프런트엔드 build ID는 사용하지 않습니다. JavaScript와 CSS 캐시 무효화 키는 현재 `Makefile`의 `PKG_VERSION`과 `PKG_RELEASE`를 기준으로 관리합니다. README에는 특정 릴리스 버전을 고정해서 기록하지 않습니다.

## 설치

SmartSafeHub 저장소를 사용하는 경우 최신 버전은 패키지 이름으로 설치하거나 업데이트합니다.

```bash
apk update
apk add --upgrade luci-app-smartsafehub
```

직접 빌드한 APK를 테스트 장치에 설치하는 경우에는 `/tmp`에 해당 APK만 복사한 뒤 실제 생성된 파일을 설치합니다.

```bash
apk add --allow-untrusted /tmp/luci-app-smartsafehub-*.apk
```

정확한 현재 버전은 `Makefile`의 `PKG_VERSION`과 `PKG_RELEASE`, 또는 설치된 장치의 `apk info luci-app-smartsafehub`로 확인합니다.

패키지의 postinst는 설치/업그레이드 후 updater, firmware, maintenance 등 항상 동작해야 하는 SmartSafeHub 서비스를 명시적으로 enable하고 LuCI 메뉴 캐시를 지운 뒤 `/usr/libexec/smartsafehub-rpcd-reconcile`을 실행합니다. helper는 먼저 `rpcd reload`로 기존 세션 영향을 최소화하고, reload가 끝난 뒤 핵심 `smartsafehub` ubus 객체가 실제로 다시 등록됐는지 최대 5회 확인하고 연속 2회 확인될 때만 정상으로 판정합니다. 실기기에서 확인된 것처럼 reload 명령 자체는 성공했는데 핵심 객체가 사라진 경우에만 `rpcd restart`로 자동 복구하며, restart 후에도 객체가 돌아오지 않으면 실패 상태를 남깁니다. 수동 설치 환경에서 같은 검증·복구를 실행하려면 아래 명령을 사용할 수 있습니다.

```bash
rm -f /tmp/luci-indexcache
/bin/sh /usr/libexec/smartsafehub-rpcd-reconcile
ubus list | grep smartsafehub
ubus call smartsafehub system_root_password_status '{}'
```

## 설치 후 확인

### 패키지와 정적 자산

```bash
apk info -e luci-app-smartsafehub
ls -lh /www/luci-static/smartsafehub/app.js
ls -lh /www/luci-static/smartsafehub/app.css
```

### rpcd 등록

```bash
ubus -v list smartsafehub
ubus call smartsafehub status '{}'
```

LAN/DHCP 구현은 기존 관리 RPC의 가용성을 보호하기 위해 별도 `smartsafehub_network` ubus 객체로 격리되어 있습니다. LAN 화면은 같은 `rpcd` 프로세스 안에서 다른 객체를 동기 프록시하지 않고 이 객체를 직접 호출합니다. `smartsafehub_network`는 자체적으로 관리자 비밀번호 설정 상태를 확인하며 LuCI ACL도 LAN 읽기/쓰기 메서드에만 제한됩니다.

```bash
ubus -v list smartsafehub_network
ubus call smartsafehub_network lan_settings '{}'
```

`smartsafehub_network`가 로드되지 않더라도 `smartsafehub` 객체와 로그인/대시보드 RPC는 계속 동작해야 합니다. LAN 구현 파일은 기존 경로인 `smartsafehub/network-management.uc`를 그대로 사용해 패치/체크아웃 과정의 파일명 이동에 의존하지 않습니다.

주요 읽기 기능:

```bash
ubus call smartsafehub_network lan_settings '{}'
ubus call smartsafehub wifi_summary '{}'
ubus call smartsafehub connected_devices '{}'
ubus call smartsafehub system_time_settings '{}'
ubus call safeshield status '{}'
ubus call safeshield config '{}'
ubus call safeshield rules_list '{}'
```

SmartSafeHub의 핵심 `smartsafehub` RPC는 장치·Wi-Fi·시스템·로컬 Health 기능을 소유하고, LAN/DHCP는 장애 격리를 위해 `smartsafehub_network` 객체가 소유합니다. Health 관련 RPC는 다음과 같습니다.

```text
health_status
health_run
health_reporter_update
```

`health_status`는 `/tmp/smartsafehub/health.json`과 Reporter 상태를 읽습니다. 최초 결과가 아직 없으면 rpcd를 막지 않도록 진단 helper를 분리된 프로세스로 시작하고 `확인 중` 상태를 즉시 반환합니다. `health_run`도 같은 방식으로 사용자의 `지금 진단`을 비동기로 시작하며 프런트엔드가 새 `generatedAt`이 기록될 때까지 짧게 재조회합니다. `health_reporter_update`는 최근 로컬 eligibility 상태를 확인한 뒤 opt-in 설정을 저장하며, 실제 Hub API는 라이선스/Trial 여부를 다시 검증해야 합니다.

Health helper의 awk 코드는 OpenWrt의 기본 awk뿐 아니라 GitHub Actions에서 사용하는 GNU awk에서도 실행 가능해야 합니다. GNU awk 내장 이름과 충돌할 수 있는 식별자를 `awk -v` 변수명으로 사용하지 않으며, `test-health.sh`가 이 호환성 계약을 회귀 검사합니다.

SafeShield 기능은 `luci-app-smartsafehub`가 별도 프록시를 만들지 않고 SafeShield 패키지가 제공하는 공식 ubus API를 직접 사용합니다.

```text
safeshield.status
safeshield.config
safeshield.set_enabled
safeshield.refresh
safeshield.rules_list
safeshield.rule_add
safeshield.rule_delete
safeshield.license_get
safeshield.license_update
```

`license_get`은 평문 라이선스 키를 반환하므로 브라우저의 일반 상태 조회에는 사용하지 않습니다. 사용자가 현재 키를 명시적으로 불러올 때 호출하며 LuCI ACL에서도 일반 read 권한과 분리합니다. 로컬 Health 진단, 진단 다운로드와 주기적 UI polling은 `safeshield.status`의 마스킹된 라이선스 정보만 사용합니다. 예외적으로 opt-in된 유료/Trial Health Reporter daemon은 실제 HTTPS 보고 직전에 서버 인증 헤더를 만들기 위해 평문 키를 일시적으로 조회하며, 키를 런타임 상태 파일이나 보고 payload에 기록하지 않습니다.

SafeShield `license_get`의 현재 응답 계약은 `{ "license": { "configured": true, "key": "..." } }` 형태이며 Health Reporter와 라이선스 상태 동기화 daemon은 필요한 순간에만 `license.key`를 메모리에서 읽습니다. 이전 개발 빌드의 최상위 `key` 응답은 Health Reporter 호환 fallback으로만 허용합니다.

### SmartSafeHub 라이선스 lifecycle

Hub 계정과 장치의 라이선스 연결 lifecycle은 SafeShield 엔진이 아니라 SmartSafeHub 관리 계층이 소유합니다. SafeShield는 계속해서 실제 키 저장소와 장치 identity의 authoritative source 역할만 담당합니다.

```text
사용자가 라이선스 등록/변경
  → smartsafehub.license_activate
  → mode 0600 private request에 키만 기록
  → detached /usr/libexec/smartsafehub-license activate 시작 후 RPC 즉시 반환
  → helper가 safeshield.status에서 authoritative device identity 조회
  → POST /api/v1/licenses/activate
  → 성공한 경우에만 safeshield.license_update

smartsafehub-license daemon
  → 기본 300초 주기
  → safeshield.license_get으로 현재 키를 일시 조회
  → safeshield.status에서 physical_fingerprint 조회
  → POST /api/v1/licenses/status
      ├─ device_action=none: 로컬 상태 유지
      ├─ device_action=clear_license: safeshield.license_update { license_key: "" }
      └─ 네트워크/API 실패: 오류만 기록하고 로컬 키 유지
```

`smartsafehub-license`는 `daemon`, `activate`, `status-sync`, `status` 명령을 독립 subcommand로 제공합니다. `license_activate` RPC 자체는 SafeShield를 동기 호출하지 않으며, 장치 identity와 profile 구성은 detached `activate` subcommand 안에서 수행합니다. 이는 현재는 작은 독립 procd 서비스로 장애 범위와 디버깅 경계를 유지하면서, 향후 주기적인 Hub 동기화 작업이 늘어나면 명령 경계를 그대로 `smartsafehub-agent license ...` 모듈로 옮길 수 있도록 하기 위한 구조입니다. updater처럼 장시간 설치·재부팅 상태 머신을 가지는 기능은 별도 서비스로 유지하는 것을 전제로 합니다.

daemon의 startup/check 대기는 foreground `sleep`이 아니라 interrupt 가능한 child wait로 처리합니다. SIGTERM/SIGINT를 받으면 대기 중인 sleep child를 깨우고 loop를 종료하므로 5분 상태 확인 주기 중에도 procd stop/restart가 오래 기다리지 않습니다. Hub 요청 자체는 10초 timeout을 사용하고 procd `term_timeout`은 15초로 두어, 요청 중 종료가 들어와도 정상 정리 시간을 확보한 뒤 강제 종료하도록 합니다.

런타임 상태는 `/tmp/smartsafehub/license.json`에 atomic write하며 평문 라이선스 키를 저장하지 않습니다. 명시적 활성화와 주기 `status-sync`가 겹치면 activation single-flight lock이 우선하며, status-sync는 활성화 결과를 덮어쓰지 않고 다음 주기까지 건너뜁니다. SafeShield의 `license_get` 자체가 실패한 경우는 미설정 상태로 오인하지 않고 `LICENSE_LOCAL_READ_FAILED`로 기록합니다.

운영 진단을 위해 상태 파일에는 `lastHttpStatus`, `lastActivationResult`, `lastActivationErrorCode`도 기록합니다. 정상 Hub JSON 응답은 현재 API 계약에 따라 HTTP 200으로 기록하며, `uclient-fetch`가 transport/HTTP 실패로 종료되어 실제 상태 코드를 신뢰할 수 없는 경우 `lastHttpStatus`는 `null`로 기록합니다. `lastActivationResult`와 `lastActivationErrorCode`는 이후의 주기 `status-sync`나 `unconfigured` 전환에서도 유지되어 마지막 명시적 activation 결과를 별도로 추적할 수 있습니다.

### 라이선스 셸 계약 테스트

`tests/test-license.sh`는 activate/status 동기화, stale activation lock 복구, activation 진단 필드 보존과 장기 sleep 중 SIGTERM 정상 종료를 검증합니다. 각 시나리오는 mock 환경을 명시적으로 초기화해 Linux `dash`와 macOS `/bin/sh`처럼 함수 앞 임시 환경 변수의 처리 차이가 있는 환경에서도 이전 실패 주기의 값이 다음 테스트에 누적되지 않도록 합니다.

## ucode 컴파일 검사

`smartsafehub` ubus 객체가 등록되지 않으면 진입점을 직접 컴파일합니다.

```bash
mkdir -p /tmp/smartsafehub
rm -f /tmp/smartsafehub/smartsafehub.ucb
ucode -c \
  -o /tmp/smartsafehub/smartsafehub.ucb \
  /usr/share/rpcd/ucode/smartsafehub.uc

echo "main compile exit=$?"

ucode -c \
  -o /tmp/smartsafehub/smartsafehub-network.ucb \
  /usr/share/rpcd/ucode/smartsafehub-network.uc

echo "lan compile exit=$?"
```

공개 `smartsafehub.uc`는 LAN 구현 모듈을 직접 import하지 않습니다. 따라서 LAN 전용 진입점의 컴파일/로드 오류가 기존 관리자 보안 상태 확인과 대시보드 진입까지 중단시키지 않아야 합니다.

정상 결과는 `main compile exit=0`, `lan compile exit=0`입니다. 실패하면 출력되는 모듈 파일과 줄 번호를 먼저 수정합니다. SmartSafeHub의 ucode 모듈에서 `export function` 선언은 일반 내부 함수와 달리 기존 모듈들과 동일하게 함수 본문 뒤를 `};`로 종료해야 합니다. `}`만 사용하면 다음 `export` 또는 파일 끝에서 `Expecting ';'` 컴파일 오류가 발생해 해당 ubus 객체가 등록되지 않습니다.

같은 종류의 문법 오류를 장치 설치 이후에 발견하지 않도록 Backend CI에서는 실제 ucode 컴파일을 필수 계약으로 실행합니다. CI는 OpenWrt 25.12에서 사용하는 ucode `2026.01.16~85922056` 계열의 source revision `8592205`를 host용으로 빌드한 뒤 `tests/test-ucode-syntax.sh`를 실행합니다. 이 테스트는 `smartsafehub.uc`, `smartsafehub-network.uc` 같은 모든 rpcd 최상위 진입점을 실제 `ucode -c`로 컴파일하므로 상대 import를 따라가는 과정에서 feature module의 문법 오류도 함께 잡습니다.

또한 `smartsafehub/` 아래의 모든 `.uc` 파일을 합성 모듈에서 직접 import해 현재 어느 진입점에서도 사용하지 않는 모듈까지 컴파일합니다. host compiler에는 OpenWrt 전용 `ubus`/`uci` 모듈이 없기 때문에 테스트 중 최소 stub을 module search path에 넣지만, 이 stub은 외부 모듈 이름 해석만 담당하며 SmartSafeHub 소스 자체와 상대 import는 실제 ucode parser/compiler가 검사합니다. 과거에 발생한 `export function ... }` 형태도 별도 negative regression으로 컴파일이 거부되는지 확인합니다.

로컬에 `ucode`가 설치되어 있으면 다음 명령으로 CI와 같은 소스 검사를 강제할 수 있습니다. `SMARTSAFEHUB_REQUIRE_UCODE=1`에서는 compiler가 없으면 skip하지 않고 실패합니다.

```bash
SMARTSAFEHUB_REQUIRE_UCODE=1 sh tests/test-ucode-syntax.sh
```

일반 로컬 ShellSpec 실행에서는 ucode가 설치되지 않은 환경의 개발 흐름을 막지 않기 위해 해당 검사만 skip할 수 있지만, GitHub Actions Backend job은 `SMARTSAFEHUB_REQUIRE_UCODE=1`을 고정하므로 실제 컴파일 없이 성공할 수 없습니다.

실제 ucode 컴파일은 `tests/test-ucode-syntax.sh`에서만 수행합니다. GitHub Actions에서 빌드한 host ucode에는 OpenWrt 런타임 전용 `ubus`, `uci`, `fs` 모듈이 포함되지 않으므로 `test-lan-settings.sh` 같은 기능별 계약 테스트에서 raw `ucode -c`를 직접 실행하면 정상 소스도 외부 모듈 import 해석 단계에서 실패할 수 있습니다. 전용 문법 테스트가 최소 stub과 module search path를 구성하고, 기능별 테스트는 소스 구조와 동작 계약만 검증하도록 역할을 분리합니다. 정적 검증은 이 원칙을 위반하는 raw compile 호출이 다른 테스트에 다시 추가되는 것도 차단합니다.

LAN 설정은 문법 검사만으로 실제 OpenWrt UCI 값의 타입 차이를 검출할 수 없으므로 `tests/test-lan-uci-runtime.sh`에서 별도 런타임 회귀 검사를 수행합니다. 이 테스트는 실제 장치에서 확인된 OpenWrt 25.12 형식인 `network.lan.ipaddr = [ "192.168.1.1/24" ]` fixture와 DHCP `start=100`, `limit=150`을 stub UCI cursor로 제공하고 실제 `network-management.uc`의 `read_lan_settings()`와 동일값 update를 실행합니다. CI에서는 주소가 `192.168.1.1/24`, DHCP 범위가 `192.168.1.100~249`로 해석되고 동일 설정이 `changed=false`로 판정되는지까지 확인합니다.

LAN 컴파일이 성공한 뒤에는 다음 명령으로 실제 객체와 메서드 등록을 확인합니다.

```bash
/etc/init.d/rpcd restart
sleep 2
ubus -v list smartsafehub_network
ubus call smartsafehub_network lan_settings '{}'
```

기존 핵심 RPC도 함께 확인하려면 다음을 실행합니다.

```bash
/etc/init.d/rpcd restart
sleep 2

logread | grep -Ei 'rpcd|ucode|smartsafehub' | tail -200
ubus -v list smartsafehub
```

## 진단 다운로드 확인

시스템 화면의 **진단 정보 다운로드**를 눌렀을 때 JSON 파일이 생성되어야 합니다. 현재 구현에는 `smartsafehub.system_diagnostics` RPC가 없습니다.

진단 생성 흐름은 다음과 같습니다.

```text
현재 시스템/Health 상태 재사용
  + smartsafehub.wifi_summary
  + safeshield.status
  → 브라우저에서 JSON 결합 및 다운로드
```

Wi-Fi 또는 SafeShield가 설치되지 않았거나 일시적으로 응답하지 않아도 진단 파일은 생성되며 해당 섹션은 사용 불가 기본값으로 기록됩니다. 로컬 Health 결과도 함께 포함됩니다. 진단 파일에는 비밀번호와 라이선스 키는 없지만 호스트명, WAN IPv4와 Wi-Fi SSID 같은 네트워크 식별 정보가 포함될 수 있으므로 외부 전달 전에 내용을 확인하세요.

오류가 발생하면 브라우저 개발자 도구의 Network 항목과 다음 로그를 함께 확인합니다.

```bash
logread | grep -Ei 'rpcd|ucode|smartsafehub|safeshield' | tail -200
```

## 프런트엔드 캐시 문제

패키지를 업그레이드했는데 이전 화면이 남으면 다음 순서로 확인합니다.

```bash
rm -f /tmp/luci-indexcache
/etc/init.d/uhttpd restart
```

브라우저에서는 강력 새로고침을 수행하거나 기존 SmartSafeHub 탭을 닫고 다시 접속합니다. 통합 진입 템플릿의 `app.js?v=...`와 Shadow DOM용 `app.css?v=...`에는 현재 패키지의 `PKG_VERSION-rPKG_RELEASE` 값이 사용되므로 패키지 릴리스 변경 시 브라우저 캐시가 함께 무효화됩니다.

## 배포 전 체크리스트

셸 계약 테스트는 stdout의 `PASS:`뿐 아니라 stderr가 비어 있는지도 확인합니다. ACL을 `jq`로 검증할 때 여러 배열을 `or`로 비교하는 식은 각 파이프 표현식을 괄호로 분리해, 파이프의 중간 배열이 다음 ACL 경로의 입력으로 전달되지 않도록 유지합니다.

Health 계약 테스트의 mock 환경은 각 시나리오를 subshell에서 실행하고 기본값을 매번 다시 설정합니다. macOS `/bin/sh`와 Linux `dash`처럼 함수 호출 앞 `VAR=value` 임시 대입의 복원 동작 차이가 다음 시나리오의 SafeShield/license mock 상태로 전파되지 않도록 하기 위한 테스트 격리 규칙입니다.

```bash
sh tests/test-lan-settings.sh
SMARTSAFEHUB_REQUIRE_UCODE=1 sh tests/test-ucode-syntax.sh
shellspec spec/contracts_spec.sh
```

```bash
cd frontend
npm ci
npm run typecheck
npm run build
cd ..
```

OpenWrt buildroot에서:

```bash
make package/luci-app-smartsafehub/clean
make package/luci-app-smartsafehub/compile V=s
```

실제 장치에서:

```bash
mkdir -p /tmp/smartsafehub
ucode -c -o /tmp/smartsafehub/smartsafehub.ucb /usr/share/rpcd/ucode/smartsafehub.uc
/etc/init.d/rpcd restart
ubus -v list smartsafehub
ubus call smartsafehub status '{}'
ubus call smartsafehub wifi_summary '{}'
ubus call smartsafehub connected_devices '{}'
ubus call smartsafehub system_time_settings '{}'
```

브라우저에서는 root 비밀번호가 없는 초기 상태의 강제 비밀번호 설정·재로그인, 홈, Wi-Fi 조회·변경, Wi-Fi reload 뒤 상태 재조회, 연결 기기, SafeShield 상태·갱신, 사용자 규칙, 진단 다운로드, 시간대 조회·변경과 현재 시간 표시, 메뉴 재진입 데이터 갱신, 다른 LuCI 화면 이동 뒤 폴링 종료, 자산 로드 실패 화면, 설정 메뉴의 LuCI 보조 진입점과 모바일 메뉴를 확인합니다. 재부팅과 실제 시간대 변경은 테스트 장치에서만 실행합니다.

생성된 `app.js` 계약 테스트는 minify 과정에서 변경될 수 있는 TypeScript 식별자 이름에 의존하지 않고, 사용자 동작에 필요한 값과 결과물이 실제 번들에 포함되었는지를 검증합니다.

## 버전 관리 원칙

- 사용자 기능 버전은 `PKG_VERSION`으로 관리합니다.
- 같은 기능 버전의 정식 배포 후 패키지 수정은 `PKG_RELEASE`를 올립니다.
- 정식 배포 전 개발 과정에서 사용한 임시 package revision은 배포 기준점에서 `r1`로 squash할 수 있으며, `CHANGELOG.md`에는 중간 revision을 별도 릴리스로 남기지 않습니다.
- `frontend/package.json`과 `frontend/package-lock.json`의 버전은 `PKG_VERSION`과 맞춥니다.
- 통합 진입 템플릿의 `data-asset-version`과 `app.js?v=` 버전은 `PKG_VERSION-rPKG_RELEASE`와 맞춥니다.
- 프런트엔드 build ID 상수는 별도로 두지 않습니다.
- 정식 배포 이력은 `CHANGELOG.md`에 기록합니다.
- README에는 현재 SmartSafeHub 릴리스 버전을 직접 기록하지 않습니다. 최신 버전은 `Makefile`과 배포 저장소를 기준으로 확인합니다.

현재 소스 트리의 패키지 버전은 다음 명령으로 확인할 수 있습니다.

```bash
awk -F':=' '
  /^PKG_VERSION:=/ { version=$2 }
  /^PKG_RELEASE:=/ { release=$2 }
  END { printf "%s-r%s\\n", version, release }
' Makefile
```

설치된 장치에서는 다음 명령으로 실제 설치 버전을 확인합니다.

```bash
apk info luci-app-smartsafehub
```

## 현재 제약

- Wi-Fi 화면은 각 radio에서 선택한 기본 LAN AP 하나만 관리합니다.
- 게스트 Wi-Fi, VLAN, mesh, 방화벽과 상세 패키지 설정은 기존 LuCI에서 관리합니다.
- LAN 화면은 기본 `network.lan`/`dhcp.lan`만 관리하며 다중 LAN, VLAN별 DHCP와 방화벽 zone 구성은 기존 LuCI에서 관리합니다.
- WAN/LAN 충돌 감지는 IPv4 기준이며 WAN 상태는 `network.interface.wan` 객체를 기준으로 합니다.
- SafeShield 기능은 별도 `safeshield` 패키지와 공식 ubus API 계약에 의존하며, SmartSafeHub는 SafeShield의 상태 파일이나 init script를 직접 다루지 않습니다.
- 프런트엔드 개발 서버만으로는 LuCI ACL과 실제 ubus 동작을 완전히 재현할 수 없습니다.
- ucode module 문법은 JavaScript·TypeScript와 차이가 있으므로 실제 `ucode -c` 검사가 필요합니다.

## 라이선스

이 프로젝트는 [GPL-3.0-or-later](LICENSE) 조건으로 배포됩니다.
