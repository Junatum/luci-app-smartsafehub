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
  MoonIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  SettingsIcon,
  ShieldIcon,
  SunIcon,
  UpdateIcon,
  UserIcon,
  WifiIcon,
} from './Icons';

interface ProductNavigationProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onToggleTheme: () => void;
  route: AppRoute;
  theme: 'dark' | 'light';
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

function ThemeIcon({ theme }: { theme: 'dark' | 'light' }) {
  return theme === 'dark' ? <SunIcon class="size-5" /> : <MoonIcon class="size-5" />;
}

function themeActionLabel(theme: 'dark' | 'light'): string {
  return theme === 'dark' ? '라이트 모드' : '다크 모드';
}

function navigationClass(active: boolean, collapsed = false): string {
  return `relative flex min-h-11 min-w-0 items-center rounded-xl py-2.5 text-sm font-extrabold no-underline transition ${
    collapsed ? 'justify-center px-2' : 'gap-3 px-3'
  } ${
    active
      ? 'bg-teal-50 text-teal-800 ring-1 ring-inset ring-teal-200'
      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
  }`;
}

function NavigationItems({
  collapsed = false,
  route,
  updateCount,
}: {
  collapsed?: boolean;
  route: AppRoute;
  updateCount: number;
}) {
  return (
    <div class={collapsed ? 'space-y-3' : 'space-y-5'}>
      {NAVIGATION_GROUPS.map((group, groupIndex) => (
        <section
          aria-label={group.label}
          class={
            collapsed && groupIndex > 0 ? 'border-t border-slate-100 pt-3' : undefined
          }
          key={group.label}
        >
          {collapsed ? null : (
            <p class="mb-2 px-3 text-[0.65rem] font-black uppercase tracking-[0.18em] text-slate-400">
              {group.label}
            </p>
          )}
          <div class="space-y-1">
            {group.routes.map((routeName) => {
              const item = ROUTE_BY_NAME[routeName];
              const active = route === routeName;
              return (
                <a
                  aria-current={active ? 'page' : undefined}
                  aria-label={collapsed ? item.label : undefined}
                  class={navigationClass(active, collapsed)}
                  href={item.hash}
                  key={routeName}
                  title={collapsed ? item.label : undefined}
                >
                  <span
                    class={`grid size-9 shrink-0 place-items-center rounded-lg ${
                      active ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <NavigationIcon route={routeName} />
                  </span>
                  {collapsed ? null : <span class="min-w-0 flex-1 truncate">{item.label}</span>}
                  {routeName === 'system' && updateCount > 0 ? (
                    collapsed ? (
                      <span
                        aria-label={`${updateCount}개의 업데이트`}
                        class="absolute right-1.5 top-1.5 min-w-4 rounded-full bg-amber-100 px-1 py-0.5 text-center text-[9px] font-black leading-none text-amber-800 ring-2 ring-white"
                      >
                        {updateCount}
                      </span>
                    ) : (
                      <span class="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-black text-amber-800">
                        {updateCount}
                      </span>
                    )
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

export function ProductNavigation({
  collapsed,
  onToggleCollapsed,
  onToggleTheme,
  route,
  theme,
  title,
  updateCount,
}: ProductNavigationProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const themeLabel = themeActionLabel(theme);

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
              <button
                aria-label={`${themeLabel}로 전환`}
                class={`${navigationClass(false)} w-full`}
                onClick={onToggleTheme}
                type="button"
              >
                <span class="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
                  <ThemeIcon theme={theme} />
                </span>
                {themeLabel}
              </button>
              <a class={navigationClass(false)} href={luciAdminUrl('/admin/system')}>
                <span class="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
                  <SettingsIcon class="size-5" />
                </span>
                고급 설정
              </a>
              <a
                class={`${navigationClass(false)} text-rose-700 hover:bg-rose-50 hover:text-rose-800`}
                href={luciAdminUrl('/admin/logout')}
              >
                <span class="grid size-9 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-600">
                  <LogOutIcon class="size-5" />
                </span>
                로그아웃
              </a>
            </div>
          </div>
        ) : null}
      </nav>

      <aside
        class="hidden min-h-screen border-r border-slate-200 bg-white md:flex md:flex-col"
        data-collapsed={collapsed ? 'true' : 'false'}
      >
        <div class="sticky top-0 flex h-screen flex-col">
          <div
            class={`flex min-h-20 items-center border-b border-slate-100 ${
              collapsed ? 'justify-center px-2' : 'gap-3 px-4'
            }`}
          >
            <a
              aria-label="SmartSafeHub Dashboard"
              class={`flex items-center no-underline ${
                collapsed ? 'justify-center' : 'min-w-0 flex-1 gap-3'
              }`}
              href="#home"
              title={collapsed ? 'SmartSafeHub' : undefined}
            >
              <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-950 text-teal-300 shadow-sm shadow-slate-950/10">
                <ShieldIcon class="size-5" />
              </span>
              {collapsed ? null : (
                <div class="min-w-0">
                  <strong class="block truncate text-sm font-black tracking-tight text-slate-950">
                    SmartSafeHub
                  </strong>
                  <span class="block text-[0.68rem] font-bold uppercase tracking-[0.14em] text-slate-400">
                    Home Gateway
                  </span>
                </div>
              )}
            </a>
            <button
              aria-controls="smartsafehub-desktop-navigation"
              aria-expanded={!collapsed}
              aria-label={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
              class={`inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-white text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-100 ${
                collapsed
                  ? 'absolute -right-3 top-6 z-10 size-7 border-slate-200 shadow-sm shadow-slate-900/10'
                  : 'size-8'
              }`}
              onClick={onToggleCollapsed}
              title={collapsed ? '사이드바 펼치기' : '사이드바 접기'}
              type="button"
            >
              {collapsed ? (
                <PanelLeftOpenIcon class="size-4" />
              ) : (
                <PanelLeftCloseIcon class="size-4.5" />
              )}
            </button>
          </div>
          <nav
            aria-label="SmartSafeHub 메뉴"
            class={`flex-1 overflow-y-auto py-5 ${collapsed ? 'px-2' : 'px-3'}`}
            id="smartsafehub-desktop-navigation"
          >
            <NavigationItems collapsed={collapsed} route={route} updateCount={updateCount} />
          </nav>
          <div class={`border-t border-slate-100 ${collapsed ? 'p-2' : 'p-3'}`}>
            <button
              aria-label={`${themeLabel}로 전환`}
              class={`${navigationClass(false, collapsed)} w-full`}
              onClick={onToggleTheme}
              title={collapsed ? themeLabel : undefined}
              type="button"
            >
              <span class="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
                <ThemeIcon theme={theme} />
              </span>
              {collapsed ? null : themeLabel}
            </button>
            <a
              aria-label={collapsed ? '고급 설정' : undefined}
              class={navigationClass(false, collapsed)}
              href={luciAdminUrl('/admin/system')}
              title={collapsed ? '고급 설정' : undefined}
            >
              <span class="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
                <SettingsIcon class="size-5" />
              </span>
              {collapsed ? null : '고급 설정'}
            </a>
            <a
              aria-label="SmartSafeHub에서 로그아웃"
              class={`${navigationClass(false, collapsed)} mt-1 text-rose-700 hover:bg-rose-50 hover:text-rose-800`}
              href={luciAdminUrl('/admin/logout')}
              title={collapsed ? '로그아웃' : undefined}
            >
              <span class="grid size-9 shrink-0 place-items-center rounded-lg bg-rose-50 text-rose-600">
                <LogOutIcon class="size-5" />
              </span>
              {collapsed ? null : '로그아웃'}
            </a>
          </div>
        </div>
      </aside>
    </>
  );
}
