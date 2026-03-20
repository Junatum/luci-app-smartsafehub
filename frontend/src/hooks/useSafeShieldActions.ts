import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

import {
  requestSafeShieldRefresh,
  setSafeShieldEnabled,
} from '../api/smartsafehub';
import { errorMessage } from '../utils/errors';

export type SafeShieldAction = 'enable' | 'disable' | 'refresh';

interface SafeShieldActionState {
  action: SafeShieldAction | null;
  error: string | null;
  message: string | null;
}

export function useSafeShieldActions(
  refreshStatus: () => Promise<void>,
) {
  const [state, setState] = useState<SafeShieldActionState>({
    action: null,
    error: null,
    message: null,
  });
  const timers = useRef<number[]>([]);

  const clearTimers = useCallback(() => {
    for (const timer of timers.current) {
      window.clearTimeout(timer);
    }

    timers.current = [];
  }, []);

  const scheduleRefreshes = useCallback(
    (delays: number[]) => {
      clearTimers();

      timers.current = delays.map((delay) =>
        window.setTimeout(() => {
          void refreshStatus();
        }, delay),
      );
    },
    [clearTimers, refreshStatus],
  );

  useEffect(() => clearTimers, [clearTimers]);

  const setEnabled = useCallback(
    async (enabled: boolean) => {
      const action: SafeShieldAction = enabled ? 'enable' : 'disable';
      setState({ action, error: null, message: null });

      try {
        const result = await setSafeShieldEnabled(enabled);
        setState({
          action: null,
          error: null,
          message: result.changed
            ? enabled
              ? 'SafeShield 보호를 활성화했습니다.'
              : 'SafeShield 보호를 비활성화하고 차단 목록을 제거했습니다.'
            : enabled
              ? 'SafeShield 보호가 이미 활성화되어 있습니다.'
              : 'SafeShield 보호가 이미 비활성화되어 있습니다.',
        });
        await refreshStatus();
        scheduleRefreshes([1500, 4000]);
      } catch (error) {
        setState({
          action: null,
          error: errorMessage(error, 'SafeShield 작업을 수행하지 못했습니다.'),
          message: null,
        });
      }
    },
    [refreshStatus, scheduleRefreshes],
  );

  const refreshBlocklist = useCallback(async () => {
    setState({ action: 'refresh', error: null, message: null });

    try {
      await requestSafeShieldRefresh();
      setState({
        action: null,
        error: null,
        message: '차단 목록 갱신 작업을 시작했습니다.',
      });
      scheduleRefreshes([700, 2500, 6000, 12000]);
    } catch (error) {
      setState({
        action: null,
        error: errorMessage(error, 'SafeShield 작업을 수행하지 못했습니다.'),
        message: null,
      });
    }
  }, [scheduleRefreshes]);

  const dismissFeedback = useCallback(() => {
    setState((current) => ({ ...current, error: null, message: null }));
  }, []);

  return {
    ...state,
    dismissFeedback,
    refreshBlocklist,
    setEnabled,
  };
}
