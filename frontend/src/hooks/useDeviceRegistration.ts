import { useCallback, useEffect, useMemo, useState } from 'preact/hooks';

import {
  fetchDeviceRegistrationStatus,
  refreshDeviceRegistrationStatus,
  requestDevicePairingCode,
  type DeviceRegistrationStatus,
} from '../api/smartsafehub';

const PAIRING_POLL_INTERVAL_MS = 5_000;

function pairingStillValid(status: DeviceRegistrationStatus | null): boolean {
  if (!status?.pairingCode || status.accountRegistered === true) {
    return false;
  }

  if (!status.pairingExpiresAt) {
    return true;
  }

  const expiresAt = Date.parse(status.pairingExpiresAt);
  return !Number.isFinite(expiresAt) || expiresAt > Date.now();
}

export function useDeviceRegistration(enabled: boolean) {
  const [data, setData] = useState<DeviceRegistrationStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const [pairingBusy, setPairingBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) {
      return null;
    }

    setRefreshing(true);
    try {
      const status = await refreshDeviceRegistrationStatus();
      setData(status);
      setError(null);
      setSyncError(null);
      return status;
    }
    catch {
      // status-sync can outlive the RPC timeout while it starts a SafeShield
      // refresh. The helper persists account connection state first, so read
      // the local state again before leaving stale pairing data on screen.
      const localStatus = await fetchDeviceRegistrationStatus().catch(() => null);
      if (localStatus) {
        setData(localStatus);
        setError(null);
      }
      setSyncError('SmartSafeHub 서버에서 최신 계정 연결 상태를 확인하지 못했습니다.');
      return localStatus;
    }
    finally {
      setRefreshing(false);
    }
  }, [enabled]);

  const requestPairing = useCallback(async () => {
    setPairingBusy(true);
    try {
      const status = await requestDevicePairingCode();
      setData(status);
      setError(null);
      setSyncError(null);
      return status;
    }
    finally {
      setPairingBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let active = true;
    setLoading(true);

    void fetchDeviceRegistrationStatus()
      .then(async (localStatus) => {
        if (!active) return;
        setData(localStatus);
        setError(null);

        // A locally cached pairing code may already have been consumed on the
        // website. Verify it with Hub before the page is considered loaded so
        // a browser refresh does not briefly present a stale code as valid.
        const syncedStatus = await refreshDeviceRegistrationStatus().catch(() => null);
        if (!active) return;
        if (syncedStatus) {
          setData(syncedStatus);
          setSyncError(null);
        }
        else {
          // The sync RPC may time out after the helper has already persisted
          // accountRegistered=true and cleared the consumed pairing code.
          const latestLocalStatus = await fetchDeviceRegistrationStatus().catch(() => null);
          if (!active) return;
          if (latestLocalStatus) {
            setData(latestLocalStatus);
          }
          setSyncError('SmartSafeHub 서버에서 최신 계정 연결 상태를 확인하지 못했습니다.');
        }
      })
      .catch(() => {
        if (!active) return;
        setError('기기 등록 상태를 확인하지 못했습니다.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [enabled]);

  const shouldPoll = useMemo(() => pairingStillValid(data), [data]);

  useEffect(() => {
    if (!enabled || !shouldPoll) {
      return;
    }

    let active = true;
    let timer = 0;

    const poll = async () => {
      await refresh();
      if (active) {
        timer = window.setTimeout(() => void poll(), PAIRING_POLL_INTERVAL_MS);
      }
    };

    timer = window.setTimeout(() => void poll(), PAIRING_POLL_INTERVAL_MS);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [enabled, refresh, shouldPoll]);

  return {
    data,
    error,
    loading,
    pairingBusy,
    refresh,
    refreshing,
    requestPairing,
    syncError,
  };
}
