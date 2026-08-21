const DEFAULT_LUCI_BASE = '/cgi-bin/luci';

export function luciBaseUrl(): string {
  const marker = '/cgi-bin/luci';
  const pathname = window.location.pathname;
  const markerIndex = pathname.indexOf(marker);

  if (markerIndex >= 0) {
    return pathname.slice(0, markerIndex + marker.length);
  }

  return DEFAULT_LUCI_BASE;
}

export function luciUrl(route: string): string {
  const normalizedRoute = route.startsWith('/') ? route : `/${route}`;
  return `${luciBaseUrl()}${normalizedRoute}`;
}

export function luciAdminUrl(route: string): string {
  return luciUrl(route);
}

export function smartSafeHubPublicUrl(hash = ''): string {
  const normalizedHash = hash
    ? hash.startsWith('#')
      ? hash
      : `#${hash}`
    : '';

  return `${luciUrl('/smartsafehub')}${normalizedHash}`;
}
