import { fetchConnectedDevices } from '../api/smartsafehub';
import { t } from '../utils/gettext';
import { useAsyncResource } from './useAsyncResource';

const REFRESH_INTERVAL_MS = 15_000;

export function useConnectedDevices(active: boolean) {
  return useAsyncResource({
    active,
    fallbackError: t('Failed to fetch the list of connected devices.'),
    loader: fetchConnectedDevices,
    pollInterval: REFRESH_INTERVAL_MS,
  });
}
