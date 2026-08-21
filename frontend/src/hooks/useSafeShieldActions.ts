import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

import {
  requestSafeShieldRefresh,
  setSafeShieldEnabled,
  updateSafeShieldLicense,
} from '../api/safeshield';
import { errorMessage } from '../utils/errors';

export type SafeShieldAction = 'enable' | 'disable' | 'refresh' | 'license';

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
              ? 'SafeShield 보호 활성화 요청을 적용했습니다.'
              : 'SafeShield 보호 비활성화 요청을 적용했습니다.'
            : enabled
              ? 'SafeShield 보호가 이미 활성화 상태입니다.'
              : 'SafeShield 보호가 이미 비활성화 상태입니다.',
        });
        await refreshStatus();
        scheduleRefreshes([800, 2000, 5000]);
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
      const result = await requestSafeShieldRefresh();
      setState({
        action: null,
        error: null,
        message: result.accepted
          ? '차단 목록 갱신 작업을 시작했습니다.'
          : result.reason === 'already_running'
            ? '차단 목록을 이미 갱신하고 있습니다.'
            : '차단 목록 갱신 요청을 처리했습니다.',
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

  const updateLicense = useCallback(
    async (licenseKey: string): Promise<boolean> => {
      const normalizedKey = licenseKey.trim();

      if (!normalizedKey) {
        setState({
          action: null,
          error: '라이선스 키를 입력해 주세요.',
          message: null,
        });
        return false;
      }

      setState({ action: 'license', error: null, message: null });

      try {
        const result = await updateSafeShieldLicense(normalizedKey);
        setState({
          action: null,
          error: null,
          message: result.changed
            ? '라이선스 키를 저장했습니다.'
            : '입력한 라이선스 키가 이미 설정되어 있습니다.',
        });
        await refreshStatus();

        if (result.refresh.requested) {
          scheduleRefreshes([800, 2500, 6000, 12000]);
        }

        return true;
      } catch (error) {
        setState({
          action: null,
          error: errorMessage(error, '라이선스 키를 저장하지 못했습니다.'),
          message: null,
        });
        return false;
      }
    },
    [refreshStatus, scheduleRefreshes],
  );

  const dismissFeedback = useCallback(() => {
    setState((current) => ({ ...current, error: null, message: null }));
  }, []);

  return {
    ...state,
    dismissFeedback,
    refreshBlocklist,
    setEnabled,
    updateLicense,
  };
}
