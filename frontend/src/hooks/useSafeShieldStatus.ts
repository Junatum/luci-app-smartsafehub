import { fetchSafeShieldStatus } from '../api/safeshield';
import type { SafeShieldStatus } from '../types/safeshield';
import { useAsyncResource } from './useAsyncResource';

const TRANSITION_REFRESH_INTERVAL_MS = 3_000;
const TRANSITION_STAGES = new Set([
  'starting',
  'boot_delay',
  'boot_refresh',
  'boot_refresh_skipped',
  'scheduled_refresh',
  'init',
  'resolve_api',
  'download_artifact',
  'local_overrides',
  'merge',
  'install',
  'restart_dnsmasq',
  'runtime_check',
  'blocklist_verify',
]);

function isTransitioning(data: SafeShieldStatus | null): boolean {
  if (!data) {
    return false;
  }

  return (
    data.status === 'running' ||
    (data.stage !== null && TRANSITION_STAGES.has(data.stage))
  );
}

export function useSafeShieldStatus(active: boolean) {
  return useAsyncResource({
    active,
    fallbackError: 'SafeShield 상태를 불러오지 못했습니다.',
    loader: fetchSafeShieldStatus,
    pollInterval: (data) =>
      isTransitioning(data) ? TRANSITION_REFRESH_INTERVAL_MS : null,
  });
}
