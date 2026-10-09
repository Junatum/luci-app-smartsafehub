#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-or-later
# Guard the isolation boundaries even when no OpenWrt runtime is available.
set -eu
cd "$(dirname "$0")/.."
API=root/usr/share/rpcd/ucode/smartsafehub.uc
BACKEND=root/usr/share/rpcd/ucode/smartsafehub/guest-wifi.uc
WIFI=root/usr/share/rpcd/ucode/smartsafehub/wifi.uc
ACL=root/usr/share/rpcd/acl.d/luci-app-smartsafehub.json
PAGE=frontend/src/components/GuestWifiCard.tsx

# Guest actions require the same administrator authentication and lock as primary Wi-Fi.
grep -q 'wifi_guest_update: {' "$API"
grep -q 'return update_guest_wifi(request);' "$API"
grep -q 'require_root_password(function(request)' "$API"
grep -q '"wifi_guest_update"' "$ACL"
grep -q "const LOCK = '/tmp/smartsafehub/wifi-update.lock'" "$BACKEND"

# Cannot take over or change existing LAN AP; 2.4 GHz radio is discovered.
grep -q "section?.\['.name'\] == 'ssh_guest'" "$WIFI"
grep -q "network.band == '2g'" "$BACKEND"
grep -Fq -- '-Guest' "$BACKEND"
grep -q "guest_default_ssid" "$BACKEND"
grep -q "'bridge'" "$BACKEND"
grep -q "bridge_empty: '1'" "$BACKEND"
grep -q "device: two_g.device" "$BACKEND"

# Enforce an actual L3 separation and prevent guest connections to the router,
# internal LAN, upstream private networks, or other guest clients.
grep -q "input: 'REJECT', output: 'ACCEPT', forward: 'REJECT'" "$BACKEND"
grep -q "src: ZONE, dest: 'wan'" "$BACKEND"
grep -q "proto: \[ 'tcp', 'udp' \], dest_port: '53'" "$BACKEND"
grep -q "proto: 'udp', dest_port: '67'" "$BACKEND"
grep -q "isolate: '1'" "$BACKEND"
grep -q "dhcpv6: 'disabled', ra: 'disabled', ndp: 'disabled'" "$BACKEND"
grep -q "family: 'ipv6'" "$BACKEND"
for net in 10.0.0.0/8 172.16.0.0/12 192.168.0.0/16 100.64.0.0/10 169.254.0.0/16; do
  grep -q "$net" "$BACKEND"
done

# Only enable guest AP after network, dnsmasq, firewall setup and commit succeed.
grep -q "disabled: '1'" "$BACKEND"
grep -q "\[ '/etc/init.d/firewall', 'restart' \]" "$BACKEND"
grep -q "ctx.set('wireless', GUEST, 'disabled', '0')" "$BACKEND"
grep -q 'restore_files(snapshot)' "$BACKEND"
grep -q 'GUEST_WIFI_SUBNET_CONFLICT' "$BACKEND"
grep -q 'GUEST_WIFI_CONFLICT' "$BACKEND"
grep -q "passwordConfigured:" "$BACKEND"
if grep -q 'password: key' "$BACKEND"; then echo 'FAIL: guest password is leaked'; exit 1; fi

grep -q '게스트 Wi-Fi 사용' "$PAGE"
grep -q '게스트 전용 비밀번호를 입력' "$PAGE"
grep -q 'onUpdateGuest={wifi.updateGuest}' frontend/src/app/App.tsx
grep -q 'updateGuestWifi' frontend/src/hooks/useWifi.ts

echo 'guest Wi-Fi security and UI contract: PASS'
