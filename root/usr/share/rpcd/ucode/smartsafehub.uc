// SPDX-License-Identifier: GPL-3.0-or-later
'use strict';

import { read_connected_devices } from './smartsafehub/devices.uc';
import {
	discard_uploaded_backup,
	restore_uploaded_backup,
	validate_uploaded_backup
} from './smartsafehub/backup.uc';
import {
	read_scheduled_reboot_settings,
	read_status,
	read_time_settings,
	reboot_system,
	sync_time,
	update_scheduled_reboot_settings,
	update_timezone
} from './smartsafehub/system.uc';
import {
	check_firmware,
	discard_firmware,
	install_firmware,
	prepare_firmware,
	read_firmware_status,
	validate_uploaded_firmware
} from './smartsafehub/firmware.uc';
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
	firmware_status: {
		call: function(request) {
			return read_firmware_status(request);
		},
	},
	firmware_check: {
		call: function(request) {
			return check_firmware(request);
		},
	},
	firmware_prepare: {
		call: function(request) {
			return prepare_firmware(request);
		},
	},
	firmware_validate_upload: {
		args: {
			filename: 'firmware.bin',
		},
		call: function(request) {
			return validate_uploaded_firmware(request);
		},
	},
	firmware_install: {
		args: {
			confirm: '',
			keep_settings: true,
		},
		call: function(request) {
			return install_firmware(request);
		},
	},
	firmware_discard: {
		call: function(request) {
			return discard_firmware(request);
		},
	},
	system_time_settings: {
		call: function(request) {
			return read_time_settings(request);
		},
	},
	system_time_sync: {
		call: function(request) {
			return sync_time(request);
		},
	},
	system_scheduled_reboot_settings: {
		call: function(request) {
			return read_scheduled_reboot_settings(request);
		},
	},
	system_scheduled_reboot_update: {
		args: {
			enabled: false,
			frequency: 'weekly',
			day_of_week: 'sun',
			time: '04:00',
		},
		call: function(request) {
			return update_scheduled_reboot_settings(request);
		},
	},
	system_timezone_update: {
		args: {
			zonename: '',
		},
		call: function(request) {
			return update_timezone(request);
		},
	},
	system_backup_validate: {
		args: {
			filename: 'backup.tar.gz',
		},
		call: function(request) {
			return validate_uploaded_backup(request);
		},
	},
	system_backup_restore: {
		args: {
			confirm: '',
		},
		call: function(request) {
			return restore_uploaded_backup(request);
		},
	},
	system_backup_discard: {
		call: function(request) {
			return discard_uploaded_backup(request);
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
