import { ActivityLoadState, ActivityTimeline } from '../components/ActivityTimeline';
import type { ActivityHistory } from '../types/activity';

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
              인터넷, SafeShield, 업데이트, 라이선스와 장치 진단에서 실제 상태가 변경된 시점만 기록합니다.
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

      <aside class="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
        <p class="m-0 text-sm font-extrabold text-slate-800">로컬 활동 기록 안내</p>
        <p class="mt-1 mb-0 text-xs leading-5 text-slate-500">
          이 기록은 공유기의 메모리 영역에만 보관되어 재부팅하면 초기화됩니다. 주기적인 상태 조회 자체는 기록하지 않고 상태가 실제로 변경된 경우에만 새 활동을 추가합니다.
        </p>
      </aside>
    </div>
  );
}
