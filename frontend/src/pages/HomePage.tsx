import { t } from '../utils/gettext';
import { useMemo } from 'preact/hooks';

import {
  ClockIcon,
  GlobeIcon,
  MemoryIcon,
  RouterIcon,
  ShieldIcon,
} from '../components/Icons';
import { ErrorPanel, LoadingPanel } from '../components/StatePanels';
import { StatusCard } from '../components/StatusCard';
import type { SmartSafeHubStatus } from '../types/status';
import {
  formatBootTime,
  formatBytes,
  formatUptime,
  getMemoryUsage,
} from '../app/format';

interface HomePageProps {
  data: SmartSafeHubStatus | null;
  error: string | null;
  loading: boolean;
  onRetry: () => void;
}

function StateBadge({ up }: { up: boolean }) {
  return (
    <span
      class={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-extrabold ring-1 ring-inset ${
        up
          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
          : 'bg-amber-50 text-amber-800 ring-amber-200'
      }`}
    >
      <span
        class={`size-2 rounded-full ${up ? 'bg-emerald-500' : 'bg-amber-500'}`}
      />
      {up ? t('OK') : t('Need verification')}
    </span>
  );
}

export function HomePage({ data, error, loading, onRetry }: HomePageProps) {
  const memory = useMemo(
    () => (data ? getMemoryUsage(data.runtime.memory) : null),
    [data],
  );

  if (loading) {
    return <LoadingPanel />;
  }

  if (error) {
    return <ErrorPanel message={error} onRetry={onRetry} />;
  }

  if (!data) {
    return null;
  }

  return (
    <>
      <section
        aria-label={t('Device summary')}
        class="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4"
      >
        <StatusCard
          description={data.device.hostname}
          eyebrow={t('Device')}
          icon={<RouterIcon class="size-6" />}
          title={data.device.model}
        />
        <StatusCard
          description={`${data.software.distribution} ${data.software.version} · ${data.software.revision}`}
          eyebrow={t('Firmware')}
          icon={<ShieldIcon class="size-6" />}
          title={data.software.version}
        />
        <StatusCard
          badge={<StateBadge up={data.network.up} />}
          description={
            data.network.available
              ? [data.network.protocol, data.network.ipv4Address]
                  .filter(Boolean)
                  .join(' · ') || t('No interface information')
              : t('WAN interface not found.')
          }
          eyebrow={t('Internet')}
          icon={<GlobeIcon class="size-6" />}
          title={data.network.up ? t('Bound') : t('Connection Verification Required')}
        />
        <StatusCard
          description={t('Boot time %s', formatBootTime(data.runtime.localtime, data.runtime.uptime))}
          eyebrow={t('Uptime')}
          icon={<ClockIcon class="size-6" />}
          title={formatUptime(data.runtime.uptime)}
        />
      </section>

      <section class="mt-5">
        <article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5 sm:p-6">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="m-0 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                {t('System health')}
              </p>
              <h2 class="mt-3 mb-0 text-xl font-extrabold tracking-tight text-slate-950">
                {t('SYSTEM STATUS')}
              </h2>
            </div>
            <span class="grid size-11 place-items-center rounded-xl bg-teal-50 text-teal-700">
              <MemoryIcon class="size-6" />
            </span>
          </div>

          <dl class="mt-6 grid gap-4 sm:grid-cols-3">
            <div class="rounded-xl bg-slate-50 p-4">
              <dt class="text-xs font-bold text-slate-500">{t('Memory Usage')}</dt>
              <dd class="mt-2 mb-0 ml-0 text-lg font-extrabold text-slate-950">
                {memory ? formatBytes(memory.used) : t('Inaccessible')}
              </dd>
            </div>
            <div class="rounded-xl bg-slate-50 p-4">
              <dt class="text-xs font-bold text-slate-500">{t('Full Memory')}</dt>
              <dd class="mt-2 mb-0 ml-0 text-lg font-extrabold text-slate-950">
                {formatBytes(data.runtime.memory.total)}
              </dd>
            </div>
            <div class="rounded-xl bg-slate-50 p-4">
              <dt class="text-xs font-bold text-slate-500">{t('1 min Load')}</dt>
              <dd class="mt-2 mb-0 ml-0 text-lg font-extrabold text-slate-950">
                {(data.runtime.load[0] / 65_536).toFixed(2)}
              </dd>
            </div>
          </dl>

          <div class="mt-5">
            <div class="mb-2 flex items-center justify-between gap-3 text-xs font-bold text-slate-500">
              <span>{t('-Memory usage')}</span>
              <span>{memory ? `${Math.round(memory.percent)}%` : '-'}</span>
            </div>
            <div class="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                class="h-full rounded-full bg-teal-600 transition-[width] duration-300"
                style={{ width: `${memory?.percent ?? 0}%` }}
              />
            </div>
          </div>
        </article>
      </section>
    </>
  );
}
