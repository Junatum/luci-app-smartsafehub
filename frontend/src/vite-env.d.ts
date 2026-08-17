/// <reference types="vite/client" />

import type { SmartSafeHubBootstrap } from './types/bootstrap';

declare global {
  interface Window {
    __SMARTHUB_BOOTSTRAP__?: SmartSafeHubBootstrap;
    __SMARTHUB_APP_MOUNT__?: () => void;
    __SMARTHUB_APP_UNMOUNT__?: () => void;
    __SMARTHUB_APP_ASSET_VERSION__?: string;
  }
}

export {};
