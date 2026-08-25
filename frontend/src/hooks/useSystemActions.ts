import { useCallback, useState } from 'preact/hooks';

import { fetchSafeShieldStatus } from '../api/safeshield';
import {
  fetchWifiSummary,
  requestSystemReboot,
} from '../api/smartsafehub';
import type { SafeShieldStatus } from '../types/safeshield';
import type { SmartSafeHubStatus } from '../types/status';
import type { SystemDiagnostics } from '../types/system';
import type { WifiSummary } from '../types/wifi';
import { t } from '../utils/gettext';
import { diagnosticFilename, downloadJson } from '../utils/download';
import { errorMessage } from '../utils/errors';

export type SystemAction = 'diagnostics' | 'reboot' | null;

interface SystemActionState {
  action: SystemAction;
  error: string | null;
  message: string | null;
  rebootAccepted: boolean;
}

function diagnosticSafeShieldStatus(status: SafeShieldStatus) {
  return {
    enabled: status.available ? status.enabled : null,
    status: status.status,
    lastResult: status.runtime.lastResult,
    validLineCount: status.blocklist.validLineCount,
    blocklistInstalled: status.blocklist.installed,
    dnsmasqOk: status.runtime.dnsRuntimeOk,
  };
}

function unavailableWifiSummary(): WifiSummary {
  return {
    networks: [],
    totalClients: 0,
  };
}

function unavailableSafeShieldDiagnostic() {
  return {
    enabled: null,
    status: 'unavailable',
    lastResult: null,
    validLineCount: 0,
    blocklistInstalled: false,
    dnsmasqOk: false,
  };
}

async function fetchDiagnostics(
  system: SmartSafeHubStatus | null,
): Promise<SystemDiagnostics> {
  if (!system) {
    throw new Error(
      t('System status is not ready. Please refresh and try again.'),
    );
  }

  // The system snapshot is already loaded for this page. Only the two
  // independent detail APIs are requested, and they run in parallel so a
  // missing optional service does not prevent the diagnostic file download.
  const [wifiResult, safeshieldResult] = await Promise.allSettled([
    fetchWifiSummary(),
    fetchSafeShieldStatus(),
  ]);

  return {
    generatedAt: Math.floor(Date.now() / 1000),
    system,
    wifi:
      wifiResult.status === 'fulfilled'
        ? wifiResult.value
        : unavailableWifiSummary(),
    safeshield:
      safeshieldResult.status === 'fulfilled'
        ? diagnosticSafeShieldStatus(safeshieldResult.value)
        : unavailableSafeShieldDiagnostic(),
  };
}

export function useSystemActions(system: SmartSafeHubStatus | null) {
  const [state, setState] = useState<SystemActionState>({
    action: null,
    error: null,
    message: null,
    rebootAccepted: false,
  });

  const downloadDiagnostics = useCallback(async () => {
    setState((current) => ({
      ...current,
      action: 'diagnostics',
      error: null,
      message: null,
    }));

    try {
      const diagnostics = await fetchDiagnostics(system);
      downloadJson(
        diagnosticFilename(
          diagnostics.system.device.hostname,
          diagnostics.generatedAt,
        ),
        diagnostics,
      );
      setState((current) => ({
        ...current,
        action: null,
        message: t('Diagnostic information file has been created.'),
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        action: null,
        error: errorMessage(error, t('Failed to complete system operation.')),
      }));
    }
  }, [system]);

  const reboot = useCallback(async () => {
    setState((current) => ({
      ...current,
      action: 'reboot',
      error: null,
      message: null,
    }));

    try {
      const result = await requestSystemReboot();
      setState({
        action: null,
        error: null,
        message: result.accepted
          ? t('Reboot has started. Please reconnect to the router in a few minutes.')
          : t('No reboot requests were received.'),
        rebootAccepted: result.accepted,
      });
    } catch (error) {
      setState((current) => ({
        ...current,
        action: null,
        error: errorMessage(error, t('Failed to complete system operation.')),
      }));
    }
  }, []);

  const dismissFeedback = useCallback(() => {
    setState((current) => ({
      ...current,
      error: null,
      message: null,
    }));
  }, []);

  return {
    ...state,
    dismissFeedback,
    downloadDiagnostics,
    reboot,
  };
}
