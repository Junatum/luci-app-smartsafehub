import { useState } from 'preact/hooks';
import { formatNumber, formatRelativeTime } from '../app/format';
import { SectionHeading } from '../components/SectionHeading';
import { ErrorPanel, LoadingPanel } from '../components/StatePanels';
import type { NetwatchStatus } from '../types/netwatch';

interface Props {
  data: NetwatchStatus | null;
  error: string | null;
  loading: boolean;
  onRetry: () => void;
  onSetEnabled: (enabled: boolean) => Promise<void>;
  demo?: boolean;
  onDemoAction?: () => void;
}

export function NetworkWatchPage({ data, error, loading, onRetry, onSetEnabled, demo = false, onDemoAction }: Props) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const enabled = !!data?.enabled;
  const ready = enabled && data?.phase === 'ready';

  const toggle = async () => {
    if (demo) { onDemoAction?.(); return; }
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    setNotice(null);
    try {
      await onSetEnabled(!enabled);
      setNotice('설정을 저장했습니다. 다음 관찰 주기에 상태가 갱신됩니다.');
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : '설정을 저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div class="space-y-5">
      <SectionHeading eyebrow="Security" title="Network Watch" description="연결된 기기의 외부 통신 변화를 관찰합니다. 의심 징후는 참고 정보이며 악성 앱을 확정하거나 연결을 자동 차단하지 않습니다." />
      <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 class="text-base font-extrabold text-slate-900">네트워크 이상 감지</h2>
            <p class="mt-1 text-sm text-slate-500">60초 간격으로 연결 정보를 간단히 살펴봅니다.</p>
          </div>
          <button type="button" disabled={saving || !data} onClick={() => void toggle()}
            aria-pressed={enabled} class={`rounded-xl px-5 py-2.5 text-sm font-extrabold transition disabled:opacity-50 ${enabled ? 'bg-teal-700 text-white hover:bg-teal-800' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
            {saving ? '저장 중...' : enabled ? '관찰 켜짐 · 끄기' : '관찰 꺼짐 · 켜기'}
          </button>
        </div>
        {notice ? <p role="status" class="mt-3 text-sm text-teal-700">{notice}</p> : null}
        {saveError ? <p role="alert" class="mt-3 text-sm text-rose-700">{saveError}</p> : null}
      </section>
      {loading && !data ? <LoadingPanel /> : null}
      {error && !data ? <ErrorPanel message={error} onRetry={onRetry} /> : null}
      {data && !enabled ? <p role="status" class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">네트워크 관찰이 꺼져 있습니다. 기존 방화벽과 SafeShield 보호에는 영향이 없습니다.</p> : null}
      {enabled && data?.phase === 'preparing' ? <p role="status" class="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">첫 연결 관찰을 준비하고 있습니다. 잠시 후 자동으로 갱신됩니다.</p> : null}
      {enabled && data?.phase === 'unavailable' ? <div role="alert" class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">연결 정보를 읽을 수 없습니다. OpenWrt의 conntrack 지원 여부를 확인해 주세요. 실제 감시가 수행 중인 것으로 표시하지 않습니다.</div> : null}
      {ready && data ? <>
        <div class="grid gap-3 sm:grid-cols-3">
          {[
            ['관찰 중인 연결', formatNumber(data.totalConnections)],
            ['관찰된 기기', formatNumber(data.totalDevices)],
            ['마지막 관찰', data.sampledAt > 0 ? formatRelativeTime(data.sampledAt) : '—'],
          ].map(([label, value]) => <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" key={label}>
            <p class="text-sm font-semibold text-slate-500">{label}</p><p class="mt-2 text-xl font-extrabold text-slate-900">{value}</p>
          </div>)}
        </div>
        {data.limited ? <p role="status" class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">연결 수가 관찰 한도를 초과하여 일부 연결만 집계했습니다. 이번 결과로 이상 여부를 판단하지 않습니다.</p> : null}
        {data.alert ? <p role="status" class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{data.alert.ip} 기기에서 연결 또는 목적지 수가 연속해 높게 관찰되었습니다. 정상적인 앱 사용일 수도 있습니다.</p> : null}
        <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 class="text-base font-extrabold text-slate-900">기기별 외부 연결 현황</h2>
          <p class="mt-1 text-xs text-slate-500">IPv4 기준 현재 연결 스냅샷 · 최대 12대 표시 · 콘텐츠 분석 없음</p>
          {data.devices.length ? <div class="mt-4 overflow-x-auto"><table class="w-full text-left text-sm">
            <thead class="text-slate-500"><tr><th class="pb-3">내부 IP</th><th class="pb-3 text-right">연결 수</th><th class="pb-3 text-right">외부 목적지 수</th></tr></thead>
            <tbody>{data.devices.map(device => <tr class="border-t border-slate-100 text-slate-700" key={device.ip}>
              <td class="py-3 font-semibold">{device.ip}</td><td class="py-3 text-right">{formatNumber(device.connections)}</td><td class="py-3 text-right">{formatNumber(device.destinations)}</td>
            </tr>)}</tbody>
          </table></div> : <p class="mt-4 text-sm text-slate-500">현재 확인된 외부 연결이 없습니다.</p>}
        </section>
      </> : null}
      <p class="text-xs leading-relaxed text-slate-500">개인정보 보호를 위해 연결 내용은 읽지 않으며 연결 요약은 공유기 임시 메모리에 저장됩니다. IPv6, 짧게 종료된 연결, 일부 하드웨어 가속 연결은 관찰에 포함되지 않을 수 있습니다. 주의 이벤트는 최근 활동에 기록되며, Cloud 활동 기록을 직접 켠 경우 이벤트에 포함된 기기 내부 IP와 연결 건수가 전송될 수 있습니다.</p>
    </div>
  );
}
