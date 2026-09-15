# SPDX-License-Identifier: GPL-3.0-or-later

Describe 'SmartSafeHub shell contract suite'
  It 'passes shell syntax and JSON validation'
    When run command sh "$SHELLSPEC_PROJECT_ROOT/tests/test-static-validation.sh"
    The status should be success
    The output should start with 'PASS:'
    The error should be blank
  End

  It 'passes package contract'
    When run command sh "$SHELLSPEC_PROJECT_ROOT/tests/test-package-contract.sh"
    The status should be success
    The output should start with 'PASS:'
    The error should be blank
  End

  It 'passes navigation contract'
    When run command sh "$SHELLSPEC_PROJECT_ROOT/tests/test-navigation-contract.sh"
    The status should be success
    The output should start with 'PASS:'
    The error should be blank
  End

  It 'passes document UI contract'
    When run command sh "$SHELLSPEC_PROJECT_ROOT/tests/test-document-ui-contract.sh"
    The status should be success
    The output should start with 'PASS:'
    The error should be blank
  End

  It 'passes login UI contract'
    When run command sh "$SHELLSPEC_PROJECT_ROOT/tests/test-login-ui-contract.sh"
    The status should be success
    The output should start with 'PASS:'
    The error should be blank
  End

  It 'passes dashboard UI contract'
    When run command sh "$SHELLSPEC_PROJECT_ROOT/tests/test-dashboard-ui-contract.sh"
    The status should be success
    The output should start with 'PASS:'
    The error should be blank
  End

  It 'passes network input contract'
    When run command sh "$SHELLSPEC_PROJECT_ROOT/tests/test-network-input-contract.sh"
    The status should be success
    The output should start with 'PASS:'
    The error should be blank
  End

  It 'passes update UI contract'
    When run command sh "$SHELLSPEC_PROJECT_ROOT/tests/test-update-ui-contract.sh"
    The status should be success
    The output should start with 'PASS:'
    The error should be blank
  End

  It 'passes reload and session safety regression contract'
    When run command sh "$SHELLSPEC_PROJECT_ROOT/tests/test-reload-safety.sh"
    The status should be success
    The output should start with 'PASS:'
    The error should be blank
  End

  It 'passes settings UI contract'
    When run command sh "$SHELLSPEC_PROJECT_ROOT/tests/test-settings-ui-contract.sh"
    The status should be success
    The output should start with 'PASS:'
    The error should be blank
  End

  It 'passes system timezone contract'
    When run command sh "$SHELLSPEC_PROJECT_ROOT/tests/test-system-time-contract.sh"
    The status should be success
    The output should start with 'PASS:'
    The error should be blank
  End

  It 'passes scheduled reboot contract'
    When run command sh "$SHELLSPEC_PROJECT_ROOT/tests/test-scheduled-reboot.sh"
    The status should be success
    The output should start with 'PASS:'
    The error should be blank
  End

  It 'passes configuration backup and restore contract'
    When run command sh "$SHELLSPEC_PROJECT_ROOT/tests/test-backup-restore.sh"
    The status should be success
    The output should start with 'PASS:'
    The error should be blank
  End

  It 'passes ucode import contract'
    When run command sh "$SHELLSPEC_PROJECT_ROOT/tests/test-ucode-imports.sh"
    The status should be success
    The output should start with 'PASS:'
    The error should be blank
  End

  It 'passes RPC contract'
    When run command sh "$SHELLSPEC_PROJECT_ROOT/tests/test-rpc-contract.sh"
    The status should be success
    The output should start with 'PASS:'
    The error should be blank
  End

  It 'passes rules UI contract'
    When run command sh "$SHELLSPEC_PROJECT_ROOT/tests/test-rules-ui-contract.sh"
    The status should be success
    The output should start with 'PASS:'
    The error should be blank
  End

  It 'passes SafeShield page contract'
    When run command sh "$SHELLSPEC_PROJECT_ROOT/tests/test-safeshield-page-contract.sh"
    The status should be success
    The output should start with 'PASS:'
    The error should be blank
  End

  It 'passes statistics UI contract'
    When run command sh "$SHELLSPEC_PROJECT_ROOT/tests/test-statistics-ui-contract.sh"
    The status should be success
    The output should start with 'PASS:'
    The error should be blank
  End

  It 'passes updater contract'
    When run command sh "$SHELLSPEC_PROJECT_ROOT/tests/test-updater.sh"
    The status should be success
    The output should start with 'PASS:'
    The error should be blank
  End

  It 'passes firmware updater contract'
    When run command sh "$SHELLSPEC_PROJECT_ROOT/tests/test-firmware-updater.sh"
    The status should be success
    The output should start with 'PASS:'
    The error should be blank
  End
End
