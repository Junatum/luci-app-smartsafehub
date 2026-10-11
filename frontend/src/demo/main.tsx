import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';

import { AppShell } from '../components/AppShell';
import { useHashRoute } from '../hooks/useHashRoute';
import { ConnectedDevicesPage } from '../pages/ConnectedDevicesPage';
import { HomePage } from '../pages/HomePage';
import { SafeShieldPage } from '../pages/SafeShieldPage';
import {
  demoActivity, demoDevices, demoFirmware, demoHealth, demoLan,
  demoSafeShield, demoStatistics, demoStatus, demoUpdates,
} from './data';
import '../styles/app.css';

// This entry MUST NOT import App, auth/session, or api/*. No backend is involved.
const ALLOWED_ROUTES = new Set(['home', 'devices', 'safeshield']);

function DemoApp() {
  const currentRoute = useHashRoute();
  const route = ALLOWED_ROUTES.has(currentRoute) ? currentRoute : 'home';
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (!ALLOWED_ROUTES.has(currentRoute)) {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#home`);
      setNotice('해당 기능은 현재 데모에서 제공하지 않습니다.');
    }
  }, [currentRoute]);
  const readonlyNotice = () => setNotice('데모에서는 실제 공유기 설정을 변경할 수 없습니다.');
  const dismiss = () => setNotice('');
  const reset = () => setNotice('예시 데이터가 표시되고 있습니다. 실제 공유기에는 연결되지 않습니다.');

  let content;
  switch (route) {
    case 'devices':
      content = <ConnectedDevicesPage data={demoDevices} error={null} loading={false} onRetry={reset} />;
      break;
    case 'safeshield':
      content = (
        <SafeShieldPage
          action={null} actionError={null} actionMessage={null} data={demoSafeShield}
          error={null} loading={false} statistics={demoStatistics} statisticsError={null}
          statisticsLoading={false} statisticsRefreshing={false} onDismissFeedback={dismiss}
          onRefreshBlocklist={readonlyNotice} onRetry={reset} onRetryStatistics={reset}
          onSetEnabled={readonlyNotice} onSetStatisticsEnabled={readonlyNotice}
        />
      );
      break;
    default:
      content = (
        <HomePage
          accountRegistered={false} activity={demoActivity} activityError={null} activityLoading={false}
          data={demoStatus} devices={demoDevices} devicesError={null} devicesLoading={false}
          error={null} firmware={demoFirmware} firmwareError={null} firmwareLoading={false}
          health={demoHealth} healthError={null} healthLoading={false}
          lan={demoLan} lanError={null} lanLoading={false} loading={false} onRetry={reset}
          safeshield={demoSafeShield} safeshieldError={null} safeshieldLoading={false}
          statistics={demoStatistics} statisticsError={null} statisticsLoading={false}
          statisticsRefreshing={false} updates={demoUpdates} updatesError={null} updatesLoading={false}
        />
      );
  }

  return (
    <AppShell accountRegistered={false} demo loading={false} onRefresh={reset} refreshing={false} route={route} updateCount={0}>
      <div role="status" class="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-900">
        <span>체험 모드 · 표시되는 기기와 보호 통계는 모두 예시입니다.</span>
        <a class="font-extrabold underline" href="/devices/">지원 기기 살펴보기 →</a>
      </div>
      {notice ? (
        <div role="alert" class="mb-5 flex items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
          {notice}
          <button aria-label="안내 닫기" class="font-black" onClick={dismiss} type="button">✕</button>
        </div>
      ) : null}
      {content}
    </AppShell>
  );
}

// The real router app mounts into a shadow root too. Isolate Tailwind Preflight
// from Django's global CSS and keep the same actual router components/styling.
const host = document.getElementById('smartsafehub-demo-root');
if (host) {
  const shadow = host.attachShadow({ mode: 'open' });
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = host.dataset.demoCss || '/static/router-demo/demo.css';
  shadow.appendChild(stylesheet);
  const mount = document.createElement('div');
  mount.className = 'smartsafehub-shadow-root';
  shadow.appendChild(mount);
  render(<DemoApp />, mount);
}
