/** Read-only SmartSafeHub Apps catalog schema 1 from the local router. */
export interface VerifiedApp {
  id: string;
  name: string;
  summary: string;
  description: string;
  category: string;
  version: string;
}

export interface AppsCatalog {
  schema: 1;
  deviceCode: string;
  firmwareBuildId: string;
  channel: string;
  apps: VerifiedApp[];
}
