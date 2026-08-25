import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

import {
  requestSafeShieldRefresh,
  setSafeShieldEnabled,
} from '../api/safeshield';
import { t } from '../utils/gettext';
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
              ? t('You applied a request to activate SafeShield protection.')
              : t('You applied a SafeShield protection deactivation request.')
            : enabled
              ? t('SafeShield protection is already active.')
              : t('SafeShield protection is already inactive.'),
        });
        await refreshStatus();
        scheduleRefreshes([800, 2000, 5000]);
      } catch (error) {
        setState({
          action: null,
          error: errorMessage(error, t('SafeShield operation failed.')),
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
          ? t('We\'ve started updating your blacklists.')
          : result.reason === 'already_running'
            ? t('The blocklist is already being renewed.')
            : t('We\'ve processed your request to renew your blacklist.'),
      });
      scheduleRefreshes([700, 2500, 6000, 12000]);
    } catch (error) {
      setState({
        action: null,
        error: errorMessage(error, t('SafeShield operation failed.')),
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
