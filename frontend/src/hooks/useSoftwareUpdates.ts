import { useCallback, useState } from 'preact/hooks';

import {
  fetchSoftwareUpdates,
  requestSoftwareUpdateCheck,
  requestSoftwareUpdateInstall,
  updateSoftwareUpdateSettings,
} from '../api/smartsafehub';
import type {
  SoftwareUpdateSettingsInput,
  SoftwareUpdateStatus,
} from '../types/updates';
import { errorMessage } from '../utils/errors';
import { useAsyncResource } from './useAsyncResource';

export type SoftwareUpdateAction = 'check' | 'install' | 'settings' | null;

const IDLE_POLL_INTERVAL_MS = 60_000;
const BUSY_POLL_INTERVAL_MS = 2_000;

export function useSoftwareUpdates(active = true) {
  const resource = useAsyncResource({
    active,
    fallbackError: '소프트웨어 업데이트 상태를 불러오지 못했습니다.',
    loader: fetchSoftwareUpdates,
    pollInterval: (data: SoftwareUpdateStatus | null) =>
      data?.phase === 'checking' || data?.phase === 'installing'
        ? BUSY_POLL_INTERVAL_MS
        : IDLE_POLL_INTERVAL_MS,
  });
  const [action, setAction] = useState<SoftwareUpdateAction>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const markPhase = useCallback(
    (phase: SoftwareUpdateStatus['phase']) => {
      if (!resource.data) {
        return;
      }

      resource.replaceData({ ...resource.data, phase });
    },
    [resource],
  );

  const check = useCallback(async () => {
    setAction('check');
    setActionError(null);
    setMessage(null);

    try {
      const result = await requestSoftwareUpdateCheck();
      if (!result.accepted) {
        throw new Error('업데이트 확인 요청이 접수되지 않았습니다.');
      }
      markPhase('checking');
      setAction(null);
      window.setTimeout(() => void resource.refresh(), 500);
    } catch (error) {
      setAction(null);
      setActionError(errorMessage(error, '업데이트 확인을 시작하지 못했습니다.'));
    }
  }, [markPhase, resource]);

  const install = useCallback(async () => {
    setAction('install');
    setActionError(null);
    setMessage(null);

    try {
      const result = await requestSoftwareUpdateInstall();
      if (!result.accepted) {
        throw new Error('업데이트 설치 요청이 접수되지 않았습니다.');
      }
      markPhase('installing');
      setAction(null);
      setMessage('업데이트 설치를 시작했습니다. 완료 후 화면을 새로고침해 주세요.');
      window.setTimeout(() => void resource.refresh(), 750);
    } catch (error) {
      setAction(null);
      setActionError(errorMessage(error, '업데이트 설치를 시작하지 못했습니다.'));
    }
  }, [markPhase, resource]);

  const saveSettings = useCallback(
    async (input: SoftwareUpdateSettingsInput): Promise<boolean> => {
      setAction('settings');
      setActionError(null);
      setMessage(null);

      try {
        const settings = await updateSoftwareUpdateSettings(input);
        if (resource.data) {
          resource.replaceData({ ...resource.data, settings });
        }
        setAction(null);
        setMessage('자동 업데이트 설정을 저장했습니다.');
        return true;
      } catch (error) {
        setAction(null);
        setActionError(errorMessage(error, '자동 업데이트 설정을 저장하지 못했습니다.'));
        return false;
      }
    },
    [resource],
  );

  const dismissFeedback = useCallback(() => {
    setActionError(null);
    setMessage(null);
  }, []);

  return {
    ...resource,
    action,
    actionError,
    message,
    check,
    dismissFeedback,
    install,
    saveSettings,
  };
}
