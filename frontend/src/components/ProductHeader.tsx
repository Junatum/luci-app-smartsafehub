import { MoonIcon, RefreshIcon, SunIcon } from './Icons';

interface ProductHeaderProps {
  description: string;
  loading: boolean;
  onRefresh: () => void;
  onToggleTheme: () => void;
  refreshing: boolean;
  theme: 'dark' | 'light';
  title: string;
}

export function ProductHeader({
  description,
  loading,
  onRefresh,
  onToggleTheme,
  refreshing,
  theme,
  title,
}: ProductHeaderProps) {
  return (
    <header class="ssh-product-hero border-b border-slate-200 bg-white px-4 py-4 sm:px-6 lg:px-8 xl:px-10">
      <div class="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4">
        <div class="min-w-0">
          <p class="m-0 text-[0.68rem] font-extrabold uppercase tracking-[0.18em] text-teal-700">
            SmartSafeHub
          </p>
          <div class="mt-1 flex min-w-0 items-baseline gap-3">
            <h1 class="m-0 truncate text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
              {title}
            </h1>
            <p class="m-0 hidden truncate text-sm text-slate-500 lg:block">
              {description}
            </p>
          </div>
        </div>

        <div class="flex shrink-0 items-center gap-2">
          <button
            aria-label={theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
            class="hidden size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm shadow-slate-900/5 transition hover:border-slate-300 hover:bg-slate-50 hover:text-teal-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-100 md:inline-flex"
            onClick={onToggleTheme}
            title={theme === 'dark' ? '라이트 모드' : '다크 모드'}
            type="button"
          >
            {theme === 'dark' ? <SunIcon class="size-4.5" /> : <MoonIcon class="size-4.5" />}
          </button>
          <button
            aria-busy={refreshing}
            aria-label={refreshing ? '새로고침 중' : '현재 화면 새로고침'}
            class={`hidden size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5 transition hover:border-slate-300 hover:bg-slate-50 hover:text-teal-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-100 disabled:cursor-wait disabled:opacity-60 md:inline-flex ${
              refreshing ? 'text-teal-700' : 'text-slate-600'
            }`}
            disabled={loading || refreshing}
            onClick={onRefresh}
            title={refreshing ? '새로고침 중' : '새로고침'}
            type="button"
          >
            <RefreshIcon class={`size-4.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
}
