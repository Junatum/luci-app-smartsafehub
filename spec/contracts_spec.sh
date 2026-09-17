# SPDX-License-Identifier: GPL-3.0-or-later

Describe 'SmartSafeHub 셸 계약 테스트'
  It '셸 문법과 JSON 유효성을 검증한다'
    When run command sh "$SHELLSPEC_PROJECT_ROOT/tests/test-static-validation.sh"
    The status should be success
    The output should start with 'PASS:'
    The error should be blank
  End

  It '패키지 계약을 검증한다'
    When run command sh "$SHELLSPEC_PROJECT_ROOT/tests/test-package-contract.sh"
    The status should be success
    The output should start with 'PASS:'
    The error should be blank
  End

  It '내비게이션 계약을 검증한다'
    When run command sh "$SHELLSPEC_PROJECT_ROOT/tests/test-navigation-contract.sh"
    The status should be success
    The output should start with 'PASS:'
    The error should be blank
  End

  It '문서 UI 계약을 검증한다'
    When run command sh "$SHELLSPEC_PROJECT_ROOT/tests/test-document-ui-contract.sh"
    The status should be success
    The output should start with 'PASS:'
    The error should be blank
  End

  It '로그인 UI 계약을 검증한다'
    When run command sh "$SHELLSPEC_PROJECT_ROOT/tests/test-login-ui-contract.sh"
    The status should be success
    The output should start with 'PASS:'
    The error should be blank
  End

  It '초기 관리자 비밀번호 설정 계약을 검증한다'
    When run command sh "$SHELLSPEC_PROJECT_ROOT/tests/test-initial-password-setup.sh"
    The status should be success
    The output should start with 'PASS:'
    The error should be blank
  End

  It '대시보드 UI 계약을 검증한다'
    When run command sh "$SHELLSPEC_PROJECT_ROOT/tests/test-dashboard-ui-contract.sh"
    The status should be success
    The output should start with 'PASS:'
    The error should be blank
  End

  It '네트워크 입력 계약을 검증한다'
    When run command sh "$SHELLSPEC_PROJECT_ROOT/tests/test-network-input-contract.sh"
    The status should be success
    The output should start with 'PASS:'
    The error should be blank
  End

  It 'LAN/DHCP 설정과 subnet 충돌 방지 계약을 검증한다'
    When run command sh "$SHELLSPEC_PROJECT_ROOT/tests/test-lan-settings.sh"
    The status should be success
    The output should start with 'PASS:'
    The error should be blank
  End

  It 'OpenWrt 25.12 LAN UCI list/CIDR 런타임 호환성을 검증한다'
    When run command sh "$SHELLSPEC_PROJECT_ROOT/tests/test-lan-uci-runtime.sh"
    The status should be success
    The output should start with 'PASS:'
    The error should be blank
  End

  It '업데이트 UI 계약을 검증한다'
    When run command sh "$SHELLSPEC_PROJECT_ROOT/tests/test-update-ui-contract.sh"
    The status should be success
    The output should start with 'PASS:'
    The error should be blank
  End

  It '새로고침과 세션 안전 회귀 계약을 검증한다'
    When run command sh "$SHELLSPEC_PROJECT_ROOT/tests/test-reload-safety.sh"
    The status should be success
    The output should start with 'PASS:'
    The error should be blank
  End

  It '설정 UI 계약을 검증한다'
    When run command sh "$SHELLSPEC_PROJECT_ROOT/tests/test-settings-ui-contract.sh"
    The status should be success
    The output should start with 'PASS:'
    The error should be blank
  End

  It '시스템 시간대 계약을 검증한다'
    When run command sh "$SHELLSPEC_PROJECT_ROOT/tests/test-system-time-contract.sh"
    The status should be success
    The output should start with 'PASS:'
    The error should be blank
  End

  It '예약 재부팅 계약을 검증한다'
    When run command sh "$SHELLSPEC_PROJECT_ROOT/tests/test-scheduled-reboot.sh"
    The status should be success
    The output should start with 'PASS:'
    The error should be blank
  End

  It '로컬 진단과 원격 상태 보고 계약을 검증한다'
    When run command sh "$SHELLSPEC_PROJECT_ROOT/tests/test-health.sh"
    The status should be success
    The output should start with 'PASS:'
    The error should be blank
  End

  It '설정 백업과 복원 계약을 검증한다'
    When run command sh "$SHELLSPEC_PROJECT_ROOT/tests/test-backup-restore.sh"
    The status should be success
    The output should start with 'PASS:'
    The error should be blank
  End

  It '모든 rpcd ucode 진입점과 모듈의 실제 컴파일을 검증한다'
    When run command sh "$SHELLSPEC_PROJECT_ROOT/tests/test-ucode-syntax.sh"
    The status should be success
    The output should start with 'PASS:'
    The error should be blank
  End

  It 'ucode import 계약을 검증한다'
    When run command sh "$SHELLSPEC_PROJECT_ROOT/tests/test-ucode-imports.sh"
    The status should be success
    The output should start with 'PASS:'
    The error should be blank
  End

  It 'RPC 계약을 검증한다'
    When run command sh "$SHELLSPEC_PROJECT_ROOT/tests/test-rpc-contract.sh"
    The status should be success
    The output should start with 'PASS:'
    The error should be blank
  End

  It '규칙 UI 계약을 검증한다'
    When run command sh "$SHELLSPEC_PROJECT_ROOT/tests/test-rules-ui-contract.sh"
    The status should be success
    The output should start with 'PASS:'
    The error should be blank
  End

  It 'SafeShield 페이지 계약을 검증한다'
    When run command sh "$SHELLSPEC_PROJECT_ROOT/tests/test-safeshield-page-contract.sh"
    The status should be success
    The output should start with 'PASS:'
    The error should be blank
  End

  It '보호 통계 UI 계약을 검증한다'
    When run command sh "$SHELLSPEC_PROJECT_ROOT/tests/test-statistics-ui-contract.sh"
    The status should be success
    The output should start with 'PASS:'
    The error should be blank
  End

  It '관리 소프트웨어 업데이트 계약을 검증한다'
    When run command sh "$SHELLSPEC_PROJECT_ROOT/tests/test-updater.sh"
    The status should be success
    The output should start with 'PASS:'
    The error should be blank
  End

  It '펌웨어 업데이트 계약을 검증한다'
    When run command sh "$SHELLSPEC_PROJECT_ROOT/tests/test-firmware-updater.sh"
    The status should be success
    The output should start with 'PASS:'
    The error should be blank
  End
End
