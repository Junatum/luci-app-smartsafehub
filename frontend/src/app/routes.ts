export type AppRoute =
  | 'home'
  | 'wifi'
  | 'devices'
  | 'safeshield'
  | 'rules'
  | 'system'
  | 'settings';

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
    label: '대시보드',
    title: '대시보드',
    description: '네트워크, 장치와 시스템 상태를 한눈에 확인합니다.',
  },
  {
    route: 'wifi',
    hash: '#wifi',
    label: 'Wi-Fi',
    title: 'Wi-Fi',
    description: '기본 무선 네트워크의 이름, 보안과 사용 상태를 관리합니다.',
  },
  {
    route: 'devices',
    hash: '#devices',
    label: '연결된 기기',
    title: '연결된 기기',
    description: '네트워크에서 확인된 기기와 연결 방식을 살펴봅니다.',
  },
  {
    route: 'safeshield',
    hash: '#safeshield',
    label: 'SafeShield',
    title: 'SafeShield',
    description: 'DNS 보호 상태를 확인하고 차단 목록을 관리합니다.',
  },
  {
    route: 'rules',
    hash: '#rules',
    label: '사용자 규칙',
    title: '사용자 규칙',
    description: '직접 허용하거나 차단할 도메인을 관리합니다.',
  },
  {
    route: 'system',
    hash: '#system',
    label: '업데이트',
    title: '업데이트',
    description: 'SmartSafeHub 소프트웨어 업데이트 상태와 자동 설치 일정을 관리합니다.',
  },
  {
    route: 'settings',
    hash: '#settings',
    label: '설정',
    title: '설정',
    description: '시스템 상태를 확인하고 장치 관리와 고급 설정 진입점을 관리합니다.',
  },
] as const;

export const ROUTE_BY_NAME = Object.fromEntries(
  ROUTES.map((definition) => [definition.route, definition]),
) as Record<AppRoute, RouteDefinition>;
