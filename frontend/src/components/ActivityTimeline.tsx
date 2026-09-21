import type { ComponentChildren } from 'preact';

import { formatNumber, formatTimestamp } from '../app/format';
import type { ActivityEvent, ActivityEventSeverity } from '../types/activity';
import {
  AlertIcon,
  CheckCircleIcon,
  ClockIcon,
  ReloadIcon,
} from './Icons';

interface ActivityPresentation {
  title: string;
  description: string | null;
}

function metadataString(event: ActivityEvent, key: string): string | null {
  const value = event.metadata[key];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function metadataNumber(event: ActivityEvent, key: string): number | null {
  const value = event.metadata[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  if (seconds < 60) {
    return `${seconds}초`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}분 ${remainingSeconds}초` : `${minutes}분`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}시간 ${remainingMinutes}분` : `${hours}시간`;
}

function versionTransition(event: ActivityEvent): string | null {
  const fromVersion = metadataString(event, 'from_version');
  const toVersion = metadataString(event, 'to_version');

  if (fromVersion && toVersion) {
    return `${fromVersion} → ${toVersion}`;
  }
  if (toVersion) {
    return `${toVersion} 버전이 적용되었습니다.`;
  }
  return null;
}

function licensePlan(value: string | null): string | null {
  if (!value) {
    return null;
  }

  return value.toUpperCase();
}

export function activityPresentation(event: ActivityEvent): ActivityPresentation {
  switch (event.eventType) {
    case 'system.booted':
      return {
        title: '공유기 시작',
        description: 'SmartSafeHub가 새 부팅 세션을 시작했습니다.',
      };

    case 'network.internet.disconnected':
      return {
        title: '인터넷 연결 끊김',
        description: '상위 네트워크 연결이 끊어졌습니다.',
      };

    case 'network.internet.recovered': {
      const downtime = metadataNumber(event, 'downtime_seconds');
      return {
        title: '인터넷 연결 복구',
        description:
          downtime !== null && downtime > 0
            ? `${formatDuration(downtime)} 동안 연결이 중단되었습니다.`
            : '인터넷 연결이 다시 정상 상태로 돌아왔습니다.',
      };
    }

    case 'safeshield.protection.enabled':
      return {
        title: 'SafeShield 보호 켜짐',
        description: 'DNS 보호 기능이 활성화되었습니다.',
      };

    case 'safeshield.protection.disabled':
      return {
        title: 'SafeShield 보호 꺼짐',
        description: 'DNS 보호 기능이 비활성화되었습니다.',
      };

    case 'safeshield.blocklist.updated': {
      const domainCount = metadataNumber(event, 'domain_count');
      const artifactVersion = metadataString(event, 'artifact_version');
      const details: string[] = [];
      if (domainCount !== null && domainCount > 0) {
        details.push(`${formatNumber(domainCount)}개 도메인 적용`);
      }
      if (artifactVersion) {
        details.push(`목록 ${artifactVersion}`);
      }
      return {
        title: 'SafeShield 차단 목록 업데이트 완료',
        description: details.length > 0 ? details.join(' · ') : '최신 차단 목록을 적용했습니다.',
      };
    }

    case 'safeshield.blocklist.update_failed':
      return {
        title: 'SafeShield 차단 목록 업데이트 실패',
        description: metadataString(event, 'error_code')
          ? `오류 코드: ${metadataString(event, 'error_code')}`
          : '차단 목록을 업데이트하지 못했습니다.',
      };

    case 'software.update.completed':
      return {
        title: '관리 소프트웨어 업데이트 완료',
        description: versionTransition(event),
      };

    case 'software.update.failed':
      return {
        title: '관리 소프트웨어 업데이트 실패',
        description: metadataString(event, 'error_code')
          ? `오류 코드: ${metadataString(event, 'error_code')}`
          : '업데이트 작업을 완료하지 못했습니다.',
      };

    case 'firmware.update.started':
      return {
        title: '펌웨어 업데이트 시작',
        description: '펌웨어 설치를 시작했습니다. 완료 과정에서 공유기가 재부팅됩니다.',
      };

    case 'firmware.update.failed':
      return {
        title: '펌웨어 업데이트 실패',
        description: metadataString(event, 'error_code')
          ? `오류 코드: ${metadataString(event, 'error_code')}`
          : '펌웨어 설치 준비 또는 검증에 실패했습니다.',
      };

    case 'license.activated': {
      const plan = licensePlan(metadataString(event, 'to_plan'));
      return {
        title: '라이선스 활성화',
        description: plan ? `${plan} 라이선스가 활성화되었습니다.` : '라이선스가 활성화되었습니다.',
      };
    }

    case 'license.changed': {
      const fromPlan = licensePlan(metadataString(event, 'from_plan'));
      const toPlan = licensePlan(metadataString(event, 'to_plan'));
      return {
        title: '라이선스 변경',
        description:
          fromPlan && toPlan
            ? `${fromPlan} → ${toPlan}`
            : toPlan
              ? `${toPlan} 라이선스로 변경되었습니다.`
              : '라이선스 상태가 변경되었습니다.',
      };
    }

    case 'license.cleared':
      return {
        title: '라이선스 해제',
        description: '서버의 라이선스 상태와 동기화되어 로컬 라이선스가 해제되었습니다.',
      };

    case 'health.issue.started': {
      const warningCount = metadataNumber(event, 'warning_count') ?? 0;
      const criticalCount = metadataNumber(event, 'critical_count') ?? 0;
      const details: string[] = [];
      if (criticalCount > 0) {
        details.push(`이상 ${formatNumber(criticalCount)}건`);
      }
      if (warningCount > 0) {
        details.push(`주의 ${formatNumber(warningCount)}건`);
      }
      return {
        title: '장치 진단에서 확인 항목 발견',
        description: details.length > 0 ? details.join(' · ') : '확인이 필요한 진단 항목이 발견되었습니다.',
      };
    }

    case 'health.issue.changed': {
      const warningCount = metadataNumber(event, 'warning_count') ?? 0;
      const criticalCount = metadataNumber(event, 'critical_count') ?? 0;
      const details: string[] = [];
      if (criticalCount > 0) {
        details.push(`이상 ${formatNumber(criticalCount)}건`);
      }
      if (warningCount > 0) {
        details.push(`주의 ${formatNumber(warningCount)}건`);
      }
      return {
        title: '장치 진단 상태 변경',
        description: details.length > 0 ? details.join(' · ') : '진단에서 확인 중인 항목이 변경되었습니다.',
      };
    }

    case 'health.issue.resolved':
      return {
        title: '장치 진단 정상화',
        description: '이전에 확인된 진단 항목이 해소되었습니다.',
      };

    default:
      return {
        title: 'SmartSafeHub 활동',
        description: '장치에서 새로운 활동이 기록되었습니다.',
      };
  }
}

function severityTone(severity: ActivityEventSeverity): {
  icon: ComponentChildren;
  surface: string;
} {
  if (severity === 'error') {
    return {
      icon: <AlertIcon class="size-4" />,
      surface: 'bg-rose-50 text-rose-700 ring-rose-200',
    };
  }
  if (severity === 'warning') {
    return {
      icon: <AlertIcon class="size-4" />,
      surface: 'bg-amber-50 text-amber-800 ring-amber-200',
    };
  }
  if (severity === 'success') {
    return {
      icon: <CheckCircleIcon class="size-4" />,
      surface: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    };
  }
  return {
    icon: <ClockIcon class="size-4" />,
    surface: 'bg-slate-100 text-slate-600 ring-slate-200',
  };
}

function timeLabel(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

function dateKey(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function dateHeading(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const elapsedDays = Math.round((today.getTime() - target.getTime()) / 86_400_000);

  if (elapsedDays === 0) {
    return '오늘';
  }
  if (elapsedDays === 1) {
    return '어제';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(date);
}

export function ActivityTimeline({
  compact = false,
  events,
}: {
  compact?: boolean;
  events: ActivityEvent[];
}) {
  if (events.length === 0) {
    return (
      <div class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-center">
        <ClockIcon class="mx-auto size-5 text-slate-400" />
        <p class="mt-2 mb-0 text-sm font-extrabold text-slate-700">아직 기록된 활동이 없습니다.</p>
        <p class="mt-1 mb-0 text-xs leading-5 text-slate-500">
          상태가 실제로 변경되면 이곳에 시간순으로 기록됩니다.
        </p>
      </div>
    );
  }

  let previousDate = '';

  return (
    <div class={compact ? 'space-y-0' : 'space-y-1'}>
      {events.map((event) => {
        const presentation = activityPresentation(event);
        const tone = severityTone(event.severity);
        const currentDate = dateKey(event.occurredAt);
        const showDate = !compact && currentDate !== previousDate;
        previousDate = currentDate;

        return (
          <div key={event.eventId}>
            {showDate ? (
              <p class="mt-5 mb-2 first:mt-0 text-xs font-black text-slate-500">
                {dateHeading(event.occurredAt)}
              </p>
            ) : null}
            <article
              class={`relative flex min-w-0 gap-3 ${
                compact
                  ? 'border-b border-slate-100 py-3 first:pt-0 last:border-b-0 last:pb-0'
                  : 'rounded-xl px-2 py-3 hover:bg-slate-50'
              }`}
            >
              <div class="w-12 shrink-0 pt-1 text-xs font-bold tabular-nums text-slate-400">
                <time dateTime={new Date(event.occurredAt * 1000).toISOString()} title={formatTimestamp(event.occurredAt)}>
                  {timeLabel(event.occurredAt)}
                </time>
              </div>
              <span
                class={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-full ring-1 ring-inset ${tone.surface}`}
              >
                {tone.icon}
              </span>
              <div class="min-w-0 flex-1">
                <p class="m-0 text-sm font-black leading-5 text-slate-950">{presentation.title}</p>
                {presentation.description ? (
                  <p class="mt-1 mb-0 break-words text-xs font-medium leading-5 text-slate-500">
                    {presentation.description}
                  </p>
                ) : null}
              </div>
            </article>
          </div>
        );
      })}
    </div>
  );
}

export function ActivityLoadState({
  error,
  loading,
  onRetry,
}: {
  error: string | null;
  loading: boolean;
  onRetry?: () => void;
}) {
  if (loading) {
    return (
      <div class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-center">
        <ReloadIcon class="mx-auto size-5 animate-spin text-teal-700" />
        <p class="mt-2 mb-0 text-sm font-bold text-slate-500">최근 활동을 불러오는 중입니다.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div class="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-4">
        <div class="flex items-start gap-3">
          <AlertIcon class="mt-0.5 size-5 shrink-0 text-amber-700" />
          <div class="min-w-0 flex-1">
            <p class="m-0 text-sm font-black text-slate-950">최근 활동을 불러오지 못했습니다.</p>
            <p class="mt-1 mb-0 text-xs leading-5 text-slate-500">{error}</p>
            {onRetry ? (
              <button
                class="mt-3 inline-flex min-h-9 items-center justify-center rounded-lg border border-amber-300 bg-white px-3 text-xs font-extrabold text-amber-800 transition hover:bg-amber-50"
                onClick={onRetry}
                type="button"
              >
                다시 시도
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
