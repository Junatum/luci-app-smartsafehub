import { useMemo, useState } from 'preact/hooks';

import { AppsIcon, ReloadIcon } from '../components/Icons';
import { SectionHeading } from '../components/SectionHeading';
import type { AppsCatalog, VerifiedApp } from '../types/apps';

type Category = 'all' | 'network' | 'security' | 'smart_home' | 'other';

interface AppsPageProps {
  data: AppsCatalog | null;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
  onRetry: () => void;
}

function categoryOf(app: VerifiedApp): Category {
  switch (app.category) {
    case 'network': return 'network';
    case 'security': return 'security';
    case 'smart_home':
    case 'iot': return 'smart_home';
    default: return 'other';
  }
}

const TABS: readonly { id: Category; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'network', label: '네트워크' },
  { id: 'security', label: '보안' },
  { id: 'smart_home', label: '스마트홈' },
  { id: 'other', label: '기타' },
];

export function AppsPage({ data, error, loading, refreshing, onRetry }: AppsPageProps) {
  const [category, setCategory] = useState<Category>('all');
  const [query, setQuery] = useState('');
  // Revocations cannot be revalidated while offline; never keep presenting a
  // previously fetched approval as current after a failed refresh.
  const currentData = error ? null : data;
  const apps = currentData?.apps ?? [];
  const filtered = useMemo(() => apps.filter((app) =>
    (category === 'all' || categoryOf(app) === category) &&
    `${app.name} ${app.summary}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  ), [apps, category, query]);

  return (
    <section class="min-w-0 space-y-5">
      <SectionHeading
        eyebrow="SmartSafeHub Apps"
        title="Apps"
        description="SmartSafeHub에서 직접 검증한 앱으로 공유기의 기능을 확장하세요."
        action={
          <button
            class="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 transition hover:border-teal-300 hover:text-teal-700 disabled:opacity-50"
            disabled={loading || refreshing}
            onClick={onRetry}
            type="button"
          >
            <ReloadIcon class={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? '확인 중' : '목록 새로고침'}
          </button>
        }
      />

      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex min-w-0 items-center gap-3">
            <span class="grid size-12 shrink-0 place-items-center rounded-2xl bg-teal-50 text-teal-700">
              <AppsIcon class="size-6" />
            </span>
            <div class="min-w-0">
              <h3 class="m-0 text-base font-black text-slate-950">검증된 앱</h3>
              <p class="mt-1 mb-0 text-xs leading-5 text-slate-500">현재 펌웨어에서 확인된 앱만 표시합니다.</p>
            </div>
          </div>
          <span class="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800">
            {currentData ? `${apps.length}개` : '확인 전'}
          </span>
        </div>
        <p class="mt-4 mb-0 text-xs leading-5 text-slate-500">
          Apps는 승인된 목록을 조회하는 기능부터 제공합니다. 실제 앱 설치와 제거는 추가적인 안전성 검증을 마친 후 지원할 예정입니다.
        </p>
      </div>

      {error ? (
        <div class="rounded-2xl border border-rose-200 bg-rose-50 p-5" role="alert">
          <p class="m-0 text-sm font-bold text-rose-800">앱 목록을 불러오지 못했습니다.</p>
          <p class="mt-2 mb-0 text-sm text-rose-700">{error}</p>
          <button class="mt-3 rounded-lg border border-rose-300 px-3 py-2 text-xs font-bold text-rose-800" onClick={onRetry} type="button">다시 시도</button>
        </div>
      ) : null}

      {loading && !currentData ? (
        <div aria-live="polite" class="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500" role="status">
          검증된 앱 목록을 확인하고 있습니다…
        </div>
      ) : currentData ? (
        <>
          {apps.length > 0 ? (
            <div class="min-w-0 space-y-3">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="flex min-w-0 flex-wrap gap-2" role="group" aria-label="앱 카테고리">
                  {TABS.map((tab) => (
                    <button
                      aria-pressed={category === tab.id}
                      class={`rounded-lg border px-3 py-2 text-xs font-bold transition ${category === tab.id
                        ? 'border-teal-700 bg-teal-700 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-teal-300'}`}
                      key={tab.id}
                      onClick={() => setCategory(tab.id)}
                      type="button"
                    >{tab.label}</button>
                  ))}
                </div>
                <input
                  aria-label="앱 검색"
                  class="min-h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-teal-500 sm:w-52"
                  onInput={(event) => setQuery(event.currentTarget.value)}
                  placeholder="앱 검색"
                  type="search"
                  value={query}
                />
              </div>
              <div class="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((app) => (
                  <article class="flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" key={app.id}>
                    <div class="flex min-w-0 items-start gap-3">
                      <span class="grid size-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600"><AppsIcon class="size-5" /></span>
                      <div class="min-w-0 flex-1">
                        <h3 class="m-0 break-words text-sm font-black text-slate-950">{app.name}</h3>
                        <p class="mt-1 mb-0 text-xs text-slate-500">v{app.version}</p>
                      </div>
                    </div>
                    <p class="mt-4 mb-4 min-h-10 break-words text-sm leading-5 text-slate-600">{app.summary}</p>
                    <div class="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
                      <span class="text-xs font-bold text-teal-700">✓ 검증된 앱</span>
                      <span class="text-xs font-semibold text-slate-400">설치 준비 중</span>
                    </div>
                  </article>
                ))}
              </div>
              {filtered.length === 0 ? <p class="rounded-xl bg-slate-100 p-5 text-center text-sm text-slate-600">검색 조건에 맞는 앱이 없습니다.</p> : null}
            </div>
          ) : (
            <div class="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
              <AppsIcon class="mx-auto size-10 text-slate-400" />
              <h3 class="mt-4 mb-2 text-base font-black text-slate-900">아직 등록된 앱이 없습니다.</h3>
              <p class="m-0 text-sm leading-6 text-slate-500">
                현재 기기와 펌웨어에 대해 승인된 앱이 준비되면 이곳에서 확인할 수 있습니다.
              </p>
            </div>
          )}
          <p class="text-xs text-slate-400">기기 {currentData.deviceCode} · 펌웨어 {currentData.firmwareBuildId} · {currentData.channel} 채널</p>
        </>
      ) : null}
    </section>
  );
}
