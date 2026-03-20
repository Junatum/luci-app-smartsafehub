import { RefreshIcon, ShieldIcon } from './Icons';

interface ProductHeaderProps {
  description: string;
  loading: boolean;
  onRefresh: () => void;
  refreshing: boolean;
  title: string;
}

export function ProductHeader({
  description,
  loading,
  onRefresh,
  refreshing,
  title,
}: ProductHeaderProps) {
  return (
    <header class="ssh-product-hero bg-slate-950 px-4 py-5 text-white sm:px-6 sm:py-7 lg:px-10 lg:py-10">
      <div class="flex w-full items-start justify-between gap-3 sm:items-center">
        <div class="flex min-w-0 items-start gap-3 sm:items-center sm:gap-5">
          <span class="grid size-11 shrink-0 place-items-center rounded-2xl bg-teal-500/15 text-teal-300 ring-1 ring-inset ring-teal-400/20 sm:size-14">
            <ShieldIcon class="size-6 sm:size-8" />
          </span>
          <div class="min-w-0">
            <p class="m-0 text-[0.68rem] font-extrabold uppercase tracking-[0.2em] text-teal-300 sm:text-xs sm:tracking-[0.24em]">
              SmartSafeHub
            </p>
            <h1 class="mt-1.5 mb-0 break-words text-2xl font-black tracking-tight sm:mt-2 sm:text-3xl lg:text-4xl">
              {title}
            </h1>
            <p class="mt-1.5 mb-0 max-w-3xl text-xs leading-5 text-slate-300 sm:mt-2 sm:text-sm sm:leading-6 lg:text-base">
              {description}
            </p>
          </div>
        </div>

        <button
          aria-label={refreshing ? '새로고침 중' : '현재 화면 새로고침'}
          class="inline-flex size-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 p-0 text-sm font-bold text-white transition hover:bg-white/15 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-400/25 disabled:cursor-wait disabled:opacity-60 sm:h-11 sm:w-auto sm:px-4 sm:py-2.5"
          disabled={loading || refreshing}
          onClick={onRefresh}
          type="button"
        >
          <RefreshIcon class={`size-5 sm:size-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span class="hidden sm:inline">
            {refreshing ? '새로고침 중' : '새로고침'}
          </span>
        </button>
      </div>
    </header>
  );
}
