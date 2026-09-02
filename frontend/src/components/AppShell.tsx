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
    <div class="ssh-app min-h-screen bg-slate-50 text-slate-950">
      <ProductHeader
        description={copy.description}
        loading={loading}
        onRefresh={onRefresh}
        refreshing={refreshing}
        title={copy.title}
      />
      <main class="ssh-product-main bg-slate-50 px-4 pb-8 sm:px-6 sm:pb-10 lg:px-10 lg:pb-12">
        <ProductNavigation route={route} title={copy.title} updateCount={updateCount} />
        {children}
      </main>
    </div>
  );
}
