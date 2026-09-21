import { formatNumber, formatRelativeTime } from '../app/format';
import { ActivityLoadState, ActivityTimeline } from '../components/ActivityTimeline';
import type { ActivityCloudSync, ActivityHistory } from '../types/activity';

function cloudStatus(cloud: ActivityCloudSync): {
  label: string;
  description: string;
  tone: string;
} {
  if (cloud.eligible === false || cloud.phase === 'ineligible') {
    return {
      label: 'Pro / Ultimate 전용',
      description: '유료 멤버십이 활성화되면 이후 발생하는 활동을 Cloud에 자동으로 동기화합니다.',
      tone: 'bg-slate-100 text-slate-600 ring-slate-200',
    };
  }
  if (cloud.phase === 'error') {
    return {
      label: '동기화 확인 필요',
      description: '최근 Cloud 전송을 완료하지 못했습니다. 로컬 활동 기록은 계속 보관됩니다.',
      tone: 'bg-amber-50 text-amber-800 ring-amber-200',
    };
  }
  if (cloud.phase === 'syncing') {
    return {
      label: '동기화 중',
      description: '새 활동을 SmartSafeHub Cloud에 전송하고 있습니다.',
      tone: 'bg-teal-50 text-teal-800 ring-teal-200',
    };
  }
  if (cloud.eligible === true) {
    return {
      label: '자동 동기화',
      description: '새 활동이 생기면 SmartSafeHub Cloud에 자동으로 안전하게 전송합니다.',
      tone: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    };
  }
  return {
    label: '확인 중',
    description: 'Cloud 활동 기록 사용 가능 여부를 확인하고 있습니다.',
    tone: 'bg-slate-100 text-slate-600 ring-slate-200',
  };
}

function CloudActivitySyncCard({ cloud }: { cloud: ActivityCloudSync }) {
  const status = cloudStatus(cloud);
  const plan = cloud.plan?.toUpperCase() ?? null;

  return (
    <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5 sm:p-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="m-0 text-xs font-extrabold uppercase tracking-[0.16em] text-teal-700">
            Cloud history
          </p>
          <h2 class="mt-2 mb-0 text-base font-black text-slate-950">Cloud 활동 기록 동기화</h2>
          <p class="mt-2 mb-0 max-w-3xl text-sm leading-6 text-slate-500">{status.description}</p>
        </div>
        <span class={`rounded-full px-3 py-1.5 text-xs font-extrabold ring-1 ring-inset ${status.tone}`}>
          {status.label}
        </span>
      </div>

      <dl class="mt-5 grid gap-3 sm:grid-cols-4">
        <div class="rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-inset ring-slate-200">
          <dt class="text-xs font-bold text-slate-500">멤버십</dt>
          <dd class="mt-1 text-sm font-black text-slate-900">{plan ?? (cloud.eligible === false ? 'Free' : '확인 중')}</dd>
        </div>
        <div class="rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-inset ring-slate-200">
          <dt class="text-xs font-bold text-slate-500">전송 대기</dt>
          <dd class="mt-1 text-sm font-black text-slate-900">{formatNumber(cloud.pendingEvents)}건</dd>
        </div>
        <div class="rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-inset ring-slate-200">
          <dt class="text-xs font-bold text-slate-500">마지막 동기화</dt>
          <dd class="mt-1 text-sm font-black text-slate-900">
            {cloud.lastSuccessAt > 0 ? formatRelativeTime(cloud.lastSuccessAt) : '아직 없음'}
          </dd>
        </div>
        <div class="rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-inset ring-slate-200">
          <dt class="text-xs font-bold text-slate-500">Cloud 보관</dt>
          <dd class="mt-1 text-sm font-black text-slate-900">
            {cloud.eligible === true && cloud.retentionDays > 0 ? `${cloud.retentionDays}일` : '—'}
          </dd>
        </div>
      </dl>

      {cloud.phase === 'error' && cloud.lastErrorCode ? (
        <p class="mt-3 mb-0 text-xs font-semibold text-amber-700">
          오류 코드: <code>{cloud.lastErrorCode}</code>
        </p>
      ) : null}
      <p class="mt-3 mb-0 text-xs leading-5 text-slate-500">
        Cloud 전송은 Pro 또는 Ultimate 멤버십에서만 동작합니다. 멤버십과 관계없이 현재 부팅의 로컬 활동 기록은 공유기에서 계속 확인할 수 있습니다.
      </p>
    </section>
  );
}

export function ActivityPage({
  data,
  error,
  loading,
  onRetry,
}: {
  data: ActivityHistory | null;
  error: string | null;
  loading: boolean;
  onRetry: () => void;
}) {
  return (
    <div class="min-w-0 space-y-5">
      <section
        aria-labelledby="activity-history-title"
        class="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5 sm:p-6"
      >
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="m-0 text-xs font-extrabold uppercase tracking-[0.16em] text-teal-700">
              Local history
            </p>
            <h2 class="mt-2 mb-0 text-xl font-black tracking-tight text-slate-950" id="activity-history-title">
              현재 부팅 이후의 최근 활동
            </h2>
            <p class="mt-2 mb-0 max-w-3xl text-sm leading-6 text-slate-500">
              인터넷, SafeShield, 업데이트, 라이선스와 주요 설정에서 실제 상태가 변경된 시점만 기록합니다.
            </p>
          </div>
          <span class="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-extrabold text-slate-600 ring-1 ring-inset ring-slate-200">
            최대 {data?.maxEvents ?? 128}건
          </span>
        </div>

        <div class="mt-5">
          {loading || (error && !data) ? (
            <ActivityLoadState error={error} loading={loading} onRetry={onRetry} />
          ) : (
            <ActivityTimeline events={data?.events ?? []} />
          )}
        </div>
      </section>

      <CloudActivitySyncCard
        cloud={
          data?.cloud ?? {
            phase: 'preparing',
            eligible: null,
            plan: null,
            retentionDays: 0,
            pendingEvents: 0,
            lastAttemptAt: 0,
            lastSuccessAt: 0,
            lastUploadedCount: 0,
            lastErrorCode: null,
            nextSyncAt: 0,
          }
        }
      />

      <aside class="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
        <p class="m-0 text-sm font-extrabold text-slate-800">로컬 활동 기록 안내</p>
        <p class="mt-1 mb-0 text-xs leading-5 text-slate-500">
          이 기록은 공유기의 메모리 영역에만 보관되어 재부팅하면 초기화됩니다. 직접 설정을 변경한 작업은 성공 시점에 즉시 기록하고, 인터넷 및 장치 진단처럼 외부 상태를 확인해야 하는 항목은 실제 상태 변화가 관찰된 경우에만 추가합니다.
        </p>
      </aside>
    </div>
  );
}
