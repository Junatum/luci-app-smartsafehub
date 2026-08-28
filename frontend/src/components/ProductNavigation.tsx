import { useEffect, useState } from 'preact/hooks';

import { ROUTES } from '../app/routes';
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

function desktopNavigationClass(active: boolean): string {
  return `inline-flex min-h-14 items-center gap-2 border-b-2 px-3 py-2 text-sm font-extrabold no-underline transition lg:px-4 ${
    active
      ? 'border-teal-600 text-teal-700'
      : 'border-transparent text-slate-600 hover:border-slate-200 hover:text-slate-950'
  }`;
}

function desktopNavigationIconClass(active: boolean): string {
  return `grid size-10 shrink-0 place-items-center rounded-xl transition ${
    active
      ? 'bg-teal-700 text-white shadow-sm shadow-teal-900/20'
      : 'text-slate-500'
  }`;
}

function mobileNavigationClass(active: boolean): string {
  return `flex min-h-12 min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-extrabold no-underline transition ${
    active
      ? 'bg-teal-50 text-teal-800 ring-1 ring-inset ring-teal-200'
      : 'text-slate-700 hover:bg-slate-50 hover:text-slate-950'
  }`;
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
        class="ssh-mobile-navigation sticky top-0 z-30 -mx-4 mb-5 border-b border-slate-200 bg-white/95 px-4 shadow-sm shadow-slate-900/5 backdrop-blur md:hidden"
      >
        <div class="flex min-h-14 items-center justify-between gap-3">
          <div class="flex min-w-0 items-center gap-3">
            <span class="grid size-9 shrink-0 place-items-center rounded-xl bg-teal-700 text-white">
              <NavigationIcon route={route} />
            </span>
            <span class="truncate text-sm font-extrabold text-slate-950">
              {title}
            </span>
          </div>
          <button
            aria-controls="smartsafehub-mobile-menu"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? '모바일 메뉴 닫기' : '모바일 메뉴 열기'}
            class="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-100"
            onClick={() => setMobileMenuOpen((open) => !open)}
            type="button"
          >
            {mobileMenuOpen ? (
              <CloseIcon class="size-5" />
            ) : (
              <MenuIcon class="size-5" />
            )}
          </button>
        </div>

        {mobileMenuOpen ? (
          <div
            class="ssh-mobile-menu border-t border-slate-100 py-3"
            id="smartsafehub-mobile-menu"
          >
            <div class="grid grid-cols-1 gap-1 min-[390px]:grid-cols-2">
              {ROUTES.map((item) => {
                const active = route === item.route;

                return (
                  <a
                    aria-current={active ? 'page' : undefined}
                    class={mobileNavigationClass(active)}
                    href={item.hash}
                    key={item.route}
                  >
                    <span class="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600">
                      <NavigationIcon route={item.route} />
                    </span>
                    <span class="min-w-0 truncate">{item.label}</span>
                    {item.route === 'system' && updateCount > 0 ? (
                      <span class="ml-auto rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-black text-amber-800">
                        {updateCount}
                      </span>
                    ) : null}
                  </a>
                );
              })}
            </div>

            <div class="mt-2 grid grid-cols-1 gap-1 border-t border-slate-100 pt-2 min-[390px]:grid-cols-2">
              <a
                class={mobileNavigationClass(false)}
                href={luciAdminUrl('/admin/system')}
              >
                <span class="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600">
                  <SettingsIcon class="size-5" />
                </span>
                <span class="min-w-0 truncate">고급 설정</span>
              </a>
              <a
                class="flex min-h-12 min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-extrabold text-rose-700 no-underline transition hover:bg-rose-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-100"
                href={luciAdminUrl('/admin/logout')}
              >
                <span class="grid size-9 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-600">
                  <LogOutIcon class="size-5" />
                </span>
                <span class="min-w-0 truncate">로그아웃</span>
              </a>
            </div>
          </div>
        ) : null}
      </nav>

      <nav
        aria-label="SmartSafeHub 메뉴"
        class="mb-8 hidden overflow-x-auto border-b border-slate-200 bg-white md:block"
      >
        <div class="flex w-full min-w-max items-center gap-1">
          {ROUTES.map((item) => {
            const active = route === item.route;

            return (
              <a
                aria-current={active ? 'page' : undefined}
                class={desktopNavigationClass(active)}
                href={item.hash}
                key={item.route}
              >
                <span class={desktopNavigationIconClass(active)}>
                  <NavigationIcon route={item.route} />
                </span>
                {item.label}
                {item.route === 'system' && updateCount > 0 ? (
                  <span class="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-black text-amber-800">
                    {updateCount}
                  </span>
                ) : null}
              </a>
            );
          })}
          <a
            class="inline-flex min-h-14 items-center gap-2 border-b-2 border-transparent px-3 py-2 text-sm font-extrabold text-slate-600 no-underline transition hover:border-slate-200 hover:text-slate-950 lg:px-4"
            href={luciAdminUrl('/admin/system')}
          >
            <span class="grid size-10 shrink-0 place-items-center rounded-xl text-slate-500">
              <SettingsIcon class="size-5" />
            </span>
            고급 설정
          </a>
          <span aria-hidden="true" class="min-w-4 flex-1" />
          <a
            aria-label="SmartSafeHub에서 로그아웃"
            class="inline-flex min-h-14 items-center gap-2 border-b-2 border-transparent px-3 py-2 text-sm font-extrabold text-rose-600 no-underline transition hover:border-rose-100 hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-200 lg:px-4"
            href={luciAdminUrl('/admin/logout')}
          >
            <LogOutIcon class="size-5" />
            로그아웃
          </a>
        </div>
      </nav>
    </>
  );
}
