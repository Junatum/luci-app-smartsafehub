// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';

import { read_connected_devices } from './smartsafehub/devices.uc';
import {
	mutate_safeshield_rule,
	read_safeshield_rules,
	refresh_safeshield,
	set_safeshield_enabled
} from './smartsafehub/safeshield.uc';
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
	safeshield_set_enabled: {
		args: {
			enabled: true,
		},
		call: function(request) {
			return set_safeshield_enabled(request);
		},
	},
	safeshield_refresh: {
		call: function(request) {
			return refresh_safeshield();
		},
	},
	safeshield_rules_list: {
		call: function(request) {
			return read_safeshield_rules();
		},
	},
	safeshield_rule_add: {
		args: {
			action: '',
			domain: '',
		},
		call: function(request) {
			return mutate_safeshield_rule(request, 'add');
		},
	},
	safeshield_rule_delete: {
		args: {
			action: '',
			domain: '',
		},
		call: function(request) {
			return mutate_safeshield_rule(request, 'delete');
		},
	},
};

return { smartsafehub: methods };
