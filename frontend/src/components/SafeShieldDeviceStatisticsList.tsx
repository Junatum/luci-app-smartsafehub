import { formatNumber } from '../app/format';
import type { SafeShieldDeviceStatistics } from '../types/safeshield';
import { DevicesIcon } from './Icons';

interface SafeShieldDeviceStatisticsListProps {
  devices: SafeShieldDeviceStatistics[];
  deviceLimit: number;
  truncated: boolean;
}

function blockRate(queries: number, blocked: number): string {
  if (queries <= 0) {
    return '0.0%';
  }

  return `${((blocked / queries) * 100).toFixed(1)}%`;
}

function deviceName(device: SafeShieldDeviceStatistics): string {
  if (device.id === 'other') {
    return '기타 기기';
  }

  if (device.hostname) {
    return device.hostname;
  }

  return device.identified ? '이름 없는 기기' : '미식별 기기';
}

function sortedDevices(
  devices: SafeShieldDeviceStatistics[],
): SafeShieldDeviceStatistics[] {
  return [...devices].sort((left, right) => {
    if (left.id === 'other') {
      return 1;
    }

    if (right.id === 'other') {
      return -1;
    }

    return (
      right.blocked - left.blocked ||
      right.queries - left.queries ||
      deviceName(left).localeCompare(deviceName(right), 'ko')
    );
  });
}

export function SafeShieldDeviceStatisticsList({
  devices,
  deviceLimit,
  truncated,
}: SafeShieldDeviceStatisticsListProps) {
  const orderedDevices = sortedDevices(devices);

  return (
    <div class="mt-6 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 sm:p-5">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p class="m-0 text-xs font-bold text-slate-500">기기별 통계</p>
          <h3 class="mt-1 mb-0 text-base font-extrabold text-slate-950">
            어떤 기기에서 차단되었는지 확인
          </h3>
          <p class="mt-2 mb-0 text-xs leading-5 text-slate-500">
            DHCP 정보가 있는 기기는 MAC 주소를 기준으로 식별하며, 기기별 숫자만 현재 부팅 세션 동안 메모리에 집계합니다.
          </p>
        </div>
        <span class="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-slate-600 ring-1 ring-slate-200">
          <DevicesIcon class="size-4 text-teal-700" />
          {formatNumber(orderedDevices.length)}개 항목
        </span>
      </div>

      {orderedDevices.length === 0 ? (
        <p class="mt-4 mb-0 rounded-xl bg-white p-4 text-sm leading-6 text-slate-500 ring-1 ring-slate-100">
          아직 기기별 DNS 통계가 없습니다. 클라이언트에서 DNS 요청이 발생하면 다음 통계 갱신 시 표시됩니다.
        </p>
      ) : (
        <div class="mt-4 grid gap-3">
          {orderedDevices.map((device) => (
            <article
              class="grid gap-4 rounded-xl bg-white p-4 ring-1 ring-slate-100 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              key={device.id}
            >
              <div class="min-w-0">
                <div class="flex min-w-0 flex-wrap items-center gap-2">
                  <span class="grid size-9 shrink-0 place-items-center rounded-lg bg-teal-50 text-teal-700">
                    <DevicesIcon class="size-4" />
                  </span>
                  <div class="min-w-0">
                    <h4 class="m-0 truncate text-sm font-extrabold text-slate-950">
                      {deviceName(device)}
                    </h4>
                    <p class="mt-1 mb-0 break-all text-xs text-slate-500">
                      {device.ip || 'IP 미확인'}
                      {device.mac ? ` · ${device.mac}` : ''}
                    </p>
                  </div>
                  <span
                    class={`rounded-full px-2 py-1 text-[11px] font-extrabold ${
                      device.identified
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {device.id === 'other'
                      ? '합산'
                      : device.identified
                        ? 'DHCP 식별'
                        : 'IP 임시 식별'}
                  </span>
                </div>
              </div>

              <dl class="m-0 grid grid-cols-3 gap-2 text-right">
                <div class="min-w-20">
                  <dt class="text-[11px] font-bold text-slate-400">DNS 요청</dt>
                  <dd class="mt-1 mb-0 ml-0 text-sm font-extrabold text-slate-900">
                    {formatNumber(device.queries)}
                  </dd>
                </div>
                <div class="min-w-20">
                  <dt class="text-[11px] font-bold text-slate-400">차단</dt>
                  <dd class="mt-1 mb-0 ml-0 text-sm font-extrabold text-teal-700">
                    {formatNumber(device.blocked)}
                  </dd>
                </div>
                <div class="min-w-20">
                  <dt class="text-[11px] font-bold text-slate-400">차단율</dt>
                  <dd class="mt-1 mb-0 ml-0 text-sm font-extrabold text-slate-900">
                    {blockRate(device.queries, device.blocked)}
                  </dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      )}

      {truncated ? (
        <p class="mt-4 mb-0 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-800">
          개별 통계는 최대 {formatNumber(deviceLimit)}개 기기까지 추적합니다. 한도를 초과한 기기의 요청은 기타 기기로 합산됩니다.
        </p>
      ) : null}
    </div>
  );
}
