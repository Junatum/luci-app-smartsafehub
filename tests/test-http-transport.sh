#!/bin/sh
# SPDX-License-Identifier: GPL-3.0-or-later
set -eu
ROOT="$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)"
HTTP="$ROOT/root/usr/lib/smartsafehub/http.sh"
MAKEFILE="$ROOT/Makefile"
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }

# Every cloud/request/download path uses the same curl policy; no unchecked
# HTTP client or undocumented fallback may bypass it.
grep -Eq '^LUCI_DEPENDS:=.*[[:space:]]\+curl([[:space:]]|$)' "$MAKEFILE" || fail 'curl dependency missing'
for policy in '--disable' '--fail' '--location --max-redirs 0' '--proto' '--proto-redir' '--noproxy' '--write-out'; do
 grep -Fq -- "$policy" "$HTTP" || fail "HTTP policy flag missing: $policy"
done
if grep -R -E 'uclient-fetch|UCLIENT_FETCH_BIN|UCLIENT_BIN' "$ROOT/root/usr/libexec" "$ROOT/root/usr/lib/smartsafehub/http.sh" >/dev/null; then
 fail 'insecure legacy fetch client still shipped in a cloud/request helper'
fi
for file in device activity-sync apps apps-manager updater apps-metrics firmware health; do
 path="$ROOT/root/usr/libexec/smartsafehub-$file"
 grep -Fq 'ssh_http_request ' "$path" || fail "missing shared secure request: $file"
done
python3 "$ROOT/tests/support/http_transport_check.py" || exit 1
