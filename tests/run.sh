#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-or-later
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"

fail() {
	echo "FAIL: $*" >&2
	exit 1
}

command -v jq >/dev/null 2>&1 || fail 'jq is required to validate JSON files'

for script in \
	root/etc/init.d/smartsafehub-updater \
	root/usr/libexec/smartsafehub-updater \
	tests/run.sh \
	tests/test-package-contract.sh \
	tests/test-navigation-contract.sh \
	tests/test-document-ui-contract.sh \
	tests/test-login-ui-contract.sh \
	tests/test-dashboard-ui-contract.sh \
	tests/test-network-input-contract.sh \
	tests/test-update-ui-contract.sh \
	tests/test-settings-ui-contract.sh \
	tests/test-rpc-contract.sh \
	tests/test-rules-ui-contract.sh \
	tests/test-safeshield-page-contract.sh \
	tests/test-statistics-ui-contract.sh \
	tests/test-ucode-imports.sh \
	tests/test-updater.sh; do
	sh -n "$ROOT_DIR/$script"
done

echo 'shell syntax tests: ok'

find \
	"$ROOT_DIR/root/usr/share/rpcd/acl.d" \
	"$ROOT_DIR/root/usr/share/luci/menu.d" \
	-type f -name '*.json' -print |
	sort |
	while IFS= read -r json_file; do
		jq empty "$json_file"
	done

echo 'JSON validation tests: ok'

sh "$ROOT_DIR/tests/test-package-contract.sh"
sh "$ROOT_DIR/tests/test-navigation-contract.sh"
sh "$ROOT_DIR/tests/test-document-ui-contract.sh"
sh "$ROOT_DIR/tests/test-login-ui-contract.sh"
sh "$ROOT_DIR/tests/test-dashboard-ui-contract.sh"
sh "$ROOT_DIR/tests/test-network-input-contract.sh"
sh "$ROOT_DIR/tests/test-update-ui-contract.sh"
sh "$ROOT_DIR/tests/test-settings-ui-contract.sh"
sh "$ROOT_DIR/tests/test-ucode-imports.sh"
sh "$ROOT_DIR/tests/test-rpc-contract.sh"
sh "$ROOT_DIR/tests/test-rules-ui-contract.sh"
sh "$ROOT_DIR/tests/test-safeshield-page-contract.sh"
sh "$ROOT_DIR/tests/test-statistics-ui-contract.sh"
sh "$ROOT_DIR/tests/test-updater.sh"
echo 'Done'
