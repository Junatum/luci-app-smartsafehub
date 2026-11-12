export interface NetwatchDevice {
  ip: string;
  connections: number;
  destinations: number;
  /** Present on collectors with per-device learning (r3+). */
  trainingDays?: number;
  baselineConnections?: number | null;
  baselineDestinations?: number | null;
  state?: 'learning' | 'normal' | 'watch' | 'anomaly';
}

export interface NetwatchStatus {
  schema: 1;
  enabled: boolean;
  phase: 'preparing' | 'ready' | 'unavailable' | 'disabled';
  sampledAt: number;
  intervalSeconds: number;
  source: string;
  ipv4Only: boolean;
  limited: boolean;
  totalConnections: number;
  totalDevices: number;
  trainingDays?: number;
  trainingTargetDays?: number;
  devices: NetwatchDevice[];
  alert: NetwatchDevice | null;
}
