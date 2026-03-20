export type SafeShieldRuleAction = 'allow' | 'block';

export interface SafeShieldRuleCounts {
  allow: number;
  block: number;
  total: number;
}

export interface SafeShieldRuleIgnoredCounts {
  allow: number;
  block: number;
}

export interface SafeShieldRuleLimits {
  perList: number;
  total: number;
}

export interface SafeShieldRules {
  allow: string[];
  block: string[];
  counts: SafeShieldRuleCounts;
  ignored: SafeShieldRuleIgnoredCounts;
  safeshieldEnabled: boolean;
  applyLocalOverrides: boolean;
  limits: SafeShieldRuleLimits;
}

export type SafeShieldRuleRefreshReason =
  | 'started'
  | 'already_running'
  | 'safeshield_disabled'
  | 'local_overrides_disabled'
  | 'start_failed'
  | 'unchanged';

export interface SafeShieldRuleMutationResult {
  action: SafeShieldRuleAction;
  domain: string;
  changed: boolean;
  refresh: {
    started: boolean;
    reason: SafeShieldRuleRefreshReason;
  };
  rules: SafeShieldRules;
}
