import { useCallback, useState } from 'preact/hooks';

import {
  fetchSystemTimeSettings,
  updateSystemTimezone,
} from '../api/smartsafehub';
import { errorMessage } from '../utils/errors';
import { useAsyncResource } from './useAsyncResource';

interface SystemTimeMutationState {
  saving: boolean;
  saveError: string | null;
  saveMessage: string | null;
}

export function useSystemTimeSettings(active: boolean) {
  const resource = useAsyncResource({
    active,
    fallbackError: '시간대 설정을 불러오지 못했습니다.',
    loader: fetchSystemTimeSettings,
    refreshOnFocus: true,
  });
  const [mutation, setMutation] = useState<SystemTimeMutationState>({
    saving: false,
    saveError: null,
    saveMessage: null,
  });

  const saveTimezone = useCallback(
    async (zonename: string): Promise<boolean> => {
      setMutation({
        saving: true,
        saveError: null,
        saveMessage: null,
      });

      try {
        const result = await updateSystemTimezone(zonename);
        resource.replaceData(result);
        setMutation({
          saving: false,
          saveError: null,
          saveMessage: '시간대를 저장하고 시스템 시간 설정에 적용했습니다.',
        });
        return true;
      } catch (error) {
        setMutation({
          saving: false,
          saveError: errorMessage(error, '시간대 설정을 저장하지 못했습니다.'),
          saveMessage: null,
        });
        return false;
      }
    },
    [resource.replaceData],
  );

  const dismissSaveFeedback = useCallback(() => {
    setMutation((current) => ({
      ...current,
      saveError: null,
      saveMessage: null,
    }));
  }, []);

  return {
    ...resource,
    ...mutation,
    dismissSaveFeedback,
    saveTimezone,
  };
}
