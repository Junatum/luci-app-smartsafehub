import { useEffect, useState } from 'preact/hooks';

import type { AppRoute } from '../app/routes';

const ROUTE_STORAGE_KEY = 'smartsafehub.route.hash';

const HASH_ROUTES: Readonly<Record<string, AppRoute>> = {
  '#home': 'home',
  '#lan': 'lan',
  '#wifi': 'wifi',
  '#devices': 'devices',
  '#safeshield': 'safeshield',
  '#rules': 'rules',
  '#system': 'system',
  '#settings': 'settings',
};

function isKnownHash(hash: string): boolean {
  return HASH_ROUTES[hash] !== undefined;
}

function readStoredHash(): string {
  try {
    return window.sessionStorage.getItem(ROUTE_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
}

function writeStoredHash(hash: string): void {
  try {
    if (isKnownHash(hash)) {
      window.sessionStorage.setItem(ROUTE_STORAGE_KEY, hash);
    } else {
      window.sessionStorage.removeItem(ROUTE_STORAGE_KEY);
    }
  } catch {
    // Storage can be unavailable in hardened/private browser contexts.
  }
}

function isReloadNavigation(): boolean {
  const navigation = window.performance.getEntriesByType('navigation')[0] as
    | PerformanceNavigationTiming
    | undefined;

  return navigation?.type === 'reload';
}

function restoreHashAfterReload(): string {
  const currentHash = window.location.hash;

  if (isKnownHash(currentHash)) {
    writeStoredHash(currentHash);
    return currentHash;
  }

  if (currentHash || !isReloadNavigation()) {
    writeStoredHash('');
    return currentHash;
  }

  const storedHash = readStoredHash();

  if (!isKnownHash(storedHash)) {
    writeStoredHash('');
    return '';
  }

  window.history.replaceState(
    null,
    '',
    `${window.location.pathname}${window.location.search}${storedHash}`,
  );

  return storedHash;
}

function routeFromHash(hash = window.location.hash): AppRoute {
  return HASH_ROUTES[hash] ?? 'home';
}

export function useHashRoute(): AppRoute {
  const [route, setRoute] = useState<AppRoute>(() =>
    routeFromHash(restoreHashAfterReload()),
  );

  useEffect(() => {
    const handleChange = () => {
      const hash = window.location.hash;
      writeStoredHash(hash);
      setRoute(routeFromHash(hash));
    };

    window.addEventListener('hashchange', handleChange);
    return () => window.removeEventListener('hashchange', handleChange);
  }, []);

  return route;
}
