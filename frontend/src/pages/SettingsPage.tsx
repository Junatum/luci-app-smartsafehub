import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';

import {
  formatBytes,
  formatLoadAverage,
  formatUptime,
  getMemoryUsage,
} from '../app/format';
import type { SystemAction } from '../hooks/useSystemActions';
import type { SmartSafeHubStatus } from '../types/status';
import { luciAdminUrl } from '../utils/luci';

interface SettingsPageProps {
  action: SystemAction;
  data: SmartSafeHubStatus | null;
  error: string | null;
  feedbackError: string | null;
  feedbackMessage: string | null;
  loading: boolean;
  rebootAccepted: boolean;
  onDismissFeedback: () => void;
  onDownloadDiagnostics: () => void;
  onReboot: () => void;
  onRetry: () => void;
}

function InfoCard(props: { label: string; value: string; description: string }) {
  return (
    <article class="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5 sm:p-5">
      <p class="m-0 text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">
        {props.label}
      </p>
      <p class="mt-3 mb-0 break-words text-2xl font-black tracking-tight text-slate-950">
        {props.value}
      </p>
      <p class="mt-2 mb-0 text-sm leading-6 text-slate-500">{props.description}</p>
    </article>
  );
}

function ActionCard(props: {
  title: string;
  description: string;
  children?: ComponentChildren;
  danger?: boolean;
}) {
  return (
    <article
      class={`min-w-0 rounded-2xl border bg-white p-5 shadow-sm shadow-slate-900/5 sm:p-6 ${
        props.danger ? 'border-rose-200' : 'border-slate-200'
      }`}
    >
      <h2
        class={`m-0 text-xl font-black ${
          props.danger ? 'text-rose-950' : 'text-slate-950'
        }`}
      >
        {props.title}
      </h2>
      <p
        class={`mt-2 mb-0 text-sm leading-6 ${
          props.danger ? 'text-rose-700' : 'text-slate-500'
        }`}
      >
        {props.description}
      </p>
      <div class="mt-5">{props.children}</div>
    </article>
  );
}

export function SettingsPage({
  action,
  data,
  error,
  feedbackError,
  feedbackMessage,
  loading,
  rebootAccepted,
  onDismissFeedback,
  onDownloadDiagnostics,
  onReboot,
  onRetry,
}: SettingsPageProps) {
  const [confirmingReboot, setConfirmingReboot] = useState(false);

  if (loading && !data) {
    return (
      <div class="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm shadow-slate-900/5">
        <p class="m-0 text-sm font-bold text-slate-500">시스템 정보를 확인하고 있습니다.</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div class="rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <h2 class="m-0 text-lg font-black text-rose-900">
          시스템 정보를 불러오지 못했습니다.
        </h2>
        <p class="mt-2 mb-0 text-sm leading-6 text-rose-700">{error}</p>
        <button
          class="mt-4 inline-flex min-h-10 items-center rounded-xl bg-rose-700 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-rose-800"
          onClick={onRetry}
          type="button"
        >
          다시 시도
        </button>
      </div>
    );
  }

  const memory = data?.runtime.memory;
  const totalMemory = memory?.total ?? 0;
  const memoryUsage = memory ? getMemoryUsage(memory) : null;
  const usedMemory = memoryUsage?.used ?? 0;
  const memoryPercent = Math.round(memoryUsage?.percent ?? 0);
  const firmwareUrl = luciAdminUrl('/admin/system/flash');
  const advancedSystemUrl = luciAdminUrl('/admin/system');
  const logsUrl = luciAdminUrl('/admin/status/logs');

  return (
    <section class="min-w-0 space-y-6">
      {(feedbackError || feedbackMessage) && (
        <div
          class={`flex min-w-0 flex-col gap-3 rounded-xl border px-4 py-3 text-sm font-bold sm:flex-row sm:items-center sm:justify-between ${
            feedbackError
              ? 'border-rose-200 bg-rose-50 text-rose-800'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
        >
          <span class="min-w-0">{feedbackError || feedbackMessage}</span>
          {!rebootAccepted && (
            <button
              class="shrink-0 self-start rounded-lg px-3 py-1.5 text-xs font-extrabold hover:bg-black/5 sm:self-auto"
              onClick={onDismissFeedback}
              type="button"
            >
              닫기
            </button>
          )}
        </div>
      )}

      <section class="min-w-0">
        <div class="mb-4">
          <p class="m-0 text-xs font-extrabold uppercase tracking-[0.16em] text-teal-700">
            System
          </p>
          <h2 class="mt-2 mb-0 text-xl font-black text-slate-950">시스템 상태</h2>
          <p class="mt-2 mb-0 text-sm leading-6 text-slate-500">
            장치의 펌웨어, 실행 시간, 메모리와 시스템 부하를 확인합니다.
          </p>
        </div>
        <div class="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <InfoCard
            label="Firmware"
            value={data ? `${data.software.version}` : '미확인'}
            description={data ? data.software.revision : '버전 정보를 확인할 수 없습니다.'}
          />
          <InfoCard
            label="Uptime"
            value={data ? formatUptime(data.runtime.uptime) : '미확인'}
            description={
              data ? `커널 ${data.software.kernel}` : '실행 시간을 확인할 수 없습니다.'
            }
          />
          <InfoCard
            label="Memory"
            value={`${memoryPercent}%`}
            description={`${formatBytes(usedMemory)} / ${formatBytes(totalMemory)} 사용`}
          />
          <InfoCard
            label="Load"
            value={data ? formatLoadAverage(data.runtime.load[0]) : '0.00'}
            description={
              data
                ? `5분 ${formatLoadAverage(data.runtime.load[1])} · 15분 ${formatLoadAverage(data.runtime.load[2])}`
                : '시스템 부하를 확인할 수 없습니다.'
            }
          />
        </div>
      </section>

      <section class="min-w-0">
        <div class="mb-4">
          <p class="m-0 text-xs font-extrabold uppercase tracking-[0.16em] text-teal-700">
            Device management
          </p>
          <h2 class="mt-2 mb-0 text-xl font-black text-slate-950">시스템 관리</h2>
          <p class="mt-2 mb-0 text-sm leading-6 text-slate-500">
            자주 사용하는 시스템 작업은 SmartSafeHub에서 처리하고, 아직 제공하지 않는 상세 항목만 LuCI를 사용합니다.
          </p>
        </div>
        <div class="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
          <ActionCard
            title="펌웨어 업데이트"
            description="펌웨어 파일 검증과 업로드는 OpenWrt의 검증된 시스템 업그레이드 화면에서 진행합니다."
          >
            <a
              class="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-extrabold text-white no-underline transition hover:bg-teal-800 sm:w-auto"
              href={firmwareUrl}
            >
              펌웨어 관리 열기
            </a>
            <p class="mt-3 mb-0 text-xs leading-5 text-slate-500">
              같은 화면에서 설정 백업 다운로드와 백업 파일 복원도 수행할 수 있습니다.
            </p>
          </ActionCard>

          <ActionCard
            title="진단 정보"
            description="장치, 펌웨어, 메모리, 인터넷, Wi-Fi와 SafeShield 상태를 JSON 파일로 저장합니다. 비밀번호와 라이선스 키는 포함하지 않지만 호스트명, WAN IP와 Wi-Fi SSID 같은 네트워크 식별 정보는 포함됩니다."
          >
            <button
              class="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-800 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
              disabled={action !== null}
              onClick={onDownloadDiagnostics}
              type="button"
            >
              {action === 'diagnostics' ? '진단 정보 생성 중' : '진단 정보 다운로드'}
            </button>
            <p class="mt-3 mb-0 text-xs leading-5 text-slate-500">
              지원 담당자에게 전달하기 전에 파일에 포함된 네트워크 식별 정보를 확인해 주세요.
            </p>
          </ActionCard>

          <ActionCard
            title="고급 설정"
            description="SmartSafeHub에서 아직 제공하지 않는 상세 시스템 설정과 원본 로그가 필요한 경우에만 LuCI 관리 화면을 사용합니다."
          >
            <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a
                class="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-800 no-underline transition hover:bg-slate-50 sm:w-auto"
                href={advancedSystemUrl}
              >
                LuCI 고급 설정 열기
              </a>
              <a
                class="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-800 no-underline transition hover:bg-slate-50 sm:w-auto"
                href={logsUrl}
              >
                시스템 로그 열기
              </a>
            </div>
            <p class="mt-3 mb-0 text-xs leading-5 text-slate-500">
              SmartSafeHub에서 제공하는 설정 범위를 계속 확대해 LuCI로 이동해야 하는 경우를 줄일 예정입니다.
            </p>
          </ActionCard>

          <ActionCard
            danger
            title="공유기 재부팅"
            description="재부팅하는 동안 인터넷과 Wi-Fi 연결이 잠시 중단됩니다. 저장되지 않은 LuCI 설정이 있다면 먼저 저장해 주세요."
          >
            {!confirmingReboot ? (
              <button
                class="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-rose-300 bg-white px-4 py-2.5 text-sm font-extrabold text-rose-700 transition hover:bg-rose-50 disabled:opacity-60 sm:w-auto"
                disabled={action !== null || rebootAccepted}
                onClick={() => setConfirmingReboot(true)}
                type="button"
              >
                재부팅 준비
              </button>
            ) : (
              <div class="rounded-xl border border-rose-200 bg-rose-50 p-4">
                <p class="m-0 text-sm font-extrabold text-rose-900">
                  지금 공유기를 재부팅하시겠습니까?
                </p>
                <div class="mt-4 flex flex-wrap gap-3">
                  <button
                    class="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50 sm:min-h-10 sm:w-auto"
                    disabled={action !== null}
                    onClick={() => setConfirmingReboot(false)}
                    type="button"
                  >
                    취소
                  </button>
                  <button
                    class="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-rose-700 px-4 py-2 text-sm font-extrabold text-white transition hover:bg-rose-800 disabled:cursor-wait disabled:opacity-60 sm:min-h-10 sm:w-auto"
                    disabled={action !== null}
                    onClick={onReboot}
                    type="button"
                  >
                    {action === 'reboot' ? '재부팅 요청 중' : '지금 재부팅'}
                  </button>
                </div>
              </div>
            )}
          </ActionCard>
        </div>
      </section>

      <p class="m-0 text-xs leading-5 text-slate-500">
        펌웨어 업로드, 백업 및 복원처럼 장치 전체에 영향을 주는 작업은 검증된 OpenWrt 절차를 유지합니다. 그 외 자주 사용하는 관리 기능은 SmartSafeHub 안에서 제공하는 것을 목표로 합니다.
      </p>
    </section>
  );
}
