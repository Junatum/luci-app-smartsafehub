import type { ComponentChildren } from 'preact';
import { useMemo } from 'preact/hooks';

import {
  ClockIcon,
  DevicesIcon,
  GlobeIcon,
  MemoryIcon,
  RouterIcon,
  ShieldIcon,
  UpdateIcon,
} from '../components/Icons';
import { DashboardSafeShieldActivity } from '../components/DashboardSafeShieldActivity';
import { ErrorPanel, LoadingPanel } from '../components/StatePanels';
import type { ConnectedDevicesSummary } from '../types/devices';
import type { SafeShieldStatistics, SafeShieldStatus } from '../types/safeshield';
import type { SmartSafeHubStatus } from '../types/status';
import type { SoftwareUpdateStatus } from '../types/updates';
import {
  formatBootTime,
  formatBytes,
  formatLoadAverage,
  formatNumber,
  formatTimestamp,
  formatUptime,
  getMemoryUsage,
} from '../app/format';

interface HomePageProps {
  data: SmartSafeHubStatus | null;
  devices: ConnectedDevicesSummary | null;
  devicesError: string | null;
  devicesLoading: boolean;
  error: string | null;
  loading: boolean;
  onRetry: () => void;
  safeshield: SafeShieldStatus | null;
  safeshieldError: string | null;
  safeshieldLoading: boolean;
  statistics: SafeShieldStatistics | null;
  statisticsError: string | null;
  statisticsLoading: boolean;
  statisticsRefreshing: boolean;
  updates: SoftwareUpdateStatus | null;
  updatesError: string | null;
  updatesLoading: boolean;
}

type OverviewState = 'healthy' | 'warning' | 'neutral';

interface OverviewCardProps {
  detail: string;
  eyebrow: string;
  href?: string;
  icon: ComponentChildren;
  state?: OverviewState;
  value: string;
}

function stateClasses(state: OverviewState): string {
  if (state === 'healthy') {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
  }
  if (state === 'warning') {
    return 'bg-amber-50 text-amber-800 ring-amber-200';
  }
  return 'bg-slate-100 text-slate-600 ring-slate-200';
}

function OverviewCard({
  detail,
  eyebrow,
  href,
  icon,
  state = 'neutral',
  value,
}: OverviewCardProps) {
  const content = (
    <>
      <div class="flex items-start justify-between gap-4">
        <p class="m-0 text-[0.68rem] font-black uppercase tracking-[0.16em] text-slate-500">
          {eyebrow}
        </p>
        <span
          class={`grid size-10 shrink-0 place-items-center rounded-xl ring-1 ring-inset ${stateClasses(state)}`}
        >
          {icon}
        </span>
      </div>
      <p class="mt-4 mb-0 break-words text-2xl font-black tracking-tight text-slate-950">
        {value}
      </p>
      <p class="mt-2 mb-0 min-h-10 text-sm font-medium leading-5 text-slate-500">
        {detail}
      </p>
      {href ? (
        <span class="mt-4 inline-flex text-xs font-extrabold text-teal-700">자세히 보기 →</span>
      ) : null}
    </>
  );

  const className =
    'min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5 transition';

  if (href) {
    return (
      <a
        class={`${className} no-underline hover:border-slate-300 hover:shadow-md`}
        href={href}
      >
        {content}
      </a>
    );
  }

  return <article class={className}>{content}</article>;
}

function SectionHeading({
  description,
  eyebrow,
  id,
  title,
}: {
  description: string;
  eyebrow: string;
  id: string;
  title: string;
}) {
  return (
    <div class="mb-4">
      <p class="m-0 text-[0.68rem] font-black uppercase tracking-[0.18em] text-teal-700">
        {eyebrow}
      </p>
      <h2 class="mt-2 mb-0 text-xl font-black tracking-tight text-slate-950" id={id}>
        {title}
      </h2>
      <p class="mt-2 mb-0 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: ComponentChildren }) {
  return (
    <div class="flex min-w-0 items-start justify-between gap-4 border-b border-slate-100 py-3 last:border-b-0">
      <dt class="text-sm font-semibold text-slate-500">{label}</dt>
      <dd class="m-0 min-w-0 max-w-[68%] break-words text-right text-sm font-extrabold text-slate-950">
        {value}
      </dd>
    </div>
  );
}

function safeShieldOverview(
  data: SafeShieldStatus | null,
  loading: boolean,
  error: string | null,
): { detail: string; state: OverviewState; value: string } {
  if (loading && !data) {
    return { detail: '보호 상태를 확인하고 있습니다.', state: 'neutral', value: '확인 중' };
  }

  if (error && !data) {
    return { detail: 'SafeShield 상태를 불러오지 못했습니다.', state: 'warning', value: '확인 필요' };
  }

  if (!data || !data.available) {
    return { detail: 'SafeShield 서비스를 사용할 수 없습니다.', state: 'warning', value: '사용 불가' };
  }

  if (!data.enabled || data.status === 'disabled') {
    return { detail: 'DNS 보호가 비활성화되어 있습니다.', state: 'neutral', value: '꺼짐' };
  }

  if (data.status === 'running') {
    return { detail: '차단 목록을 갱신하고 있습니다.', state: 'neutral', value: '갱신 중' };
  }

  const healthy =
    data.active &&
    data.runtime.dnsmasqRunning &&
    data.runtime.dnsRuntimeOk &&
    data.health.overall !== 'error' &&
    data.issueCounts.errors === 0;

  if (!healthy) {
    return {
      detail: data.runtime.lastErrorCode
        ? `최근 오류: ${data.runtime.lastErrorCode}`
        : 'DNS 보호 상태를 확인해 주세요.',
      state: 'warning',
      value: '확인 필요',
    };
  }

  const plan = data.license.plan?.trim();
  const ruleDetail =
    data.blocklist.validLineCount > 0
      ? `${formatNumber(data.blocklist.validLineCount)}개 차단 규칙`
      : '차단 목록 적용됨';

  return {
    detail: plan ? `${ruleDetail} · ${plan.toUpperCase()}` : ruleDetail,
    state: 'healthy',
    value: '보호 중',
  };
}

export function HomePage({
  data,
  devices,
  devicesError,
  devicesLoading,
  error,
  loading,
  onRetry,
  safeshield,
  safeshieldError,
  safeshieldLoading,
  statistics,
  statisticsError,
  statisticsLoading,
  statisticsRefreshing,
  updates,
  updatesError,
  updatesLoading,
}: HomePageProps) {
  const memory = useMemo(() => (data ? getMemoryUsage(data.runtime.memory) : null), [data]);

  if (loading) {
    return <LoadingPanel />;
  }

  if (error) {
    return <ErrorPanel message={error} onRetry={onRetry} />;
  }

  if (!data) {
    return null;
  }

  const memoryPercent = memory ? Math.round(memory.percent) : 0;
  const safeShieldSummary = safeShieldOverview(
    safeshield,
    safeshieldLoading,
    safeshieldError,
  );
  const updatePackage =
    updates?.packages.find((item) => item.name === 'luci-app-smartsafehub') ??
    updates?.packages[0] ??
    null;
  const updateAvailable = Boolean(updates && updates.updateCount > 0);
  const updateValue = updates
    ? updateAvailable
      ? `${updates.updateCount}개 업데이트`
      : updates.lastCheckAt
        ? '최신 상태'
        : '확인 전'
    : updatesError
      ? '확인 필요'
      : '확인 중';
  const updateDetail = updatePackage
    ? updateAvailable && updatePackage.availableVersion
      ? `${updatePackage.installedVersion} → ${updatePackage.availableVersion}`
      : `설치 버전 ${updatePackage.installedVersion}`
    : updatesError
      ? '업데이트 상태를 불러오지 못했습니다.'
      : updatesLoading
        ? '업데이트 상태를 확인하고 있습니다.'
        : '업데이트 상태를 확인할 수 없습니다.';
  const devicesValue = devices
    ? `${formatNumber(devices.totals.online)}대`
    : devicesLoading
      ? '확인 중'
      : '확인 필요';
  const devicesDetail = devices
    ? `Wi-Fi ${formatNumber(devices.totals.wireless)}대 · 유선/기타 ${formatNumber(devices.totals.ethernet)}대`
    : devicesError || '연결 기기 요약을 불러오고 있습니다.';
  const wanDetail = data.network.available
    ? [data.network.protocol, data.network.ipv4Address].filter(Boolean).join(' · ') ||
      '인터페이스 정보 없음'
    : 'WAN 인터페이스를 찾을 수 없습니다.';

  return (
    <div class="min-w-0 space-y-6">
      <section aria-labelledby="dashboard-overview-title">
        <SectionHeading
          description="인터넷, SafeShield, 연결 기기와 소프트웨어 상태를 한눈에 확인합니다."
          eyebrow="Overview"
          id="dashboard-overview-title"
          title="시스템 개요"
        />
        <div class="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <OverviewCard
            detail={wanDetail}
            eyebrow="Internet"
            icon={<GlobeIcon class="size-5" />}
            state={data.network.up ? 'healthy' : 'warning'}
            value={data.network.up ? '정상 연결' : '연결 확인'}
          />
          <OverviewCard
            detail={safeShieldSummary.detail}
            eyebrow="SafeShield"
            href="#safeshield"
            icon={<ShieldIcon class="size-5" />}
            state={safeShieldSummary.state}
            value={safeShieldSummary.value}
          />
          <OverviewCard
            detail={devicesDetail}
            eyebrow="Connected devices"
            href="#devices"
            icon={<DevicesIcon class="size-5" />}
            state={devices ? 'healthy' : devicesError ? 'warning' : 'neutral'}
            value={devicesValue}
          />
          <OverviewCard
            detail={updateDetail}
            eyebrow="Software update"
            href="#system"
            icon={<UpdateIcon class="size-5" />}
            state={
              updatesError
                ? 'warning'
                : updateAvailable
                  ? 'warning'
                  : updates?.lastCheckAt
                    ? 'healthy'
                    : 'neutral'
            }
            value={updateValue}
          />
        </div>
      </section>

      <section aria-labelledby="dashboard-activity-title">
        <SectionHeading
          description="최근 SafeShield 차단 활동과 현재 네트워크 연결 구성을 함께 확인합니다."
          eyebrow="Activity"
          id="dashboard-activity-title"
          title="네트워크 보호 활동"
        />
        <div class="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(18rem,0.65fr)]">
          <DashboardSafeShieldActivity
            data={statistics}
            error={statisticsError}
            loading={statisticsLoading}
            refreshing={statisticsRefreshing}
          />

          <article class="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5 sm:p-6">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="m-0 text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">
                  Network
                </p>
                <h3 class="mt-2 mb-0 text-xl font-black text-slate-950">연결 상태</h3>
              </div>
              <span
                class={`grid size-10 shrink-0 place-items-center rounded-xl ${
                  data.network.up
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-amber-50 text-amber-800'
                }`}
              >
                <GlobeIcon class="size-5" />
              </span>
            </div>

            <dl class="mt-4 mb-0">
              <DetailRow
                label="인터넷"
                value={data.network.up ? '정상 연결' : '연결 확인'}
              />
              <DetailRow
                label="WAN IP"
                value={data.network.ipv4Address || '할당되지 않음'}
              />
              <DetailRow
                label="프로토콜"
                value={data.network.protocol || '확인되지 않음'}
              />
              <DetailRow
                label="연결 기기"
                value={
                  devices
                    ? `${formatNumber(devices.totals.online)}대`
                    : devicesLoading
                      ? '확인 중'
                      : '확인 필요'
                }
              />
              <DetailRow
                label="Wi-Fi"
                value={devices ? `${formatNumber(devices.totals.wireless)}대` : '-'}
              />
              <DetailRow
                label="유선/기타"
                value={devices ? `${formatNumber(devices.totals.ethernet)}대` : '-'}
              />
            </dl>

            <a
              class="mt-5 inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-extrabold text-slate-700 no-underline transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800"
              href="#devices"
            >
              연결된 기기 보기
            </a>
          </article>
        </div>
      </section>

      <section aria-labelledby="dashboard-system-title">
        <SectionHeading
          description="메모리, 시스템 부하와 장치 정보를 빠르게 점검합니다."
          eyebrow="System"
          id="dashboard-system-title"
          title="시스템 상태"
        />
        <div class="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.75fr)]">
          <article class="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5 sm:p-6">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p class="m-0 text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">
                  Runtime
                </p>
                <h3 class="mt-2 mb-0 text-xl font-black text-slate-950">리소스 사용량</h3>
              </div>
              <span
                class={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-black ring-1 ring-inset ${
                  memoryPercent >= 90
                    ? 'bg-amber-50 text-amber-800 ring-amber-200'
                    : 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                }`}
              >
                <span
                  class={`size-2 rounded-full ${memoryPercent >= 90 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                />
                {memoryPercent >= 90 ? '메모리 확인' : '정상 실행'}
              </span>
            </div>

            <div class="mt-5 grid gap-3 sm:grid-cols-3">
              <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div class="flex items-center gap-2 text-slate-500">
                  <MemoryIcon class="size-4" />
                  <span class="text-xs font-extrabold">메모리</span>
                </div>
                <p class="mt-2 mb-0 text-xl font-black text-slate-950">{memoryPercent}%</p>
                <p class="mt-1 mb-0 text-xs font-semibold text-slate-500">
                  {memory ? formatBytes(memory.used) : '-'} /{' '}
                  {formatBytes(data.runtime.memory.total)}
                </p>
              </div>
              <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div class="flex items-center gap-2 text-slate-500">
                  <RouterIcon class="size-4" />
                  <span class="text-xs font-extrabold">시스템 부하</span>
                </div>
                <p class="mt-2 mb-0 text-xl font-black text-slate-950">
                  {formatLoadAverage(data.runtime.load[0])}
                </p>
                <p class="mt-1 mb-0 text-xs font-semibold text-slate-500">
                  5분 {formatLoadAverage(data.runtime.load[1])} · 15분{' '}
                  {formatLoadAverage(data.runtime.load[2])}
                </p>
              </div>
              <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div class="flex items-center gap-2 text-slate-500">
                  <ClockIcon class="size-4" />
                  <span class="text-xs font-extrabold">실행 시간</span>
                </div>
                <p class="mt-2 mb-0 text-xl font-black text-slate-950">
                  {formatUptime(data.runtime.uptime)}
                </p>
                <p class="mt-1 mb-0 text-xs font-semibold text-slate-500">
                  부팅 {formatBootTime(data.runtime.localtime, data.runtime.uptime)}
                </p>
              </div>
            </div>

            <div class="mt-5">
              <div class="mb-2 flex items-center justify-between gap-3 text-xs font-extrabold text-slate-500">
                <span>메모리 사용률</span>
                <span>{memoryPercent}%</span>
              </div>
              <div class="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  class={`h-full rounded-full transition-[width] duration-300 ${
                    memoryPercent >= 90 ? 'bg-amber-500' : 'bg-teal-600'
                  }`}
                  style={{ width: `${Math.min(100, memoryPercent)}%` }}
                />
              </div>
            </div>
          </article>

          <article class="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5 sm:p-6">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="m-0 text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">
                  Device
                </p>
                <h3 class="mt-2 mb-0 text-xl font-black text-slate-950">장치 정보</h3>
              </div>
              <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700">
                <RouterIcon class="size-5" />
              </span>
            </div>
            <dl class="mt-4 mb-0">
              <DetailRow label="모델" value={data.device.model} />
              <DetailRow label="호스트 이름" value={data.device.hostname} />
              <DetailRow
                label="펌웨어"
                value={`${data.software.distribution} ${data.software.version}`}
              />
              <DetailRow label="리비전" value={data.software.revision} />
              <DetailRow label="커널" value={data.software.kernel} />
              <DetailRow
                label="WAN IP"
                value={data.network.ipv4Address || '할당되지 않음'}
              />
              {data.device.boardName ? (
                <DetailRow label="보드" value={data.device.boardName} />
              ) : null}
            </dl>
          </article>
        </div>
      </section>

      <section aria-labelledby="dashboard-freshness-title">
        <SectionHeading
          description="Dashboard에 표시된 보안, 기기와 업데이트 정보의 최근 확인 시각입니다."
          eyebrow="Status freshness"
          id="dashboard-freshness-title"
          title="최근 상태 확인"
        />
        <article class="min-w-0 rounded-2xl border border-slate-200 bg-white px-5 shadow-sm shadow-slate-900/5 sm:px-6">
          <dl class="m-0 grid min-w-0 lg:grid-cols-3 lg:divide-x lg:divide-slate-200">
            <div class="py-4 lg:pr-6">
              <dt class="text-xs font-extrabold text-slate-500">SafeShield 차단 목록</dt>
              <dd class="mt-2 mb-0 ml-0 text-sm font-black text-slate-950">
                {safeshield?.timestamps.lastSuccess
                  ? formatTimestamp(safeshield.timestamps.lastSuccess)
                  : safeshieldLoading
                    ? '확인 중'
                    : '기록 없음'}
              </dd>
            </div>
            <div class="border-t border-slate-100 py-4 lg:border-t-0 lg:px-6">
              <dt class="text-xs font-extrabold text-slate-500">연결 기기 목록</dt>
              <dd class="mt-2 mb-0 ml-0 text-sm font-black text-slate-950">
                {devices?.generatedAt
                  ? formatTimestamp(devices.generatedAt)
                  : devicesLoading
                    ? '확인 중'
                    : '기록 없음'}
              </dd>
            </div>
            <div class="border-t border-slate-100 py-4 lg:border-t-0 lg:pl-6">
              <dt class="text-xs font-extrabold text-slate-500">소프트웨어 업데이트</dt>
              <dd class="mt-2 mb-0 ml-0 text-sm font-black text-slate-950">
                {updates?.lastCheckAt
                  ? formatTimestamp(updates.lastCheckAt)
                  : '아직 확인하지 않음'}
              </dd>
            </div>
          </dl>
        </article>
      </section>
    </div>
  );
}
