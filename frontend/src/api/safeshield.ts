import type {
  SafeShieldRuleAction,
  SafeShieldRuleMutationResult,
  SafeShieldRules,
} from '../types/rules';
import type {
  SafeShieldConfig,
  SafeShieldConfigUpdate,
  SafeShieldConfigUpdateResult,
  SafeShieldEnabledResult,
  SafeShieldLicenseUpdateResult,
  SafeShieldRefreshResult,
  SafeShieldStatus,
} from '../types/safeshield';
import { t } from '../utils/gettext';
import { callRpc, RpcError } from './rpc';

const API_OBJECT = 'safeshield';

interface RawSafeShieldStatus {
  version?: unknown;
  enabled?: unknown;
  active?: unknown;
  status?: unknown;
  stage?: unknown;
  summary?: Record<string, unknown>;
  runtime?: Record<string, unknown>;
  license?: Record<string, unknown>;
  artifact?: Record<string, unknown>;
  local_overrides?: Record<string, unknown>;
  blocklist?: Record<string, unknown>;
  health?: Record<string, unknown>;
  warnings?: unknown;
  errors?: unknown;
  timestamps?: Record<string, unknown>;
}

interface RawSafeShieldConfig {
  values?: Record<string, unknown>;
  license?: Record<string, unknown>;
  device?: Record<string, unknown>;
}

interface RawSafeShieldRules {
  ok?: unknown;
  allow?: unknown;
  block?: unknown;
  counts?: Record<string, unknown>;
  error?: unknown;
}

interface RawSafeShieldMutation {
  ok?: unknown;
  changed?: unknown;
  accepted?: unknown;
  target_enabled?: unknown;
  reconciled?: unknown;
  reason?: unknown;
  status?: unknown;
  action?: unknown;
  domain?: unknown;
  added?: unknown;
  deleted?: unknown;
  refresh?: unknown;
  restarted?: unknown;
  config?: unknown;
  license?: unknown;
  error?: unknown;
}

function stringValue(value: unknown, fallback: string | null): string | null {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function plainString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function numberValue(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function boolValue(value: unknown): boolean {
  return value === true;
}

function arrayCount(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function objectValue(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function apiError(response: Record<string, unknown>): RpcError {
  const error = objectValue(response.error);
  const code = plainString(error.code) || 'UNKNOWN_ERROR';
  const message =
    plainString(error.message) || t('Failed to process SafeShield API request.');

  return new RpcError(`SAFESHIELD_${code.toUpperCase()}`, message);
}

async function callSafeShield<T>(
  method: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const response = await callRpc<unknown>(API_OBJECT, method, params);
  const object = objectValue(response);

  if (object.ok === false) {
    throw apiError(object);
  }

  return response as T;
}

function unavailableStatus(): SafeShieldStatus {
  return {
    available: false,
    version: null,
    enabled: false,
    active: false,
    status: 'unavailable',
    stage: null,
    summary: {
      label: t('Unavailable'),
      message: t('SafeShield status API is unavailable'),
      severity: 'warning',
    },
    runtime: {
      refreshdRunning: false,
      dnsmasqRunning: false,
      dnsRuntimeOk: false,
      lastResult: null,
      lastErrorCode: null,
    },
    license: {
      configured: false,
      keyMasked: '',
      plan: null,
      status: null,
    },
    artifact: {
      resolved: false,
      tier: null,
      version: null,
      uniqueDomains: 0,
      rules: 0,
    },
    localOverrides: {
      enabled: false,
      allowlistPath: null,
      blocklistPath: null,
    },
    blocklist: {
      installed: false,
      validLineCount: 0,
      fileSizeKb: 0,
      verificationOk: false,
    },
    health: {
      overall: 'unavailable',
    },
    issueCounts: {
      warnings: 0,
      errors: 0,
    },
    timestamps: {
      lastAttempt: 0,
      lastSuccess: 0,
      lastFailure: 0,
      lastLocalApply: 0,
      lastLocalApplyFailure: 0,
      nextRefreshAt: 0,
      refreshIntervalS: 0,
    },
  };
}

function normalizeStatus(sourceValue: RawSafeShieldStatus): SafeShieldStatus {
  const source = objectValue(sourceValue);

  if (Object.keys(source).length === 0) {
    return unavailableStatus();
  }

  const summary = objectValue(source.summary);
  const runtime = objectValue(source.runtime);
  const license = objectValue(source.license);
  const artifact = objectValue(source.artifact);
  const localOverrides = objectValue(source.local_overrides);
  const blocklist = objectValue(source.blocklist);
  const health = objectValue(source.health);
  const timestamps = objectValue(source.timestamps);

  return {
    available: true,
    version: stringValue(source.version, null),
    enabled: boolValue(source.enabled),
    active: boolValue(source.active),
    status: stringValue(source.status, 'unknown') ?? 'unknown',
    stage: stringValue(source.stage, null),
    summary: {
      label: stringValue(summary.label, t('Unknown')) ?? t('Unknown'),
      message:
        stringValue(summary.message, t('SafeShield status is unknown')) ??
        t('SafeShield status is unknown'),
      severity: stringValue(summary.severity, 'warning') ?? 'warning',
    },
    runtime: {
      refreshdRunning: boolValue(runtime.refreshd_running),
      dnsmasqRunning: boolValue(runtime.dnsmasq_running),
      dnsRuntimeOk: boolValue(runtime.dns_runtime_ok),
      lastResult: stringValue(runtime.last_result, null),
      lastErrorCode: stringValue(runtime.last_error_code, null),
    },
    license: {
      configured: boolValue(license.configured),
      keyMasked: plainString(license.key_masked),
      plan: stringValue(license.plan, null),
      status: stringValue(license.status, null),
    },
    artifact: {
      resolved: boolValue(artifact.resolved),
      tier: stringValue(artifact.tier, null),
      version: stringValue(artifact.version, null),
      uniqueDomains: numberValue(artifact.unique_domains),
      rules: numberValue(artifact.rules),
    },
    localOverrides: {
      enabled: boolValue(localOverrides.enabled),
      allowlistPath: stringValue(localOverrides.allowlist_path, null),
      blocklistPath: stringValue(localOverrides.blocklist_path, null),
    },
    blocklist: {
      installed: boolValue(blocklist.installed),
      validLineCount: numberValue(blocklist.valid_line_count),
      fileSizeKb: numberValue(blocklist.file_size_kb),
      verificationOk: boolValue(blocklist.verification_ok),
    },
    health: {
      overall: stringValue(health.overall, 'unknown') ?? 'unknown',
    },
    issueCounts: {
      warnings: arrayCount(source.warnings),
      errors: arrayCount(source.errors),
    },
    timestamps: {
      lastAttempt: numberValue(timestamps.last_attempt),
      lastSuccess: numberValue(timestamps.last_success),
      lastFailure: numberValue(timestamps.last_failure),
      lastLocalApply: numberValue(timestamps.last_local_apply),
      lastLocalApplyFailure: numberValue(timestamps.last_local_apply_failure),
      nextRefreshAt: numberValue(timestamps.next_refresh_at),
      refreshIntervalS: numberValue(timestamps.refresh_interval_s),
    },
  };
}

function normalizeConfig(sourceValue: RawSafeShieldConfig): SafeShieldConfig {
  const source = objectValue(sourceValue);
  const values = objectValue(source.values);
  const license = objectValue(source.license);
  const device = objectValue(source.device);

  return {
    values: {
      verbosity: numberValue(values.verbosity),
      applyLocalOverrides: boolValue(values.apply_local_overrides),
      maxBlocklistFileSizeKb: numberValue(values.max_blocklist_file_size_kb),
      minValidLineCount: numberValue(values.min_valid_line_count),
      compressBlocklist: boolValue(values.compress_blocklist),
      initialDnsmasqRestart: boolValue(values.initial_dnsmasq_restart),
      dnsmasqSanityCheck: boolValue(values.dnsmasq_sanity_check),
      downloadTimeout: numberValue(values.download_timeout),
      downloadRetry: numberValue(values.download_retry),
      pauseTimeout: numberValue(values.pause_timeout),
      bootStartDelayS: numberValue(values.boot_start_delay_s),
      refreshOnBoot: boolValue(values.refresh_on_boot),
      refreshIntervalS: numberValue(values.refresh_interval_s),
      requireWan: boolValue(values.require_wan),
      debug: boolValue(values.debug),
      enabled: boolValue(values.enabled),
    },
    license: {
      configured: boolValue(license.configured),
      keyMasked: plainString(license.key_masked),
    },
    device: {
      vendor: plainString(device.vendor),
      model: plainString(device.model),
      arch: plainString(device.arch),
      memoryMb: numberValue(device.memory_mb),
    },
  };
}

function configUpdatePayload(values: SafeShieldConfigUpdate): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  const mappings: Array<[keyof SafeShieldConfigUpdate, string]> = [
    ['verbosity', 'verbosity'],
    ['applyLocalOverrides', 'apply_local_overrides'],
    ['maxBlocklistFileSizeKb', 'max_blocklist_file_size_kb'],
    ['minValidLineCount', 'min_valid_line_count'],
    ['compressBlocklist', 'compress_blocklist'],
    ['initialDnsmasqRestart', 'initial_dnsmasq_restart'],
    ['dnsmasqSanityCheck', 'dnsmasq_sanity_check'],
    ['downloadTimeout', 'download_timeout'],
    ['downloadRetry', 'download_retry'],
    ['pauseTimeout', 'pause_timeout'],
    ['bootStartDelayS', 'boot_start_delay_s'],
    ['refreshOnBoot', 'refresh_on_boot'],
    ['refreshIntervalS', 'refresh_interval_s'],
    ['requireWan', 'require_wan'],
    ['debug', 'debug'],
  ];

  for (const [frontendName, apiName] of mappings) {
    const value = values[frontendName];

    if (value !== undefined) {
      payload[apiName] = value;
    }
  }

  return payload;
}

function normalizeRefresh(source: unknown): {
  requested: boolean;
  accepted: boolean;
  reason: string;
} {
  const refresh = objectValue(source);

  return {
    requested: boolValue(refresh.requested),
    accepted: boolValue(refresh.accepted),
    reason: plainString(refresh.reason),
  };
}

export async function fetchSafeShieldStatus(): Promise<SafeShieldStatus> {
  try {
    const response = await callSafeShield<RawSafeShieldStatus>('status');
    return normalizeStatus(response);
  } catch (error) {
    if (
      error instanceof RpcError &&
      ['UBUS_3', 'UBUS_4', 'UBUS_5'].includes(error.code)
    ) {
      return unavailableStatus();
    }

    throw error;
  }
}

export async function fetchSafeShieldConfig(): Promise<SafeShieldConfig> {
  const response = await callSafeShield<RawSafeShieldConfig>('config');
  return normalizeConfig(response);
}

export async function updateSafeShieldConfig(
  values: SafeShieldConfigUpdate,
): Promise<SafeShieldConfigUpdateResult> {
  const response = await callSafeShield<RawSafeShieldMutation>('config_update', {
    values: configUpdatePayload(values),
  });

  return {
    changed: stringArray(response.changed),
    restarted: boolValue(response.restarted),
    refresh: response.refresh == null ? null : normalizeRefresh(response.refresh),
    config: normalizeConfig(response.config as RawSafeShieldConfig),
  };
}

export async function setSafeShieldEnabled(
  enabled: boolean,
): Promise<SafeShieldEnabledResult> {
  const response = await callSafeShield<RawSafeShieldMutation>('set_enabled', {
    enabled,
  });

  return {
    changed: boolValue(response.changed),
    accepted: boolValue(response.accepted),
    targetEnabled: boolValue(response.target_enabled),
    reconciled: boolValue(response.reconciled),
  };
}

export async function requestSafeShieldRefresh(): Promise<SafeShieldRefreshResult> {
  const response = await callSafeShield<RawSafeShieldMutation>('refresh');

  return {
    accepted: boolValue(response.accepted),
    reason: plainString(response.reason),
    status: normalizeStatus(response.status as RawSafeShieldStatus),
  };
}

export async function fetchSafeShieldRules(): Promise<SafeShieldRules> {
  const [rulesResponse, config] = await Promise.all([
    callSafeShield<RawSafeShieldRules>('rules_list'),
    fetchSafeShieldConfig(),
  ]);
  const allow = stringArray(rulesResponse.allow);
  const block = stringArray(rulesResponse.block);

  return {
    allow,
    block,
    counts: {
      allow: allow.length,
      block: block.length,
      total: allow.length + block.length,
    },
    safeshieldEnabled: config.values.enabled,
    applyLocalOverrides: config.values.applyLocalOverrides,
  };
}

async function mutateSafeShieldRule(
  method: 'rule_add' | 'rule_delete',
  action: SafeShieldRuleAction,
  domain: string,
  refresh = true,
): Promise<SafeShieldRuleMutationResult> {
  const response = await callSafeShield<RawSafeShieldMutation>(method, {
    action,
    domain,
    refresh,
  });
  const changed = method === 'rule_add'
    ? boolValue(response.added)
    : boolValue(response.deleted);

  return {
    action,
    domain: plainString(response.domain) || domain,
    changed,
    refresh: normalizeRefresh(response.refresh),
    rules: await fetchSafeShieldRules(),
  };
}

export function addSafeShieldRule(
  action: SafeShieldRuleAction,
  domain: string,
  refresh = true,
): Promise<SafeShieldRuleMutationResult> {
  return mutateSafeShieldRule('rule_add', action, domain, refresh);
}

export function deleteSafeShieldRule(
  action: SafeShieldRuleAction,
  domain: string,
  refresh = true,
): Promise<SafeShieldRuleMutationResult> {
  return mutateSafeShieldRule('rule_delete', action, domain, refresh);
}

export async function updateSafeShieldLicense(
  licenseKey: string,
): Promise<SafeShieldLicenseUpdateResult> {
  const response = await callSafeShield<RawSafeShieldMutation>('license_update', {
    license_key: licenseKey,
  });
  const license = objectValue(response.license);

  return {
    changed: boolValue(response.changed),
    license: {
      configured: boolValue(license.configured),
      keyMasked: plainString(license.key_masked),
    },
    refresh: normalizeRefresh(response.refresh),
  };
}
