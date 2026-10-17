export type SafeShieldRuleAction = 'allow' | 'block';

export interface SafeShieldRuleCounts {
  allow: number;
  block: number;
  total: number;
}

export interface SafeShieldRules {
  allow: string[];
  block: string[];
  counts: SafeShieldRuleCounts;
  safeshieldEnabled: boolean;
  applyLocalOverrides: boolean;
}

export type SafeShieldRuleRefreshReason =
  | ''
  | 'already_running'
  | 'disabled'
  | 'local_overrides_disabled'
  | 'not_requested'
  | 'service_stopped'
  | 'spawn_failed'
  | 'unchanged'
  | string;

export interface SafeShieldRuleMutationResult {
  action: SafeShieldRuleAction;
  domain: string;
  changed: boolean;
  refresh: {
    requested: boolean;
    accepted: boolean;
    reason: SafeShieldRuleRefreshReason;
  };
  rules: SafeShieldRules;
}

// Local SafeShield allow-list confirmation, not a DNS traffic test.
export interface RecommendedRulesStatus {
  revision: string | null;
  domains: string[];
  confirmedDomains: Array<{ domain: string; source: 'managed' | 'manual' }>;
  syncStatus: 'pending' | 'confirmed' | 'failed';
  lastCheckedAt: number;
  lastDeviceSyncAt: number;
  nextDeviceSyncAt: number;
  accountRegistered: boolean;
}
