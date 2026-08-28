# SmartSafeHub LuCI 애플리케이션

SmartSafeHub는 OpenWrt 공유기에서 장치 상태, 기본 Wi-Fi, 연결된 기기와 SafeShield DNS 보호 기능을 일반 사용자 중심의 화면에서 관리하기 위한 LuCI 애플리케이션입니다.

현재 정식 배포 버전은 **`0.2.1-r1`**입니다.

- 애플리케이션 버전: `0.2.1`
- OpenWrt 패키지 릴리스: `1`
- 프런트엔드: Preact, TypeScript, Vite, Tailwind CSS
- 백엔드: rpcd ucode 모듈
- 라이선스: GPL-3.0-or-later

변경 내역은 [CHANGELOG.md](CHANGELOG.md), 내부 구조와 데이터 흐름은 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)를 참고하세요.

## 주요 기능

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
- 갱신 데몬, dnsmasq와 DNS 런타임 상태 표시
- 라이선스, 플랜, 아티팩트와 차단 목록 통계 표시
- 새 라이선스 키는 일반 텍스트 입력란에서 확인하며 등록·변경·제거 가능
- 현재 라이선스 키는 사용자가 `현재 키 불러오기`를 선택했을 때만 `safeshield.license_get`으로 평문 조회
- 사용자 허용 목록과 차단 목록 관리
- 규칙 저장과 유효성 검사는 SafeShield 공식 API가 담당
- 규칙 변경은 SafeShield 엔진의 cached-artifact local apply 경로로 즉시 반영
- full Hub refresh와의 직렬화, debounce, 중복 apply 억제는 SafeShield 엔진이 담당
- `safeshield.status.timestamps.last_local_apply`를 확인한 뒤 DNS 적용 완료로 표시

### 업데이트 및 시스템

- `luci-app-smartsafehub`의 설치 버전과 저장소 업데이트 버전 표시
- 홈 알림 배너와 업데이트 메뉴 badge로 설치 가능한 업데이트 표시
- 1·6·12·24시간 자동 확인 주기와 지정 시각 자동 설치 설정
- 자동 설치는 `luci-app-smartsafehub`만 대상으로 수행하며 `safeshield >= 0.3.10`은 패키지 dependency로 함께 관리
- 현재 펌웨어, 실행 시간, 메모리와 부하 표시
- OpenWrt의 검증된 펌웨어 업그레이드·백업·복원 화면으로 이동
- 장치, Wi-Fi와 SafeShield 상태를 JSON 진단 파일로 다운로드
- 진단 파일에 Wi-Fi 비밀번호와 SafeShield 라이선스 키를 포함하지 않음
- 진단 파일에는 호스트명, WAN IPv4와 Wi-Fi SSID가 포함될 수 있으므로 외부 전달 전 확인 필요
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
- 메뉴를 다시 열면 해당 리소스를 새로 조회하고 홈·시스템 상태는 활성 상태에서 60초마다 갱신합니다.
- RPC는 기본 20초, Wi-Fi 변경은 35초 후 중단하며 JSON-RPC ID·결과·상태 코드 형식을 검증합니다.
- 연결 기기 조회는 `network.wireless`에 station 정보가 없을 때만 hostapd를 추가 호출합니다.
- Wi-Fi 변경 검증은 UCI 설정을 기준으로 수행해 불필요한 런타임 전체 조회를 피합니다.
- SmartSafeHub는 공개 shell의 단일 Preact lifecycle을 사용하며 legacy LuCI view loader나 DOM observer를 두지 않습니다.
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
procd
safeshield (>= 0.3.10)
```

`LUCI_DEPENDS`의 `+safeshield`는 빌드 시 패키지 선택 관계를 유지하고, `EXTRA_DEPENDS:=safeshield (>= 0.3.10)`는 설치·업데이트 시 필요한 최소 SafeShield 버전을 강제합니다.

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
│   ├── usr/libexec/smartsafehub-updater
│   ├── usr/share/luci/menu.d/
│   ├── usr/share/rpcd/acl.d/
│   ├── usr/share/rpcd/ucode/
│   │   ├── smartsafehub.uc
│   │   └── smartsafehub/
│   │       ├── core.uc
│   │       ├── devices.uc
│   │       ├── system.uc
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

별도의 프런트엔드 build ID는 사용하지 않습니다. 패키지 버전 `0.2.1-r1`이 JavaScript와 CSS 캐시 무효화 키입니다.

## 설치

생성한 APK를 공유기에 복사한 뒤 설치합니다.

```bash
apk add --allow-untrusted /tmp/luci-app-smartsafehub-0.2.1-r1.apk
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

브라우저에서는 강력 새로고침을 수행하거나 기존 SmartSafeHub 탭을 닫고 다시 접속합니다. 통합 진입 템플릿은 `app.js?v=0.2.1-r1`와 Shadow DOM용 `app.css?v=0.2.1-r1`를 사용하므로 패키지 릴리스 변경 시 브라우저 캐시가 함께 무효화됩니다.

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
```

브라우저에서는 홈, Wi-Fi 조회·변경, Wi-Fi reload 뒤 상태 재조회, 연결 기기, SafeShield 상태·갱신, 사용자 규칙, 진단 다운로드, 메뉴 재진입 데이터 갱신, 다른 LuCI 화면 이동 뒤 폴링 종료, 자산 로드 실패 화면, 고급 설정 링크와 모바일 메뉴를 확인합니다. 재부팅은 테스트 장치에서만 실행합니다.

## 버전 관리 원칙

- 사용자 기능 버전은 `PKG_VERSION`으로 관리합니다.
- 같은 기능 버전의 정식 배포 후 패키지 수정은 `PKG_RELEASE`를 올립니다.
- 정식 배포 전 개발 과정에서 사용한 임시 package revision은 배포 기준점에서 `r1`로 squash할 수 있으며, `CHANGELOG.md`에는 중간 revision을 별도 릴리스로 남기지 않습니다.
- `frontend/package.json`과 `frontend/package-lock.json`의 버전은 `PKG_VERSION`과 맞춥니다.
- 통합 진입 템플릿의 `data-asset-version`과 `app.js?v=` 버전은 `PKG_VERSION-rPKG_RELEASE`와 맞춥니다.
- 프런트엔드 build ID 상수는 별도로 두지 않습니다.
- 정식 배포 이력은 `CHANGELOG.md`에 기록합니다.

현재 값:

```makefile
PKG_VERSION:=0.2.1
PKG_RELEASE:=1
```

```js
data-asset-version="0.2.1-r1"
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
