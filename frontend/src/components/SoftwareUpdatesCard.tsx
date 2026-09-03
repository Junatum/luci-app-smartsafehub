import { useEffect, useState } from 'preact/hooks';

import type { SoftwareUpdateAction } from '../hooks/useSoftwareUpdates';
import type {
  SoftwareUpdateSettingsInput,
  SoftwareUpdateStatus,
} from '../types/updates';
import {
  CheckCircleIcon,
  ClockIcon,
  DownloadIcon,
  RefreshIcon,
  SettingsIcon,
  UpdateIcon,
} from './Icons';

interface SoftwareUpdatesCardProps {
  action: SoftwareUpdateAction;
  actionError: string | null;
  data: SoftwareUpdateStatus | null;
  error: string | null;
  loading: boolean;
  message: string | null;
  onCheck: () => void;
  onDismissFeedback: () => void;
  onInstall: () => void;
  onRetry: () => void;
  onSaveSettings: (input: SoftwareUpdateSettingsInput) => Promise<boolean>;
}

const INTERVAL_OPTIONS = [
  { value: 3600, label: '1시간마다' },
  { value: 21600, label: '6시간마다' },
  { value: 43200, label: '12시간마다' },
  { value: 86400, label: '24시간마다' },
] as const;

const UPDATE_PACKAGE = 'luci-app-smartsafehub';

function formatTimestamp(value: number | null): string {
  if (!value) {
    return '아직 없음';
  }

  return new Date(value * 1000).toLocaleString('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function phaseLabel(data: SoftwareUpdateStatus): string {
  if (data.phase === 'checking') {
    return '업데이트 확인 중';
  }
  if (data.phase === 'installing') {
    return '업데이트 설치 중';
  }
  if (data.phase === 'error') {
    return '확인 필요';
  }
  if (data.updateCount > 0) {
    return '업데이트 가능';
  }
  return data.lastCheckAt ? '최신 상태' : '확인 전';
}

function phaseClass(data: SoftwareUpdateStatus): string {
  if (data.phase === 'error') {
    return 'bg-rose-50 text-rose-700 ring-rose-200';
  }
  if (data.phase === 'checking' || data.phase === 'installing') {
    return 'bg-sky-50 text-sky-700 ring-sky-200';
  }
  if (data.updateCount > 0) {
    return 'bg-amber-50 text-amber-800 ring-amber-200';
  }
  return 'bg-emerald-50 text-emerald-700 ring-emerald-200';
}

function SettingSwitch({
  checked,
  disabled = false,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      aria-checked={checked}
      aria-label={label}
      class={`relative inline-flex h-7 w-12 shrink-0 rounded-full border transition focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-100 disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? 'border-teal-600 bg-teal-600' : 'border-slate-300 bg-slate-200'
      }`}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      role="switch"
      type="button"
    >
      <span
        aria-hidden="true"
        class={`absolute top-1 size-5 rounded-full bg-white shadow-sm transition-[left] ${
          checked ? 'left-6' : 'left-1'
        }`}
      />
    </button>
  );
}

export function SoftwareUpdatesCard({
  action,
  actionError,
  data,
  error,
  loading,
  message,
  onCheck,
  onDismissFeedback,
  onInstall,
  onRetry,
  onSaveSettings,
}: SoftwareUpdatesCardProps) {
  const [checkEnabled, setCheckEnabled] = useState(true);
  const [checkIntervalSeconds, setCheckIntervalSeconds] = useState(21600);
  const [autoInstall, setAutoInstall] = useState(false);
  const [autoInstallTime, setAutoInstallTime] = useState('03:00');
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [confirmingInstall, setConfirmingInstall] = useState(false);

  useEffect(() => {
    if (!data || settingsDirty) {
      return;
    }

    setCheckEnabled(data.settings.checkEnabled);
    setCheckIntervalSeconds(data.settings.checkIntervalSeconds);
    setAutoInstall(data.settings.autoInstall);
    setAutoInstallTime(data.settings.autoInstallTime);
  }, [data, settingsDirty]);

  const busy =
    action === 'check' ||
    action === 'install' ||
    data?.phase === 'checking' ||
    data?.phase === 'installing';

  const currentPackage = data?.packages.find((item) => item.name === UPDATE_PACKAGE) ??
    data?.packages[0] ??
    null;

  const saveSettings = async () => {
    const saved = await onSaveSettings({
      checkEnabled,
      checkIntervalSeconds,
      autoInstall,
      autoInstallTime,
    });
    if (saved) {
      setSettingsDirty(false);
    }
  };

  return (
    <div class="min-w-0 space-y-4 lg:col-span-2">
      <article class="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5">
        <div class="p-5 sm:p-6">
          <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div class="flex min-w-0 gap-4">
              <span class="grid size-12 shrink-0 place-items-center rounded-2xl bg-teal-50 text-teal-700">
                <UpdateIcon class="size-6" />
              </span>
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <p class="m-0 text-xs font-extrabold uppercase tracking-[0.16em] text-teal-700">
                    Software update
                  </p>
                  {data ? (
                    <span
                      class={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-extrabold ring-1 ring-inset ${phaseClass(data)}`}
                    >
                      {phaseLabel(data)}
                    </span>
                  ) : null}
                </div>
                <h2 class="mt-2 mb-0 text-xl font-black text-slate-950 sm:text-2xl">
                  SmartSafeHub 업데이트
                </h2>
                <p class="mt-2 mb-0 max-w-2xl text-sm leading-6 text-slate-500">
                  SmartSafeHub 소프트웨어의 새 버전을 확인하고 안전하게 설치합니다. OpenWrt 펌웨어 전체 업그레이드는 아래 펌웨어 관리에서 별도로 진행합니다.
                </p>
              </div>
            </div>

            {data ? (
              <div class="flex shrink-0 flex-col gap-2 sm:flex-row lg:justify-end">
                <button
                  class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-800 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
                  disabled={busy}
                  onClick={onCheck}
                  type="button"
                >
                  <RefreshIcon class="size-4" />
                  {data.phase === 'checking' || action === 'check' ? '확인 중' : '업데이트 확인'}
                </button>

                {data.updateCount > 0 && !confirmingInstall ? (
                  <button
                    class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-teal-800 disabled:cursor-wait disabled:opacity-60"
                    disabled={busy}
                    onClick={() => setConfirmingInstall(true)}
                    type="button"
                  >
                    <DownloadIcon class="size-4" />
                    업데이트 설치
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          {(actionError || message) && (
            <div
              class={`mt-5 flex flex-col gap-3 rounded-xl border px-4 py-3 text-sm font-bold sm:flex-row sm:items-center sm:justify-between ${
                actionError
                  ? 'border-rose-200 bg-rose-50 text-rose-800'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-800'
              }`}
            >
              <span>{actionError || message}</span>
              <button
                class="shrink-0 self-start rounded-lg px-3 py-1.5 text-xs font-extrabold hover:bg-black/5 sm:self-auto"
                onClick={onDismissFeedback}
                type="button"
              >
                닫기
              </button>
            </div>
          )}

          {error && !data ? (
            <div class="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <p class="m-0 font-bold">{error}</p>
              <button
                class="mt-3 rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs font-extrabold text-rose-700"
                onClick={onRetry}
                type="button"
              >
                다시 시도
              </button>
            </div>
          ) : loading && !data ? (
            <div class="mt-5 rounded-xl bg-slate-50 p-4 text-sm font-bold text-slate-500">
              업데이트 상태를 확인하고 있습니다.
            </div>
          ) : data ? (
            <>
              {data.lastError ? (
                <div class="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4">
                  <p class="m-0 text-sm font-extrabold text-rose-900">최근 업데이트 작업 실패</p>
                  <p class="mt-2 mb-0 break-words text-sm leading-6 text-rose-700">
                    {data.lastError.message}
                  </p>
                </div>
              ) : null}

              {confirmingInstall ? (
                <div class="mt-5 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div class="min-w-0">
                    <strong class="block text-sm font-black text-amber-900">
                      SmartSafeHub를 지금 업데이트할까요?
                    </strong>
                    <span class="mt-1 block text-xs leading-5 text-amber-800">
                      설치 중 웹 화면 연결이 잠시 끊길 수 있습니다.
                    </span>
                  </div>
                  <div class="flex shrink-0 gap-2">
                    <button
                      class="min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-extrabold text-slate-700"
                      disabled={busy}
                      onClick={() => setConfirmingInstall(false)}
                      type="button"
                    >
                      취소
                    </button>
                    <button
                      class="min-h-10 rounded-lg bg-amber-700 px-3 py-2 text-xs font-extrabold text-white disabled:opacity-60"
                      disabled={busy}
                      onClick={() => {
                        setConfirmingInstall(false);
                        onInstall();
                      }}
                      type="button"
                    >
                      설치 시작
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        {data ? (
          <div class="px-5 pb-5 sm:px-6 sm:pb-6">
            <dl class="grid overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-2 xl:grid-cols-4">
              <div class="bg-white p-4">
                <dt class="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Installed
                </dt>
                <dd class="mt-2 mb-0 ml-0 break-all text-sm font-black text-slate-950">
                  {currentPackage?.installedVersion || '미확인'}
                </dd>
              </div>
              <div class="bg-white p-4">
                <dt class="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Available
                </dt>
                <dd class={`mt-2 mb-0 ml-0 break-all text-sm font-black ${
                  currentPackage?.updateAvailable ? 'text-amber-700' : 'text-slate-950'
                }`}>
                  {currentPackage?.updateAvailable && currentPackage.availableVersion
                    ? currentPackage.availableVersion
                    : '최신 버전'}
                </dd>
              </div>
              <div class="bg-white p-4">
                <dt class="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Last check
                </dt>
                <dd class="mt-2 mb-0 ml-0 text-sm font-black text-slate-950">
                  {formatTimestamp(data.lastCheckAt)}
                </dd>
              </div>
              <div class="bg-white p-4">
                <dt class="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">
                  Auto install
                </dt>
                <dd class="mt-2 mb-0 ml-0 text-sm font-black text-slate-950">
                  {data.settings.autoInstall ? `켜짐 · ${data.settings.autoInstallTime}` : '꺼짐'}
                </dd>
              </div>
            </dl>
          </div>
        ) : null}
      </article>

      {data ? (
        <>
          {data.updateCount > 0 ? (
            <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5 sm:p-6">
              <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div>
                  <p class="m-0 text-xs font-extrabold uppercase tracking-[0.16em] text-teal-700">
                    Release notes
                  </p>
                  <h3 class="mt-2 mb-0 text-lg font-black text-slate-950">업데이트 내용</h3>
                  <p class="mt-2 mb-0 text-sm leading-6 text-slate-500">
                    현재 설치된 버전 이후 포함되는 주요 변경 사항입니다.
                  </p>
                </div>
                {data.releaseNotes.length ? (
                  <span class="shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-extrabold text-slate-600">
                    {data.releaseNotes.length === 1
                      ? '1개 릴리즈'
                      : `${data.releaseNotes.length}개 릴리즈`}
                  </span>
                ) : null}
              </div>

              {data.releaseNotes.length ? (
                <div class="mt-5 grid gap-3">
                  {data.releaseNotes.map((releaseNote) => (
                    <article
                      class="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:p-5"
                      key={releaseNote.version}
                    >
                      <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                        <strong class="break-all text-sm font-black text-slate-950">
                          {releaseNote.version}
                        </strong>
                        {releaseNote.date ? (
                          <span class="text-xs font-bold text-slate-500">
                            {releaseNote.date}
                          </span>
                        ) : null}
                      </div>

                      {releaseNote.summary ? (
                        <p class="mt-3 mb-0 text-sm leading-6 text-slate-700">
                          {releaseNote.summary}
                        </p>
                      ) : null}

                      {releaseNote.sections.length ? (
                        <details
                          class="mt-4 rounded-lg border border-slate-200 bg-white p-3"
                          open={data.releaseNotes.length === 1}
                        >
                          <summary class="cursor-pointer text-xs font-extrabold text-slate-800">
                            자세한 변경 사항
                          </summary>
                          <div class="mt-3 grid gap-4">
                            {releaseNote.sections.map((section) => (
                              <section key={`${releaseNote.version}-${section.title}`}>
                                <h4 class="m-0 text-xs font-extrabold text-slate-700">
                                  {section.title}
                                </h4>
                                <ul class="mt-2 mb-0 space-y-1.5 pl-5 text-xs leading-5 text-slate-600">
                                  {section.items.map((item, index) => (
                                    <li key={`${releaseNote.version}-${section.title}-${index}`}>
                                      {item}
                                    </li>
                                  ))}
                                </ul>
                              </section>
                            ))}
                          </div>
                        </details>
                      ) : null}
                    </article>
                  ))}

                  {!data.releaseNotesComplete ? (
                    <p class="m-0 rounded-xl bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-800">
                      일부 릴리즈 노트를 불러오지 못했습니다. 업데이트 확인과 설치는 계속 사용할 수 있습니다.
                    </p>
                  ) : null}
                </div>
              ) : (
                <p class="mt-4 mb-0 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  릴리즈 노트를 불러오지 못했습니다. 업데이트 확인과 설치는 계속 사용할 수 있습니다.
                </p>
              )}
            </section>
          ) : (
            <section class="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
              <div class="flex gap-3">
                <span class="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-emerald-700">
                  <CheckCircleIcon class="size-5" />
                </span>
                <div>
                  <h3 class="m-0 text-base font-black text-emerald-950">최신 버전을 사용 중입니다.</h3>
                  <p class="mt-1 mb-0 text-sm leading-6 text-emerald-800">
                    마지막 확인은 {formatTimestamp(data.lastCheckAt)}에 완료되었습니다.
                  </p>
                </div>
              </div>
            </section>
          )}

          <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5 sm:p-6">
            <div class="flex gap-4">
              <span class="grid size-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-600">
                <SettingsIcon class="size-5" />
              </span>
              <div class="min-w-0">
                <p class="m-0 text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">
                  Settings
                </p>
                <h3 class="mt-2 mb-0 text-lg font-black text-slate-950">자동 업데이트</h3>
                <p class="mt-2 mb-0 max-w-3xl text-sm leading-6 text-slate-500">
                  업데이트 확인과 설치 일정은 공유기에서 실행되므로 브라우저를 닫아도 설정이 유지됩니다.
                </p>
              </div>
            </div>

            <div class="mt-5 grid gap-4 lg:grid-cols-2">
              <div class="rounded-xl border border-slate-200 p-4 sm:p-5">
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <strong class="block text-sm font-black text-slate-950">자동으로 업데이트 확인</strong>
                    <span class="mt-1 block text-xs leading-5 text-slate-500">
                      선택한 주기에 새 SmartSafeHub 버전을 확인합니다.
                    </span>
                  </div>
                  <SettingSwitch
                    checked={checkEnabled}
                    label="자동 업데이트 확인"
                    onChange={(checked) => {
                      setCheckEnabled(checked);
                      setSettingsDirty(true);
                    }}
                  />
                </div>

                <label class="mt-4 block">
                  <span class="text-xs font-extrabold text-slate-700">확인 주기</span>
                  <select
                    class="mt-2 min-h-11 w-full cursor-pointer rounded-xl border-2 border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-inner outline-none transition focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                    disabled={!checkEnabled}
                    onChange={(event) => {
                      setCheckIntervalSeconds(Number(event.currentTarget.value));
                      setSettingsDirty(true);
                    }}
                    value={checkIntervalSeconds}
                  >
                    {INTERVAL_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div class="rounded-xl border border-slate-200 p-4 sm:p-5">
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <strong class="block text-sm font-black text-slate-950">자동으로 업데이트 설치</strong>
                    <span class="mt-1 block text-xs leading-5 text-slate-500">
                      새 버전이 있으면 지정한 시각에 자동으로 설치합니다.
                    </span>
                  </div>
                  <SettingSwitch
                    checked={autoInstall}
                    label="자동 업데이트 설치"
                    onChange={(checked) => {
                      setAutoInstall(checked);
                      setSettingsDirty(true);
                    }}
                  />
                </div>

                <label class="mt-4 block">
                  <span class="text-xs font-extrabold text-slate-700">설치 시각</span>
                  <div class="relative mt-2">
                    <span class="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center text-slate-400">
                      <ClockIcon class="size-4" />
                    </span>
                    <input
                      class="min-h-11 w-full rounded-xl border-2 border-slate-300 bg-slate-50 py-2.5 pr-4 pl-11 text-sm font-semibold text-slate-950 shadow-inner outline-none transition focus:border-teal-500 focus:bg-white focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                      disabled={!autoInstall}
                      onChange={(event) => {
                        setAutoInstallTime(event.currentTarget.value);
                        setSettingsDirty(true);
                      }}
                      type="time"
                      value={autoInstallTime}
                    />
                  </div>
                </label>
              </div>
            </div>

            {autoInstall ? (
              <p class="mt-4 mb-0 rounded-xl bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-800">
                자동 설치 중에는 SmartSafeHub 웹 화면 연결이 잠시 끊길 수 있습니다.
              </p>
            ) : null}

            <div class="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p class="m-0 text-xs leading-5 text-slate-500">
                마지막 설치: {formatTimestamp(data.lastInstallAt)}
              </p>
              <button
                class="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!settingsDirty || action === 'settings' || busy}
                onClick={() => void saveSettings()}
                type="button"
              >
                {action === 'settings' ? '저장 중' : '자동 업데이트 설정 저장'}
              </button>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
