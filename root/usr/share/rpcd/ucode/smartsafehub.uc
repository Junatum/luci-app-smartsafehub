// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';

import { read_connected_devices } from './smartsafehub/devices.uc';
import {
	read_status,
	reboot_system
} from './smartsafehub/system.uc';
import {
	check_updates,
	install_updates,
	read_updates_status,
	update_update_settings
} from './smartsafehub/updates.uc';
import {
	read_wifi_summary,
	update_wifi
} from './smartsafehub/wifi-management.uc';

const methods = {
	status: {
		call: function(request) {
			return read_status(request);
		},
	},
	connected_devices: {
		call: function(request) {
			return read_connected_devices();
		},
	},
	wifi_summary: {
		call: function(request) {
			return read_wifi_summary();
		},
	},
	wifi_update: {
		args: {
			section: '',
			ssid: '',
			security: 'keep',
			password: '',
			enabled: true,
		},
		call: function(request) {
			return update_wifi(request);
		},
	},
	updates_status: {
		call: function(request) {
			return read_updates_status(request);
		},
	},
	updates_check: {
		call: function(request) {
			return check_updates(request);
		},
	},
	updates_install: {
		args: {
			confirm: '',
		},
		call: function(request) {
			return install_updates(request);
		},
	},
	updates_settings_update: {
		args: {
			check_enabled: true,
			check_interval_s: 21600,
			auto_install: false,
			auto_install_time: '03:00',
		},
		call: function(request) {
			return update_update_settings(request);
		},
	},
	system_reboot: {
		args: {
			confirm: '',
		},
		call: function(request) {
			return reboot_system(request);
		},
	},
};

return { smartsafehub: methods };
