import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

import {
  fetchSafeShieldLicense,
  requestSafeShieldRefresh,
  setSafeShieldEnabled,
  setSafeShieldStatisticsEnabled,
  updateSafeShieldLicense,
} from '../api/safeshield';
import { errorMessage } from '../utils/errors';

export type SafeShieldAction =
  | 'enable'
  | 'disable'
  | 'refresh'
  | 'statistics-enable'
  | 'statistics-disable'
  | 'license-read'
  | 'license-update'
  | 'license-remove';

interface SafeShieldActionState {
  action: SafeShieldAction | null;
  error: string | null;
  message: string | null;
}

export function useSafeShieldActions(
  refreshStatus: () => Promise<void>,
  refreshStatistics: () => Promise<void>,
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

  const scheduleStatisticsRefreshes = useCallback(
    (delays: number[]) => {
      clearTimers();

      timers.current = delays.map((delay) =>
        window.setTimeout(() => {
          void refreshStatistics();
        }, delay),
      );
    },
    [clearTimers, refreshStatistics],
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

  const setStatisticsEnabled = useCallback(
    async (enabled: boolean) => {
      const action: SafeShieldAction = enabled
        ? 'statistics-enable'
        : 'statistics-disable';
      setState({ action, error: null, message: null });

      try {
        const result = await setSafeShieldStatisticsEnabled(enabled);

        // Statistics-only configuration changes are reconciled synchronously by
        // SafeShield 0.3.14-r8+, so keep the busy indicator visible until the
        // first statistics refresh has observed the new runtime state.
        await refreshStatistics();

        setState({
          action: null,
          error: null,
          message: result.changed
            ? result.reconciled
              ? enabled
                ? '차단 통계 수집을 활성화했습니다.'
                : '차단 통계 수집을 비활성화했습니다.'
              : '차단 통계 설정을 저장했습니다.'
            : enabled
              ? '차단 통계 수집이 이미 활성화되어 있습니다.'
              : '차단 통계 수집이 이미 비활성화되어 있습니다.',
        });

        if (result.changed) {
          scheduleStatisticsRefreshes([500, 1500]);
        }
      } catch (error) {
        setState({
          action: null,
          error: errorMessage(error, '차단 통계 설정을 변경하지 못했습니다.'),
          message: null,
        });
      }
    },
    [refreshStatistics, scheduleStatisticsRefreshes],
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

      setState({ action: 'license-update', error: null, message: null });

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

  const readLicense = useCallback(async (): Promise<string | null> => {
    setState({ action: 'license-read', error: null, message: null });

    try {
      const result = await fetchSafeShieldLicense();
      setState({ action: null, error: null, message: null });
      return result.key;
    } catch (error) {
      setState({
        action: null,
        error: errorMessage(error, '라이선스 키를 불러오지 못했습니다.'),
        message: null,
      });
      return null;
    }
  }, []);

  const removeLicense = useCallback(async (): Promise<boolean> => {
    setState({ action: 'license-remove', error: null, message: null });

    try {
      const result = await updateSafeShieldLicense('');
      setState({
        action: null,
        error: null,
        message: result.changed
          ? '라이선스 키를 제거했습니다.'
          : '설정된 라이선스 키가 없습니다.',
      });
      await refreshStatus();

      if (result.refresh.requested) {
        scheduleRefreshes([800, 2500, 6000, 12000]);
      }

      return true;
    } catch (error) {
      setState({
        action: null,
        error: errorMessage(error, '라이선스 키를 제거하지 못했습니다.'),
        message: null,
      });
      return false;
    }
  }, [refreshStatus, scheduleRefreshes]);

  const dismissFeedback = useCallback(() => {
    setState((current) => ({ ...current, error: null, message: null }));
  }, []);

  return {
    ...state,
    dismissFeedback,
    readLicense,
    refreshBlocklist,
    removeLicense,
    setEnabled,
    setStatisticsEnabled,
    updateLicense,
  };
}
