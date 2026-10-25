/** Restrict app launch targets to same-origin LuCI admin pages only. */
export function approvedLuciPath(webUi: { type: string; path: string } | null | undefined): string | null {
  if (webUi?.type !== 'luci') return null;
  const path = webUi.path;
  if (typeof path !== 'string' || path.length > 160) return null;
  if (!/^\/cgi-bin\/luci\/admin\/[a-z0-9_-]+(?:\/[a-z0-9_-]+)*$/.test(path)) return null;
  return path;
}
