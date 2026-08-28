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
import { StatusCard } from '../components/StatusCard';
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
      {up ? '정상' : '확인 필요'}
    </span>
  );
}

export function HomePage({ data, error, loading, onRetry, updates }: HomePageProps) {
  const memory = useMemo(
    () => (data ? getMemoryUsage(data.runtime.memory) : null),
    [data],
  );
  const availableVersion = updates?.packages.find(
    (item) => item.name === 'luci-app-smartsafehub' && item.updateAvailable,
  )?.availableVersion;
  const latestReleaseNote =
    updates?.releaseNotes.find((note) => note.version === availableVersion) ??
    updates?.releaseNotes[0];

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
      {updates && updates.updateCount > 0 ? (
        <a
          class="mb-5 flex min-w-0 items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-amber-950 no-underline shadow-sm shadow-amber-900/5 transition hover:bg-amber-100/70 sm:px-5"
          href="#system"
        >
          <span class="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-800">
            <UpdateIcon class="size-6" />
          </span>
          <span class="min-w-0 flex-1">
            <strong class="block text-sm font-black">SmartSafeHub 업데이트가 있습니다.</strong>
            <span class="mt-1 block text-xs leading-5 text-amber-800">
              {latestReleaseNote?.summary ||
                '새 SmartSafeHub 버전을 설치할 수 있습니다. 업데이트 화면에서 확인해 주세요.'}
            </span>
          </span>
          <span class="shrink-0 text-sm font-black">확인</span>
        </a>
      ) : null}

      <section
        aria-label="장치 요약"
        class="grid gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4"
      >
        <StatusCard
          description={data.device.hostname}
          eyebrow="Device"
          icon={<RouterIcon class="size-6" />}
          title={data.device.model}
        />
        <StatusCard
          description={`${data.software.distribution} ${data.software.version} · ${data.software.revision}`}
          eyebrow="Firmware"
          icon={<ShieldIcon class="size-6" />}
          title={data.software.version}
        />
        <StatusCard
          badge={<StateBadge up={data.network.up} />}
          description={
            data.network.available
              ? [data.network.protocol, data.network.ipv4Address]
                  .filter(Boolean)
                  .join(' · ') || '인터페이스 정보 없음'
              : 'WAN 인터페이스를 찾을 수 없습니다.'
          }
          eyebrow="Internet"
          icon={<GlobeIcon class="size-6" />}
          title={data.network.up ? '연결됨' : '연결 확인 필요'}
        />
        <StatusCard
          description={`부팅 시각 ${formatBootTime(data.runtime.localtime, data.runtime.uptime)}`}
          eyebrow="Uptime"
          icon={<ClockIcon class="size-6" />}
          title={formatUptime(data.runtime.uptime)}
        />
      </section>

      <section class="mt-5">
        <article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5 sm:p-6">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="m-0 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                System health
              </p>
              <h2 class="mt-3 mb-0 text-xl font-extrabold tracking-tight text-slate-950">
                시스템 상태
              </h2>
            </div>
            <span class="grid size-11 place-items-center rounded-xl bg-teal-50 text-teal-700">
              <MemoryIcon class="size-6" />
            </span>
          </div>

          <dl class="mt-6 grid gap-4 sm:grid-cols-3">
            <div class="rounded-xl bg-slate-50 p-4">
              <dt class="text-xs font-bold text-slate-500">메모리 사용</dt>
              <dd class="mt-2 mb-0 ml-0 text-lg font-extrabold text-slate-950">
                {memory ? formatBytes(memory.used) : '확인 불가'}
              </dd>
            </div>
            <div class="rounded-xl bg-slate-50 p-4">
              <dt class="text-xs font-bold text-slate-500">전체 메모리</dt>
              <dd class="mt-2 mb-0 ml-0 text-lg font-extrabold text-slate-950">
                {formatBytes(data.runtime.memory.total)}
              </dd>
            </div>
            <div class="rounded-xl bg-slate-50 p-4">
              <dt class="text-xs font-bold text-slate-500">1분 Load</dt>
              <dd class="mt-2 mb-0 ml-0 text-lg font-extrabold text-slate-950">
                {(data.runtime.load[0] / 65_536).toFixed(2)}
              </dd>
            </div>
          </dl>

          <div class="mt-5">
            <div class="mb-2 flex items-center justify-between gap-3 text-xs font-bold text-slate-500">
              <span>메모리 사용률</span>
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
