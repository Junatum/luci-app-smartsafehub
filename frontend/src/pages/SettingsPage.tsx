import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';

import {
  formatBytes,
  formatLoadAverage,
  formatTimestampInTimezone,
  formatUptime,
  getMemoryUsage,
} from '../app/format';
import {
  ClockIcon,
  DownloadIcon,
  PowerIcon,
  SettingsIcon,
} from '../components/Icons';
import type { SystemAction } from '../hooks/useSystemActions';
import type { SmartSafeHubStatus } from '../types/status';
import type { SystemTimeSettings } from '../types/system';
import { luciAdminUrl } from '../utils/luci';

interface SettingsPageProps {
  action: SystemAction;
  data: SmartSafeHubStatus | null;
  error: string | null;
  feedbackError: string | null;
  feedbackMessage: string | null;
  loading: boolean;
  rebootAccepted: boolean;
  timeData: SystemTimeSettings | null;
  timeError: string | null;
  timeLoading: boolean;
  timeSaveError: string | null;
  timeSaveMessage: string | null;
  timeSaving: boolean;
  onDismissFeedback: () => void;
  onDismissTimeFeedback: () => void;
  onDownloadDiagnostics: () => void;
  onReboot: () => void;
  onRetry: () => void;
  onSaveTimezone: (zonename: string) => Promise<boolean>;
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
  icon: ComponentChildren;
  children?: ComponentChildren;
  danger?: boolean;
}) {
  return (
    <article
      class={`min-w-0 rounded-2xl border bg-white p-5 shadow-sm shadow-slate-900/5 sm:p-6 ${
        props.danger ? 'border-rose-200' : 'border-slate-200'
      }`}
    >
      <div class="flex min-w-0 items-start gap-4">
        <div
          class={`flex size-11 shrink-0 items-center justify-center rounded-xl ${
            props.danger
              ? 'bg-rose-50 text-rose-700'
              : 'bg-slate-100 text-slate-600'
          }`}
        >
          {props.icon}
        </div>
        <div class="min-w-0">
          <h2
            class={`m-0 text-lg font-black ${
              props.danger ? 'text-rose-950' : 'text-slate-950'
            }`}
          >
            {props.title}
          </h2>
          <p
            class={`mt-1.5 mb-0 text-sm leading-6 ${
              props.danger ? 'text-rose-700' : 'text-slate-500'
            }`}
          >
            {props.description}
          </p>
        </div>
      </div>
      <div class="mt-5">{props.children}</div>
    </article>
  );
}

function browserTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

function TimeSettingsCard(props: {
  localtime: number;
  data: SystemTimeSettings | null;
  error: string | null;
  loading: boolean;
  saveError: string | null;
  saveMessage: string | null;
  saving: boolean;
  onDismissFeedback: () => void;
  onRetry: () => void;
  onSave: (zonename: string) => Promise<boolean>;
}) {
  const [selectedTimezone, setSelectedTimezone] = useState('');
  const [displayedLocaltime, setDisplayedLocaltime] = useState(props.localtime);
  const detectedBrowserTimezone = browserTimezone();

  useEffect(() => {
    if (props.data?.zonename) {
      setSelectedTimezone(props.data.zonename);
    }
  }, [props.data?.zonename]);

  useEffect(() => {
    const baseLocaltime = props.localtime;
    const startedAt = Date.now();
    setDisplayedLocaltime(baseLocaltime);

    if (!Number.isFinite(baseLocaltime) || baseLocaltime <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setDisplayedLocaltime(
        baseLocaltime + Math.floor((Date.now() - startedAt) / 1000),
      );
    }, 1000);

    return () => window.clearInterval(timer);
  }, [props.localtime]);

  const zones = props.data
    ? Object.keys(props.data.timezones).sort((left, right) =>
        left.localeCompare(right),
      )
    : [];
  const currentTimezone = props.data?.zonename ?? 'UTC';
  const currentTime = formatTimestampInTimezone(
    displayedLocaltime,
    currentTimezone,
  );
  const browserTimezoneAvailable =
    detectedBrowserTimezone !== null &&
    props.data?.timezones[detectedBrowserTimezone] !== undefined;
  const changed =
    props.data !== null &&
    selectedTimezone.length > 0 &&
    selectedTimezone !== props.data.zonename;

  return (
    <ActionCard
      description="공유기의 기준 시간대를 설정합니다. 로그, 통계와 예약된 자동 설치 시각도 이 시간대를 기준으로 동작합니다."
      icon={<ClockIcon class="size-5" />}
      title="시간 및 시간대"
    >
      {(props.saveError || props.saveMessage) && (
        <div
          class={`mb-5 flex min-w-0 items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-bold ${
            props.saveError
              ? 'border-rose-200 bg-rose-50 text-rose-800'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
        >
          <span class="min-w-0">{props.saveError || props.saveMessage}</span>
          <button
            class="shrink-0 rounded-lg px-2 py-1 text-xs font-extrabold hover:bg-black/5"
            onClick={props.onDismissFeedback}
            type="button"
          >
            닫기
          </button>
        </div>
      )}

      {props.error && !props.data ? (
        <div class="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <p class="m-0 text-sm font-bold text-rose-800">{props.error}</p>
          <button
            class="mt-3 inline-flex min-h-10 items-center rounded-xl border border-rose-300 bg-white px-3 py-2 text-xs font-extrabold text-rose-700 transition hover:bg-rose-100"
            onClick={props.onRetry}
            type="button"
          >
            다시 불러오기
          </button>
        </div>
      ) : (
        <>
          <div class="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
            <div class="rounded-xl bg-slate-50 p-4">
              <p class="m-0 text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">
                현재 시간
              </p>
              <p class="mt-2 mb-0 text-sm font-extrabold leading-6 text-slate-900">
                {currentTime}
              </p>
              <p class="mt-1 mb-0 break-words text-xs leading-5 text-slate-500">
                {props.data?.zonename ?? '시간대 확인 중'}
              </p>
            </div>
            <div class="rounded-xl bg-slate-50 p-4">
              <p class="m-0 text-xs font-extrabold uppercase tracking-[0.12em] text-slate-500">
                시간 동기화
              </p>
              <p
                class={`mt-2 mb-0 text-sm font-extrabold ${
                  props.data?.ntpEnabled ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {props.data?.ntpEnabled ? '자동 동기화 설정됨' : '자동 동기화 꺼짐'}
              </p>
              <p class="mt-1 mb-0 text-xs leading-5 text-slate-500">
                장치의 기본 NTP 설정 상태입니다.
              </p>
            </div>
          </div>

          <div class="mt-5">
            <label
              class="mb-2 block text-sm font-extrabold text-slate-800"
              for="smartsafehub-timezone"
            >
              시간대
            </label>
            <select
              aria-label="시간대"
              class="min-h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm font-bold text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:cursor-wait disabled:opacity-60"
              disabled={props.loading || props.saving || !props.data}
              id="smartsafehub-timezone"
              onChange={(event) =>
                setSelectedTimezone(event.currentTarget.value)
              }
              value={selectedTimezone}
            >
              {!props.data && <option value="">시간대 불러오는 중</option>}
              {zones.map((zone) => (
                <option key={zone} value={zone}>
                  {zone}
                </option>
              ))}
            </select>
            <p class="mt-2 mb-0 text-xs leading-5 text-slate-500">
              시간대를 변경하면 시스템에 즉시 적용되며 관리 소프트웨어의 자동 설치 일정도 새 기준 시간으로 다시 계산합니다.
            </p>
          </div>

          <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
            {browserTimezoneAvailable &&
              detectedBrowserTimezone !== selectedTimezone && (
                <button
                  class="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 sm:w-auto"
                  disabled={props.saving}
                  onClick={() => setSelectedTimezone(detectedBrowserTimezone)}
                  type="button"
                >
                  브라우저 시간대 사용
                </button>
              )}
            <button
              class="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              disabled={!changed || props.saving}
              onClick={() => void props.onSave(selectedTimezone)}
              type="button"
            >
              {props.saving ? '시간대 저장 중' : '시간대 저장'}
            </button>
          </div>
        </>
      )}
    </ActionCard>
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
  timeData,
  timeError,
  timeLoading,
  timeSaveError,
  timeSaveMessage,
  timeSaving,
  onDismissFeedback,
  onDismissTimeFeedback,
  onDownloadDiagnostics,
  onReboot,
  onRetry,
  onSaveTimezone,
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
  const advancedSystemUrl = luciAdminUrl('/admin/system');
  const logsUrl = luciAdminUrl('/admin/status/logs');

  return (
    <section class="min-w-0 space-y-7">
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
            Device settings
          </p>
          <h2 class="mt-2 mb-0 text-xl font-black text-slate-950">장치 설정</h2>
          <p class="mt-2 mb-0 text-sm leading-6 text-slate-500">
            시간 기준과 진단 정보를 SmartSafeHub에서 직접 관리합니다.
          </p>
        </div>
        <div class="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
          <TimeSettingsCard
            data={timeData}
            error={timeError}
            loading={timeLoading}
            localtime={data?.runtime.localtime ?? 0}
            onDismissFeedback={onDismissTimeFeedback}
            onRetry={onRetry}
            onSave={onSaveTimezone}
            saveError={timeSaveError}
            saveMessage={timeSaveMessage}
            saving={timeSaving}
          />

          <ActionCard
            description="장치, 펌웨어, 메모리, 인터넷, Wi-Fi와 SafeShield 상태를 JSON 파일로 저장합니다. 비밀번호와 라이선스 키는 포함하지 않습니다."
            icon={<DownloadIcon class="size-5" />}
            title="진단 및 지원"
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
              진단 파일에는 호스트명, WAN IP와 Wi-Fi SSID 같은 네트워크 식별 정보가 포함될 수 있으므로 외부 전달 전에 내용을 확인해 주세요.
            </p>
          </ActionCard>
        </div>
      </section>

      <section class="min-w-0">
        <div class="mb-4">
          <p class="m-0 text-xs font-extrabold uppercase tracking-[0.16em] text-teal-700">
            System management
          </p>
          <h2 class="mt-2 mb-0 text-xl font-black text-slate-950">시스템 관리</h2>
          <p class="mt-2 mb-0 text-sm leading-6 text-slate-500">
            장치 재부팅과 SmartSafeHub에서 아직 제공하지 않는 고급 설정을 관리합니다.
          </p>
        </div>
        <div class="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
          <ActionCard
            danger
            description="재부팅하는 동안 인터넷과 Wi-Fi 연결이 잠시 중단됩니다. 저장되지 않은 LuCI 설정이 있다면 먼저 저장해 주세요."
            icon={<PowerIcon class="size-5" />}
            title="공유기 재부팅"
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

          <ActionCard
            description="SmartSafeHub에서 아직 제공하지 않는 상세 시스템 설정이나 원본 로그가 필요한 경우에만 LuCI 관리 화면을 사용합니다."
            icon={<SettingsIcon class="size-5" />}
            title="고급 설정"
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
              설정 백업·복원 등 아직 SmartSafeHub에서 제공하지 않는 기능은 이 고급 설정에서 사용할 수 있습니다.
            </p>
          </ActionCard>
        </div>
      </section>
    </section>
  );
}
