import type { SmartSafeHubStatus } from './status';
import type { WifiSummary } from './wifi';

export interface SystemTimeSettings {
  zonename: string;
  timezone: string;
  ntpEnabled: boolean;
  timezones: Record<string, string>;
}

export interface SafeShieldDiagnosticStatus {
  enabled: boolean | null;
  status: string | null;
  lastResult: string | null;
  validLineCount: number;
  blocklistInstalled: boolean;
  dnsmasqOk: boolean;
}

export interface SystemDiagnostics {
  generatedAt: number;
  system: SmartSafeHubStatus;
  wifi: WifiSummary;
  safeshield: SafeShieldDiagnosticStatus;
}

export interface SystemRebootResult {
  accepted: boolean;
  scheduledAt: number;
}
