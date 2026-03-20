import { fetchSafeShieldStatus } from '../api/safeshield';
import { useAsyncResource } from './useAsyncResource';

const RUNNING_REFRESH_INTERVAL_MS = 3_000;

export function useSafeShieldStatus(active: boolean) {
  return useAsyncResource({
    active,
    fallbackError: 'SafeShield 상태를 불러오지 못했습니다.',
    loader: fetchSafeShieldStatus,
    pollInterval: (data) =>
      data?.status === 'running' ? RUNNING_REFRESH_INTERVAL_MS : null,
  });
}
