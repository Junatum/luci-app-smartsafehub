// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';

import {
	apply_recommended_lan,
	read_lan_settings,
	update_lan_settings
} from './smartsafehub/network-management.uc';

const methods = {
	lan_settings: {
		call: function(request) {
			return read_lan_settings();
		},
	},
	lan_update: {
		args: {
			ip_address: '',
			prefix_length: 24,
			dhcp_enabled: true,
			dhcp_start: '',
			dhcp_end: '',
			lease_time: '12h',
			confirm: '',
		},
		call: function(request) {
			return update_lan_settings(request);
		},
	},
	lan_auto_subnet: {
		args: {
			confirm: '',
		},
		call: function(request) {
			return apply_recommended_lan(request);
		},
	},
};

return { smartsafehub_network: methods };
