/** Read-only SmartSafeHub Apps catalog schema 1 from the local router. */
export interface VerifiedApp {
  id: string;
  name: string;
  summary: string;
  description: string;
  category: string;
  version: string;
  /** Approved same-origin LuCI page or first-party static app; never a remote URL. */
  webUi?: { type: 'luci' | 'static'; path: string } | null;
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
    action: 'install' | 'update' | 'remove' | '';
    appId: string;
    code: string;
    operationId?: string;
  };
  restore?: {
    phase: 'idle' | 'starting' | 'running' | 'success' | 'failed';
    appId: string;
    code: string;
  };
  installed: Record<string, {
    installed: boolean;
    partial: boolean;
    managed: boolean;
    updateAvailable?: boolean;
    webUiReady?: boolean;
  }>;
}

export interface AppsOperationAccepted {
  accepted: boolean;
  appId: string;
  action: 'install' | 'update' | 'remove';
}
