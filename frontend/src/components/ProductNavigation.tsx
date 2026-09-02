import { useEffect, useState } from 'preact/hooks';

import { ROUTE_BY_NAME } from '../app/routes';
import type { AppRoute } from '../app/routes';
import { luciAdminUrl } from '../utils/luci';
import {
  CloseIcon,
  DevicesIcon,
  HomeIcon,
  LogOutIcon,
  MenuIcon,
  SettingsIcon,
  ShieldIcon,
  UpdateIcon,
  UserIcon,
  WifiIcon,
} from './Icons';

interface ProductNavigationProps {
  route: AppRoute;
  title: string;
  updateCount: number;
}

const NAVIGATION_GROUPS: readonly {
  label: string;
  routes: readonly AppRoute[];
}[] = [
  { label: 'Overview', routes: ['home'] },
  { label: 'Network', routes: ['wifi', 'devices'] },
  { label: 'Security', routes: ['safeshield', 'rules'] },
  { label: 'System', routes: ['system'] },
];

function NavigationIcon({ route }: { route: AppRoute }) {
  switch (route) {
    case 'home':
      return <HomeIcon class="size-5" />;
    case 'wifi':
      return <WifiIcon class="size-5" />;
    case 'devices':
      return <DevicesIcon class="size-5" />;
    case 'safeshield':
      return <ShieldIcon class="size-5" />;
    case 'rules':
      return <UserIcon class="size-5" />;
    case 'system':
      return <UpdateIcon class="size-5" />;
  }
}

function navigationClass(active: boolean): string {
  return `flex min-h-11 min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-extrabold no-underline transition ${
    active
      ? 'bg-teal-50 text-teal-800 ring-1 ring-inset ring-teal-200'
      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
  }`;
}

function NavigationItems({ route, updateCount }: { route: AppRoute; updateCount: number }) {
  return (
    <div class="space-y-5">
      {NAVIGATION_GROUPS.map((group) => (
        <section aria-label={group.label} key={group.label}>
          <p class="mb-2 px-3 text-[0.65rem] font-black uppercase tracking-[0.18em] text-slate-400">
            {group.label}
          </p>
          <div class="space-y-1">
            {group.routes.map((routeName) => {
              const item = ROUTE_BY_NAME[routeName];
              const active = route === routeName;
              return (
                <a
                  aria-current={active ? 'page' : undefined}
                  class={navigationClass(active)}
                  href={item.hash}
                  key={routeName}
                >
                  <span
                    class={`grid size-9 shrink-0 place-items-center rounded-lg ${
                      active ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <NavigationIcon route={routeName} />
                  </span>
                  <span class="min-w-0 flex-1 truncate">{item.label}</span>
                  {routeName === 'system' && updateCount > 0 ? (
                    <span class="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-black text-amber-800">
                      {updateCount}
                    </span>
                  ) : null}
                </a>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}


export function ProductNavigation({ route, title, updateCount }: ProductNavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [route]);

  useEffect(() => {
    if (!mobileMenuOpen) {
      return undefined;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [mobileMenuOpen]);

  return (
    <>
      <nav
        aria-label="SmartSafeHub 모바일 메뉴"
        class="ssh-mobile-navigation sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-4 shadow-sm shadow-slate-900/5 backdrop-blur md:hidden"
      >
        <div class="flex min-h-16 items-center justify-between gap-3">
          <a class="flex min-w-0 items-center gap-3 no-underline" href="#home">
            <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-950 text-teal-300">
              <ShieldIcon class="size-5" />
            </span>
            <span class="min-w-0">
              <strong class="block truncate text-sm font-black text-slate-950">SmartSafeHub</strong>
              <span class="block truncate text-xs font-semibold text-slate-500">{title}</span>
            </span>
          </a>
          <button
            aria-controls="smartsafehub-mobile-menu"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? '모바일 메뉴 닫기' : '모바일 메뉴 열기'}
            class="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-100"
            onClick={() => setMobileMenuOpen((open) => !open)}
            type="button"
          >
            {mobileMenuOpen ? <CloseIcon class="size-5" /> : <MenuIcon class="size-5" />}
          </button>
        </div>

        {mobileMenuOpen ? (
          <div class="ssh-mobile-menu border-t border-slate-100 py-4" id="smartsafehub-mobile-menu">
            <NavigationItems route={route} updateCount={updateCount} />
            <div class="mt-5 space-y-1 border-t border-slate-100 pt-4">
              <a class={navigationClass(false)} href={luciAdminUrl('/admin/system')}>
                <span class="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
                  <SettingsIcon class="size-5" />
                </span>
                고급 설정
              </a>
              <a class={`${navigationClass(false)} text-rose-700 hover:bg-rose-50 hover:text-rose-800`} href={luciAdminUrl('/admin/logout')}>
                <span class="grid size-9 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-600">
                  <LogOutIcon class="size-5" />
                </span>
                로그아웃
              </a>
            </div>
          </div>
        ) : null}
      </nav>

      <aside class="hidden min-h-screen border-r border-slate-200 bg-white md:flex md:flex-col">
        <div class="sticky top-0 flex h-screen flex-col">
          <div class="flex min-h-20 items-center gap-3 border-b border-slate-100 px-5">
            <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-950 text-teal-300 shadow-sm shadow-slate-950/10">
              <ShieldIcon class="size-5" />
             </span>
            <div class="min-w-0">
              <strong class="block truncate text-sm font-black tracking-tight text-slate-950">SmartSafeHub</strong>
              <span class="block text-[0.68rem] font-bold uppercase tracking-[0.14em] text-slate-400">Home Gateway</span>
            </div>
          </div>
          <nav aria-label="SmartSafeHub 메뉴" class="flex-1 overflow-y-auto px-3 py-5">
            <NavigationItems route={route} updateCount={updateCount} />
          </nav>
          <div class="border-t border-slate-100 p-3">
            <a class={navigationClass(false)} href={luciAdminUrl('/admin/system')}>
              <span class="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
                <SettingsIcon class="size-5" />
              </span>
              고급 설정
            </a>
            <a
              aria-label="SmartSafeHub에서 로그아웃"
              class={`${navigationClass(false)} mt-1 text-rose-700 hover:bg-rose-50 hover:text-rose-800`}
              href={luciAdminUrl('/admin/logout')}
            >
              <span class="grid size-9 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-600">
                <LogOutIcon class="size-5" />
              </span>
              로그아웃
            </a>
          </div>
        </div>
      </aside>
    </>
  );
}
