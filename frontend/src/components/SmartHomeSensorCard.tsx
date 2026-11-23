// SPDX-License-Identifier: GPL-3.0-or-later
import { DevicesIcon, ReloadIcon } from './Icons';
import type { JarbisDevice, JarbisSensorState } from '../types/jarbis';
import { sensorReading, sensorReportLabel } from '../utils/shellySensor';

const button = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';
interface Props {
  device: JarbisDevice;
  state: JarbisSensorState | undefined;
  checking: boolean;
  busy: boolean;
  supported: boolean;
  onRefresh: () => void;
  onToggle: () => void;
  onRemove: () => void;
}

export function SmartHomeSensorCard({ device, state, checking, busy, supported, onRefresh, onToggle, onRemove }: Props) {
  const report = sensorReportLabel(state?.lastSeen, Math.floor(Date.now() / 1000));
  const observed = state?.observed === true && state.id === device.id && !report.label.includes('미확인');
  const stateLabel = !device.enabled ? '사용 중지' : !supported ? 'Jarbis 업데이트 필요' : !observed ? '측정값 없음'
    : report.stale ? '오래된 측정값' : '최근 측정값';
  return <article class="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5" aria-label={`${device.name} 온습도 센서`}>
    <div class="flex flex-wrap items-start gap-3">
      <span class="grid size-11 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-700"><DevicesIcon class="size-5" /></span>
      <div class="min-w-0 flex-1">
        <h3 class="m-0 truncate text-sm font-extrabold text-slate-950" title={device.name}>{device.name}</h3>
        <p class="mt-1 mb-0 text-xs text-slate-500">Shelly H&T Gen3 · Wi-Fi 온습도 센서</p>
      </div>
      <span class={`rounded-full px-2.5 py-1 text-[0.7rem] font-bold ${!device.enabled || !supported ? 'bg-slate-100 text-slate-600' : observed && !report.stale ? 'bg-teal-50 text-teal-800' : 'bg-amber-50 text-amber-800'}`}>{stateLabel}</span>
    </div>
    <div class="mt-4 grid grid-cols-2 gap-3" aria-label="최근 측정 정보">
      <div class="rounded-xl bg-sky-50 p-4"><p class="m-0 text-xs font-semibold text-sky-800">온도</p><p class="mt-1 mb-0 text-2xl font-black tabular-nums text-slate-900">{observed ? sensorReading(state?.temperatureC, '°C', -40, 125) : '—'}</p></div>
      <div class="rounded-xl bg-teal-50 p-4"><p class="m-0 text-xs font-semibold text-teal-800">습도</p><p class="mt-1 mb-0 text-2xl font-black tabular-nums text-slate-900">{observed ? sensorReading(state?.humidityPercent, '%', 0, 100) : '—'}</p></div>
    </div>
    <div class="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
      <span>{observed ? report.label : '기기에서 수신된 측정 정보가 없습니다.'}{observed && report.stale ? ' · 최신 값이 아닙니다' : ''}</span>
      <span>배터리 {observed ? sensorReading(state?.batteryPercent, '%', 0, 100) : '—'}</span>
    </div>
    <p class="mt-3 mb-0 text-xs leading-5 text-slate-500">배터리 사용 시 센서는 측정 후 잠듭니다. 현재 Wi-Fi 접속 상태가 아닌 마지막 수신값이며, 새로고침으로 기기를 깨울 수는 없습니다.</p>
    {!supported ? <p class="mt-3 mb-0 text-xs text-amber-800">설치된 Jarbis에 Shelly 센서 상태 조회 기능이 없습니다. 지원 버전으로 업데이트해 주세요.</p> : null}
    <div class="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
      <button class={button} type="button" disabled={busy || checking || !device.enabled || !supported} onClick={onRefresh}><ReloadIcon class="size-4" />{checking ? '확인 중…' : '측정값 다시 확인'}</button>
      <details class="relative z-20 text-sm text-slate-600">
        <summary class={`${button} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>관리</summary>
        <div class="absolute left-0 top-full z-30 mt-2 flex w-64 max-w-[calc(100vw-3rem)] flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
          <p class="m-0 break-all text-xs text-slate-500">기기 ID: {device.id}</p>
          <button class={button} type="button" disabled={busy} onClick={onToggle}>{device.enabled ? '기기 사용 중지' : '기기 다시 사용'}</button>
          <button class={`${button} text-rose-700`} type="button" disabled={busy} onClick={onRemove}>기기 삭제</button>
        </div>
      </details>
    </div>
  </article>;
}
