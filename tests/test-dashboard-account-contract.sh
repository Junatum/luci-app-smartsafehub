#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
app=frontend/src/app/App.tsx
home=frontend/src/pages/HomePage.tsx
hook=frontend/src/hooks/useDashboardAccountStatus.ts
api=frontend/src/api/smartsafehub.ts

grep -Fq "useDashboardAccountStatus(route === 'home')" "$app" || { echo 'FAIL: dashboard-only registration state missing' >&2; exit 1; }
grep -Fq 'accountRegistered={dashboardAccountRegistered}' "$app" || { echo 'FAIL: missing account state prop' >&2; exit 1; }
grep -Fq 'accountRegistered === false' "$home" || { echo 'FAIL: missing explicit disconnected guard' >&2; exit 1; }
grep -Fq 'href="#account"' "$home" || { echo 'FAIL: missing account page link' >&2; exit 1; }
grep -Fq 'fetchDeviceRegistrationStatus()' "$hook" || { echo 'FAIL: local status fetch missing' >&2; exit 1; }
if grep -Eq 'refreshDeviceRegistrationStatus|requestDevicePairingCode|setInterval' "$hook"; then
  echo 'FAIL: dashboard must not synchronize with Hub or poll repeatedly' >&2
  exit 1
fi
grep -Fq "'device_registration_status'" "$api" || { echo 'FAIL: local RPC missing' >&2; exit 1; }
echo 'PASS: dashboard account banner uses router-local disconnected status only'
