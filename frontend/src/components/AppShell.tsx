import type { ComponentChildren } from 'preact';

import { ROUTE_BY_NAME } from '../app/routes';
import type { AppRoute } from '../app/routes';
import { ProductHeader } from './ProductHeader';
import { ProductNavigation } from './ProductNavigation';

interface AppShellProps {
  children: ComponentChildren;
  loading: boolean;
  onRefresh: () => void;
  refreshing: boolean;
  route: AppRoute;
  updateCount: number;
}

export function AppShell({
  children,
  loading,
  onRefresh,
  refreshing,
  route,
  updateCount,
}: AppShellProps) {
  const copy = ROUTE_BY_NAME[route];

  return (
    <div class="ssh-app min-h-screen bg-slate-50 text-slate-950 md:grid md:grid-cols-[16rem_minmax(0,1fr)]">
      <ProductNavigation route={route} title={copy.title} updateCount={updateCount} />
      <div class="min-w-0 md:min-h-screen">
        <ProductHeader
          description={copy.description}
          loading={loading}
          onRefresh={onRefresh}
          refreshing={refreshing}
          title={copy.title}
        />
        <main class="ssh-product-main mx-auto w-full max-w-[1600px] bg-slate-50 px-4 pb-8 pt-5 sm:px-6 sm:pb-10 sm:pt-6 lg:px-8 lg:pb-12 lg:pt-8 xl:px-10">
          {children}
        </main>
      </div>
    </div>
  );
}
