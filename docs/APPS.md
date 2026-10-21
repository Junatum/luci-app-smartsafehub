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
3. 공유기에 해당 펌웨어용 **고정된 서명 APK 저장소**가 실제 APK 설정에 등록되어야 합니다. 앱과 간접 의존성도 동일한 검증된 빌드의 저장소에서 해결해야 합니다. 일반 SNAPSHOT의 가변 미러를 사용하는 것은 안전하지 않습니다.
4. 위 고정 저장소에서 확인한 실제 인덱스 파일(`packages.adb` 등)을 펌웨어 빌드 시 `/usr/share/smartsafehub/apps-packages.adb`에 배치하세요. 이 파일의 SHA-256을 Hub의 `StoreApproval.repository_index_sha256`에 기록합니다. 일치하지 않으면 설치를 차단합니다. **인덱스 파일만 복사한다고 APK 저장소가 설정되거나 서명 검증이 생기지는 않습니다.**
5. `apk`, `sha256sum`, `start-stop-daemon`, `jsonfilter`, `uclient-fetch`가 공유기에 있어야 하며 RAM/overlay 용량이 충분해야 합니다.

**중요:** 복사한 인덱스 SHA-256 검사는 관리자가 준비한 파일과 Hub 승인값의 일치 여부만 판단합니다. 설치기가 APK의 활성 저장소가 반드시 같은 스냅샷임을 독립적으로 증명하지는 않습니다. 직접 요청하는 APK 파일은 별도로 SHA-256을 검사하고, APK의 기본 서명 검증은 끄지 않습니다. 간접 의존성의 버전·해시 고정 및 실기기 안전성을 보장하려면 배포 담당자가 **불변 저장소를 제공·유지하고 의존성까지 검증**해야 합니다. 이 운영 체계가 없는 기기에서는 설치를 활성화하면 안 됩니다.

OpenWrt 25.12의 패키지 인덱스는 `packages.adb` 형식일 수 있으며, 이전의 `APKINDEX.tar.gz` 형식이라고 가정하면 안 됩니다.

## 동작과 제한

- 설치 시작 시 **Hub에서 승인 목록을 다시 조회**합니다. 인터넷이 끊겼거나 승인이 취소된 앱은 신규 설치가 불가능합니다.
- 앱의 특정 APK 아카이브를 내려받아 SHA-256을 확인하고 `apk add --simulate` 후 `apk add`를 실행합니다. `--allow-untrusted`, 전체 `apk upgrade`, 사용자 입력 셸 명령은 사용하지 않습니다.
- 핵심 시스템 패키지 및 SafeShield 관련 패키지는 앱 패키지 대상에서 제외합니다. 의존성 해석과 설치 스크립트 실행은 APK가 담당하므로, 앱마다 실제 환경 테스트가 필요합니다.
- `/etc/smartsafehub/apps-installed/<앱 ID>`에 **Apps가 직접 설치한 패키지 소유권**을 기록합니다. 기존 Software/SSH로 설치된 동일 패키지는 Apps에서 제거하지 않습니다.
- 승인 철회된 앱도 Apps가 설치한 기록이 있다면 `제공이 중단된 앱` 목록에서 제거할 수 있습니다.
- 펌웨어 변경으로 앱 바이너리가 사라진 경우 승인된 앱을 재설치할 수 있지만, 펌웨어 업그레이드가 이전 APK를 자동 복원하지는 않습니다.
- 설치 작업 중 공유기를 재부팅하거나 전원을 끊지 말아야 합니다. APK 실패 후 트랜잭션의 수동 복구가 필요할 수 있으며 **완전한 자동 롤백은 제공하지 않습니다**.
- 이번 릴리스에서는 승인된 새 앱 설치와 제거까지만 제공하며, 기존 앱의 인플레이스 버전 업데이트는 지원하지 않습니다.

## 장애 확인

- `E21`: 서버에서 새 카탈로그를 조회하지 못함 / `E22`: 승인 앱 없음 / `E23`, `E24`: 런타임 또는 기기 아키텍처 불일치.
- `E25`: 고정 저장소 인덱스 누락 또는 SHA 불일치 / `E26`: 리소스 부족 / `E27`: 승인 패키지 정보 검증 실패.
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
