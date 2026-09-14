#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-or-later
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"

fail() {
	printf 'FAIL: %s\n' "$*" >&2
	exit 1
}

command -v jq >/dev/null 2>&1 || fail 'jq is required to validate JSON files'

for script in \
	root/etc/init.d/smartsafehub-updater \
	root/etc/init.d/smartsafehub-firmware \
	root/usr/libexec/smartsafehub-updater \
	root/usr/libexec/smartsafehub-firmware \
	spec/contracts_spec.sh \
	tests/test-static-validation.sh \
	tests/test-package-contract.sh \
	tests/test-navigation-contract.sh \
	tests/test-document-ui-contract.sh \
	tests/test-login-ui-contract.sh \
	tests/test-dashboard-ui-contract.sh \
	tests/test-network-input-contract.sh \
	tests/test-update-ui-contract.sh \
	tests/test-reload-safety.sh \
	tests/test-settings-ui-contract.sh \
	tests/test-system-time-contract.sh \
	tests/test-rpc-contract.sh \
	tests/test-rules-ui-contract.sh \
	tests/test-safeshield-page-contract.sh \
	tests/test-statistics-ui-contract.sh \
	tests/test-ucode-imports.sh \
	tests/test-updater.sh \
	tests/test-firmware-updater.sh; do
	sh -n "$ROOT_DIR/$script"
done

find \
	"$ROOT_DIR/root/usr/share/rpcd/acl.d" \
	"$ROOT_DIR/root/usr/share/luci/menu.d" \
	-type f -name '*.json' -print |
	sort |
	while IFS= read -r json_file; do
		jq empty "$json_file"
	done

printf 'PASS: shell syntax and JSON files are valid\n'
