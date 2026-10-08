import { useEffect, useState } from 'preact/hooks';
import { fetchDeviceRegistrationStatus } from '../api/smartsafehub';

const ACCOUNT_STATUS_INTERVAL_MS = 60_000;

// Router-local status only; never contact Hub from the dashboard/sidebar.
export function useDashboardAccountStatus(accountRoute: boolean): boolean | null {
  const [registered, setRegistered] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;
    let inFlight = false;
    let lastAttempt = 0;

    const check = async (force = false) => {
      if (cancelled || document.visibilityState === 'hidden' || inFlight ||
          (!force && Date.now() - lastAttempt < ACCOUNT_STATUS_INTERVAL_MS)) return;
      inFlight = true;
      lastAttempt = Date.now();
      try {
        const status = await fetchDeviceRegistrationStatus();
        if (!cancelled) setRegistered(status.accountRegistered);
      } catch {
        // Unknown is not disconnected: retain last known state if available.
        if (!cancelled) setRegistered((previous) => previous ?? null);
      } finally {
        inFlight = false;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') void check();
    };
    const onFocus = () => void check();
    void check(true);
    timer = window.setInterval(() => void check(), ACCOUNT_STATUS_INTERVAL_MS);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      if (timer !== null) window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
    };
  }, [accountRoute]);

  return registered;
}
