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

/** Local APK adapter state, independent from the future IoT / AI runtimes. */
export interface AppsInstallStatus {
  job: {
    phase: 'idle' | 'starting' | 'running' | 'success' | 'failed';
    action: 'install' | 'remove' | '';
    appId: string;
    code: string;
  };
  installed: Record<string, {
    installed: boolean;
    partial: boolean;
    managed: boolean;
  }>;
}

export interface AppsOperationAccepted {
  accepted: boolean;
  appId: string;
  action: 'install' | 'remove';
}
