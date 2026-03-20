import { fetchStatus } from '../api/smartsafehub';
import { useAsyncResource } from './useAsyncResource';

export function useStatus() {
  return useAsyncResource({
    fallbackError: '장치 상태를 불러오지 못했습니다.',
    loader: fetchStatus,
  });
}
