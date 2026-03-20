export function luciAdminUrl(route: string): string {
  const marker = '/admin/';
  const index = window.location.pathname.indexOf(marker);
  const base =
    index >= 0 ? window.location.pathname.slice(0, index) : '/cgi-bin/luci';

  return `${base}${route}`;
}
