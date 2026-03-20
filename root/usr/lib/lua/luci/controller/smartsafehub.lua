module("luci.controller.smartsafehub", package.seeall)

local http = require "luci.http"
local jsonc = require "luci.jsonc"
local util = require "luci.util"
local sys = require "luci.sys"
local uci = require "luci.model.uci".cursor()

function index()
	entry({"admin", "smart", "api", "overview"}, call("action_overview")).dependent = false
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
	local leases = sys.exec("awk 'NR>1 {count++} END {print count+0}' /tmp/dhcp.leases 2>/dev/null")
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
