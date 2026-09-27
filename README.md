# SmartSafeHub LuCI 애플리케이션

[![Lint](https://github.com/Junatum/luci-app-smartsafehub/actions/workflows/ci.yml/badge.svg)](https://github.com/Junatum/luci-app-smartsafehub/actions/workflows/ci.yml)
![OpenWrt](https://img.shields.io/badge/OpenWrt-Compatible-blue)
![License](https://img.shields.io/github/license/Junatum/luci-app-smartsafehub?label=License)

SmartSafeHub는 OpenWrt 지원 공유기에서 장치 상태, Wi-Fi, 연결 기기, 네트워크 설정과 SafeShield DNS 보호 기능을 일반 사용자 중심의 화면에서 관리하기 위한 LuCI 애플리케이션입니다.

- OpenWrt: **25.12 버전 이상**
- 백엔드: rpcd ucode 모듈
- 프런트엔드: Preact, TypeScript, Vite, Tailwind CSS
- SafeShield: **safeshield (>= 0.3.24)**
- 라이선스: **GPL-3.0-or-later**

변경 내역은 [CHANGELOG.md](CHANGELOG.md)를 참고하세요.

## 패키지 버전

아래 표는 SmartSafeHub 관련 패키지가 Stable 및 Beta 채널에 현재 배포되어 있는 버전을 보여줍니다.

| 패키지 | Stable | Beta |
| --- | --- | --- |
| SmartSafeHub | [![Stable SmartSafeHub](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Frepo.smartsafehub.com%2Fstable%2Fversions.json&query=%24.packages%5B%22luci-app-smartsafehub%22%5D&label=&color=brightgreen&cacheSeconds=300)](https://repo.smartsafehub.com/stable/versions.json) | [![Beta SmartSafeHub](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Frepo.smartsafehub.com%2Fbeta%2Fversions.json&query=%24.packages%5B%22luci-app-smartsafehub%22%5D&label=&color=orange&cacheSeconds=300)](https://repo.smartsafehub.com/beta/versions.json) |
| SafeShield | [![Stable SafeShield](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Frepo.smartsafehub.com%2Fstable%2Fversions.json&query=%24.packages%5B%22safeshield%22%5D&label=&color=brightgreen&cacheSeconds=300)](https://repo.smartsafehub.com/stable/versions.json) | [![Beta SafeShield](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Frepo.smartsafehub.com%2Fbeta%2Fversions.json&query=%24.packages%5B%22safeshield%22%5D&label=&color=orange&cacheSeconds=300)](https://repo.smartsafehub.com/beta/versions.json) |
| LuCI SafeShield | [![Stable LuCI SafeShield](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Frepo.smartsafehub.com%2Fstable%2Fversions.json&query=%24.packages%5B%22luci-app-safeshield%22%5D&label=&color=brightgreen&cacheSeconds=300)](https://repo.smartsafehub.com/stable/versions.json) | [![Beta LuCI SafeShield](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Frepo.smartsafehub.com%2Fbeta%2Fversions.json&query=%24.packages%5B%22luci-app-safeshield%22%5D&label=&color=orange&cacheSeconds=300)](https://repo.smartsafehub.com/beta/versions.json) |

## 주요 기능

- **반응형 UI**: 데스크톱과 모바일, 라이트/다크 모드를 지원합니다.
- **장치 대시보드**: 시스템 상태, WAN, 리소스 사용량, 최근 활동과 진단 상태를 한 화면에서 확인합니다.
- **네트워크 관리**: LAN/DHCP 설정, WAN/LAN 대역 충돌 감지와 안전한 대역 추천을 제공합니다.
- **Wi-Fi 관리**: SSID, 사용 여부와 WPA2/WPA3 보안 설정을 관리하고 실패 시 설정을 롤백합니다.
- **연결 기기**: DHCP, ARP와 무선 정보를 결합해 현재 연결된 기기를 보여줍니다.
- **SafeShield 통합**: DNS 보호 상태, 차단 통계, 사용자 Allow/Block 규칙과 차단 목록 갱신을 관리합니다.
- **업데이트 관리**: SmartSafeHub 관리 소프트웨어와 펌웨어 업데이트를 확인하고 적용합니다.
- **장치 진단**: 로컬 진단, 진단 정보 다운로드와 사용자가 동의한 원격 Health Reporter를 제공합니다.
- **최근 활동**: 인터넷, 보호, 업데이트, 라이선스와 진단 상태 변화를 로컬 이벤트 타임라인으로 정규화합니다.
- **IPTV Beta**: SK Broadband와 LG U+ 환경을 위한 IGMP Proxy/Snooping 구성을 제공합니다.

기능별 동작과 현재 제약은 [docs/FEATURES.md](docs/FEATURES.md)에서 확인할 수 있습니다.

## 빠른 시작

SmartSafeHub 패키지 저장소를 사용하는 장치에서는 다음과 같이 설치하거나 업데이트합니다.

```bash
apk update
apk add --upgrade luci-app-smartsafehub
```

로컬 프런트엔드 개발은 테스트 공유기를 지정한 Vite 개발 서버를 사용합니다.

```bash
cd frontend
SMARTSAFEHUB_DEV_ROUTER=http://192.168.1.1 npm run dev
```

상세 설치·운영 절차는 [docs/OPERATIONS.md](docs/OPERATIONS.md), 개발 환경·빌드·검증 절차는 [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)를 참고하세요.

## 문서

| 문서 | 내용 |
| --- | --- |
| [FEATURES.md](docs/FEATURES.md) | 기능별 상세 동작, UI 정책, 성능·안정성 설계와 현재 제약 |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | 프런트엔드, rpcd, 데이터 흐름과 보안 경계 |
| [DEVELOPMENT.md](docs/DEVELOPMENT.md) | 로컬 개발, 저장소 구조, 빌드, ucode 검사, 배포 전 검증과 버전 관리 |
| [OPERATIONS.md](docs/OPERATIONS.md) | 설치, 설치 후 확인, 라이선스 동기화, 진단과 트러블슈팅 |
| [STATISTICS_TESTING.md](docs/STATISTICS_TESTING.md) | 저사양 장비를 포함한 통계 기능 검증 절차 |
| [CHANGELOG.md](CHANGELOG.md) | 릴리스별 변경 내역 |

## 라이선스

이 프로젝트는 [GPL-3.0-or-later](LICENSE) 조건으로 배포됩니다.
