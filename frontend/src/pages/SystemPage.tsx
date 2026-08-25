import { t } from '../utils/gettext';
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';

import {
  formatBytes,
  formatLoadAverage,
  formatUptime,
  getMemoryUsage,
} from '../app/format';
import type { SystemAction } from '../hooks/useSystemActions';
import type { SmartSafeHubStatus } from '../types/status';
import { luciAdminUrl } from '../utils/luci';

interface SystemPageProps {
  action: SystemAction;
  data: SmartSafeHubStatus | null;
  error: string | null;
  feedbackError: string | null;
  feedbackMessage: string | null;
  loading: boolean;
  rebootAccepted: boolean;
  onDismissFeedback: () => void;
  onDownloadDiagnostics: () => void;
  onReboot: () => void;
  onRetry: () => void;
}

function InfoCard(props: { label: string; value: string; description: string }) {
  return (
    <article class="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5 sm:p-5">
      <p class="m-0 text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">
        {props.label}
      </p>
      <p class="mt-3 mb-0 break-words text-2xl font-black tracking-tight text-slate-950">
        {props.value}
      </p>
      <p class="mt-2 mb-0 text-sm leading-6 text-slate-500">
        {props.description}
      </p>
    </article>
  );
}

function ActionCard(props: {
  title: string;
  description: string;
  children?: ComponentChildren;
  danger?: boolean;
}) {
  return (
    <article
      class={`min-w-0 rounded-2xl border bg-white p-5 shadow-sm shadow-slate-900/5 sm:p-6 ${
        props.danger ? 'border-rose-200' : 'border-slate-200'
      }`}
    >
      <h2 class={`m-0 text-xl font-black ${props.danger ? 'text-rose-950' : 'text-slate-950'}`}>
        {props.title}
      </h2>
      <p class={`mt-2 mb-0 text-sm leading-6 ${props.danger ? 'text-rose-700' : 'text-slate-500'}`}>
        {props.description}
      </p>
      <div class="mt-5">{props.children}</div>
    </article>
  );
}

export function SystemPage({
  action,
  data,
  error,
  feedbackError,
  feedbackMessage,
  loading,
  rebootAccepted,
  onDismissFeedback,
  onDownloadDiagnostics,
  onReboot,
  onRetry,
}: SystemPageProps) {
  const [confirmingReboot, setConfirmingReboot] = useState(false);

  if (loading && !data) {
    return (
      <div class="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm shadow-slate-900/5">
        <p class="m-0 text-sm font-bold text-slate-500">{t('Checking system information.')}</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div class="rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <h2 class="m-0 text-lg font-black text-rose-900">{t('Failed to load system information.')}</h2>
        <p class="mt-2 mb-0 text-sm leading-6 text-rose-700">{error}</p>
        <button
          class="mt-4 inline-flex min-h-10 items-center rounded-xl bg-rose-700 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-rose-800"
          onClick={onRetry}
          type="button"
        >
          {t('Try Again')}
        </button>
      </div>
    );
  }

  const memory = data?.runtime.memory;
  const totalMemory = memory?.total ?? 0;
  const memoryUsage = memory ? getMemoryUsage(memory) : null;
  const usedMemory = memoryUsage?.used ?? 0;
  const memoryPercent = Math.round(memoryUsage?.percent ?? 0);
  const firmwareUrl = luciAdminUrl('/admin/system/flash');
  const advancedSystemUrl = luciAdminUrl('/admin/system/system');
  const logsUrl = luciAdminUrl('/admin/status/logs');

  return (
    <section class="min-w-0 space-y-6">
      {(feedbackError || feedbackMessage) && (
        <div
          class={`flex min-w-0 flex-col gap-3 rounded-xl border px-4 py-3 text-sm font-bold sm:flex-row sm:items-center sm:justify-between ${
            feedbackError
              ? 'border-rose-200 bg-rose-50 text-rose-800'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
        >
          <span class="min-w-0">{feedbackError || feedbackMessage}</span>
          {!rebootAccepted && (
            <button
              class="shrink-0 self-start rounded-lg px-3 py-1.5 text-xs font-extrabold hover:bg-black/5 sm:self-auto"
              onClick={onDismissFeedback}
              type="button"
            >
              {t('CLOSE')}
            </button>
          )}
        </div>
      )}

      <div class="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InfoCard
          label={t('Firmware')}
          value={data ? `${data.software.version}` : t('Undetermined')}
          description={data ? data.software.revision : t('Version information could not be verified.')}
        />
        <InfoCard
          label={t('Uptime')}
          value={data ? formatUptime(data.runtime.uptime) : t('Undetermined')}
          description={data ? t('Kernel %s', data.software.kernel) : t('Execution time could not be determined.')}
        />
        <InfoCard
          label={t('Memory')}
          value={`${memoryPercent}%`}
          description={t('Use %s of %s', formatBytes(usedMemory), formatBytes(totalMemory))}
        />
        <InfoCard
          label={t('Load')}
          value={data ? formatLoadAverage(data.runtime.load[0]) : '0.00'}
          description={data
            ? t('5 min %s · 15 min %s', formatLoadAverage(data.runtime.load[1]), formatLoadAverage(data.runtime.load[2]))
            : t('The system load could not be verified.')}
        />
      </div>

      <div class="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
        <ActionCard
          title={t('Updating the firmware')}
          description={t('Validating and uploading firmware files is done from OpenWrt\'s Verified System Upgrades screen.')}
        >
          <a
            class="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-teal-700 sm:w-auto px-4 py-2.5 text-sm font-extrabold text-white no-underline transition hover:bg-teal-800"
            href={firmwareUrl}
          >
            {t('Open Firmware Management')}
          </a>
          <p class="mt-3 mb-0 text-xs leading-5 text-slate-500">
            {t('You can also download settings backups and restore backup files from the same screen.')}
          </p>
        </ActionCard>

        <ActionCard
          title={t('Diagnostic Info')}
          description={t('Stores device, firmware, memory, Internet, Wi-Fi and SafeShield status as JSON files. It does not include your password and license key, but it does include your hostname and network identification information such as your WAN IP and Wi-Fi SSID.')}
        >
          <button
            class="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white sm:w-auto px-4 py-2.5 text-sm font-extrabold text-slate-800 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
            disabled={action !== null}
            onClick={onDownloadDiagnostics}
            type="button"
          >
            {action === 'diagnostics' ? t('Generating diagnostic information') : t('Download diagnostic information')}
          </button>
          <p class="mt-3 mb-0 text-xs leading-5 text-slate-500">
            {t('Please check the network identifiers contained in the file before forwarding it to a support agent.')}
          </p>
        </ActionCard>

        <ActionCard
          title={t('Advanced Settings')}
          description={t('Detailed networks, firewalls, packages and logs are managed from the existing LuCI admin screen.')}
        >
          <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a
              class="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white sm:w-auto px-4 py-2.5 text-sm font-extrabold text-slate-800 no-underline transition hover:bg-slate-50"
              href={advancedSystemUrl}
            >
              {t('System Settings')}
            </a>
            <a
              class="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white sm:w-auto px-4 py-2.5 text-sm font-extrabold text-slate-800 no-underline transition hover:bg-slate-50"
              href={logsUrl}
            >
              {t('System Logs')}
            </a>
          </div>
        </ActionCard>

        <ActionCard
          danger
          title={t('Reboot router')}
          description={t('Internet and Wi-Fi connection interrupted briefly during reboot. If you have any unsaved LuCI settings, please save them first.')}
        >
          {!confirmingReboot ? (
            <button
              class="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-rose-300 bg-white sm:w-auto px-4 py-2.5 text-sm font-extrabold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
              disabled={action !== null || rebootAccepted}
              onClick={() => setConfirmingReboot(true)}
              type="button"
            >
              {t('Prepare for reboot')}
            </button>
          ) : (
            <div class="rounded-xl border border-rose-200 bg-rose-50 p-4">
              <p class="m-0 text-sm font-extrabold text-rose-900">
                {t('Do you want to reboot the router now?')}
              </p>
              <div class="mt-4 flex flex-wrap gap-3">
                <button
                  class="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white sm:min-h-10 sm:w-auto px-4 py-2 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50"
                  disabled={action !== null}
                  onClick={() => setConfirmingReboot(false)}
                  type="button"
                >
                  {t('Cancel')}
                </button>
                <button
                  class="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-rose-700 sm:min-h-10 sm:w-auto px-4 py-2 text-sm font-extrabold text-white transition hover:bg-rose-800 disabled:cursor-wait disabled:opacity-60"
                  disabled={action !== null}
                  onClick={onReboot}
                  type="button"
                >
                  {action === 'reboot' ? t('Requesting reboot') : t('Reboot now')}
                </button>
              </div>
            </div>
          )}
        </ActionCard>
      </div>

      <p class="m-0 text-xs leading-5 text-slate-500">
        {t('Firmware uploads, backups, and restores can have a big impact on your device, so use the existing LuCI verification procedures as they are. The SmartSafeHub product screen only provides frequent status checks and secure entry points.')}
      </p>
    </section>
  );
}
