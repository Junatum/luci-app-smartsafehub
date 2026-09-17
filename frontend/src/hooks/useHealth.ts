import { useCallback, useState } from 'preact/hooks';

import {
  fetchHealthStatus,
  requestHealthRun,
  updateHealthReporter,
} from '../api/smartsafehub';
import { errorMessage } from '../utils/errors';
import { useAsyncResource } from './useAsyncResource';

const HEALTH_REFRESH_INTERVAL_MS = 60_000;
const HEALTH_PENDING_REFRESH_INTERVAL_MS = 1_000;
const HEALTH_RUN_POLL_DELAYS_MS = [400, 800, 1_200, 1_600] as const;

interface HealthMutationState {
  running: boolean;
  savingReporter: boolean;
  actionError: string | null;
  actionMessage: string | null;
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export function useHealth(active: boolean) {
  const resource = useAsyncResource({
    active,
    fallbackError: '장치 진단 상태를 불러오지 못했습니다.',
    loader: fetchHealthStatus,
    pollInterval: (data) =>
      data?.generatedAt
        ? HEALTH_REFRESH_INTERVAL_MS
        : HEALTH_PENDING_REFRESH_INTERVAL_MS,
    refreshOnFocus: true,
  });
  const [mutation, setMutation] = useState<HealthMutationState>({
    running: false,
    savingReporter: false,
    actionError: null,
    actionMessage: null,
  });

  const runDiagnostic = useCallback(async (): Promise<boolean> => {
    setMutation({
      running: true,
      savingReporter: false,
      actionError: null,
      actionMessage: null,
    });

    try {
      const previousGeneratedAt = resource.data?.generatedAt ?? 0;
      const accepted = await requestHealthRun();
      if (!accepted.accepted) {
        throw new Error('장치가 진단 요청을 접수하지 않았습니다.');
      }

      let latest = resource.data;
      for (const delay of HEALTH_RUN_POLL_DELAYS_MS) {
        await sleep(delay);
        latest = await fetchHealthStatus();
        if (latest.generatedAt > 0 && latest.generatedAt !== previousGeneratedAt) {
          break;
        }
      }

      if (latest) {
        resource.replaceData(latest);
      }
      setMutation({
        running: false,
        savingReporter: false,
        actionError: null,
        actionMessage: '장치 상태를 다시 진단했습니다.',
      });
      return true;
    } catch (error) {
      setMutation({
        running: false,
        savingReporter: false,
        actionError: errorMessage(error, '장치 상태 진단을 실행하지 못했습니다.'),
        actionMessage: null,
      });
      return false;
    }
  }, [resource.data, resource.replaceData]);

  const setReporterEnabled = useCallback(
    async (enabled: boolean): Promise<boolean> => {
      setMutation({
        running: false,
        savingReporter: true,
        actionError: null,
        actionMessage: null,
      });

      try {
        const result = await updateHealthReporter(enabled);
        resource.replaceData(result);
        setMutation({
          running: false,
          savingReporter: false,
          actionError: null,
          actionMessage: enabled
            ? '원격 상태 보고를 활성화했습니다.'
            : '원격 상태 보고를 비활성화했습니다.',
        });
        return true;
      } catch (error) {
        setMutation({
          running: false,
          savingReporter: false,
          actionError: errorMessage(error, '원격 상태 보고 설정을 변경하지 못했습니다.'),
          actionMessage: null,
        });
        return false;
      }
    },
    [resource.replaceData],
  );

  const dismissActionFeedback = useCallback(() => {
    setMutation((current) => ({
      ...current,
      actionError: null,
      actionMessage: null,
    }));
  }, []);

  return {
    ...resource,
    ...mutation,
    dismissActionFeedback,
    runDiagnostic,
    setReporterEnabled,
  };
}
