import type { ConnectedDevicesSummary } from '../types/devices';
import type {
  SafeShieldRuleAction,
  SafeShieldRuleMutationResult,
  SafeShieldRules,
} from '../types/rules';
import type { SmartSafeHubStatus } from '../types/status';
import type { SystemRebootResult } from '../types/system';
import type {
  WifiSummary,
  WifiUpdateInput,
  WifiUpdateResult,
} from '../types/wifi';
import { callApi } from './rpc';

const API_OBJECT = 'smartsafehub';

export interface SafeShieldEnabledResult {
  enabled: boolean;
  changed: boolean;
}

export interface SafeShieldRefreshResult {
  accepted: boolean;
  startedAt: number;
}

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
  return callApi(API_OBJECT, 'wifi_update', { ...input });
}

export function setSafeShieldEnabled(
  enabled: boolean,
): Promise<SafeShieldEnabledResult> {
  return callApi(API_OBJECT, 'safeshield_set_enabled', { enabled });
}

export function requestSafeShieldRefresh(): Promise<SafeShieldRefreshResult> {
  return callApi(API_OBJECT, 'safeshield_refresh');
}

export function fetchSafeShieldRules(): Promise<SafeShieldRules> {
  return callApi(API_OBJECT, 'safeshield_rules_list');
}

export function addSafeShieldRule(
  action: SafeShieldRuleAction,
  domain: string,
): Promise<SafeShieldRuleMutationResult> {
  return callApi(API_OBJECT, 'safeshield_rule_add', { action, domain });
}

export function deleteSafeShieldRule(
  action: SafeShieldRuleAction,
  domain: string,
): Promise<SafeShieldRuleMutationResult> {
  return callApi(API_OBJECT, 'safeshield_rule_delete', { action, domain });
}
