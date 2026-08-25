import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

import { fetchWifiSummary, updateWifiNetwork } from '../api/smartsafehub';
import { RpcError } from '../api/rpc';
import type { WifiUpdateInput } from '../types/wifi';
import { t } from '../utils/gettext';
import { errorMessage } from '../utils/errors';
import { useAsyncResource } from './useAsyncResource';

const RUNTIME_REFRESH_DELAYS_MS = [2_000, 3_000] as const;

export type WifiFeedback =
  | { kind: 'success' | 'warning' | 'error'; message: string }
  | null;

interface WifiMutationState {
  updatingSection: string | null;
  feedback: WifiFeedback;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export function useWifi(active: boolean) {
  const resource = useAsyncResource({
    active,
    fallbackError: t('Failed to process Wi-Fi settings.'),
    loader: fetchWifiSummary,
  });
  const mounted = useRef(true);
  const activeRef = useRef(active);
  const [mutation, setMutation] = useState<WifiMutationState>({
    updatingSection: null,
    feedback: null,
  });

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const refreshRuntimeAfterReload = useCallback(async () => {
    for (const waitMs of RUNTIME_REFRESH_DELAYS_MS) {
      await delay(waitMs);

      if (!mounted.current || !activeRef.current) {
        return;
      }

      await resource.refresh();
    }
  }, [resource.refresh]);

  const update = useCallback(
    async (input: WifiUpdateInput): Promise<boolean> => {
      setMutation({
        updatingSection: input.section,
        feedback: null,
      });

      try {
        const result = await updateWifiNetwork(input);
        resource.replaceData(result.summary);
        setMutation({
          updatingSection: null,
          feedback: {
            kind: 'success',
            message: result.changed
              ? t('Saved your Wi-Fi settings and reloaded your wireless network.')
              : t('No Wi-Fi settings have been changed.'),
          },
        });

        if (result.reloaded) {
          void refreshRuntimeAfterReload();
        }

        return true;
      } catch (error) {
        const connectionMayHaveChanged =
          error instanceof RpcError &&
          ['NETWORK_ERROR', 'RPC_TIMEOUT'].includes(error.code);

        setMutation({
          updatingSection: null,
          feedback: {
            kind: connectionMayHaveChanged ? 'warning' : 'error',
            message: connectionMayHaveChanged
              ? t('Your Wi-Fi may have restarted and you may have lost connection. Please reconnect to the SSID you changed and refresh the screen.')
              : errorMessage(error, t('Failed to process Wi-Fi settings.')),
          },
        });
        return false;
      }
    },
    [refreshRuntimeAfterReload, resource.replaceData],
  );

  const dismissFeedback = useCallback(() => {
    setMutation((current) => ({ ...current, feedback: null }));
  }, []);

  return {
    ...resource,
    ...mutation,
    update,
    dismissFeedback,
  };
}
