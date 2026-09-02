import type { ComponentChildren } from 'preact';
import { useMemo } from 'preact/hooks';

import {
  ClockIcon,
  GlobeIcon,
  MemoryIcon,
  RouterIcon,
  ShieldIcon,
  UpdateIcon,
} from '../components/Icons';
import { ErrorPanel, LoadingPanel } from '../components/StatePanels';
import type { SmartSafeHubStatus } from '../types/status';
import type { SoftwareUpdateStatus } from '../types/updates';
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
  updates: SoftwareUpdateStatus | null;
}

interface MetricCardProps {
  eyebrow: string;
  icon: ComponentChildren;
  title: string;
  value: string;
  detail: string;
  state?: 'healthy' | 'warning' | 'neutral';
}

function MetricCard({ detail, eyebrow, icon, state = 'neutral', title, value }: MetricCardProps) {
  const stateClass =
    state === 'healthy'
      ? 'bg-emerald-50 text-emerald-700'
      : state === 'warning'
        ? 'bg-amber-50 text-amber-800'
        : 'bg-slate-100 text-slate-600';

  return (
  <article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/[0.03] sm:p-5">
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <p class="m-0 text-[0.65rem] font-black uppercase tracking-[0.16em] text-slate-400">{eyebrow}</p>
        <h2 class="mt-3 mb-0 truncate text-sm font-extrabold text-slate-600">{title}</h2>
      </div>
      <span class={`grid size-10 shrink-0 place-items-center rounded-xl ${stateClass}`}>{icon}</span>
    </div>
    <p class="mt-4 mb-0 break-words text-2xl font-black tracking-tight text-slate-950">{value}</p>
    <p class="mt-1.5 mb-0 break-words text-xs font-medium leading-5 text-slate-500">{detail}</p>
  </article>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div class="flex items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0">
      <dt class="text-sm font-semibold text-slate-500">{label}</dt>
      <dd class="m-0 max-w-[65%] break-words text-right text-sm font-extrabold text-slate-900">{value}</dd>
    </div>
   );
}

export function HomePage({ data, error, loading, onRetry, updates }: HomePageProps) {
  const memory = useMemo(() => (data ? getMemoryUsage(data.runtime.memory) : null), [data]);
  const availableVersion = updates?.packages.find(
    (item) => item.name === 'luci-app-smartsafehub' && item.updateAvailable,
  )?.availableVersion;
  const latestReleaseNote =
    updates?.releaseNotes.find((note) => note.version === availableVersion) ?? updates?.releaseNotes[0];

  if (loading) {
    return <LoadingPanel />;
  }

  if (error) {
    return <ErrorPanel message={error} onRetry={onRetry} />;
  }

  if (!data) {
    return null;
  }

  const wanDetail = data.network.available
    ? [data.network.protocol, data.network.ipv4Address].filter(Boolean).join(' · ') || '인터페이스 정보 없음'
    : 'WAN 인터페이스를 찾을 수 없습니다.';
  const loadOneMinute = (data.runtime.load[0] / 65_536).toFixed(2);
  const memoryPercent = memory ? Math.round(memory.percent) : 0;

  return (
    <>
      {updates && updates.updateCount > 0 ? (
        <a
          class="mb-6 flex min-w-0 items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-amber-950 no-underline transition hover:bg-amber-100/70 sm:px-5"
          href="#system"
        >
          <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-800">
            <UpdateIcon class="size-5" />
          </span>
          <span class="min-w-0 flex-1">
            <strong class="block text-sm font-black">SmartSafeHub 업데이트가 있습니다.</strong>
            <span class="mt-1 block text-xs leading-5 text-amber-800">
              {latestReleaseNote?.summary || '새 SmartSafeHub 버전을 설치할 수 있습니다. 업데이트 화면에서 확인해 주세요.'}
            </span>
          </span>
          <span class="hidden shrink-0 text-xs font-black sm:inline">업데이트 확인</span>
        </a>
      ) : null}

      <section aria-labelledby="overview-title">
        <div class="mb-4 flex items-end justify-between gap-4">
          <div>
            <p class="m-0 text-[0.68rem] font-black uppercase tracking-[0.18em] text-teal-700">Overview</p>
            <h2 class="mt-1.5 mb-0 text-xl font-black tracking-tight text-slate-950" id="overview-title">System overview</h2>
          </div>
          <span class="hidden text-xs font-semibold text-slate-400 sm:block">현재 장치 상태</span>
        </div>
        <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            detail={wanDetail}
            eyebrow="Internet"
            icon={<GlobeIcon class="size-5" />}
            state={data.network.up ? 'healthy' : 'warning'}
            title="WAN connection"
            value={data.network.up ? 'Online' : 'Check connection'}
          />
          <MetricCard
            detail={data.device.hostname}
            eyebrow="Device"
            icon={<RouterIcon class="size-5" />}
            title="Router"
            value={data.device.model}
          />
          <MetricCard
            detail={`부팅 ${formatBootTime(data.runtime.localtime, data.runtime.uptime)}`}
            eyebrow="Uptime"
            icon={<ClockIcon class="size-5" />}
            state="healthy"
            title="System runtime"
            value={formatUptime(data.runtime.uptime)}
          />
          <MetricCard
            detail={`${memory ? formatBytes(memory.used) : '-'} / ${formatBytes(data.runtime.memory.total)}`}
            eyebrow="Memory"
            icon={<MemoryIcon class="size-5" />}
            state={memoryPercent >= 90 ? 'warning' : 'neutral'}
            title="Memory usage"
            value={`${memoryPercent}%`}
          />
        </div>
      </section>

      <section class="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.75fr)]">
        <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.03] sm:p-6">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="m-0 text-[0.68rem] font-black uppercase tracking-[0.18em] text-slate-400">Health</p>
              <h2 class="mt-2 mb-0 text-xl font-black tracking-tight text-slate-950">System health</h2>
              <p class="mt-1.5 mb-0 text-sm leading-6 text-slate-500">메모리와 시스템 부하를 빠르게 확인합니다.</p>
            </div>
            <span class="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700 ring-1 ring-inset ring-emerald-200">
              <span class="size-2 rounded-full bg-emerald-500" /> Running
            </span>
          </div>

          <div class="mt-6 grid gap-4 sm:grid-cols-3">
            <div class="rounded-xl bg-slate-50 p-4">
              <p class="m-0 text-xs font-bold text-slate-500">Memory used</p>
              <p class="mt-2 mb-0 text-lg font-black text-slate-950">{memory ? formatBytes(memory.used) : '확인 불가'}</p>
            </div>

            <div class="rounded-xl bg-slate-50 p-4">
              <p class="m-0 text-xs font-bold text-slate-500">Total memory</p>
              <p class="mt-2 mb-0 text-lg font-black text-slate-950">{formatBytes(data.runtime.memory.total)}</p>
            </div>

            <div class="rounded-xl bg-slate-50 p-4">
              <p class="m-0 text-xs font-bold text-slate-500">1 min load</p>
              <p class="mt-2 mb-0 text-lg font-black text-slate-950">{loadOneMinute}</p>
            </div>
          </div>

          <div class="mt-6">
            <div class="mb-2 flex items-center justify-between gap-3 text-xs font-bold text-slate-500">
              <span>Memory utilization</span>
              <span>{memoryPercent}%</span>
            </div>
            <div class="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div class="h-full rounded-full bg-teal-600 transition-[width] duration-300" style={{ width: `${memoryPercent}%` }} />
            </div>
          </div>
        </article>

        <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.03] sm:p-6">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="m-0 text-[0.68rem] font-black uppercase tracking-[0.18em] text-slate-400">Device</p>
              <h2 class="mt-2 mb-0 text-xl font-black tracking-tight text-slate-950">Device details</h2>
            </div>
            <span class="grid size-10 place-items-center rounded-xl bg-teal-50 text-teal-700"><ShieldIcon class="size-5" /></span>
          </div>
          <dl class="mt-4">
            <DetailRow label="Hostname" value={data.device.hostname} />
            <DetailRow label="Model" value={data.device.model} />
            <DetailRow label="Firmware" value={`${data.software.distribution} ${data.software.version}`} />
            <DetailRow label="Revision" value={data.software.revision} />
            <DetailRow label="WAN" value={data.network.up ? 'Online' : 'Needs attention'} />
          </dl>
        </article>
      </section>
    </>
  );
}
