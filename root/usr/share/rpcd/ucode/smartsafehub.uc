// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';

import { read_connected_devices } from './smartsafehub/devices.uc';
import {
	read_status,
	reboot_system
} from './smartsafehub/system.uc';
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
