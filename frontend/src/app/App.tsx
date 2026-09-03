import type { ComponentChildren } from 'preact';

import { AppShell } from '../components/AppShell';
import { useConnectedDevices } from '../hooks/useConnectedDevices';
import { useHashRoute } from '../hooks/useHashRoute';
import { useSafeShieldActions } from '../hooks/useSafeShieldActions';
import { useSafeShieldRules } from '../hooks/useSafeShieldRules';
import { useSafeShieldStatistics } from '../hooks/useSafeShieldStatistics';
import { useSafeShieldStatus } from '../hooks/useSafeShieldStatus';
import { useSoftwareUpdates } from '../hooks/useSoftwareUpdates';
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
  const status = useStatus(route === 'home' || route === 'system');
  const updates = useSoftwareUpdates(true);
  const wifi = useWifi(route === 'wifi');
  const dashboardDevices = useConnectedDevices(route === 'home', false);
  const devices = useConnectedDevices(route === 'devices');
  const dashboardSafeShield = useSafeShieldStatus(route === 'home');
  const dashboardSafeShieldStatistics = useSafeShieldStatistics(route === 'home', false);
  const safeshield = useSafeShieldStatus(route === 'safeshield');
  const safeshieldStatistics = useSafeShieldStatistics(route === 'safeshield');
  const rules = useSafeShieldRules(route === 'rules');
  const systemActions = useSystemActions(status.data);
  const safeshieldActions = useSafeShieldActions(
    safeshield.refresh,
    safeshieldStatistics.refresh,
  );

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
          updateAction={updates.action}
          updateActionError={updates.actionError}
          updateData={updates.data}
          updateError={updates.error}
          updateLoading={updates.loading}
          updateMessage={updates.message}
          onCheckUpdates={() => void updates.check()}
          onDismissUpdateFeedback={updates.dismissFeedback}
          onInstallUpdates={() => void updates.install()}
          onRetryUpdates={() => void updates.refresh()}
          onSaveUpdateSettings={updates.saveSettings}
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
          statistics={safeshieldStatistics.data}
          statisticsError={safeshieldStatistics.error}
          statisticsLoading={safeshieldStatistics.loading}
          statisticsRefreshing={safeshieldStatistics.refreshing}
          onDismissFeedback={safeshieldActions.dismissFeedback}
          onReadLicense={safeshieldActions.readLicense}
          onRefreshBlocklist={() => void safeshieldActions.refreshBlocklist()}
          onRemoveLicense={safeshieldActions.removeLicense}
          onRetry={() => void safeshield.refresh()}
          onRetryStatistics={() => void safeshieldStatistics.refresh()}
          onSetEnabled={(enabled) => void safeshieldActions.setEnabled(enabled)}
          onSetStatisticsEnabled={(enabled) =>
            void safeshieldActions.setStatisticsEnabled(enabled)
          }
          onUpdateLicense={safeshieldActions.updateLicense}
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
          devices={dashboardDevices.data}
          devicesError={dashboardDevices.error}
          devicesLoading={dashboardDevices.loading}
          error={status.error}
          loading={status.loading}
          onRetry={() =>
            void Promise.all([
              status.refresh(),
              dashboardDevices.refresh(),
              dashboardSafeShield.refresh(),
              dashboardSafeShieldStatistics.refresh(),
              updates.refresh(),
            ])
          }
          safeshield={dashboardSafeShield.data}
          safeshieldError={dashboardSafeShield.error}
          safeshieldLoading={dashboardSafeShield.loading}
          statistics={dashboardSafeShieldStatistics.data}
          statisticsError={dashboardSafeShieldStatistics.error}
          statisticsLoading={dashboardSafeShieldStatistics.loading}
          statisticsRefreshing={dashboardSafeShieldStatistics.refreshing}
          updates={updates.data}
          updatesError={updates.error}
          updatesLoading={updates.loading}
        />
      );
  }

  const refreshCurrent = () => {
    if (route === 'home') {
      void Promise.all([
        status.refresh(),
        dashboardDevices.refresh(),
        dashboardSafeShield.refresh(),
        dashboardSafeShieldStatistics.refresh(),
        updates.refresh(),
      ]);
      return;
    }

    if (route === 'system') {
      void Promise.all([status.refresh(), updates.refresh()]);
      return;
    }

    if (route === 'safeshield') {
      void Promise.all([safeshield.refresh(), safeshieldStatistics.refresh()]);
      return;
    }

    void current.refresh();
  };

  return (
    <AppShell
      loading={current.loading}
      onRefresh={refreshCurrent}
      refreshing={
        current.refreshing ||
        (route === 'home' &&
          (dashboardDevices.refreshing ||
            dashboardSafeShield.refreshing ||
            dashboardSafeShieldStatistics.refreshing ||
            updates.refreshing)) ||
        (route === 'system' && updates.refreshing) ||
        (route === 'safeshield' && safeshieldStatistics.refreshing)
      }
      route={route}
      updateCount={updates.data?.updateCount ?? 0}
    >
      {content}
    </AppShell>
  );
}
