export type ActivityEventSeverity = 'info' | 'success' | 'warning' | 'error';

export interface ActivityEvent {
  schema: 1;
  eventId: string;
  eventType: string;
  severity: ActivityEventSeverity;
  occurredAt: number;
  deviceUuid: string | null;
  source: string;
  metadata: Record<string, unknown>;
}

export interface ActivityHistory {
  schema: 1;
  scope: 'current_boot';
  volatile: boolean;
  maxEvents: number;
  events: ActivityEvent[];
}
