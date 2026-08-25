import { fetchStatus } from '../api/smartsafehub';
import { t } from '../utils/gettext';
import { useAsyncResource } from './useAsyncResource';

const STATUS_REFRESH_INTERVAL_MS = 60_000;

export function useStatus(active: boolean) {
  return useAsyncResource({
    active,
    fallbackError: t('Failed to fetch device status.'),
    loader: fetchStatus,
    pollInterval: STATUS_REFRESH_INTERVAL_MS,
  });
}
