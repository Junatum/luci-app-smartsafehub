import { useEffect, useState } from 'preact/hooks';

import { fetchDeviceRegistrationStatus } from '../api/smartsafehub';

// Dashboard only needs the router-local registration flag. Never trigger
// device_registration_refresh (which can make a network request to Hub).
export function useDashboardAccountStatus(enabled: boolean): boolean | null {
  const [registered, setRegistered] = useState<boolean | null>(null);

  useEffect(() => {
    if (!enabled) {
      setRegistered(null);
      return;
    }

    let active = true;
    setRegistered(null);
    void fetchDeviceRegistrationStatus()
      .then((status) => {
        if (active) setRegistered(status.accountRegistered);
      })
      .catch(() => {
        // Unknown must never be presented as disconnected.
        if (active) setRegistered(null);
      });

    return () => {
      active = false;
    };
  }, [enabled]);

  return registered;
}
