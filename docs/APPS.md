# SmartSafeHub Apps — 공유기 웹사이트

## 메뉴 및 아키텍처

- `System` 영역: `SmartSafeHub 계정 → Apps → 업데이트 → 설정` / 해시 URL `#apps`.
- 앱 목록: `smartsafehub.apps_catalog` RPC → `/usr/libexec/smartsafehub-apps` → Hub 승인 카탈로그.
- 설치 상태: `smartsafehub.apps_status` RPC → 독립된 `smartsafehub-apps-manager`의 로컬 APK 상태와 설치 기록.
- 설치·제거: `smartsafehub.apps_install`, `smartsafehub.apps_remove` RPC. 앱 ID만 받으며, 실제 작업은 root 전용 백그라운드 매니저에서 진행합니다. 다른 앱 작업이 진행 중이면 거절합니다.
- Phase 2의 IoT/로컬 AI 설치기는 추후 `runtime`에 따라 별도 어댑터로 추가합니다. 현재는 `router + apk`만 가능하며 Hub의 패키지명·URL·명령을 브라우저가 보낼 수 없습니다.

## 설치를 활성화하기 위한 **필수 운영 조건**

현재 버전은 APK 엔진까지 구현했지만 **아무 OpenWrt 미러에서나 바로 설치하지 않습니다.**

1. Hub에 `store.patch`의 앱 카탈로그가 배포되고 펌웨어가 `device_code`와 `build_id`로 등록되어 있어야 합니다.
2. 관리자 승인이 특정 펌웨어 빌드, 채널, 패키지 아키텍처 및 **정확한 APK 버전과 SHA-256**에 대해 완료되어야 합니다.
3. 공유기에는 OpenWrt 공식 패키지 관리자(`apk`)와 필요한 시스템 의존성이 설치되어 있어야 합니다. SmartSafeHub가 사용하는 APK 서명 공개 키도 신뢰 저장소에 등록되어 있어야 합니다.
4. 설치기는 승인된 채널(`beta`/`stable`)과 공유기 아키텍처로 `https://repo.smartsafehub.com/<채널>/packages/<아키텍처>/smartsafehub/packages.adb`를 조회합니다. 이 인덱스를 새로 다운로드한 뒤 Hub 승인 SHA-256과 비교합니다. 펌웨어에 별도 인덱스 파일을 복사할 필요가 없습니다.
5. 실제 APK는 위 고정 도메인/경로에서 이름과 버전으로만 내려받아 SHA-256을 검증합니다. 임의 URL 입력이나 `--allow-untrusted`는 허용되지 않습니다.
6. `apk`, `sha256sum`, `start-stop-daemon`, `jsonfilter`, `uclient-fetch`가 공유기에 있어야 하며 RAM/overlay 용량이 충분해야 합니다.

**주의:** Stable/Beta 저장소는 게시 때 변경됩니다. 다른 패키지를 갱신해서 `packages.adb` 해시가 변경되면 기존 승인 정보가 갱신되기 전까지 설치를 **차단**합니다. Hub에서 새 인덱스를 검토·승인해야 하며 이는 의도한 안전 동작입니다.

**의존성 주의:** APK가 간접적으로 설치하는 OpenWrt 기본 저장소의 라이브러리/커널 모듈은 전체 개별 해시가 이 승인에 포함된 것은 아닙니다. 실제 펌웨어의 커널 ABI·의존성 및 서명 키를 확인하고 기기별로 검증해야 합니다. 승인된 패키지 파일과 인덱스가 해시로 검증돼도, 그것만으로 모든 간접 의존성이 완전히 고정되었다는 뜻은 아닙니다.

OpenWrt 25.12의 패키지 인덱스는 `packages.adb` 형식일 수 있으며, 이전의 `APKINDEX.tar.gz` 형식이라고 가정하면 안 됩니다.

## 동작과 제한

- 설치 시작 시 **Hub에서 승인 목록을 다시 조회**합니다. 인터넷이 끊겼거나 승인이 취소된 앱은 신규 설치가 불가능합니다.
- SmartSafeHub 저장소의 서명된 인덱스를 APK 관리자로 조회하고, 승인된 아카이브를 직접 내려받아 SHA-256을 확인합니다. `apk add --simulate` 후 `apk add`를 실행합니다. `--allow-untrusted`, 전체 `apk upgrade`, 사용자 입력 셸 명령은 사용하지 않습니다.
- 핵심 시스템 패키지 및 SafeShield 관련 패키지는 앱 패키지 대상에서 제외합니다. 의존성 해석과 설치 스크립트 실행은 APK가 담당하므로, 앱마다 실제 환경 테스트가 필요합니다.
- `/etc/smartsafehub/apps-installed/<앱 ID>`에 **Apps가 직접 설치한 패키지 소유권**을 기록합니다. 기존 Software/SSH로 설치된 동일 패키지는 Apps에서 제거하지 않습니다.
- 승인 철회된 앱도 Apps가 설치한 기록이 있다면 `제공이 중단된 앱` 목록에서 제거할 수 있습니다.
- 펌웨어 변경으로 앱 바이너리가 사라진 경우 승인된 앱을 재설치할 수 있지만, 펌웨어 업그레이드가 이전 APK를 자동 복원하지는 않습니다.
- 설치 작업 중 공유기를 재부팅하거나 전원을 끊지 말아야 합니다. APK 실패 후 트랜잭션의 수동 복구가 필요할 수 있으며 **완전한 자동 롤백은 제공하지 않습니다**.
- 이번 릴리스에서는 승인된 새 앱 설치와 제거까지만 제공하며, 기존 앱의 인플레이스 버전 업데이트는 지원하지 않습니다.

## 장애 확인

- `E21`: 서버에서 새 카탈로그를 조회하지 못함 / `E22`: 승인 앱 없음 / `E23`, `E24`: 런타임 또는 기기 아키텍처 불일치.
- `E25`: SmartSafeHub 배포 인덱스 다운로드 실패 또는 SHA 불일치 / `E26`: 리소스 부족 / `E27`: 승인 패키지 정보 검증 실패.
- `E29`: 설치된 외부 패키지와 충돌 / `E31`~`E34`: APK 내려받기, 파일 검증 또는 시뮬레이션 실패 / `E35`: 실제 APK 설치 실패.
- `E41`: Apps가 설치한 앱이 아니라서 제거 불가 / `E44`, `E45`: 제거 시뮬레이션·실행 실패.
- `/tmp/smartsafehub/apps-operation.state`: 최근 작업 상태 및 코드 (재부팅 시 초기화).
- `/etc/smartsafehub/apps-installed/`: Apps가 설치한 패키지 소유권 기록 (설치 바이너리는 포함하지 않음).
- `apk` 실행 로그는 작업용 임시 디렉터리에만 보관되며 완료 시 정리되므로, 운영 시 별도 시스템 로그/진단 확보가 필요합니다.

## 테스트

```sh
sh tests/test-apps-contract.sh
sh tests/test-apps-manager.sh
sh tests/test-ucode-imports.sh
# 개발 환경에서 (프론트엔드 빌드 결과는 패치 미포함)
cd frontend && npm ci && npm run typecheck && npm run build
```
