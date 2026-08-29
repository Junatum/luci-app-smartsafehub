import { formatNumber, formatTimestamp } from '../app/format';
import type {
  SafeShieldStatistics,
  SafeShieldStatisticsBucket,
} from '../types/safeshield';
import { DatabaseIcon } from './Icons';
import { SafeShieldBlockedBarChart } from './SafeShieldBlockedBarChart';
import { SafeShieldDeviceStatisticsList } from './SafeShieldDeviceStatisticsList';

interface SafeShieldStatisticsPanelProps {
  data: SafeShieldStatistics | null;
  error: string | null;
  loading: boolean;
  onRetry: () => void;
  refreshing: boolean;
}

const HOUR_SECONDS = 3_600;
const DISPLAY_HOURS = 24;
function blockRate(queries: number, blocked: number): string {
  if (queries <= 0) {
    return '0.0%';
  }

  return `${((blocked / queries) * 100).toFixed(1)}%`;
}

function latestHour(data: SafeShieldStatistics): number {
  const lastBucket = data.hourly[data.hourly.length - 1];

  if (lastBucket?.bucketStart) {
    return lastBucket.bucketStart;
  }

  const timestamp =
    data.updatedAt > 0 ? data.updatedAt : Math.floor(Date.now() / 1_000);
  return Math.floor(timestamp / HOUR_SECONDS) * HOUR_SECONDS;
}

function recentBuckets(data: SafeShieldStatistics): SafeShieldStatisticsBucket[] {
  const byStart = new Map(data.hourly.map((bucket) => [bucket.bucketStart, bucket]));
  const end = latestHour(data);
  const start = end - (DISPLAY_HOURS - 1) * HOUR_SECONDS;

  return Array.from({ length: DISPLAY_HOURS }, (_, index) => {
    const bucketStart = start + index * HOUR_SECONDS;

    return (
      byStart.get(bucketStart) ?? {
        bucketStart,
        queries: 0,
        blocked: 0,
      }
    );
  });
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div class="rounded-xl bg-slate-50 p-4">
      <dt class="text-xs font-bold text-slate-500">{label}</dt>
      <dd class="mt-2 mb-0 ml-0 text-xl font-extrabold text-slate-950">
        {value}
      </dd>
    </div>
  );
}

export function SafeShieldStatisticsPanel({
  data,
  error,
  loading,
  onRetry,
  refreshing,
}: SafeShieldStatisticsPanelProps) {
  if (loading && data === null) {
    return (
      <section class="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5 sm:p-6">
        <p class="m-0 text-sm font-bold text-slate-500">
          차단 통계를 불러오는 중입니다…
        </p>
      </section>
    );
  }

  if (error && data === null) {
    return (
      <section class="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
        <p class="m-0 text-sm font-extrabold text-amber-950">
          차단 통계를 불러오지 못했습니다.
        </p>
        <p class="mt-2 mb-0 text-xs leading-5 text-amber-800">{error}</p>
        <button
          class="mt-4 inline-flex min-h-9 items-center justify-center rounded-xl border border-amber-300 bg-white px-3 py-2 text-xs font-extrabold text-amber-900 transition hover:bg-amber-100 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-100"
          onClick={onRetry}
          type="button"
        >
          다시 시도
        </button>
      </section>
    );
  }

  if (!data?.available) {
    return (
      <section class="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5 sm:p-6">
        <p class="m-0 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
          Statistics
        </p>
        <h2 class="mt-3 mb-0 text-xl font-extrabold text-slate-950">
          차단 통계
        </h2>
        <p class="mt-3 mb-0 text-sm leading-6 text-slate-600">
          현재 SafeShield에서 통계 데이터를 제공하지 않습니다. SafeShield 0.3.14-r7 이상이 설치되어 있고 통계 수집이 활성화되어 있는지 확인해 주세요.
        </p>
      </section>
    );
  }

  const buckets = recentBuckets(data);
  const latest = buckets[buckets.length - 1];

  return (
    <section class="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5 sm:p-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="m-0 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
            Statistics
          </p>
          <h2 class="mt-3 mb-0 text-xl font-extrabold text-slate-950">
            차단 통계
          </h2>
          <p class="mt-2 mb-0 text-sm leading-6 text-slate-600">
            DNS 요청 원본은 저장하지 않고 숫자만 로컬 메모리에 집계합니다.
          </p>
        </div>
        <span class="grid size-11 place-items-center rounded-xl bg-teal-50 text-teal-700">
          <DatabaseIcon class="size-6" />
        </span>
      </div>

      <dl class="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="전체 DNS 요청" value={formatNumber(data.totals.queries)} />
        <Metric label="차단 요청" value={formatNumber(data.totals.blocked)} />
        <Metric
          label="차단율"
          value={blockRate(data.totals.queries, data.totals.blocked)}
        />
        <Metric
          label="현재 시간 차단"
          value={formatNumber(latest?.blocked ?? 0)}
        />
      </dl>

      <div class="mt-6 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 sm:p-5">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p class="m-0 text-xs font-bold text-slate-500">최근 24시간</p>
            <h3 class="mt-1 mb-0 text-base font-extrabold text-slate-950">
              시간대별 차단 요청
            </h3>
          </div>
          <span class="text-xs font-bold text-slate-500">
            {refreshing
              ? '갱신 중…'
              : `마지막 집계 ${formatTimestamp(data.updatedAt)}`}
          </span>
        </div>

        <SafeShieldBlockedBarChart buckets={buckets} />
      </div>

      <SafeShieldDeviceStatisticsList
        deviceLimit={data.deviceLimit}
        devices={data.devices}
        truncated={data.devicesTruncated}
      />

      <div class="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs leading-5 text-slate-500">
        <span>수집 시작 {formatTimestamp(data.startedAt)}</span>
        <span>보존 {formatNumber(data.retentionHours)}시간</span>
        {data.volatile ? <span>재부팅 시 초기화되는 메모리 통계</span> : null}
      </div>

      {error ? (
        <p class="mt-3 mb-0 text-xs font-bold text-amber-700">
          최근 자동 갱신에 실패했습니다. 현재 표시된 마지막 정상 통계를 유지합니다.
        </p>
      ) : null}
    </section>
  );
}
