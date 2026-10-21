import { useMemo, useState } from 'preact/hooks';

import { AppsIcon, ReloadIcon } from '../components/Icons';
import { SectionHeading } from '../components/SectionHeading';
import type { AppsCatalog, AppsInstallStatus, VerifiedApp } from '../types/apps';
import { errorMessage } from '../utils/errors';

type Category = 'all' | 'network' | 'security' | 'smart_home' | 'other';

interface AppsPageProps {
  data: AppsCatalog | null;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
  onRetry: () => void;
  installStatus: AppsInstallStatus | null;
  statusError: string | null;
  onRefreshStatus: () => void;
  onInstall: (id: string) => Promise<void>;
  onRemove: (id: string) => Promise<void>;
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

export function AppsPage({ data, error, loading, refreshing, onRetry, installStatus, statusError,
  onRefreshStatus, onInstall, onRemove }: AppsPageProps) {
  const [category, setCategory] = useState<Category>('all');
  const [query, setQuery] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const currentData = error ? null : data;
  const apps = currentData?.apps ?? [];
  const orphans = Object.entries(installStatus?.installed ?? {}).filter(([id, state]) => state.managed && !apps.some((app) => app.id === id));
  const job = installStatus?.job;
  const running = job?.phase === 'starting' || job?.phase === 'running';
  const filtered = useMemo(() => apps.filter((app) =>
    (category === 'all' || categoryOf(app) === category) &&
    `${app.name} ${app.summary}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  ), [apps, category, query]);

  const requestOperation = async (app: VerifiedApp, action: 'install' | 'remove') => {
    const verb = action === 'install' ? '설치' : '제거';
    if (!window.confirm(`${app.name} 앱을 ${verb}하시겠습니까?\n\n앱을 변경하는 동안 공유기를 재부팅하지 마세요.`)) return;
    setActionError(null);
    setPending(app.id);
    try {
      if (action === 'install') await onInstall(app.id);
      else await onRemove(app.id);
      onRefreshStatus();
    } catch (cause: unknown) {
      setActionError(errorMessage(cause, `${app.name} 앱 작업을 시작하지 못했습니다.`));
    } finally {
      setPending(null);
    }
  };

  return (
    <section class="min-w-0 space-y-6">
      <div class="min-w-0">
        <SectionHeading
          eyebrow="SmartSafeHub Apps"
          title="Apps"
          description="SmartSafeHub에서 직접 검증한 앱으로 공유기의 기능을 확장하세요."
        />
        <div class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5 sm:p-5">
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
            <div class="flex flex-wrap items-center gap-2">
              <span class="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800">
                {currentData ? `${apps.length}개` : '확인 전'}
              </span>
              <button
                class="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:border-teal-300 hover:text-teal-700 disabled:opacity-50"
                disabled={loading || refreshing}
                onClick={onRetry}
                type="button"
              >
                <ReloadIcon class={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? '확인 중' : '목록 새로고침'}
              </button>
            </div>
          </div>
          <p class="mt-4 mb-0 text-xs leading-5 text-slate-500">
            검증된 APK 패키지를 설치하거나 제거할 수 있습니다. 설치 및 제거는 공유기에서 실행되며, 완료할 때까지 다른 앱 작업을 시작할 수 없습니다.
          </p>
        </div>
      </div>

      {job && job.phase !== 'idle' ? (
        <div aria-live="polite" class={`rounded-2xl border p-4 text-sm ${job.phase === 'failed' ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-teal-200 bg-teal-50 text-teal-900'}`} role="status">
          {running ? '앱 작업 진행 중' : job.phase === 'success' ? '마지막 앱 작업 완료' : '마지막 앱 작업 실패'}
          {job.appId ? ` · ${job.appId}` : ''}
          {job.code && job.code !== 'NONE' ? ` · 오류 코드 ${job.code}` : ''}
          {running ? <p class="mb-0 mt-1 text-xs">설치 확인과 패키지 처리가 진행 중입니다. 화면을 닫아도 작업은 계속됩니다.</p> : null}
        </div>
      ) : null}
      {actionError ? <p class="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800" role="alert">{actionError}</p> : null}
      {statusError ? <div class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900" role="alert">설치 상태를 확인하지 못했습니다. 설치 및 제거 버튼이 비활성화됩니다. <button class="underline" onClick={onRefreshStatus} type="button">다시 확인</button></div> : null}
      {error ? (
        <div class="rounded-2xl border border-rose-200 bg-rose-50 p-5" role="alert">
          <p class="m-0 text-sm font-bold text-rose-800">앱 목록을 불러오지 못했습니다.</p>
          <p class="mt-2 mb-0 text-sm text-rose-700">{error}</p>
          <button class="mt-3 rounded-lg border border-rose-300 px-3 py-2 text-xs font-bold text-rose-800" onClick={onRetry} type="button">다시 시도</button>
        </div>
      ) : null}
      {loading && !currentData ? (
        <div aria-live="polite" class="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500" role="status">검증된 앱 목록을 확인하는 중입니다.</div>
      ) : null}
      {currentData ? (
        <>
          {apps.length > 0 ? (
            <div class="space-y-4">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="flex flex-wrap items-center gap-2" role="group" aria-label="앱 카테고리">
                  {TABS.map((tab) => (
                    <button
                      class={`min-h-10 rounded-xl border px-3 text-xs font-bold ${category === tab.id ? 'border-teal-400 bg-teal-50 text-teal-800' : 'border-slate-200 bg-white text-slate-600'}`}
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
                {filtered.map((app) => {
                  const state = installStatus?.installed[app.id];
                  const installed = state?.installed ?? false;
                  const managed = state?.managed ?? false;
                  const working = running && job?.appId === app.id;
                  const disabled = !installStatus || Boolean(statusError) || pending !== null || running;
                  return (
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
                        {working ? <span class="text-xs font-semibold text-teal-700">작업 중…</span>
                          : installed && !managed ? <span class="text-xs text-slate-500">기존에 설치됨</span>
                          : state?.partial && !managed ? <span class="text-xs text-amber-700">일부 패키지 설치됨</span>
                          : <button
                              class="min-h-9 rounded-lg border border-teal-300 px-3 text-xs font-bold text-teal-800 transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-50"
                              disabled={disabled || (Boolean(state?.partial) && !managed)}
                              onClick={() => void requestOperation(app, managed && (installed || state?.partial) ? 'remove' : 'install')}
                              type="button"
                            >{managed ? (installed || state?.partial ? '제거' : '재설치') : '설치'}</button>}
                      </div>
                    </article>
                  );
                })}
              </div>
              {filtered.length === 0 ? <p class="rounded-xl bg-slate-100 p-5 text-center text-sm text-slate-600">검색 조건에 맞는 앱이 없습니다.</p> : null}
            </div>
          ) : (
            <div class="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-12 text-center">
              <AppsIcon class="mx-auto size-10 text-slate-400" />
              <h3 class="mt-4 mb-2 text-base font-black text-slate-900">아직 등록된 앱이 없습니다.</h3>
              <p class="m-0 text-sm leading-6 text-slate-500">현재 기기와 펌웨어에 대해 승인된 앱이 준비되면 이곳에서 확인할 수 있습니다.</p>
            </div>
          )}
          <p class="text-xs text-slate-400">기기 {currentData.deviceCode} · 펌웨어 {currentData.firmwareBuildId} · {currentData.channel} 채널</p>
        </>
      ) : null}
          {orphans.length > 0 ? (
            <div class="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <h3 class="m-0 text-sm font-black text-amber-900">제공이 중단된 앱</h3>
              <p class="mb-3 mt-1 text-xs text-amber-800">현재 승인 목록에서 제외되었지만 기기에 남아 있는 앱입니다. 설치는 불가능하며 제거할 수 있습니다.</p>
              <div class="space-y-2">
                {orphans.map(([id]) => (
                  <div class="flex flex-wrap items-center justify-between gap-3" key={id}>
                    <span class="break-all text-sm text-amber-900">{id}</span>
                    <button
                      class="min-h-9 rounded-lg border border-amber-400 px-3 text-xs font-bold text-amber-900 disabled:opacity-50"
                      disabled={running || pending !== null || Boolean(statusError)}
                      onClick={() => void requestOperation({ id, name: id, summary: '', description: '', category: '', version: '' }, 'remove')}
                      type="button"
                    >제거</button>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
    </section>
  );
}
