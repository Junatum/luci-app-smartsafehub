# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; either version 3
# of the License, or (at your option) any later version.

include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-smartsafehub
PKG_VERSION:=0.2.15
PKG_RELEASE:=5

PKG_MAINTAINER:=Beomjun Kang <kals323@gmail.com>
PKG_LICENSE:=GPL-3.0-or-later
PKG_LICENSE_FILES:=LICENSE

LUCI_TITLE:=SmartSafeHub
LUCI_URL:=https://github.com/Junatum/luci-app-smartsafehub
LUCI_DESCRIPTION:=A modern, user-friendly OpenWrt management platform with Wi-Fi control, device management, system monitoring, and SafeShield DNS protection.
LUCI_DEPENDS:=+luci-base +rpcd-mod-ucode +ucode +ucode-mod-ubus +ucode-mod-fs +ucode-mod-uci +procd +uclient-fetch +jsonfilter +safeshield
LUCI_EXTRA_DEPENDS:=safeshield (>=0.3.23)
LUCI_PKGARCH:=all

define Package/luci-app-smartsafehub/conffiles
/etc/config/smartsafehub
endef

define Package/luci-app-smartsafehub/postinst
#!/bin/sh
if [ -z "$${IPKG_INSTROOT}" ]; then
	uci -q delete smartsafehub.firmware.check_enabled >/dev/null 2>&1 || true
	uci -q commit smartsafehub >/dev/null 2>&1 || true
	if [ -x /etc/init.d/smartsafehub-firmware ]; then
		/etc/init.d/smartsafehub-firmware enable
	fi
fi
exit 0
endef

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
