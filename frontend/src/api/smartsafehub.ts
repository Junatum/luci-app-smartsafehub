import type { ConnectedDevicesSummary } from '../types/devices';
import type { SmartSafeHubStatus } from '../types/status';
import type { SystemRebootResult } from '../types/system';
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
