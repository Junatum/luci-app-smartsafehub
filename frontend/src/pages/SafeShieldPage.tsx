import { t } from '../utils/gettext';
import type { ComponentChildren } from 'preact';

import {
  AlertIcon,
  CalendarIcon,
  CheckCircleIcon,
  DatabaseIcon,
  DownloadIcon,
  KeyIcon,
  PowerIcon,
  ShieldIcon,
} from '../components/Icons';
import { ErrorPanel, LoadingPanel } from '../components/StatePanels';
import type { SafeShieldAction } from '../hooks/useSafeShieldActions';
import type { SafeShieldStatus } from '../types/safeshield';
import {
  formatBytes,
  formatInterval,
  formatNumber,
  formatTimestamp,
} from '../app/format';

interface SafeShieldPageProps {
  action: SafeShieldAction | null;
  actionError: string | null;
  actionMessage: string | null;
  data: SafeShieldStatus | null;
  error: string | null;
  loading: boolean;
  onDismissFeedback: () => void;
  onRefreshBlocklist: () => void;
  onRetry: () => void;
  onSetEnabled: (enabled: boolean) => void;
}

function BooleanState({
  value,
  trueLabel = t('OK'),
  falseLabel = t('Need verification'),
}: {
  value: boolean;
  trueLabel?: string;
  falseLabel?: string;
}) {
  return (
    <span
      class={`inline-flex items-center gap-2 text-sm font-extrabold ${
        value ? 'text-emerald-700' : 'text-slate-500'
      }`}
    >
      <span class={`size-2 rounded-full ${value ? 'bg-emerald-500' : 'bg-slate-300'}`} />
      {value ? trueLabel : falseLabel}
    </span>
  );
}

type ProductProtectionState =
  | 'disabled'
  | 'refreshing'
  | 'protecting'
  | 'paused'
  | 'error'
  | 'attention';

function getProductProtectionState(data: SafeShieldStatus): ProductProtectionState {
  if (!data.enabled || data.status === 'disabled') {
    return 'disabled';
  }

  if (data.status === 'running') {
    return 'refreshing';
  }

  if (
    data.status === 'error' ||
    data.health.overall === 'error' ||
    data.issueCounts.errors > 0
  ) {
    return 'error';
  }

  if (data.status === 'paused') {
    return 'paused';
  }

  if (
    data.active &&
    data.runtime.dnsmasqRunning &&
    data.runtime.dnsRuntimeOk
  ) {
    return 'protecting';
  }

  return 'attention';
}

function getSummaryLabel(data: SafeShieldStatus): string {
  const labels: Record<ProductProtectionState, string> = {
    disabled: t('not active'),
    refreshing: t('Updating'),
    protecting: t('You Are Protected'),
    paused: t('Pause'),
    error: t('Error'),
    attention: t('Need verification'),
  };

  return labels[getProductProtectionState(data)];
}

function getSummaryMessage(data: SafeShieldStatus): string {
  const protectionState = getProductProtectionState(data);

  if (protectionState === 'protecting') {
    if (data.blocklist.validLineCount > 0) {
      return t('You are protecting your DNS with %s domain blocking rules.', formatNumber(data.blocklist.validLineCount));
    }

    if (data.blocklist.installed) {
      return t('The blocklist is installed and DNS protection is working normally.');
    }

    return t('The SafeShield service and DNS runtime are operating normally.');
  }

  if (protectionState === 'refreshing') {
    return data.stage
      ? t('Your blocklist is being updated. Current stage: %s', data.stage)
      : t('Your blocklist is being updated.');
  }

  if (protectionState === 'disabled') {
    return t('SafeShield DNS protection is disabled.');
  }

  if (protectionState === 'paused') {
    return t('SafeShield job is paused.');
  }

  if (protectionState === 'error') {
    return data.runtime.lastErrorCode
      ? t('An error occurred on a recent task: %s', data.runtime.lastErrorCode)
      : t('A recent SafeShield operation encountered an error.');
  }

  if (!data.active) {
    return t('SafeShield is enabled but the service is not running.');
  }

  if (!data.runtime.dnsmasqRunning) {
    return t('dnsmasq is not running and we need to check the DNS protection status.');
  }

  if (!data.runtime.dnsRuntimeOk) {
    return t('You need to check the SafeShield DNS runtime status.');
  }

  return data.summary.message;
}

function getHealthLabel(value: string): string {
  const labels: Record<string, string> = {
    ok: t('OK'),
    warning: t('Warning'),
    error: t('Error'),
    unavailable: t('Banned'),
  };

  return labels[value] ?? value;
}

function SummaryBadge({ data }: { data: SafeShieldStatus }) {
  const protectionState = getProductProtectionState(data);
  const stateClass =
    protectionState === 'error'
      ? 'bg-red-50 text-red-700 ring-red-200'
      : protectionState === 'disabled'
        ? 'bg-slate-100 text-slate-700 ring-slate-200'
        : protectionState === 'refreshing'
          ? 'bg-blue-50 text-blue-700 ring-blue-200'
          : protectionState === 'paused' || protectionState === 'attention'
            ? 'bg-amber-50 text-amber-800 ring-amber-200'
            : 'bg-emerald-50 text-emerald-700 ring-emerald-200';

  return (
    <span
      class={`inline-flex items-center rounded-full px-3 py-1.5 text-xs font-extrabold ring-1 ring-inset ${stateClass}`}
    >
      {getSummaryLabel(data)}
    </span>
  );
}

function InfoCard({
  eyebrow,
  icon,
  children,
}: {
  eyebrow: string;
  icon: ComponentChildren;
  children: ComponentChildren;
}) {
  return (
    <article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5 sm:p-5">
      <div class="flex items-center justify-between gap-4">
        <p class="m-0 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
          {eyebrow}
        </p>
        <span class="grid size-10 place-items-center rounded-xl bg-teal-50 text-teal-700">
          {icon}
        </span>
      </div>
      {children}
    </article>
  );
}

function ActionFeedback({
  error,
  message,
  onDismiss,
}: {
  error: string | null;
  message: string | null;
  onDismiss: () => void;
}) {
  if (!error && !message) {
    return null;
  }

  const failed = error !== null;

  return (
    <div
      aria-live={failed ? 'assertive' : 'polite'}
      class={`mt-4 flex flex-col items-start gap-3 rounded-2xl border px-4 sm:flex-row sm:justify-between py-3 text-sm ${
        failed
          ? 'border-red-200 bg-red-50 text-red-900'
          : 'border-emerald-200 bg-emerald-50 text-emerald-900'
      }`}
      role={failed ? 'alert' : 'status'}
    >
      <div class="flex min-w-0 items-start gap-3">
        {failed ? (
          <AlertIcon class="mt-0.5 size-5 shrink-0" />
        ) : (
          <CheckCircleIcon class="mt-0.5 size-5 shrink-0" />
        )}
        <p class="m-0 font-semibold leading-6">{error ?? message}</p>
      </div>
      <button
        aria-label={t('Close notifications')}
        class="shrink-0 rounded-lg border-0 bg-transparent px-2 py-1 font-black text-current opacity-60 transition hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-current"
        onClick={onDismiss}
        type="button"
      >
        ×
      </button>
    </div>
  );
}

export function SafeShieldPage({
  action,
  actionError,
  actionMessage,
  data,
  error,
  loading,
  onDismissFeedback,
  onRefreshBlocklist,
  onRetry,
  onSetEnabled,
}: SafeShieldPageProps) {
  if (loading) {
    return <LoadingPanel />;
  }

  if (error) {
    return <ErrorPanel message={error} onRetry={onRetry} />;
  }

  if (!data) {
    return <LoadingPanel />;
  }

  if (!data.available) {
    return (
      <section class="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
        <span class="grid size-11 place-items-center rounded-xl bg-amber-100 text-amber-800">
          <AlertIcon class="size-6" />
        </span>
        <h2 class="mt-5 mb-0 text-xl font-extrabold text-amber-950">
          {t('SafeShield Status API not found')}
        </h2>
        <p class="mt-2 mb-0 text-sm leading-6 text-amber-900">
          {t('please make sure you have the safeshield package and the rpcd ucode plugin installed.')}
        </p>
      </section>
    );
  }

  const enabled = data.enabled;
  const refreshing = data.status === 'running';
  const actionBusy = action !== null;
  const toggleLabel = enabled
    ? action === 'disable'
      ? t('Turning off…')
      : t('Protection off')
    : action === 'enable'
      ? t('Turning on…')
      : t('Turn on protection');

  function handleToggle(): void {
    if (enabled) {
      const confirmed = window.confirm(
        t('If you turn SafeShield protection off, the current blocklist will be removed and DNS blocking will be interrupted immediately. Are you sure you want to continue?'),
      );

      if (!confirmed) {
        return;
      }
    }

    onSetEnabled(!enabled);
  }

  return (
    <>
      <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5">
        <div class="flex flex-col gap-5 p-5 lg:flex-row lg:items-start lg:justify-between sm:p-6">
          <div class="flex min-w-0 items-start gap-3 sm:gap-4">
            <span class="grid size-12 shrink-0 place-items-center rounded-2xl bg-teal-50 text-teal-700">
              <ShieldIcon class="size-7" />
            </span>
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-3">
                <h2 class="m-0 break-words text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                  {t('SafeShield protected status')}
                </h2>
                <SummaryBadge data={data} />
              </div>
              <p class="mt-3 mb-0 text-sm leading-6 text-slate-600">
                {getSummaryMessage(data)}
              </p>
              <p class="mt-2 mb-0 text-xs font-semibold text-slate-500">
                {t('Version')} {data.version ?? t('unknown')}
                {data.stage ? t(' · Stage %s', data.stage) : ''}
              </p>
            </div>
          </div>

          <div class="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <button
              class={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-extrabold transition focus:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50 ${
                data.enabled
                  ? 'border-red-200 bg-white text-red-700 hover:border-red-300 hover:bg-red-50 focus-visible:ring-red-100'
                  : 'border-teal-700 bg-teal-700 text-white hover:border-teal-800 hover:bg-teal-800 focus-visible:ring-teal-100'
              }`}
              disabled={actionBusy || refreshing}
              onClick={handleToggle}
              type="button"
            >
              <PowerIcon class={`size-4 ${action === 'enable' || action === 'disable' ? 'animate-pulse' : ''}`} />
              {toggleLabel}
            </button>
            <button
              class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-100 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!data.enabled || actionBusy || refreshing}
              onClick={onRefreshBlocklist}
              type="button"
            >
              <DownloadIcon class={`size-4 ${action === 'refresh' || refreshing ? 'animate-bounce' : ''}`} />
              {action === 'refresh'
                ? t('Starting')
                : refreshing
                  ? t('Updating…')
                  : t('renew now')}
            </button>
          </div>
        </div>
      </section>

      <ActionFeedback
        error={actionError}
        message={actionMessage}
        onDismiss={onDismissFeedback}
      />

      <section class="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InfoCard eyebrow={t('Protection')} icon={<CheckCircleIcon class="size-5" />}>
          <h3 class="mt-4 mb-0 text-lg font-extrabold text-slate-950">
            {t('DNS protection')}
          </h3>
          <dl class="mt-4 mb-0 grid gap-3">
            <div class="flex items-center justify-between gap-3">
              <dt class="text-sm text-slate-600">{t('SafeShield Service')}</dt>
              <dd class="m-0"><BooleanState falseLabel={t('Stopped')} trueLabel={t('In Action')} value={data.active} /></dd>
            </div>
            <div class="flex items-center justify-between gap-3">
              <dt class="text-sm text-slate-600">{t('dnsmasq')}</dt>
              <dd class="m-0"><BooleanState falseLabel={t('Stopped')} value={data.runtime.dnsmasqRunning} /></dd>
            </div>
            <div class="flex items-center justify-between gap-3">
              <dt class="text-sm text-slate-600">{t('DNS Runtime')}</dt>
              <dd class="m-0"><BooleanState value={data.runtime.dnsRuntimeOk} /></dd>
            </div>
          </dl>
        </InfoCard>

        <InfoCard eyebrow={t('Blocklist')} icon={<DatabaseIcon class="size-5" />}>
          <h3 class="mt-4 mb-0 text-lg font-extrabold text-slate-950">
            {formatNumber(data.blocklist.validLineCount)}{t('domains')}
          </h3>
          <p class="mt-2 mb-0 text-sm text-slate-600">
            {t('File Size')} {formatBytes(data.blocklist.fileSizeKb * 1024)}
          </p>
          <div class="mt-4"><BooleanState falseLabel={t('Not Installed')} trueLabel={t('INSTALLED')} value={data.blocklist.installed} /></div>
        </InfoCard>

        <InfoCard eyebrow={t('License')} icon={<KeyIcon class="size-5" />}>
          <h3 class="mt-4 mb-0 text-lg font-extrabold text-slate-950">
            {data.license.plan?.toUpperCase() || t('Plan not confirmed')}
          </h3>
          <p class="mt-2 mb-0 text-sm text-slate-600">
            {data.license.status || (data.license.configured ? t('Checking status') : t('License not set'))}
          </p>
          <p class="mt-4 mb-0 text-xs font-bold text-slate-500">
            {data.license.configured ? t('Licenses linked') : t('No license key')}
          </p>
        </InfoCard>

        <InfoCard eyebrow={t('Artifact')} icon={<ShieldIcon class="size-5" />}>
          <h3 class="mt-4 mb-0 text-lg font-extrabold text-slate-950">
            {data.artifact.tier || t('Artifact not identified')}
          </h3>
          <p class="mt-2 mb-0 break-all text-sm text-slate-600">
            {data.artifact.version || t('No version information')}
          </p>
          <p class="mt-4 mb-0 text-xs font-bold text-slate-500">
            {t('RULES')} {formatNumber(data.artifact.rules)}{t('bill(s)')}
          </p>
        </InfoCard>
      </section>

      <section class="mt-5 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5 sm:p-6">
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="m-0 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                {t('Refresh schedule')}
              </p>
              <h2 class="mt-3 mb-0 text-xl font-extrabold text-slate-950">
                {t('Renew your blocklist')}
              </h2>
            </div>
            <span class="grid size-11 place-items-center rounded-xl bg-teal-50 text-teal-700">
              <CalendarIcon class="size-6" />
            </span>
          </div>
          <dl class="mt-6 grid gap-4 sm:grid-cols-3">
            <div class="rounded-xl bg-slate-50 p-4">
              <dt class="text-xs font-bold text-slate-500">{t('Last Success')}</dt>
              <dd class="mt-2 mb-0 ml-0 text-sm font-extrabold leading-5 text-slate-950">
                {formatTimestamp(data.timestamps.lastSuccess)}
              </dd>
            </div>
            <div class="rounded-xl bg-slate-50 p-4">
              <dt class="text-xs font-bold text-slate-500">{t('Next Renewal')}</dt>
              <dd class="mt-2 mb-0 ml-0 text-sm font-extrabold leading-5 text-slate-950">
                {formatTimestamp(data.timestamps.nextRefreshAt)}
              </dd>
            </div>
            <div class="rounded-xl bg-slate-50 p-4">
              <dt class="text-xs font-bold text-slate-500">{t('Listing Duration')}</dt>
              <dd class="mt-2 mb-0 ml-0 text-sm font-extrabold text-slate-950">
                {formatInterval(data.timestamps.refreshIntervalS)}
              </dd>
            </div>
          </dl>
          <p class="mt-5 mb-0 text-xs leading-5 text-slate-500">
            {t('Manual renewal runs in the background. Progress is reflected by screen refresh and automatic status check.')}
          </p>
        </article>

        <aside class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5 sm:p-6">
          <p class="m-0 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            {t('Health')}
          </p>
          <h2 class="mt-3 mb-0 text-xl font-extrabold text-slate-950">
            {t('Health check')}
          </h2>
          <dl class="mt-6 grid gap-4">
            <div class="flex items-center justify-between gap-4 rounded-xl bg-slate-50 p-4">
              <dt class="text-sm font-bold text-slate-600">{t('Overall Status')}</dt>
              <dd class="m-0 text-sm font-extrabold text-slate-950">{getHealthLabel(data.health.overall)}</dd>
            </div>
            <div class="flex items-center justify-between gap-4 rounded-xl bg-slate-50 p-4">
              <dt class="text-sm font-bold text-slate-600">{t('Warning')}</dt>
              <dd class="m-0 text-sm font-extrabold text-amber-700">{data.issueCounts.warnings}</dd>
            </div>
            <div class="flex items-center justify-between gap-4 rounded-xl bg-slate-50 p-4">
              <dt class="text-sm font-bold text-slate-600">{t('Error')}</dt>
              <dd class="m-0 text-sm font-extrabold text-red-700">{data.issueCounts.errors}</dd>
            </div>
          </dl>
          <p class="mt-5 mb-0 text-xs leading-5 text-slate-500">
            {t('Turning off protection will stop the SafeShield service and remove the current DNS blocklist. After turning it back on, you can renew it immediately when you need it.')}
          </p>
        </aside>
      </section>
    </>
  );
}
