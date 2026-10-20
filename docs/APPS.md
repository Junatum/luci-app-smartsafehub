# SmartSafeHub Apps — 공유기 웹사이트

## 메뉴 및 현재 동작

- `System` 영역: `SmartSafeHub 계정 → Apps → 업데이트 → 설정`.
- 해시 URL: `#apps`. 모바일, 펼친 사이드바, 접힌 사이드바에서 동일한 메뉴를 사용합니다.
- 앱 화면을 열거나 새로고침할 때 **로컬** `smartsafehub.apps_catalog` RPC를 통해 Hub의 승인된 카탈로그를 조회합니다.
- Hub 패치의 조회 API: `GET /api/v1/app-store/catalog?schema=1&device_code=...&firmware_build_id=...&channel=stable`.
- 기기 식별과 펌웨어 빌드 ID는 공유기의 ROM 펌웨어 메타데이터(없으면 로컬 펌웨어 메타데이터)에서 읽습니다. 브라우저가 이 값을 지정할 수 없습니다.
- 응답에 다른 기기/빌드/채널이 들어 있거나 검증에 실패하면 앱을 표시하지 않습니다.
- 승인된 앱이 없어 빈 목록을 반환하는 경우에는 준비 안내가 표시됩니다. 서버 연결 실패와 구분됩니다.

## 배포 선행 조건

1. Hub에 앱 카탈로그 마이그레이션/API가 배포되어 있어야 합니다.
2. Hub에 현재 사용 중인 **정확한 펌웨어 빌드**가 게시되어 있어야 합니다.
3. Hub 관리자가 해당 펌웨어에 앱을 승인해야 목록에 나타납니다.
4. 공유기 메타데이터(`firmware.json`)에 `device_code`, `build_id`가 있어야 합니다.
5. 공유기에 `uclient-fetch`와 `jsonfilter`가 설치되고 Hub HTTPS 서버에 연결할 수 있어야 합니다.

## 보안 및 단계 구분

**이번 변경은 읽기 전용입니다.** 임의 APK 설치, 제거, 원격 명령 실행 기능이 포함되지 않습니다. 웹 브라우저에는 앱의 이름/설명/버전 등 표시 항목만 반환합니다. RPC 읽기 권한 외에 설치 권한은 추가하지 않습니다.

Hub에서 목록을 승인했다고 하더라도 **공유기 측 설치 권한을 부여한 것이 아닙니다**. 향후 설치기를 추가할 때에는 승인된 빌드/저장소/패키지 해시 검증, 직접/간접 의존성, 리소스 예산, DNS/방화벽 보호 및 복구 절차가 별도로 필요합니다. Phase 2의 IoT 및 로컬 AI 확장 기능은 APK 설치기와 분리된 실행 방식과 권한 모델을 사용해야 합니다.

## 로컬 테스트

```sh
sh tests/test-apps-contract.sh
sh tests/test-navigation-contract.sh
sh tests/test-ucode-imports.sh
# 프론트엔드 빌드 결과는 포함되지 않으므로 개발자 PC에서 확인
cd frontend && npm ci && npm run typecheck && npm run build
```
