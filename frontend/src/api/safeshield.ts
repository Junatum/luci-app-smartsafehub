import type { SafeShieldStatus } from '../types/safeshield';
import { callRpc, RpcError } from './rpc';

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
  blocklist?: Record<string, unknown>;
  health?: Record<string, unknown>;
  warnings?: unknown;
  errors?: unknown;
  timestamps?: Record<string, unknown>;
}

function stringValue(value: unknown, fallback: string | null): string | null {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
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

function objectValue(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
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
      label: 'Unavailable',
      message: 'SafeShield status API is unavailable',
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
      lastSuccess: 0,
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
      label: stringValue(summary.label, 'Unknown') ?? 'Unknown',
      message:
        stringValue(summary.message, 'SafeShield status is unknown') ??
        'SafeShield status is unknown',
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
      lastSuccess: numberValue(timestamps.last_success),
      nextRefreshAt: numberValue(timestamps.next_refresh_at),
      refreshIntervalS: numberValue(timestamps.refresh_interval_s),
    },
  };
}

export async function fetchSafeShieldStatus(): Promise<SafeShieldStatus> {
  try {
    const response = await callRpc<RawSafeShieldStatus>('safeshield', 'status');
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
