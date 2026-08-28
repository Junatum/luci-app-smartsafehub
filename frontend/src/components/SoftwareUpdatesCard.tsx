import { useEffect, useState } from 'preact/hooks';

import type { SoftwareUpdateAction } from '../hooks/useSoftwareUpdates';
import type {
  SoftwareUpdateSettingsInput,
  SoftwareUpdateStatus,
} from '../types/updates';

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

const PACKAGE_LABELS: Record<string, string> = {
  'luci-app-smartsafehub': 'SmartSafeHub',
};

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
    return 'SmartSafeHub 업데이트 가능';
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
    <article class="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5 sm:p-6 lg:col-span-2">
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div class="min-w-0">
          <p class="m-0 text-xs font-extrabold uppercase tracking-[0.16em] text-teal-700">
            SmartSafeHub software
          </p>
          <h2 class="mt-2 mb-0 text-xl font-black text-slate-950">
            소프트웨어 업데이트
          </h2>
          <p class="mt-2 mb-0 max-w-3xl text-sm leading-6 text-slate-500">
            SmartSafeHub 저장소에서 관리하는 설치된 패키지만 확인하고 업데이트합니다.
            OpenWrt 펌웨어 전체 업그레이드는 이 기능의 대상이 아닙니다.
          </p>
        </div>
        {data ? (
          <span
            class={`inline-flex shrink-0 items-center rounded-full px-3 py-1.5 text-xs font-extrabold ring-1 ring-inset ${phaseClass(data)}`}
          >
            {phaseLabel(data)}
          </span>
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

          <div class="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.packages.length ? (
              data.packages.map((item) => (
                <div
                  class={`rounded-xl border p-4 ${
                    item.updateAvailable
                      ? 'border-amber-200 bg-amber-50/60'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                  key={item.name}
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <p class="m-0 truncate text-sm font-extrabold text-slate-950">
                        {PACKAGE_LABELS[item.name] || item.name}
                      </p>
                      <p class="mt-1 mb-0 break-all text-xs text-slate-500">{item.name}</p>
                    </div>
                    {item.updateAvailable ? (
                      <span class="shrink-0 rounded-full bg-amber-100 px-2 py-1 text-[11px] font-extrabold text-amber-800">
                        업데이트
                      </span>
                    ) : null}
                  </div>
                  <div class="mt-4 text-xs leading-5 text-slate-600">
                    <p class="m-0 break-all">현재 {item.installedVersion}</p>
                    {item.updateAvailable && item.availableVersion ? (
                      <p class="mt-1 mb-0 break-all font-bold text-amber-800">
                        신규 {item.availableVersion}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <div class="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 md:col-span-2 xl:col-span-3">
                아직 패키지 업데이트 확인 결과가 없습니다.
              </div>
            )}
          </div>

          {data.updateCount > 0 ? (
            <section class="mt-5 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
              <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <h3 class="m-0 text-sm font-black text-slate-950">업데이트 내용</h3>
                {data.releaseNotes.length ? (
                  <span class="text-xs font-bold text-slate-500">
                    {data.releaseNotes.length === 1
                      ? '1개 릴리즈'
                      : `${data.releaseNotes.length}개 릴리즈 포함`}
                  </span>
                ) : null}
              </div>

              {data.releaseNotes.length ? (
                <div class="mt-4 grid gap-3">
                  {data.releaseNotes.map((releaseNote) => (
                    <article
                      class="rounded-xl border border-slate-200 bg-white p-4"
                      key={releaseNote.version}
                    >
                      <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                        <strong class="break-all text-sm font-black text-slate-900">
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
                          class="mt-4 rounded-lg border border-slate-200 bg-slate-50/70 p-3"
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
                    <p class="m-0 text-xs leading-5 text-amber-700">
                      일부 릴리즈 노트를 불러오지 못했습니다. 업데이트 확인과 설치는 계속 사용할 수 있습니다.
                    </p>
                  ) : null}
                </div>
              ) : (
                <p class="mt-3 mb-0 text-xs leading-5 text-slate-500">
                  릴리즈 노트를 불러오지 못했습니다. 업데이트 확인과 설치는 계속 사용할 수 있습니다.
                </p>
              )}
            </section>
          ) : null}

          <div class="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:flex-wrap sm:items-center">
            <button
              class="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-extrabold text-slate-800 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
              disabled={busy}
              onClick={onCheck}
              type="button"
            >
              {data.phase === 'checking' || action === 'check' ? '확인 중' : '지금 업데이트 확인'}
            </button>

            {data.updateCount > 0 && !confirmingInstall ? (
              <button
                class="inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-teal-800 disabled:cursor-wait disabled:opacity-60"
                disabled={busy}
                onClick={() => setConfirmingInstall(true)}
                type="button"
              >
                SmartSafeHub 업데이트 설치
              </button>
            ) : null}

            {confirmingInstall ? (
              <div class="flex flex-col gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 sm:flex-row sm:items-center">
                <span class="text-xs font-bold leading-5 text-amber-900">
                  SmartSafeHub를 지금 업데이트할까요?
                </span>
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
            ) : null}
          </div>

          <dl class="mt-5 grid gap-3 text-xs sm:grid-cols-2">
            <div class="rounded-xl bg-slate-50 p-3">
              <dt class="font-bold text-slate-500">마지막 확인</dt>
              <dd class="mt-1 mb-0 ml-0 font-extrabold text-slate-800">
                {formatTimestamp(data.lastCheckAt)}
              </dd>
            </div>
            <div class="rounded-xl bg-slate-50 p-3">
              <dt class="font-bold text-slate-500">마지막 설치</dt>
              <dd class="mt-1 mb-0 ml-0 font-extrabold text-slate-800">
                {formatTimestamp(data.lastInstallAt)}
              </dd>
            </div>
          </dl>

          <div class="mt-6 border-t border-slate-200 pt-6">
            <h3 class="m-0 text-base font-black text-slate-950">자동 업데이트</h3>
            <p class="mt-1 mb-0 text-xs leading-5 text-slate-500">
              저장소 확인과 설치 스케줄은 공유기에서 실행됩니다. 브라우저를 닫아도 설정은 유지됩니다.
            </p>

            <div class="mt-4 grid gap-4 lg:grid-cols-2">
              <label class="rounded-xl border border-slate-200 p-4">
                <span class="flex items-center gap-3">
                  <input
                    checked={checkEnabled}
                    class="size-4 accent-teal-700"
                    onChange={(event) => {
                      setCheckEnabled(event.currentTarget.checked);
                      setSettingsDirty(true);
                    }}
                    type="checkbox"
                  />
                  <span class="text-sm font-extrabold text-slate-900">자동으로 업데이트 확인</span>
                </span>
                <select
                  class="mt-3 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-800 disabled:bg-slate-100 disabled:text-slate-400"
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

              <label class="rounded-xl border border-slate-200 p-4">
                <span class="flex items-center gap-3">
                  <input
                    checked={autoInstall}
                    class="size-4 accent-teal-700"
                    onChange={(event) => {
                      setAutoInstall(event.currentTarget.checked);
                      setSettingsDirty(true);
                    }}
                    type="checkbox"
                  />
                  <span class="text-sm font-extrabold text-slate-900">자동으로 업데이트 설치</span>
                </span>
                <input
                  class="mt-3 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-800 disabled:bg-slate-100 disabled:text-slate-400"
                  disabled={!autoInstall}
                  onChange={(event) => {
                    setAutoInstallTime(event.currentTarget.value);
                    setSettingsDirty(true);
                  }}
                  type="time"
                  value={autoInstallTime}
                />
              </label>
            </div>

            {autoInstall ? (
              <p class="mt-3 mb-0 rounded-xl bg-amber-50 px-4 py-3 text-xs font-bold leading-5 text-amber-800">
                자동 설치가 켜져 있으면 지정 시각에 새 SmartSafeHub 패키지와 필요한 dependency를 함께 설치합니다.
                설치 중 웹 화면 연결이 잠시 끊길 수 있습니다.
              </p>
            ) : null}

            <div class="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p class="m-0 text-xs text-slate-500">
                저장소: {data.settings.repositoryHost}
              </p>
              <button
                class="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-60"
                disabled={!settingsDirty || action === 'settings' || busy}
                onClick={() => void saveSettings()}
                type="button"
              >
                {action === 'settings' ? '저장 중' : '자동 업데이트 설정 저장'}
              </button>
            </div>
          </div>
        </>
      ) : null}
    </article>
  );
}
