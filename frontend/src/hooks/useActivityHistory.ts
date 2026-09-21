import { fetchActivityHistory } from '../api/smartsafehub';
import { useAsyncResource } from './useAsyncResource';

const ACTIVITY_REFRESH_INTERVAL_MS = 60_000;

export function useActivityHistory(active: boolean) {
  return useAsyncResource({
    active,
    fallbackError: '최근 활동을 불러오지 못했습니다.',
    loader: () => fetchActivityHistory(),
    pollInterval: ACTIVITY_REFRESH_INTERVAL_MS,
    refreshOnFocus: true,
  });
}
