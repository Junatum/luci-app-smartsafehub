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
- 사이드바 토글은 패널 외곽선 없이 좌/우 방향만 표현하는 공통 chevron 아이콘을 사용하고, 두 상태 모두 동일한 아이콘 크기를 유지합니다.

### 로그인과 단일 진입 URL

- 공식 사용자 URL은 `/cgi-bin/luci/smartsafehub#home` 하나로 통일
- `/cgi-bin/luci/`도 first-child 규칙을 통해 인증이 필요 없는 SmartSafeHub Preact shell로 연결
- 공개 shell은 `auth: {}`로 항상 로드되므로 비로그인 상태에서도 LuCI dispatcher가 stock 로그인 화면이나 403을 먼저 반환하지 않음
- Preact가 보호된 `/cgi-bin/luci/smartsafehub/session` endpoint를 조회해 현재 LuCI cookie session을 확인
- 세션이 없으면 `LoginApp`, 유효한 세션 ID를 받으면 제품 `App`을 같은 Shadow DOM에서 렌더링
- 로그인 폼은 `luci_username` / `luci_password`를 보호된 session endpoint에 POST하며 실제 비밀번호 검증, cookie 발급과 추가 인증 정책은 LuCI dispatcher가 담당
- 로그인 성공 후 페이지 이동 없이 받은 session ID로 `/admin/ubus` bootstrap을 구성하고 같은 `/cgi-bin/luci/smartsafehub#home` URL에서 제품 화면으로 전환
- 예전 `/cgi-bin/luci/admin/smartsafehub` 경로도 공개 shell만 제공한 뒤 브라우저 주소를 공식 public URL로 정규화
- 비밀번호 표시/숨김, Caps Lock 안내, 모바일 안전 영역 지원
- 추가 인증 등 특수 LuCI 구성에서는 보호된 session endpoint의 기본 LuCI 로그인 화면으로 계속할 수 있는 fallback 제공

### 장치 대시보드

- 호스트명, 장치 모델과 보드 이름
- OpenWrt 배포판, 버전, 리비전과 커널
- 실제 부팅 시각, 실행 시간, 시스템 부하와 메모리 사용량
- WAN 연결 상태, 프로토콜과 IPv4 주소

### Wi-Fi 관리

- 무선 장치별 관리 대상 기본 LAN AP 표시
- SSID와 사용 여부 변경
- 개방형, WPA2-PSK, WPA2/WPA3 혼합, WPA3-SAE 보안 지원
- 비밀번호를 비워 두면 기존 값 유지
- 저장된 비밀번호를 화면이나 API에 다시 노출하지 않음
- 설정 적용 실패 시 이전 UCI 설정으로 자동 롤백
- 동시에 들어온 Wi-Fi 변경 요청은 잠금 파일로 직렬화
- reload 성공 뒤 지연 재조회로 실제 무선 런타임 상태 갱신
- 게스트, VLAN, mesh, 추가 BSS와 고급 무선 옵션은 기존 LuCI에서 관리

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
- 유료 플랜은 PRO/ULTIMATE 등급별 고대비 premium badge의 아이콘과 색상만으로 간결하게 강조하고, FREE 플랜은 `https://www.smartsafehub.com/pricing/` 요금제 안내 CTA를 보호 카드에 표시
- 로컬 DNS 요청·차단 수, 차단율과 최근 24시간 시간대별 차단 통계 표시
- DHCP 식별 정보를 이용한 기기별 DNS 요청·차단 수·차단율과 IP/MAC 표시
- 통계 RPC는 SafeShield 화면에서만 60초 간격으로 조회하며 숨겨진 브라우저 탭에서는 polling 중지
- 새 라이선스 키는 일반 텍스트 입력란에서 확인하며 등록·변경·제거 가능
- 현재 라이선스 키는 사용자가 `현재 키 불러오기`를 선택했을 때만 `safeshield.license_get`으로 평문 조회
- 사용자 허용 목록과 차단 목록 관리
- 규칙 저장과 유효성 검사는 SafeShield 공식 API가 담당
- 규칙 변경은 SafeShield 엔진의 cached-artifact local apply 경로로 즉시 반영
- full Hub refresh와의 직렬화, debounce, 중복 apply 억제는 SafeShield 엔진이 담당
- `safeshield.status.timestamps.last_local_apply`를 확인한 뒤 DNS 적용 완료로 표시

### 업데이트

- 하나의 업데이트 페이지에서 `펌웨어 업데이트`와 `관리 소프트웨어 업데이트`를 독립된 두 영역으로 관리하며, 펌웨어를 최상단의 주요 업데이트 영역으로 표시
- 관리 소프트웨어 업데이트는 하나의 카드 안에서 현재 상태와 자동 업데이트 설정을 데스크톱 2열·모바일 1열로 구성해 펌웨어 업데이트와의 범위를 시각적으로 구분
- `luci-app-smartsafehub`의 설치 버전과 저장소 업데이트 버전, 새 버전의 릴리즈 요약과 배포일 표시
- 홈 알림 배너와 업데이트 메뉴 badge로 설치 가능한 SmartSafeHub 애플리케이션 업데이트 표시
- 관리 소프트웨어는 1·6·12·24시간 자동 확인 주기와 지정 시각 자동 설치를 지원하고, 명시적 설정이 없는 신규 설치에서는 Stable 채널만 자동 설치를 기본 활성화하고 Beta 채널은 비활성화. 펌웨어는 별도의 업데이트 영역에서 확인하며 자동 설치하지 않음
- 데몬 시작 시 펌웨어는 10초 뒤, 관리 소프트웨어는 20초 뒤 최초 업데이트 확인을 수행합니다. 초기 네트워크가 아직 준비되지 않아 실패하면 60초 간격으로 최대 3회까지만 재시도하며, 이후에는 설정된 일반 확인 주기로 돌아갑니다. 관리 소프트웨어는 실패한 확인 시도 시각도 별도로 기록해 저장소 장애 중 `apk update`가 1분마다 반복되지 않도록 제한합니다.
- `luci-app-smartsafehub`를 실제 공유기에 설치하거나 업그레이드할 때마다 `smartsafehub-firmware` 서비스를 강제로 enable합니다. 기존 설치에서 신규 펌웨어 데몬의 `S96smartsafehub-firmware` 링크가 없던 경우도 다음 패키지 업데이트 시 자동 복구되며, 사용자가 이전에 수동으로 disable했더라도 패키지 업데이트 정책이 다시 활성화합니다.
- 기존 장치에 `auto_install` 값이 이미 저장되어 있으면 그 사용자의 선택을 그대로 유지
- 애플리케이션 자동 설치는 `luci-app-smartsafehub`만 대상으로 수행하며 `safeshield`의 최소 버전은 패키지 dependency로 함께 관리
- 로컬 APK 설치로 SmartSafeHub 또는 SafeShield가 `/etc/apk/world`의 identity hash에 고정된 경우 해당 두 항목만 일반 패키지 항목으로 정규화한 뒤 `apk upgrade luci-app-smartsafehub`를 실행합니다. identity pin 해제를 위해 `apk add --upgrade --latest`나 전역 `apk upgrade --available`을 사용하지 않아 관계없는 OpenWrt 패키지와 커널 모듈을 갱신 범위에 포함시키지 않습니다.
- 애플리케이션 릴리즈 노트는 같은 SmartSafeHub 저장소 channel의 `releases/luci-app-smartsafehub/index.json`에서 릴리즈 순서를 확인한 뒤 현재 설치 버전 이후의 `<version>.json`을 표시용으로 사용하며, 일부 또는 전체 조회 실패가 업데이트 설치를 막지 않음
- 펌웨어는 현재 패키지 저장소 channel과 장치 코드를 사용해 Hub의 `POST /api/v1/firmware/resolve` API에서 이 장치용 최신 Sysupgrade 배포를 확인
- 펌웨어 제품 버전은 `1.0.2` 같은 `X.Y.Z` 릴리즈 버전을 사용하며, 이미지 빌드 후 관리자가 검증·게시할 때 Hub의 `OpenWrtBuild.release_version`에 지정합니다. 공유기 이미지의 `firmware.json`에는 릴리즈 버전을 넣지 않고 immutable `build_id`만 유지합니다.
- 공유기는 `firmware.json`의 `build_id`를 resolve API에 보내고 Hub가 이를 현재 `release_version`으로 역조회합니다. 업데이트 가능 여부는 Hub가 현재/최신 릴리즈 버전을 비교해 결정하며, 공유기 UI는 `current_version`과 `release.version`을 제품 펌웨어 버전으로 표시하고 OpenWrt 버전과 build ID는 진단 정보로 구분합니다.
- 펌웨어 업데이트 확인은 비활성화 옵션 없이 항상 수행하며 기본 6시간 간격으로 최신 버전을 확인합니다. 기존 설치에 남아 있는 `smartsafehub.firmware.check_enabled` 값은 패키지 설치/업그레이드 시 정리합니다. 관리 소프트웨어의 업데이트 확인 여부는 기존처럼 사용자가 선택할 수 있으며, 실제 펌웨어 자동 설치는 제공하지 않고 사용자의 명시적인 최종 확인이 있어야 설치
- 온라인 펌웨어는 Hub가 제공한 파일 크기와 SHA-256을 검증한 뒤 OpenWrt `system.validate_firmware_image`와 `sysupgrade --test`를 모두 통과한 경우에만 설치 준비 완료로 표시
- `.bin` Sysupgrade 파일을 SmartSafeHub 화면에서 직접 수동 업로드할 수 있으며 온라인 이미지와 동일한 OpenWrt 검증 경로를 사용. 수동 설치는 온라인 펌웨어 업데이트와 같은 카드 안에서 접이식 보조 영역으로 제공하고, 브라우저 기본 file input 대신 파일명·크기와 선택/검증 동작을 일관되게 표시하는 전용 파일 선택 UI를 사용
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
- 시간대, Wi-Fi 보안 방식, 업데이트 확인 주기 등 드롭다운은 공통 inset 화살표 스타일을 사용해 화면마다 동일한 선택 컨트롤 여백과 정렬을 유지
- 시간대 변경 시 관리 소프트웨어 자동 설치의 날짜·시각 marker를 초기화하고 updater와 예약 재부팅 maintenance daemon을 다시 시작해 새 로컬 시간 기준으로 일정을 재계산
- 기본 비활성화된 예약 재부팅을 `매일` 또는 `매주` 주기, 요일과 로컬 시각으로 설정 가능. 기본 제안값은 매주 일요일 04:00
- 예약 재부팅 시 관리 소프트웨어 또는 펌웨어 작업이 진행 중이면 15분 단위로 최대 2시간 연기하고, 설치 준비된 펌웨어가 있는 경우에도 사용자의 pending 작업을 보존하기 위해 재부팅을 미룸
- 부팅 후 10분 이내에는 예약 재부팅을 건너뛰고 동일 예약 key의 중복 실행을 막아 재부팅 루프를 방지
- 장치, Wi-Fi와 SafeShield 상태를 JSON 진단 파일로 다운로드
- 진단 파일에 Wi-Fi 비밀번호와 SafeShield 라이선스 키를 포함하지 않음
- 진단 파일에는 호스트명, WAN IPv4와 Wi-Fi SSID가 포함될 수 있으므로 외부 전달 전 확인 필요
- OpenWrt 표준 `sysupgrade` 설정 백업을 SmartSafeHub에서 직접 다운로드하고, SmartSafeHub 또는 기본 LuCI에서 만든 `.tar.gz` 백업을 업로드·검증한 뒤 복원 가능
- 복원 archive는 16MB로 제한하고 gzip/tar 구조, `/etc/config` 포함 여부와 위험한 경로를 검사하며, 업데이트나 펌웨어 작업 중에는 복원을 차단
- 설정 복원 후 현재 펌웨어 이미지의 `firmware.json`을 기준으로 `current_build_id`를 다시 동기화하고 자동 재부팅해 이전 백업의 펌웨어 identity가 남지 않도록 처리
- 설정 백업에는 Wi-Fi 비밀번호, 관리자 설정, VPN 키와 라이선스 정보 등 민감한 설정이 포함될 수 있으므로 안전한 위치에 보관해야 하며, 펌웨어 이미지와 설치 패키지 자체는 포함하지 않음
- 명시적인 확인 절차가 포함된 공유기 재부팅
- 업데이트 관리는 전용 `업데이트` 메뉴에만 두고 설정 화면의 중복 업데이트 진입점은 제공하지 않음
- SmartSafeHub에서 아직 제공하지 않는 상세 시스템 기능과 원본 로그만 LuCI 고급 설정을 fallback으로 사용

시간대 설정은 로그와 통계뿐 아니라 관리 소프트웨어의 예약 설치 시각과 예약 재부팅 시각에도 영향을 줍니다. 저장 시 LuCI가 제공하는 시간대 목록에서 선택 값을 검증하고 IANA `zonename`과 POSIX `timezone`을 함께 기록합니다. 런타임 적용에 실패하면 이전 UCI 값을 복원합니다. NTP가 활성화되어 있으면 설정 화면에서 `지금 동기화`를 실행해 OpenWrt `sysntpd`를 즉시 다시 시작하고 잠시 뒤 장치 시간을 재조회할 수 있습니다.

예약 재부팅은 `/usr/libexec/smartsafehub-maintenance`와 `smartsafehub-maintenance` procd service가 담당합니다. 단순 cron reboot를 사용하지 않고 SmartSafeHub updater와 firmware updater의 상태/lock을 확인한 뒤 안전한 경우에만 재부팅합니다. 업데이트 작업과 겹치면 15분 뒤 재시도하며 최대 2시간이 지나도 안전하지 않으면 해당 예약은 건너뜁니다.

설정 백업 다운로드는 LuCI의 인증된 `/cgi-bin/cgi-backup` 경로를 통해 OpenWrt `sysupgrade --create-backup` 형식을 그대로 사용합니다. 복원은 `/cgi-bin/cgi-upload`로 전용 `/tmp/smartsafehub-config-backup.tar.gz` 경로에만 업로드한 뒤 `/usr/libexec/smartsafehub-backup`이 archive 구조와 업데이트 충돌 여부를 확인하고 `sysupgrade --restore-backup`을 실행합니다. 따라서 SmartSafeHub 백업은 기본 LuCI/CLI와 상호 호환되며 별도의 독자 백업 포맷을 만들지 않습니다.

진단 파일은 설정 화면에 이미 로드된 상태를 재사용하고 Wi-Fi와 SafeShield 상세 정보만 병렬로 조회합니다. 선택적 상세 조회 하나가 실패해도 다운로드 전체를 중단하지 않습니다.

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
safeshield (>= 0.3.23)
```

`LUCI_DEPENDS`의 `+safeshield`는 빌드 시 패키지 선택 관계를 유지하고, `EXTRA_DEPENDS:=safeshield (>= 0.3.20)`는 설치·업데이트 시 필요한 최소 SafeShield 버전을 강제합니다.

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
│   │   ├── pages/
│   │   ├── styles/
│   │   ├── types/
│   │   └── utils/
│   ├── package.json
│   └── vite.config.ts
├── root/
│   ├── etc/config/smartsafehub
│   ├── etc/init.d/smartsafehub-updater
│   ├── etc/init.d/smartsafehub-firmware
│   ├── etc/init.d/smartsafehub-maintenance
│   ├── usr/libexec/smartsafehub-updater
│   ├── usr/libexec/smartsafehub-firmware
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

### 개발 서버

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

설치 후 LuCI 메뉴 캐시를 지우고 rpcd plugin/ACL을 다시 읽습니다. 기존 LuCI 세션을 유지하기 위해 `restart` 대신 `reload`를 사용합니다.

```bash
rm -f /tmp/luci-indexcache
/etc/init.d/rpcd reload
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

주요 읽기 기능:

```bash
ubus call smartsafehub wifi_summary '{}'
ubus call smartsafehub connected_devices '{}'
ubus call smartsafehub system_time_settings '{}'
ubus call safeshield status '{}'
ubus call safeshield config '{}'
ubus call safeshield rules_list '{}'
```

SmartSafeHub 자체 RPC는 장치·Wi-Fi·시스템 기능만 소유하며 총 5개입니다.

```text
status
connected_devices
wifi_summary
wifi_update
system_reboot
```

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

`license_get`은 평문 라이선스 키를 반환하므로 일반 상태 조회에는 사용하지 않습니다. 사용자가 현재 키를 명시적으로 불러올 때만 호출하며, LuCI ACL에서도 일반 read 권한과 분리해 write 권한 그룹에 포함합니다. 진단 다운로드와 주기적 상태 polling은 `safeshield.status`의 마스킹된 라이선스 정보만 사용합니다.

## ucode 컴파일 검사

`smartsafehub` ubus 객체가 등록되지 않으면 진입점을 직접 컴파일합니다.

```bash
rm -f /tmp/smartsafehub.ucb
ucode -c \
  -o /tmp/smartsafehub.ucb \
  /usr/share/rpcd/ucode/smartsafehub.uc

echo "compile exit=$?"
```

정상 결과는 `compile exit=0`입니다. 실패하면 출력되는 모듈 파일과 줄 번호를 먼저 수정합니다.

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
현재 시스템 상태 재사용
  + smartsafehub.wifi_summary
  + safeshield.status
  → 브라우저에서 JSON 결합 및 다운로드
```

Wi-Fi 또는 SafeShield가 설치되지 않았거나 일시적으로 응답하지 않아도 진단 파일은 생성되며 해당 섹션은 사용 불가 기본값으로 기록됩니다. 진단 파일에는 비밀번호와 라이선스 키는 없지만 호스트명, WAN IPv4와 Wi-Fi SSID 같은 네트워크 식별 정보가 포함될 수 있으므로 외부 전달 전에 내용을 확인하세요.

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
ucode -c -o /tmp/smartsafehub.ucb /usr/share/rpcd/ucode/smartsafehub.uc
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
- WAN 상태는 `network.interface.wan` 객체를 기준으로 합니다.
- SafeShield 기능은 별도 `safeshield` 패키지와 공식 ubus API 계약에 의존하며, SmartSafeHub는 SafeShield의 상태 파일이나 init script를 직접 다루지 않습니다.
- 프런트엔드 개발 서버만으로는 LuCI ACL과 실제 ubus 동작을 완전히 재현할 수 없습니다.
- ucode module 문법은 JavaScript·TypeScript와 차이가 있으므로 실제 `ucode -c` 검사가 필요합니다.

## 라이선스

이 프로젝트는 [GPL-3.0-or-later](LICENSE) 조건으로 배포됩니다.
