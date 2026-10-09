#!/bin/sh
# Wi-Fi QR authentication and sensitive-data regression contract.
set -eu
cd "$(dirname "$0")/.."
grep -q 'wifi_qr: {' root/usr/share/rpcd/ucode/smartsafehub.uc
grep -q 'return read_wifi_qr(request)' root/usr/share/rpcd/ucode/smartsafehub.uc
grep -q 'require_root_password(function(request)' root/usr/share/rpcd/ucode/smartsafehub.uc
grep -q 'wifi_is_managed_section(ctx, section_name, device)' root/usr/share/rpcd/ucode/smartsafehub/wifi-management.uc
grep -q 'passwordConfigured: length(key) > 0' root/usr/share/rpcd/ucode/smartsafehub/wifi.uc
if grep -q 'password: key' root/usr/share/rpcd/ucode/smartsafehub/wifi.uc; then echo 'FAIL: wifi summary leaks password'; exit 1; fi
grep -q 'wifi_qr' root/usr/share/rpcd/acl.d/luci-app-smartsafehub.json
grep -q 'QR 코드 보기' frontend/src/pages/WifiPage.tsx
grep -q 'TextEncoder' frontend/src/utils/qrMatrix.ts
printf 'wifi QR contract: PASS\n'
