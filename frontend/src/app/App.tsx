import type { ComponentChildren } from 'preact';

import { AppShell } from '../components/AppShell';
import { useConnectedDevices } from '../hooks/useConnectedDevices';
import { useHashRoute } from '../hooks/useHashRoute';
import { useSafeShieldActions } from '../hooks/useSafeShieldActions';
import { useSafeShieldRules } from '../hooks/useSafeShieldRules';
import { useSafeShieldStatus } from '../hooks/useSafeShieldStatus';
import { useStatus } from '../hooks/useStatus';
import { useSystemActions } from '../hooks/useSystemActions';
import { useWifi } from '../hooks/useWifi';
import { ConnectedDevicesPage } from '../pages/ConnectedDevicesPage';
import { HomePage } from '../pages/HomePage';
import { SafeShieldPage } from '../pages/SafeShieldPage';
import { SafeShieldRulesPage } from '../pages/SafeShieldRulesPage';
import { SystemPage } from '../pages/SystemPage';
import { WifiPage } from '../pages/WifiPage';

export function App() {
  const route = useHashRoute();
  const status = useStatus();
  const wifi = useWifi(route === 'wifi');
  const devices = useConnectedDevices(route === 'devices');
  const safeshield = useSafeShieldStatus(route === 'safeshield');
  const rules = useSafeShieldRules(route === 'rules');
  const systemActions = useSystemActions(status.data);
  const safeshieldActions = useSafeShieldActions(safeshield.refresh);

  const current =
    route === 'wifi'
      ? wifi
      : route === 'devices'
        ? devices
        : route === 'safeshield'
          ? safeshield
          : route === 'rules'
            ? rules
            : status;

  let content: ComponentChildren;

  switch (route) {
    case 'wifi':
      content = (
        <WifiPage
          data={wifi.data}
          error={wifi.error}
          feedback={wifi.feedback}
          loading={wifi.loading}
          onDismissFeedback={wifi.dismissFeedback}
          onRetry={() => void wifi.refresh()}
          onUpdate={wifi.update}
          updatingSection={wifi.updatingSection}
        />
      );
      break;

    case 'devices':
      content = (
        <ConnectedDevicesPage
          data={devices.data}
          error={devices.error}
          loading={devices.loading}
          onRetry={() => void devices.refresh()}
        />
      );
      break;

    case 'system':
      content = (
        <SystemPage
          action={systemActions.action}
          data={status.data}
          error={status.error}
          feedbackError={systemActions.error}
          feedbackMessage={systemActions.message}
          loading={status.loading}
          onDismissFeedback={systemActions.dismissFeedback}
          onDownloadDiagnostics={() => void systemActions.downloadDiagnostics()}
          onReboot={() => void systemActions.reboot()}
          onRetry={() => void status.refresh()}
          rebootAccepted={systemActions.rebootAccepted}
        />
      );
      break;

    case 'safeshield':
      content = (
        <SafeShieldPage
          action={safeshieldActions.action}
          actionError={safeshieldActions.error}
          actionMessage={safeshieldActions.message}
          data={safeshield.data}
          error={safeshield.error}
          loading={safeshield.loading}
          onDismissFeedback={safeshieldActions.dismissFeedback}
          onRefreshBlocklist={() => void safeshieldActions.refreshBlocklist()}
          onRetry={() => void safeshield.refresh()}
          onSetEnabled={(enabled) => void safeshieldActions.setEnabled(enabled)}
        />
      );
      break;

    case 'rules':
      content = (
        <SafeShieldRulesPage
          action={rules.action}
          data={rules.data}
          error={rules.error}
          feedback={rules.feedback}
          loading={rules.loading}
          onAddRule={rules.addRule}
          onDeleteRule={rules.deleteRule}
          onDismissFeedback={rules.dismissFeedback}
          onRetry={() => void rules.refresh()}
        />
      );
      break;

    default:
      content = (
        <HomePage
          data={status.data}
          error={status.error}
          loading={status.loading}
          onRetry={() => void status.refresh()}
        />
      );
  }

  return (
    <AppShell
      loading={current.loading}
      onRefresh={() => void current.refresh()}
      refreshing={current.refreshing}
      route={route}
    >
      {content}
    </AppShell>
  );
}
