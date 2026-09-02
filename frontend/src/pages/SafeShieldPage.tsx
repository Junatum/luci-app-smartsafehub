import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';

import {
  AlertIcon,
  CalendarIcon,
  CheckCircleIcon,
  DatabaseIcon,
  DownloadIcon,
  KeyIcon,
  ListIcon,
  PowerIcon,
  ShieldIcon,
} from '../components/Icons';
import { SafeShieldStatisticsPanel } from '../components/SafeShieldStatisticsPanel';
import { ErrorPanel, LoadingPanel } from '../components/StatePanels';
import type { SafeShieldAction } from '../hooks/useSafeShieldActions';
import type { SafeShieldStatistics, SafeShieldStatus } from '../types/safeshield';
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
  statistics: SafeShieldStatistics | null;
  statisticsError: string | null;
  statisticsLoading: boolean;
  statisticsRefreshing: boolean;
  onDismissFeedback: () => void;
  onReadLicense: () => Promise<string | null>;
  onRefreshBlocklist: () => void;
  onRemoveLicense: () => Promise<boolean>;
  onRetry: () => void;
  onRetryStatistics: () => void;
  onSetEnabled: (enabled: boolean) => void;
  onSetStatisticsEnabled: (enabled: boolean) => void;
  onUpdateLicense: (licenseKey: string) => Promise<boolean>;
}

function BooleanState({
  value,
  trueLabel = '정상',
  falseLabel = '확인 필요',
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

  if (data.active && data.runtime.dnsmasqRunning && data.runtime.dnsRuntimeOk) {
    return 'protecting';
  }

  return 'attention';
}

function getSummaryLabel(data: SafeShieldStatus): string {
  const labels: Record<ProductProtectionState, string> = {
    disabled: '비활성화',
    refreshing: '갱신 중',
    protecting: '보호 중',
    paused: '일시 중지',
    error: '오류',
    attention: '확인 필요',
  };

  return labels[getProductProtectionState(data)];
}

function getSummaryMessage(data: SafeShieldStatus): string {
  const protectionState = getProductProtectionState(data);

  if (protectionState === 'protecting') {
    if (data.blocklist.validLineCount > 0) {
      return `${formatNumber(data.blocklist.validLineCount)}개 도메인 차단 규칙으로 DNS를 보호하고 있습니다.`;
    }

    if (data.blocklist.installed) {
      return '차단 목록이 설치되어 있으며 DNS 보호가 정상적으로 동작하고 있습니다.';
    }

    return 'SafeShield 서비스와 DNS 런타임이 정상적으로 동작하고 있습니다.';
  }

  if (protectionState === 'refreshing') {
    return data.stage
      ? `차단 목록을 갱신하고 있습니다. 현재 단계: ${data.stage}`
      : '차단 목록을 갱신하고 있습니다.';
  }

  if (protectionState === 'disabled') {
    return 'SafeShield DNS 보호가 비활성화되어 있습니다.';
  }

  if (protectionState === 'paused') {
    return 'SafeShield 작업이 일시 중지되어 있습니다.';
  }

  if (protectionState === 'error') {
    return data.runtime.lastErrorCode
      ? `최근 작업에서 오류가 발생했습니다: ${data.runtime.lastErrorCode}`
      : '최근 SafeShield 작업에서 오류가 발생했습니다.';
  }

  if (!data.active) {
    return 'SafeShield가 활성화되어 있지만 서비스가 실행 중이 아닙니다.';
  }

  if (!data.runtime.dnsmasqRunning) {
    return 'dnsmasq가 실행 중이 아니어서 DNS 보호 상태를 확인해야 합니다.';
  }

  if (!data.runtime.dnsRuntimeOk) {
    return 'SafeShield DNS 런타임 상태를 확인해야 합니다.';
  }

  return data.summary.message;
}

function getHealthLabel(value: string): string {
  const labels: Record<string, string> = {
    ok: '정상',
    warning: '경고',
    error: '오류',
    unavailable: '사용 불가',
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

function SummaryFact({ label, value }: { label: string; value: string }) {
  return (
    <div class="bg-white px-5 py-4 sm:px-6">
      <dt class="text-[0.68rem] font-black uppercase tracking-[0.14em] text-slate-400">
        {label}
      </dt>
      <dd class="mt-2 mb-0 ml-0 truncate text-sm font-extrabold text-slate-950" title={value}>
        {value}
      </dd>
    </div>
  );
}

function SectionHeading({
  description,
  eyebrow,
  title,
}: {
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <div class="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p class="m-0 text-[0.68rem] font-black uppercase tracking-[0.18em] text-teal-700">
          {eyebrow}
        </p>
        <h2 class="mt-2 mb-0 text-xl font-black tracking-tight text-slate-950">
          {title}
        </h2>
        <p class="mt-2 mb-0 text-sm leading-6 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function DetailCard({
  children,
  eyebrow,
  icon,
  title,
}: {
  children: ComponentChildren;
  eyebrow: string;
  icon: ComponentChildren;
  title: string;
}) {
  return (
    <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5 sm:p-6">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="m-0 text-[0.68rem] font-black uppercase tracking-[0.16em] text-slate-400">
            {eyebrow}
          </p>
          <h3 class="mt-2 mb-0 text-lg font-black tracking-tight text-slate-950">{title}</h3>
        </div>
        <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500">
          {icon}
        </span>
      </div>
      <dl class="mt-5 mb-0 grid gap-3">{children}</dl>
    </article>
  );
}

function DetailRow({ label, value }: { label: string; value: ComponentChildren }) {
  return (
    <div class="flex min-w-0 items-center justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
      <dt class="text-sm font-semibold text-slate-500">{label}</dt>
      <dd class="m-0 min-w-0 text-right text-sm font-extrabold text-slate-950">{value}</dd>
    </div>
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
      class={`mt-4 flex flex-col items-start gap-3 rounded-2xl border px-4 py-3 text-sm sm:flex-row sm:justify-between ${
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
        aria-label="알림 닫기"
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
  statistics,
  statisticsError,
  statisticsLoading,
  statisticsRefreshing,
  onDismissFeedback,
  onReadLicense,
  onRefreshBlocklist,
  onRemoveLicense,
  onRetry,
  onRetryStatistics,
  onSetEnabled,
  onSetStatisticsEnabled,
  onUpdateLicense,
}: SafeShieldPageProps) {
  const [licenseKey, setLicenseKey] = useState('');
  const [licenseKeyLoaded, setLicenseKeyLoaded] = useState(false);

  useEffect(() => {
    if (data?.license.configured === false) {
      setLicenseKey('');
      setLicenseKeyLoaded(false);
    }
  }, [data?.license.configured]);

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
          SafeShield 상태 API를 찾을 수 없습니다
        </h2>
        <p class="mt-2 mb-0 text-sm leading-6 text-amber-900">
          safeshield 패키지와 rpcd ucode 플러그인이 설치되어 있는지 확인해 주세요.
        </p>
      </section>
    );
  }

  const enabled = data.enabled;
  const refreshing = data.status === 'running';
  const actionBusy = action !== null;
  const toggleLabel = enabled
    ? action === 'disable'
      ? '끄는 중…'
      : '보호 끄기'
    : action === 'enable'
      ? '켜는 중…'
      : '보호 켜기';

  async function handleLoadCurrentLicense(): Promise<void> {
    if (licenseKey.length > 0) {
      return;
    }

    const currentKey = await onReadLicense();

    if (currentKey === null) {
      return;
    }

    setLicenseKey(currentKey);
    setLicenseKeyLoaded(true);
  }

  function resetLicenseEditor(): void {
    setLicenseKey('');
    setLicenseKeyLoaded(false);
  }

  function handleRemoveLicense(): void {
    const confirmed = window.confirm(
      '라이선스 키를 제거하면 SafeShield가 라이선스 없는 상태로 다시 확인하고 차단 목록을 갱신합니다. 계속하시겠습니까?',
    );

    if (!confirmed) {
      return;
    }

    void onRemoveLicense().then((removed) => {
      if (removed) {
        resetLicenseEditor();
      }
    });
  }

  function handleToggle(): void {
    if (enabled) {
      const confirmed = window.confirm(
        'SafeShield 보호를 끄면 현재 차단 목록이 제거되고 DNS 차단이 즉시 중단됩니다. 계속하시겠습니까?',
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
        <div class="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-start lg:justify-between">
          <div class="flex min-w-0 items-start gap-3 sm:gap-4">
            <span class="grid size-12 shrink-0 place-items-center rounded-2xl bg-teal-50 text-teal-700">
              <ShieldIcon class="size-7" />
            </span>
            <div class="min-w-0">
              <p class="m-0 text-[0.68rem] font-black uppercase tracking-[0.18em] text-teal-700">
                Protection
              </p>
              <div class="mt-2 flex flex-wrap items-center gap-3">
                <h2 class="m-0 break-words text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                  SafeShield 보호 상태
                </h2>
                <SummaryBadge data={data} />
              </div>
              <p class="mt-3 mb-0 max-w-3xl text-sm leading-6 text-slate-600">
                {getSummaryMessage(data)}
              </p>
              <p class="mt-2 mb-0 text-xs font-semibold text-slate-500">
                SafeShield {data.version ?? 'unknown'}
                {data.stage ? ` · ${data.stage}` : ''}
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
              <PowerIcon
                class={`size-4 ${action === 'enable' || action === 'disable' ? 'animate-pulse' : ''}`}
              />
              {toggleLabel}
            </button>
            <button
              class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-100 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!data.enabled || actionBusy || refreshing}
              onClick={onRefreshBlocklist}
              type="button"
            >
              <DownloadIcon
                class={`size-4 ${action === 'refresh' || refreshing ? 'animate-bounce' : ''}`}
              />
              {action === 'refresh'
                ? '시작 중…'
                : refreshing
                  ? '갱신 중…'
                  : '지금 갱신'}
            </button>
          </div>
        </div>

        <div class="px-5 pb-5 sm:px-6 sm:pb-6">
          <dl class="grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryFact label="Protection" value={getSummaryLabel(data)} />
            <SummaryFact
              label="Blocklist"
              value={`${formatNumber(data.blocklist.validLineCount)}개 도메인`}
            />
            <SummaryFact label="Last refresh" value={formatTimestamp(data.timestamps.lastSuccess)} />
            <SummaryFact label="Plan" value={data.license.plan?.toUpperCase() || 'FREE'} />
          </dl>
        </div>
      </section>

      <ActionFeedback
        error={actionError}
        message={actionMessage}
        onDismiss={onDismissFeedback}
      />

      <SafeShieldStatisticsPanel
        action={action}
        data={statistics}
        error={statisticsError}
        loading={statisticsLoading}
        onRetry={onRetryStatistics}
        onSetEnabled={onSetStatisticsEnabled}
        refreshing={statisticsRefreshing}
      />

      <section class="mt-7">
        <SectionHeading
          description="DNS 보호 런타임, 차단 목록, 갱신 일정과 상태 점검 결과를 한곳에서 확인합니다."
          eyebrow="Protection details"
          title="보호 구성"
        />

        <div class="grid gap-4 lg:grid-cols-2">
          <DetailCard
            eyebrow="Runtime"
            icon={<CheckCircleIcon class="size-5" />}
            title="DNS 보호 런타임"
          >
            <DetailRow
              label="SafeShield 서비스"
              value={<BooleanState falseLabel="중지됨" trueLabel="동작 중" value={data.active} />}
            />
            <DetailRow
              label="dnsmasq"
              value={<BooleanState falseLabel="중지됨" value={data.runtime.dnsmasqRunning} />}
            />
            <DetailRow label="DNS 런타임" value={<BooleanState value={data.runtime.dnsRuntimeOk} />} />
            <DetailRow
              label="Refresh daemon"
              value={<BooleanState falseLabel="중지됨" value={data.runtime.refreshdRunning} />}
            />
          </DetailCard>

          <DetailCard
            eyebrow="Blocklist"
            icon={<DatabaseIcon class="size-5" />}
            title="차단 목록"
          >
            <DetailRow
              label="적용 규칙"
              value={`${formatNumber(data.blocklist.validLineCount)}개 도메인`}
            />
            <DetailRow label="파일 크기" value={formatBytes(data.blocklist.fileSizeKb * 1024)} />
            <DetailRow
              label="설치 상태"
              value={<BooleanState falseLabel="미설치" trueLabel="설치됨" value={data.blocklist.installed} />}
            />
            <DetailRow
              label="검증 상태"
              value={<BooleanState falseLabel="확인 필요" value={data.blocklist.verificationOk} />}
            />
          </DetailCard>

          <DetailCard
            eyebrow="Refresh schedule"
            icon={<CalendarIcon class="size-5" />}
            title="차단 목록 갱신"
          >
            <DetailRow label="마지막 성공" value={formatTimestamp(data.timestamps.lastSuccess)} />
            <DetailRow label="다음 갱신" value={formatTimestamp(data.timestamps.nextRefreshAt)} />
            <DetailRow label="갱신 주기" value={formatInterval(data.timestamps.refreshIntervalS)} />
            <DetailRow
              label="최근 결과"
              value={data.runtime.lastResult || (refreshing ? '갱신 중' : '확인되지 않음')}
            />
          </DetailCard>

          <DetailCard eyebrow="Health" icon={<ShieldIcon class="size-5" />} title="상태 점검">
            <DetailRow label="전체 상태" value={getHealthLabel(data.health.overall)} />
            <DetailRow
              label="경고"
              value={<span class="text-amber-700">{formatNumber(data.issueCounts.warnings)}</span>}
            />
            <DetailRow
              label="오류"
              value={<span class="text-red-700">{formatNumber(data.issueCounts.errors)}</span>}
            />
            <DetailRow label="최근 오류 코드" value={data.runtime.lastErrorCode || '없음'} />
          </DetailCard>
        </div>
      </section>

      <section class="mt-7">
        <SectionHeading
          description="라이선스와 현재 적용 중인 SafeShield 아티팩트 및 로컬 규칙 구성을 관리합니다."
          eyebrow="Settings"
          title="SafeShield 설정"
        />

        <div class="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
          <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5 sm:p-6">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="m-0 text-[0.68rem] font-black uppercase tracking-[0.16em] text-slate-400">
                  License
                </p>
                <h3 class="mt-2 mb-0 text-lg font-black tracking-tight text-slate-950">
                  라이선스
                </h3>
                <p class="mt-2 mb-0 text-sm leading-6 text-slate-500">
                  현재 플랜은 {data.license.plan?.toUpperCase() || 'FREE'}이며, 라이선스 키를 등록하거나 변경할 수 있습니다.
                </p>
              </div>
              <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500">
                <KeyIcon class="size-5" />
              </span>
            </div>

            <div class="mt-5 flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
              <span class="text-sm font-extrabold text-slate-950">
                {data.license.plan?.toUpperCase() || 'FREE'}
              </span>
              <span class="text-xs font-semibold text-slate-500">
                {data.license.status || (data.license.configured ? '라이선스 연결됨' : '라이선스 미설정')}
              </span>
              {data.license.configured && data.license.keyMasked ? (
                <span class="ml-auto text-xs font-bold text-slate-400">{data.license.keyMasked}</span>
              ) : null}
            </div>

            <form
              class="mt-5 grid gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                void onUpdateLicense(licenseKey).then((updated) => {
                  if (updated) {
                    resetLicenseEditor();
                  }
                });
              }}
            >
              <label class="text-xs font-bold text-slate-600" for="safeshield-license-key">
                {data.license.configured ? '라이선스 키 확인 / 변경' : '라이선스 키 등록'}
              </label>
              <div class="flex flex-col gap-2 sm:flex-row">
                <input
                  autocomplete="off"
                  autocapitalize="none"
                  class="min-h-11 min-w-0 flex-1 rounded-xl border-2 border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-900 shadow-inner outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                  data-1p-ignore
                  data-bwignore="true"
                  data-lpignore="true"
                  disabled={actionBusy}
                  id="safeshield-license-key"
                  onInput={(event) => {
                    setLicenseKey(event.currentTarget.value);
                    setLicenseKeyLoaded(false);
                  }}
                  placeholder={data.license.configured ? '새 라이선스 키 입력' : '라이선스 키 입력'}
                  spellcheck={false}
                  type="text"
                  value={licenseKey}
                />
                <button
                  class="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-100 px-4 py-2 text-xs font-extrabold text-slate-700 shadow-sm transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 disabled:opacity-70"
                  disabled={actionBusy || licenseKey.length > 0 || !data.license.configured}
                  onClick={() => void handleLoadCurrentLicense()}
                  type="button"
                >
                  <DownloadIcon class="size-4" />
                  {action === 'license-read'
                    ? '불러오는 중…'
                    : licenseKeyLoaded
                      ? '현재 키 불러옴'
                      : '현재 키 불러오기'}
                </button>
              </div>
              <div class="grid gap-2 sm:grid-cols-2">
                <button
                  class="inline-flex min-h-11 items-center justify-center rounded-xl border border-teal-700 bg-teal-700 px-4 py-2 text-sm font-extrabold text-white transition hover:border-teal-800 hover:bg-teal-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-100 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={actionBusy || licenseKey.trim().length === 0}
                  type="submit"
                >
                  {action === 'license-update'
                    ? '저장 중…'
                    : data.license.configured
                      ? '라이선스 변경'
                      : '라이선스 등록'}
                </button>
                {data.license.configured ? (
                  <button
                    class="inline-flex min-h-11 items-center justify-center rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-extrabold text-red-700 transition hover:border-red-300 hover:bg-red-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={actionBusy}
                    onClick={handleRemoveLicense}
                    type="button"
                  >
                    {action === 'license-remove' ? '제거 중…' : '라이선스 제거'}
                  </button>
                ) : null}
              </div>
            </form>
          </article>

          <div class="grid gap-4">
            <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <p class="m-0 text-[0.68rem] font-black uppercase tracking-[0.16em] text-slate-400">
                    Artifact
                  </p>
                  <h3 class="mt-2 mb-0 text-lg font-black tracking-tight text-slate-950">
                    보호 데이터
                  </h3>
                </div>
                <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500">
                  <DatabaseIcon class="size-5" />
                </span>
              </div>
              <dl class="mt-5 mb-0 grid gap-3">
                <DetailRow label="Tier" value={data.artifact.tier || '확인되지 않음'} />
                <DetailRow label="Version" value={data.artifact.version || '확인되지 않음'} />
                <DetailRow label="Rules" value={formatNumber(data.artifact.rules)} />
                <DetailRow label="Unique domains" value={formatNumber(data.artifact.uniqueDomains)} />
              </dl>
            </article>

            <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5">
              <p class="m-0 text-[0.68rem] font-black uppercase tracking-[0.16em] text-slate-400">
                Custom rules
              </p>
              <h3 class="mt-2 mb-0 text-lg font-black tracking-tight text-slate-950">
                사용자 규칙
              </h3>
              <div class="mt-4">
                <BooleanState
                  falseLabel="비활성화"
                  trueLabel="활성화"
                  value={data.localOverrides.enabled}
                />
              </div>
              <p class="mt-4 mb-0 text-sm font-semibold leading-6 text-slate-500">
                허용하거나 차단할 도메인을 직접 관리해 SafeShield 보호 정책에 반영합니다.
              </p>
              <a
                class="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-teal-700 bg-teal-700 px-4 py-2 text-sm font-extrabold text-white no-underline shadow-sm transition hover:border-teal-800 hover:bg-teal-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-100"
                href="#rules"
              >
                <ListIcon class="size-4" />
                사용자 규칙 관리
              </a>
            </article>
          </div>
        </div>
      </section>
    </>
  );
}
