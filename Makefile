# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; either version 3
# of the License, or (at your option) any later version.

include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-smartsafehub
PKG_VERSION:=0.2.9
PKG_RELEASE:=1

PKG_MAINTAINER:=Beomjun Kang <kals323@gmail.com>
PKG_LICENSE:=GPL-3.0-or-later
PKG_LICENSE_FILES:=LICENSE

LUCI_TITLE:=SmartSafeHub
LUCI_URL:=https://github.com/Junatum/luci-app-smartsafehub
LUCI_DESCRIPTION:=A modern, user-friendly OpenWrt management platform with Wi-Fi control, device management, system monitoring, and SafeShield DNS protection.
LUCI_DEPENDS:=+luci-base +rpcd-mod-ucode +ucode +ucode-mod-ubus +ucode-mod-fs +ucode-mod-uci +procd +uclient-fetch +safeshield
LUCI_EXTRA_DEPENDS:=safeshield (>=0.3.19)
LUCI_PKGARCH:=all

define Package/luci-app-smartsafehub/conffiles
/etc/config/smartsafehub
endef

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
