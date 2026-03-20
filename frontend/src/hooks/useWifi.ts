import { useCallback, useState } from 'preact/hooks';

import { fetchWifiSummary, updateWifiNetwork } from '../api/smartsafehub';
import { RpcError } from '../api/rpc';
import type { WifiUpdateInput } from '../types/wifi';
import { errorMessage } from '../utils/errors';
import { useAsyncResource } from './useAsyncResource';

export type WifiFeedback =
  | { kind: 'success' | 'warning' | 'error'; message: string }
  | null;

interface WifiMutationState {
  updatingSection: string | null;
  feedback: WifiFeedback;
}

export function useWifi(active: boolean) {
  const resource = useAsyncResource({
    active,
    fallbackError: 'Wi-Fi 설정을 처리하지 못했습니다.',
    loader: fetchWifiSummary,
  });
  const [mutation, setMutation] = useState<WifiMutationState>({
    updatingSection: null,
    feedback: null,
  });

  const update = useCallback(
    async (input: WifiUpdateInput): Promise<boolean> => {
      setMutation({
        updatingSection: input.section,
        feedback: null,
      });

      try {
        const result = await updateWifiNetwork(input);
        resource.replaceData(result.summary);
        setMutation({
          updatingSection: null,
          feedback: {
            kind: 'success',
            message: result.changed
              ? 'Wi-Fi 설정을 저장하고 무선 네트워크를 다시 불러왔습니다.'
              : '변경된 Wi-Fi 설정이 없습니다.',
          },
        });
        return true;
      } catch (error) {
        const connectionMayHaveChanged =
          error instanceof RpcError && error.code === 'NETWORK_ERROR';

        setMutation({
          updatingSection: null,
          feedback: {
            kind: connectionMayHaveChanged ? 'warning' : 'error',
            message: connectionMayHaveChanged
              ? 'Wi-Fi가 다시 시작되면서 연결이 끊어졌을 수 있습니다. 변경한 SSID로 다시 연결한 뒤 화면을 새로고침해 주세요.'
              : errorMessage(error, 'Wi-Fi 설정을 처리하지 못했습니다.'),
          },
        });
        return false;
      }
    },
    [resource.replaceData],
  );

  const dismissFeedback = useCallback(() => {
    setMutation((current) => ({ ...current, feedback: null }));
  }, []);

  return {
    ...resource,
    ...mutation,
    update,
    dismissFeedback,
  };
}
