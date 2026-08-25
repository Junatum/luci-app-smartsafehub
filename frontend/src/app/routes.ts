import { t } from '../utils/gettext';

export type AppRoute =
  | 'home'
  | 'wifi'
  | 'devices'
  | 'safeshield'
  | 'rules'
  | 'system';

export interface RouteDefinition {
  route: AppRoute;
  hash: `#${string}`;
  label: string;
  title: string;
  description: string;
}

export const ROUTES: readonly RouteDefinition[] = [
  {
    route: 'home',
    hash: '#home',
    label: t('Home'),
    title: t('Device Dashboard'),
    description: t('Securely check the default status of OpenWrt devices.'),
  },
  {
    route: 'wifi',
    hash: '#wifi',
    label: t('Wi-Fi'),
    title: t('Wi-Fi'),
    description: t('Manage the name, security, and usage of your primary wireless network.'),
  },
  {
    route: 'devices',
    hash: '#devices',
    label: t('Linked devices'),
    title: t('Linked devices'),
    description: t('Learn how to connect to devices that have been identified on your network.'),
  },
  {
    route: 'safeshield',
    hash: '#safeshield',
    label: t('SafeShield'),
    title: t('SafeShield'),
    description: t('Check DNS protection status and manage blocklists.'),
  },
  {
    route: 'rules',
    hash: '#rules',
    label: t('User Rules'),
    title: t('User Rules'),
    description: t('Manage the domains you want to allow or block.'),
  },
  {
    route: 'system',
    hash: '#system',
    label: t('Update'),
    title: t('Updates and systems'),
    description: t('Securely manage firmware, diagnostics, advanced settings and reboot operations.'),
  },
] as const;

export const ROUTE_BY_NAME = Object.fromEntries(
  ROUTES.map((definition) => [definition.route, definition]),
) as Record<AppRoute, RouteDefinition>;
