import { useEffect, useState } from 'preact/hooks';

import { CustomSelect } from '../components/CustomSelect';
import { AlertIcon, CheckCircleIcon, TvIcon } from '../components/Icons';
import { ErrorPanel, LoadingPanel } from '../components/StatePanels';
import type { IptvFeedback } from '../hooks/useIptv';
import type { IptvProvider, IptvSettings, IptvSettingsInput } from '../types/iptv';

interface IptvPageProps {
  data: IptvSettings | null;
  error: string | null;
  feedback: IptvFeedback;
  loading: boolean;
  onDismissFeedback: () => void;
  onRetry: () => void;
  onSave: (input: IptvSettingsInput) => Promise<boolean>;
  saving: boolean;
}

const PROVIDER_OPTIONS = [
  { value: 'skb', label: 'SK Broadband' },
  { value: 'lgu', label: 'LG U+' },
] as const;

function providerLabel(provider: IptvProvider): string {
  return provider === 'lgu' ? 'LG U+' : 'SK Broadband';
}

function StatusItem({
  active,
  label,
  value,
}: {
  active: boolean;
  label: string;
  value: string;
}) {
  return (
    <div class="rounded-xl border border-slate-200 bg-white p-4">
      <div class="flex items-center justify-between gap-3">
        <p class="m-0 text-xs font-extrabold text-slate-500">{label}</p>
        <span
          class={`size-2.5 shrink-0 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-300'}`}
          aria-hidden="true"
        />
      </div>
      <p class="mt-2 mb-0 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}

export function IptvPage({
  data,
  error,
  feedback,
  loading,
  onDismissFeedback,
  onRetry,
  onSave,
  saving,
}: IptvPageProps) {
  const [enabled, setEnabled] = useState(false);
  const [provider, setProvider] = useState<IptvProvider>('skb');

  useEffect(() => {
    if (!data) {
      return;
    }
    setEnabled(data.enabled);
    setProvider(data.provider);
  }, [data]);

  if (loading && !data) {
    return <LoadingPanel />;
  }
  if (error && !data) {
    return <ErrorPanel message={error} onRetry={onRetry} />;
  }
  if (!data) {
    return <ErrorPanel message="IPTV 설정을 확인할 수 없습니다." onRetry={onRetry} />;
  }

  const dirty = enabled !== data.enabled || provider !== data.provider;
  const runtimeHealthy = !data.enabled || (data.running && data.igmpSnooping);

  return (
    <div class="space-y-5">
      <section class="rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
        <div class="flex items-start gap-4">
          <span class="grid size-11 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-800">
            <AlertIcon class="size-5" />
          </span>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="m-0 text-base font-black text-amber-950">IPTV 실험 기능</h2>
              <span class="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em] text-amber-800">
                Beta
              </span>
            </div>
            <p class="mt-2 mb-0 text-sm leading-6 text-amber-900/80">
              현재 SK Broadband와 LG U+의 일반적인 IGMP Proxy 방식만 지원합니다. 설치 환경이나
              셋톱박스 구성에 따라 추가 VLAN 설정이 필요한 경우에는 동작하지 않을 수 있습니다.
            </p>
          </div>
        </div>
      </section>

      {feedback ? (
        <section
          aria-live="polite"
          class={`rounded-2xl border p-4 ${
            feedback.kind === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-red-200 bg-red-50 text-red-900'
          }`}
        >
          <div class="flex items-start justify-between gap-3">
            <p class="m-0 text-sm font-bold leading-6">{feedback.message}</p>
            <button
              class="shrink-0 text-xs font-extrabold underline underline-offset-2"
              onClick={onDismissFeedback}
              type="button"
            >
              닫기
            </button>
          </div>
        </section>
      ) : null}

      <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5 sm:p-6">
        <div class="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div class="min-w-0 max-w-2xl">
            <div class="flex items-center gap-3">
              <span class="grid size-11 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700">
                <TvIcon class="size-5" />
              </span>
              <div>
                <h2 class="m-0 text-lg font-black text-slate-950">IPTV</h2>
                <p class="mt-1 mb-0 text-sm leading-6 text-slate-600">
                  WAN의 멀티캐스트 방송을 LAN 셋톱박스로 전달합니다.
                </p>
              </div>
            </div>
          </div>

          <button
            aria-checked={enabled}
            aria-label="IPTV 사용"
            class={`relative h-8 w-14 shrink-0 rounded-full border-0 transition ${
              enabled ? 'bg-teal-700' : 'bg-slate-300'
            } disabled:cursor-not-allowed disabled:opacity-60`}
            disabled={saving || !data.available}
            onClick={() => setEnabled((current) => !current)}
            role="switch"
            type="button"
          >
            <span
              aria-hidden="true"
              class={`absolute top-1 size-6 rounded-full bg-white shadow-sm transition-[left] ${
                enabled ? 'left-7' : 'left-1'
              }`}
            />
          </button>
        </div>

        <div class="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <label class="mb-2 block text-xs font-extrabold text-slate-600" htmlFor="iptv-provider">
              통신사
            </label>
            <CustomSelect
              ariaLabel="IPTV 통신사"
              disabled={saving || !enabled}
              id="iptv-provider"
              onChange={(value) => setProvider(value as IptvProvider)}
              options={PROVIDER_OPTIONS}
              value={provider}
            />
            <p class="mt-2 mb-0 text-xs leading-5 text-slate-500">
              {providerLabel(provider)}의 일반적인 멀티캐스트 IPTV 구성을 적용합니다.
            </p>
          </div>

          <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p class="m-0 text-xs font-extrabold text-slate-500">적용 방식</p>
            <p class="mt-2 mb-0 text-sm font-black text-slate-950">WAN → IGMP Proxy → LAN</p>
            <p class="mt-1 mb-0 text-xs leading-5 text-slate-600">
              LAN bridge에는 IGMP snooping을 함께 켜서 필요하지 않은 포트와 Wi-Fi로 멀티캐스트가
              불필요하게 퍼지는 것을 줄입니다.
            </p>
          </div>
        </div>

        {!data.available ? (
          <div class="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold leading-6 text-red-900">
            IGMP Proxy 패키지를 찾지 못했습니다. 현재 펌웨어에 igmpproxy 패키지가 포함되어 있는지 확인해 주세요.
          </div>
        ) : null}

        <div class="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
          <p class="m-0 text-xs leading-5 text-slate-500">
            설정을 적용하면 네트워크 서비스가 잠시 다시 로드될 수 있습니다.
          </p>
          <button
            class="inline-flex min-h-11 items-center justify-center rounded-xl border-0 bg-teal-700 px-5 py-2.5 text-sm font-black text-white shadow-sm transition hover:bg-teal-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-100 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={saving || !data.available || (!dirty && !enabled)}
            onClick={() => void onSave({ enabled, provider })}
            type="button"
          >
            {saving ? '적용 중…' : dirty ? '변경사항 적용' : '설정 다시 적용'}
          </button>
        </div>
      </section>

      <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5 sm:p-6">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="m-0 text-xs font-black uppercase tracking-[0.14em] text-teal-700">Runtime</p>
            <h2 class="mt-1 mb-0 text-lg font-black text-slate-950">IPTV 동작 상태</h2>
          </div>
          <span
            class={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${
              runtimeHealthy
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            <CheckCircleIcon class="size-4" />
            {runtimeHealthy ? (data.enabled ? '정상' : '꺼짐') : '확인 필요'}
          </span>
        </div>

        <div class="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatusItem
            active={data.enabled && data.running}
            label="IGMP Proxy"
            value={data.enabled ? (data.running ? '동작 중' : '중지됨') : '꺼짐'}
          />
          <StatusItem
            active={data.enabled && data.igmpSnooping}
            label="IGMP Snooping"
            value={data.igmpSnooping ? '켜짐' : '꺼짐'}
          />
          <StatusItem active={data.enabled} label="Upstream" value={data.upstreamNetwork.toUpperCase()} />
          <StatusItem
            active={data.enabled}
            label="Downstream"
            value={data.lanBridge ?? data.downstreamNetwork.toUpperCase()}
          />
        </div>
      </section>
    </div>
  );
}
