module("luci.controller.smartsafehub", package.seeall)

local http = require "luci.http"
local jsonc = require "luci.jsonc"
local util = require "luci.util"
local sys = require "luci.sys"
local uci = require "luci.model.uci".cursor()

function index()
	entry({"admin", "smart", "api", "overview"}, call("action_overview")).dependent = false
	entry({"admin", "smart", "api", "devices"}, call("action_devices")).dependent = false
end

local function read_safeshield_enabled()
	local enabled = uci:get("safeshield", "config", "enabled")
	return enabled == "1"
end

local function read_safeshield_blocked_today()
	-- TODO: 실제 safeshield 통계 파일/ubus로 교체
	return 0
end

local function read_device_count()
	local leases = sys.exec("awk 'NR>0 {count++} END {print count+0}' /tmp/dhcp.leases 2>/dev/null")
	return tonumber((leases or ""):match("%d+")) or 0
end

local function read_wan_status()
	local s = util.ubus("network.interface", "status", { interface = "wan" }) or {}

	return {
		up = s.up or false,
		proto = s.proto or "unknown",
		ipaddr = s["ipv4-address"] and s["ipv4-address"][1] and s["ipv4-address"][1].address or nil
	}
end

local function parse_dhcp_leases()
	local devices = {}
	local lease_lines = sys.exec("cat /tmp/dhcp.leases 2>/dev/null") or ""

	for line in lease_lines:gmatch("[^\r\n]+") do
		local expires, mac, ipaddr, hostname, duid = line:match("^(%S+)%s+(%S+)%s+(%S+)%s+(%S+)%s*(%S*)")

		if mac and ipaddr then
			local item = {
				expires = tonumber(expires) or 0,
				mac = mac,
				ipaddr = ipaddr,
				hostname = hostname ~= "*" and hostname or nil,
				duid = duid ~= "" and duid or nil
			}

			table.insert(devices, item)
		end
	end

	table.sort(devices, function(a, b)
		local an = (a.hostname or a.ipaddr or a.mac):lower()
		local bn = (b.hostname or b.ipaddr or b.mac):lower()
		return an < bn
	end)

	return devices
end

function action_overview()
	local data = {
		internet = read_wan_status(),
		safeshield = {
			enabled = read_safeshield_enabled(),
			blocked_today = read_safeshield_blocked_today()
		},
		devices = {
			count = read_device_count()
		}
	}

	http.prepare_content("application/json")
	http.write(jsonc.stringify(data))
end

function action_devices()
	local data = {
		count = 0,
		devices = parse_dhcp_leases()
	}

	data.count = #data.devices

	http.prepare_content("application/json")
	http.write(jsonc.stringify(data))
end
