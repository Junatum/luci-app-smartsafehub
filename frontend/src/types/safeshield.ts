export type SafeShieldSeverity = 'info' | 'notice' | 'warning' | 'error';

export interface SafeShieldSummary {
  label: string;
  message: string;
  severity: SafeShieldSeverity | string;
}

export interface SafeShieldStatus {
  available: boolean;
  version: string | null;
  enabled: boolean;
  active: boolean;
  status: string;
  stage: string | null;
  summary: SafeShieldSummary;
  runtime: {
    refreshdRunning: boolean;
    dnsmasqRunning: boolean;
    dnsRuntimeOk: boolean;
    lastResult: string | null;
    lastErrorCode: string | null;
  };
  license: {
    configured: boolean;
    keyMasked: string;
    plan: string | null;
    status: string | null;
  };
  artifact: {
    resolved: boolean;
    tier: string | null;
    version: string | null;
    uniqueDomains: number;
    rules: number;
  };
  localOverrides: {
    enabled: boolean;
    allowlistPath: string | null;
    blocklistPath: string | null;
  };
  blocklist: {
    installed: boolean;
    validLineCount: number;
    fileSizeKb: number;
    verificationOk: boolean;
  };
  health: {
    overall: string;
  };
  issueCounts: {
    warnings: number;
    errors: number;
  };
  timestamps: {
    lastAttempt: number;
    lastSuccess: number;
    lastFailure: number;
    lastLocalApply: number;
    lastLocalApplyFailure: number;
    nextRefreshAt: number;
    refreshIntervalS: number;
  };
}

export interface SafeShieldConfigValues {
  verbosity: number;
  applyLocalOverrides: boolean;
  maxBlocklistFileSizeKb: number;
  minValidLineCount: number;
  compressBlocklist: boolean;
  initialDnsmasqRestart: boolean;
  dnsmasqSanityCheck: boolean;
  downloadTimeout: number;
  downloadRetry: number;
  pauseTimeout: number;
  bootStartDelayS: number;
  refreshOnBoot: boolean;
  refreshIntervalS: number;
  requireWan: boolean;
  debug: boolean;
  enabled: boolean;
}

export interface SafeShieldConfig {
  values: SafeShieldConfigValues;
  license: {
    configured: boolean;
    keyMasked: string;
  };
  device: {
    vendor: string;
    model: string;
    arch: string;
    memoryMb: number;
  };
}

export type SafeShieldConfigUpdate = Partial<
  Omit<SafeShieldConfigValues, 'enabled'>
>;

export interface SafeShieldConfigUpdateResult {
  changed: string[];
  restarted: boolean;
  refresh: {
    requested: boolean;
    accepted: boolean;
    reason: string;
  } | null;
  config: SafeShieldConfig;
}

export interface SafeShieldEnabledResult {
  changed: boolean;
  accepted: boolean;
  targetEnabled: boolean;
  reconciled: boolean;
}

export interface SafeShieldRefreshResult {
  accepted: boolean;
  reason: string;
  status: SafeShieldStatus;
}

export interface SafeShieldLicenseUpdateResult {
  changed: boolean;
  license: {
    configured: boolean;
    keyMasked: string;
  };
  refresh: {
    requested: boolean;
    accepted: boolean;
    reason: string;
  };
}
