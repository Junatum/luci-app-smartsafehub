# SmartSafeHub LuCI 애플리케이션

SmartSafeHub는 OpenWrt 공유기에서 장치 상태, 기본 Wi-Fi, 연결된 기기와 SafeShield DNS 보호 기능을 일반 사용자 중심의 화면에서 관리하기 위한 LuCI 애플리케이션입니다.

현재 정식 배포 버전은 **`0.2.0-r4`**입니다.

- 애플리케이션 버전: `0.2.0`
- OpenWrt 패키지 릴리스: `4`
- 프런트엔드: Preact, TypeScript, Vite, Tailwind CSS
- 백엔드: rpcd ucode 모듈
- 라이선스: GPL-3.0-or-later

변경 내역은 [CHANGELOG.md](CHANGELOG.md), 내부 구조와 데이터 흐름은 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)를 참고하세요.

## 주요 기능

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
- 갱신 데몬, dnsmasq와 DNS 런타임 상태 표시
- 라이선스, 플랜, 아티팩트와 차단 목록 통계 표시
- 사용자 허용 목록과 차단 목록 관리
- 규칙 정규화, 중복·충돌 방지, 잠금과 개수 제한
- 규칙 변경 후 가능한 경우 SafeShield 갱신 요청

### 업데이트 및 시스템

- 현재 펌웨어, 실행 시간, 메모리와 부하 표시
- OpenWrt의 검증된 펌웨어 업그레이드·백업·복원 화면으로 이동
- 장치, Wi-Fi와 SafeShield 상태를 JSON 진단 파일로 다운로드
- 진단 파일에 Wi-Fi 비밀번호와 SafeShield 라이선스 키를 포함하지 않음
- 명시적인 확인 절차가 포함된 공유기 재부팅
- 기존 LuCI 고급 시스템 설정과 시스템 로그로 이동

진단 파일은 시스템 화면에 이미 로드된 상태를 재사용하고 Wi-Fi와 SafeShield 상세 정보만 병렬로 조회합니다. 선택적 상세 조회 하나가 실패해도 다운로드 전체를 중단하지 않습니다.

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
- 연결 기기 조회는 `network.wireless`에 station 정보가 없을 때만 hostapd를 추가 호출합니다.
- Wi-Fi 변경 검증은 UCI 설정을 기준으로 수행해 불필요한 런타임 전체 조회를 피합니다.
- LuCI DOM 감시는 프레임 단위로 합치며 SmartSafeHub 화면을 벗어나면 해제합니다.
- SafeShield, 연결 기기와 진단 수집은 일부 소스 실패를 전체 기능 실패로 확대하지 않습니다.

## 지원 환경과 의존성

OpenWrt 패키지 의존성은 Makefile에 다음과 같이 선언합니다.

```text
luci-base
rpcd-mod-ucode
ucode
ucode-mod-ubus
ucode-mod-fs
ucode-mod-uci
safeshield
```

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
│   ├── src/
│   │   ├── api/
│   │   ├── app/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── styles/
│   │   ├── types/
│   │   └── utils/
│   ├── scripts/
│   ├── package.json
│   └── vite.config.ts
├── htdocs/
│   └── luci-static/resources/view/smartsafehub/app.js
├── root/
│   ├── usr/share/luci/menu.d/
│   ├── usr/share/rpcd/acl.d/
│   ├── usr/share/rpcd/ucode/
│   │   ├── smartsafehub.uc
│   │   └── smartsafehub/
│   │       ├── core.uc
│   │       ├── devices.uc
│   │       ├── safeshield.uc
│   │       ├── system.uc
│   │       ├── wifi-management.uc
│   │       └── wifi.uc
│   └── www/luci-static/smartsafehub/
└── scripts/
    └── check-rpcd-imports.sh
```

`root/www/luci-static/smartsafehub/app.js`와 `app.css`는 Vite가 만드는 배포 산출물입니다. 프런트엔드 소스를 수정한 뒤 반드시 다시 빌드해야 합니다.

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
npm run check:rpcd
npm run check:source
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

`npm run build`는 rpcd·소스 계약 검사, TypeScript 검사, Vite 빌드와 배포 산출물 검사를 순서대로 실행합니다.

## OpenWrt 패키지 빌드

패키지를 OpenWrt 소스 트리의 `package/luci-app-smartsafehub` 또는 사용하는 feed에 배치한 뒤 실행합니다.

```bash
make package/luci-app-smartsafehub/clean
make package/luci-app-smartsafehub/compile V=s
```

`Build/Prepare` 단계에서 다음 항목을 확인합니다.

- rpcd 진입점과 필수 기능 모듈 존재 여부
- ucode named import의 trailing comma 금지
- exported function의 `};` 종료 문법
- 10개 공개 RPC 메서드 등록 여부
- 제거된 `system_diagnostics` RPC가 소스와 번들에 다시 포함되지 않았는지 확인
- 빌드된 `app.js`, `app.css` 존재 여부
- LuCI 로더, 메뉴와 ACL 존재 여부
- 패키지 버전과 `ASSET_VERSION` 일치 여부

현재 LuCI 로더의 자산 버전은 다음과 같아야 합니다.

```js
const ASSET_VERSION = '0.2.0-r4';
```

별도의 프런트엔드 build ID는 사용하지 않습니다. 패키지 버전이 JavaScript와 CSS 캐시 무효화 키입니다.

## 설치

생성한 APK를 공유기에 복사한 뒤 설치합니다.

```bash
apk add --allow-untrusted /tmp/luci-app-smartsafehub-0.2.0-r4.apk
```

기존 버전 위에 설치할 때는 사용하는 저장소 정책에 맞춰 `apk upgrade` 또는 로컬 APK 설치를 수행합니다.

설치 후 LuCI와 rpcd 캐시를 갱신합니다.

```bash
rm -f /tmp/luci-indexcache
/etc/init.d/rpcd restart
/etc/init.d/uhttpd restart
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
ubus call smartsafehub safeshield_rules_list '{}'
ubus call safeshield status '{}'
```

공개 SmartSafeHub RPC는 총 10개입니다.

```text
status
connected_devices
wifi_summary
wifi_update
system_reboot
safeshield_set_enabled
safeshield_refresh
safeshield_rules_list
safeshield_rule_add
safeshield_rule_delete
```

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

Wi-Fi 또는 SafeShield가 설치되지 않았거나 일시적으로 응답하지 않아도 진단 파일은 생성되며 해당 섹션은 사용 불가 기본값으로 기록됩니다.

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

브라우저에서는 강력 새로고침을 수행하거나 기존 SmartSafeHub 탭을 닫고 다시 접속합니다. LuCI 로더는 `ASSET_VERSION`이 바뀌면 이전 module script와 mount 전역을 제거하고 Shadow DOM의 CSS URL도 새 버전으로 교체합니다.

## 배포 전 체크리스트

```bash
cd frontend
npm ci
npm run check:rpcd
npm run check:source
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
```

브라우저에서는 홈, Wi-Fi 조회·변경, 연결 기기, SafeShield 상태·갱신, 사용자 규칙, 진단 다운로드, 고급 설정 링크와 모바일 메뉴를 확인합니다. 재부팅은 테스트 장치에서만 실행합니다.

## 버전 관리 원칙

- 사용자 기능 버전은 `PKG_VERSION`으로 관리합니다.
- 같은 기능 버전의 OpenWrt 패키지 수정은 `PKG_RELEASE`를 올립니다.
- `frontend/package.json`과 `frontend/package-lock.json`의 버전은 `PKG_VERSION`과 맞춥니다.
- LuCI loader의 `ASSET_VERSION`은 `PKG_VERSION-rPKG_RELEASE`와 맞춥니다.
- 프런트엔드 build ID 상수는 별도로 두지 않습니다.
- 정식 배포 이력은 `CHANGELOG.md`에 기록합니다.

현재 값:

```makefile
PKG_VERSION:=0.2.0
PKG_RELEASE:=4
```

```js
const ASSET_VERSION = '0.2.0-r4';
```

## 현재 제약

- Wi-Fi 화면은 각 radio에서 선택한 기본 LAN AP 하나만 관리합니다.
- 게스트 Wi-Fi, VLAN, mesh, 방화벽과 상세 패키지 설정은 기존 LuCI에서 관리합니다.
- WAN 상태는 `network.interface.wan` 객체를 기준으로 합니다.
- SafeShield 기능은 별도 `safeshield` 패키지와 해당 ubus API, 상태 파일과 init script에 의존합니다.
- 프런트엔드 개발 서버만으로는 LuCI ACL과 실제 ubus 동작을 완전히 재현할 수 없습니다.
- ucode module 문법은 JavaScript·TypeScript와 차이가 있으므로 실제 `ucode -c` 검사가 필요합니다.

## 라이선스

이 프로젝트는 [GPL-3.0-or-later](LICENSE) 조건으로 배포됩니다.
