# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; either version 3
# of the License, or (at your option) any later version.

include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-smartsafehub
PKG_VERSION:=0.2.0
PKG_RELEASE:=9

PKG_MAINTAINER:=Beomjun Kang
PKG_LICENSE:=GPL-3.0-or-later
PKG_LICENSE_FILES:=LICENSE

LUCI_TITLE:=SmartSafeHub device application
LUCI_DEPENDS:=+luci-base +rpcd-mod-ucode +ucode +ucode-mod-ubus +ucode-mod-fs +ucode-mod-uci +safeshield
LUCI_PKGARCH:=all

SMARTSAFEHUB_RPCD_SOURCE_DIR:=$(CURDIR)/root/usr/share/rpcd/ucode/smartsafehub

# luci.mk copies htdocs/ and root/ into the package build directory. This hook
# validates the checked-in runtime assets and rpcd module contract before the
# package is assembled.
define Build/Prepare/luci-app-smartsafehub
	@sh $(CURDIR)/scripts/check-rpcd-imports.sh \
		$(CURDIR)/root/usr/share/rpcd/ucode/smartsafehub.uc \
		$(SMARTSAFEHUB_RPCD_SOURCE_DIR)
	@test -s $(CURDIR)/root/www/luci-static/smartsafehub/app.js || \
		( echo "ERROR: SmartSafeHub frontend is not built: app.js" >&2; false )
	@test -s $(CURDIR)/root/www/luci-static/smartsafehub/app.css || \
		( echo "ERROR: SmartSafeHub frontend is not built: app.css" >&2; false )
	@if grep -Fq "system_diagnostics" \
		$(CURDIR)/root/www/luci-static/smartsafehub/app.js; then \
		echo "ERROR: SmartSafeHub frontend bundle is stale; run npm run build" >&2; \
		false; \
	fi
	@if grep -Eq "safeshield_(set_enabled|refresh|rules_list|rule_add|rule_delete)" \
		$(CURDIR)/root/www/luci-static/smartsafehub/app.js; then \
		echo "ERROR: SmartSafeHub frontend bundle still uses obsolete SafeShield proxy RPCs; run npm run build" >&2; \
		false; \
	fi
	@if ! grep -Fq "Applying local rules to DNS" \
		$(CURDIR)/root/www/luci-static/smartsafehub/app.js; then \
		echo "ERROR: SmartSafeHub frontend bundle is stale; rebuild the SafeShield local-rule fast apply integration" >&2; \
		false; \
	fi
	@test -s $(CURDIR)/htdocs/luci-static/resources/view/smartsafehub/app.js || \
		( echo "ERROR: SmartSafeHub LuCI loader is missing" >&2; false )
	@grep -Fq "const ASSET_VERSION = '$(PKG_VERSION)-r$(PKG_RELEASE)';" \
		$(CURDIR)/htdocs/luci-static/resources/view/smartsafehub/app.js || \
		( echo "ERROR: SmartSafeHub asset version must match $(PKG_VERSION)-r$(PKG_RELEASE)" >&2; false )
	@test -s $(CURDIR)/root/usr/share/rpcd/acl.d/luci-app-smartsafehub.json || \
		( echo "ERROR: SmartSafeHub rpcd ACL is missing" >&2; false )
	@test -s $(CURDIR)/root/usr/share/luci/menu.d/luci-app-smartsafehub.json || \
		( echo "ERROR: SmartSafeHub LuCI menu entry is missing" >&2; false )
	@test -s $(CURDIR)/root/usr/share/ucode/luci/template/smartsafehub/login.ut || \
		( echo "ERROR: SmartSafeHub Preact login template is missing" >&2; false )
	@grep -Fq "smartsafehub-login-root" $(CURDIR)/root/www/luci-static/smartsafehub/app.js || \
		( echo "ERROR: SmartSafeHub frontend bundle is missing the Preact login entry; run npm run build" >&2; false )
	@grep -Fq "Welcome back" $(CURDIR)/root/www/luci-static/smartsafehub/app.js || \
		( echo "ERROR: SmartSafeHub frontend bundle is stale; rebuild the Preact login page" >&2; false )
	@test ! -e $(SMARTSAFEHUB_RPCD_SOURCE_DIR)/entry.uc || \
		( echo "ERROR: obsolete smartsafehub/entry.uc must be removed" >&2; false )
endef

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
