import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';

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
        <div class="flex flex-col gap-5 p-5 lg:flex-row lg:items-start lg:justify-between sm:p-6">
          <div class="flex min-w-0 items-start gap-3 sm:gap-4">
            <span class="grid size-12 shrink-0 place-items-center rounded-2xl bg-teal-50 text-teal-700">
              <ShieldIcon class="size-7" />
            </span>
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-3">
                <h2 class="m-0 break-words text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
                  SafeShield 보호 상태
                </h2>
                <SummaryBadge data={data} />
              </div>
              <p class="mt-3 mb-0 text-sm leading-6 text-slate-600">
                {getSummaryMessage(data)}
              </p>
              <p class="mt-2 mb-0 text-xs font-semibold text-slate-500">
                버전 {data.version ?? 'unknown'}
                {data.stage ? ` · 단계 ${data.stage}` : ''}
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
                ? '시작 중…'
                : refreshing
                  ? '갱신 중…'
                  : '지금 갱신'}
            </button>
          </div>
        </div>
      </section>

      <ActionFeedback
        error={actionError}
        message={actionMessage}
        onDismiss={onDismissFeedback}
      />

      <SafeShieldStatisticsPanel
        data={statistics}
        error={statisticsError}
        loading={statisticsLoading}
        onRetry={onRetryStatistics}
        refreshing={statisticsRefreshing}
      />

      <section class="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InfoCard eyebrow="Protection" icon={<CheckCircleIcon class="size-5" />}>
          <h3 class="mt-4 mb-0 text-lg font-extrabold text-slate-950">
            DNS 보호
          </h3>
          <dl class="mt-4 mb-0 grid gap-3">
            <div class="flex items-center justify-between gap-3">
              <dt class="text-sm text-slate-600">SafeShield 서비스</dt>
              <dd class="m-0"><BooleanState falseLabel="중지됨" trueLabel="동작 중" value={data.active} /></dd>
            </div>
            <div class="flex items-center justify-between gap-3">
              <dt class="text-sm text-slate-600">dnsmasq</dt>
              <dd class="m-0"><BooleanState falseLabel="중지됨" value={data.runtime.dnsmasqRunning} /></dd>
            </div>
            <div class="flex items-center justify-between gap-3">
              <dt class="text-sm text-slate-600">DNS 런타임</dt>
              <dd class="m-0"><BooleanState value={data.runtime.dnsRuntimeOk} /></dd>
            </div>
          </dl>
        </InfoCard>

        <InfoCard eyebrow="Blocklist" icon={<DatabaseIcon class="size-5" />}>
          <h3 class="mt-4 mb-0 text-lg font-extrabold text-slate-950">
            {formatNumber(data.blocklist.validLineCount)}개 도메인
          </h3>
          <p class="mt-2 mb-0 text-sm text-slate-600">
            파일 크기 {formatBytes(data.blocklist.fileSizeKb * 1024)}
          </p>
          <div class="mt-4"><BooleanState falseLabel="미설치" trueLabel="설치됨" value={data.blocklist.installed} /></div>
        </InfoCard>

        <InfoCard eyebrow="License" icon={<KeyIcon class="size-5" />}>
          <h3 class="mt-4 mb-0 text-lg font-extrabold text-slate-950">
            {data.license.plan?.toUpperCase() || '플랜 미확인'}
          </h3>
          <p class="mt-2 mb-0 text-sm text-slate-600">
            {data.license.status || (data.license.configured ? '상태 확인 중' : '라이선스 미설정')}
          </p>
          <p class="mt-4 mb-0 text-xs font-bold text-slate-500">
            {data.license.configured
              ? data.license.keyMasked || '라이선스 연결됨'
              : '라이선스 키 없음'}
          </p>

          <form
            class="mt-4 grid gap-2"
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
            <div class="flex gap-2">
              <input
                autocomplete="off"
                autocapitalize="none"
                class="min-h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-50"
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
                class="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-100 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={actionBusy || licenseKey.length > 0 || !data.license.configured}
                onClick={() => void handleLoadCurrentLicense()}
                type="button"
              >
                {action === 'license-read'
                  ? '불러오는 중…'
                  : licenseKeyLoaded
                    ? '현재 키 불러옴'
                    : '현재 키 불러오기'}
              </button>
            </div>
            <div class="grid gap-2 sm:grid-cols-2">
              <button
                class="inline-flex min-h-10 items-center justify-center rounded-xl border border-teal-700 bg-teal-700 px-3 py-2 text-sm font-extrabold text-white transition hover:border-teal-800 hover:bg-teal-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-100 disabled:cursor-not-allowed disabled:opacity-50"
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
                  class="inline-flex min-h-10 items-center justify-center rounded-xl border border-red-200 bg-white px-3 py-2 text-sm font-extrabold text-red-700 transition hover:border-red-300 hover:bg-red-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={actionBusy}
                  onClick={handleRemoveLicense}
                  type="button"
                >
                  {action === 'license-remove' ? '제거 중…' : '라이선스 제거'}
                </button>
              ) : null}
            </div>
          </form>
        </InfoCard>

        <InfoCard eyebrow="Artifact" icon={<ShieldIcon class="size-5" />}>
          <h3 class="mt-4 mb-0 text-lg font-extrabold text-slate-950">
            {data.artifact.tier || '아티팩트 미확인'}
          </h3>
          <p class="mt-2 mb-0 break-all text-sm text-slate-600">
            {data.artifact.version || '버전 정보 없음'}
          </p>
          <p class="mt-4 mb-0 text-xs font-bold text-slate-500">
            규칙 {formatNumber(data.artifact.rules)}개
          </p>
        </InfoCard>
      </section>

      <section class="mt-5 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <article class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5 sm:p-6">
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="m-0 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                Refresh schedule
              </p>
              <h2 class="mt-3 mb-0 text-xl font-extrabold text-slate-950">
                차단 목록 갱신
              </h2>
            </div>
            <span class="grid size-11 place-items-center rounded-xl bg-teal-50 text-teal-700">
              <CalendarIcon class="size-6" />
            </span>
          </div>
          <dl class="mt-6 grid gap-4 sm:grid-cols-3">
            <div class="rounded-xl bg-slate-50 p-4">
              <dt class="text-xs font-bold text-slate-500">마지막 성공</dt>
              <dd class="mt-2 mb-0 ml-0 text-sm font-extrabold leading-5 text-slate-950">
                {formatTimestamp(data.timestamps.lastSuccess)}
              </dd>
            </div>
            <div class="rounded-xl bg-slate-50 p-4">
              <dt class="text-xs font-bold text-slate-500">다음 갱신</dt>
              <dd class="mt-2 mb-0 ml-0 text-sm font-extrabold leading-5 text-slate-950">
                {formatTimestamp(data.timestamps.nextRefreshAt)}
              </dd>
            </div>
            <div class="rounded-xl bg-slate-50 p-4">
              <dt class="text-xs font-bold text-slate-500">갱신 주기</dt>
              <dd class="mt-2 mb-0 ml-0 text-sm font-extrabold text-slate-950">
                {formatInterval(data.timestamps.refreshIntervalS)}
              </dd>
            </div>
          </dl>
          <p class="mt-5 mb-0 text-xs leading-5 text-slate-500">
            수동 갱신은 백그라운드에서 실행됩니다. 진행 상태는 화면 새로고침과 자동 상태 확인으로 반영됩니다.
          </p>
        </article>

        <aside class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5 sm:p-6">
          <p class="m-0 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Health
          </p>
          <h2 class="mt-3 mb-0 text-xl font-extrabold text-slate-950">
            상태 점검
          </h2>
          <dl class="mt-6 grid gap-4">
            <div class="flex items-center justify-between gap-4 rounded-xl bg-slate-50 p-4">
              <dt class="text-sm font-bold text-slate-600">전체 상태</dt>
              <dd class="m-0 text-sm font-extrabold text-slate-950">{getHealthLabel(data.health.overall)}</dd>
            </div>
            <div class="flex items-center justify-between gap-4 rounded-xl bg-slate-50 p-4">
              <dt class="text-sm font-bold text-slate-600">경고</dt>
              <dd class="m-0 text-sm font-extrabold text-amber-700">{data.issueCounts.warnings}</dd>
            </div>
            <div class="flex items-center justify-between gap-4 rounded-xl bg-slate-50 p-4">
              <dt class="text-sm font-bold text-slate-600">오류</dt>
              <dd class="m-0 text-sm font-extrabold text-red-700">{data.issueCounts.errors}</dd>
            </div>
          </dl>
          <p class="mt-5 mb-0 text-xs leading-5 text-slate-500">
            보호를 끄면 SafeShield 서비스가 중지되고 현재 DNS 차단 목록이 제거됩니다. 다시 켠 뒤에는 필요할 때 즉시 갱신할 수 있습니다.
          </p>
        </aside>
      </section>
    </>
  );
}
