# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; either version 3
# of the License, or (at your option) any later version.

include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-smartsafehub
PKG_VERSION:=0.2.0
PKG_RELEASE:=10

PKG_MAINTAINER:=Beomjun Kang
PKG_LICENSE:=GPL-3.0-or-later
PKG_LICENSE_FILES:=LICENSE

LUCI_TITLE:=SmartSafeHub device application
LUCI_DEPENDS:=+luci-base +rpcd-mod-ucode +ucode +ucode-mod-ubus +ucode-mod-fs +ucode-mod-uci +safeshield
LUCI_PKGARCH:=all

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
