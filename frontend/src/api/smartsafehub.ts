import type {
  ConfigurationBackupDiscardResult,
  ConfigurationBackupRestoreResult,
  ConfigurationBackupValidation,
} from '../types/backup';
import type { ConnectedDevicesSummary } from '../types/devices';
import type {
  FirmwareAccepted,
  FirmwareStatus,
} from '../types/firmware';
import type { SmartSafeHubStatus } from '../types/status';
import type {
  ScheduledRebootSettings,
  ScheduledRebootSettingsInput,
  SystemRebootResult,
  SystemTimeSettings,
  SystemTimeSyncResult,
} from '../types/system';
import type {
  SoftwareUpdateAccepted,
  SoftwareUpdateSettings,
  SoftwareUpdateSettingsInput,
  SoftwareUpdateStatus,
} from '../types/updates';
import type {
  WifiSummary,
  WifiUpdateInput,
  WifiUpdateResult,
} from '../types/wifi';
import { callApi } from './rpc';

const API_OBJECT = 'smartsafehub';

export function fetchConnectedDevices(): Promise<ConnectedDevicesSummary> {
  return callApi(API_OBJECT, 'connected_devices');
}

export function fetchStatus(): Promise<SmartSafeHubStatus> {
  return callApi(API_OBJECT, 'status');
}

export function fetchSoftwareUpdates(): Promise<SoftwareUpdateStatus> {
  return callApi(API_OBJECT, 'updates_status');
}

export function fetchFirmwareStatus(): Promise<FirmwareStatus> {
  return callApi(API_OBJECT, 'firmware_status');
}

export function requestFirmwareCheck(): Promise<FirmwareAccepted> {
  return callApi(API_OBJECT, 'firmware_check');
}

export function requestFirmwarePrepare(): Promise<FirmwareAccepted> {
  return callApi(API_OBJECT, 'firmware_prepare');
}

export function requestFirmwareUploadValidation(
  filename: string,
): Promise<FirmwareAccepted> {
  return callApi(API_OBJECT, 'firmware_validate_upload', { filename });
}

export function requestFirmwareInstall(
  keepSettings: boolean,
): Promise<FirmwareAccepted> {
  return callApi(API_OBJECT, 'firmware_install', {
    confirm: 'install',
    keep_settings: keepSettings,
  });
}

export function requestFirmwareDiscard(): Promise<FirmwareAccepted> {
  return callApi(API_OBJECT, 'firmware_discard');
}

export function requestSoftwareUpdateCheck(): Promise<SoftwareUpdateAccepted> {
  return callApi(API_OBJECT, 'updates_check');
}

export function requestSoftwareUpdateInstall(): Promise<SoftwareUpdateAccepted> {
  return callApi(API_OBJECT, 'updates_install', { confirm: 'install' });
}

export function updateSoftwareUpdateSettings(
  input: SoftwareUpdateSettingsInput,
): Promise<SoftwareUpdateSettings> {
  return callApi(API_OBJECT, 'updates_settings_update', {
    check_enabled: input.checkEnabled,
    check_interval_s: input.checkIntervalSeconds,
    auto_install: input.autoInstall,
    auto_install_time: input.autoInstallTime,
  });
}

export function fetchSystemTimeSettings(): Promise<SystemTimeSettings> {
  return callApi(API_OBJECT, 'system_time_settings');
}

export function updateSystemTimezone(
  zonename: string,
): Promise<SystemTimeSettings> {
  return callApi(API_OBJECT, 'system_timezone_update', { zonename });
}

export function requestSystemTimeSync(): Promise<SystemTimeSyncResult> {
  return callApi(API_OBJECT, 'system_time_sync');
}

export function fetchScheduledRebootSettings(): Promise<ScheduledRebootSettings> {
  return callApi(API_OBJECT, 'system_scheduled_reboot_settings');
}

export function updateScheduledRebootSettings(
  input: ScheduledRebootSettingsInput,
): Promise<ScheduledRebootSettings> {
  return callApi(API_OBJECT, 'system_scheduled_reboot_update', {
    enabled: input.enabled,
    frequency: input.frequency,
    day_of_week: input.dayOfWeek,
    time: input.time,
  });
}

export function requestConfigurationBackupValidation(
  filename: string,
): Promise<ConfigurationBackupValidation> {
  return callApi(API_OBJECT, 'system_backup_validate', { filename });
}

export function requestConfigurationBackupRestore(): Promise<ConfigurationBackupRestoreResult> {
  return callApi(
    API_OBJECT,
    'system_backup_restore',
    { confirm: 'restore' },
    { timeoutMs: 35_000 },
  );
}

export function requestConfigurationBackupDiscard(): Promise<ConfigurationBackupDiscardResult> {
  return callApi(API_OBJECT, 'system_backup_discard');
}

export function requestSystemReboot(): Promise<SystemRebootResult> {
  return callApi(API_OBJECT, 'system_reboot', { confirm: 'reboot' });
}

export function fetchWifiSummary(): Promise<WifiSummary> {
  return callApi(API_OBJECT, 'wifi_summary');
}

export function updateWifiNetwork(
  input: WifiUpdateInput,
): Promise<WifiUpdateResult> {
  return callApi(
    API_OBJECT,
    'wifi_update',
    { ...input },
    { timeoutMs: 35_000 },
  );
}
