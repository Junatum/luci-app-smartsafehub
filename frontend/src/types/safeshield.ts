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
    lastSuccess: number;
    nextRefreshAt: number;
    refreshIntervalS: number;
  };
}
