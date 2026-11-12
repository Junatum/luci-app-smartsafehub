import { useEffect, useState } from 'preact/hooks';
import {
  addJarbisDevice, getJarbisCandidates, getJarbisCredentials, getJarbisDevices,
  getJarbisStatus, removeJarbisDevice, scanJarbis, setJarbisEnabled,
  setJarbisLight, updateJarbisDevice,
} from '../api/jarbis';
import type { JarbisCandidate, JarbisCredentials, JarbisDevice, JarbisStatus } from '../types/jarbis';

const button = 'inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-800 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:cursor-not-allowed disabled:opacity-50';
const primary = 'inline-flex min-h-10 items-center justify-center rounded-lg bg-teal-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-teal-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 disabled:cursor-not-allowed disabled:opacity-50';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '요청을 처리하지 못했습니다.';
}

function deviceIdForTopic(topic: string): string {
  return `tasmota_${topic.replace(/[^A-Za-z0-9_]/g, '_').slice(0, 32)}`;
}

export function SmartHomePage() {
  const [status, setStatus] = useState<JarbisStatus | null>(null);
  const [devices, setDevices] = useState<JarbisDevice[]>([]);
  const [candidates, setCandidates] = useState<JarbisCandidate[]>([]);
  const [credentials, setCredentials] = useState<JarbisCredentials | null>(null);
  const [reveal, setReveal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [brightness, setBrightness] = useState<Record<string, number>>({});

  const refresh = async () => {
    const fresh = await getJarbisStatus();
    setStatus(fresh);
    setDevices((await getJarbisDevices()).devices);
    setCandidates((await getJarbisCandidates()).devices);
    return fresh;
  };

  useEffect(() => {
    let alive = true;
    // Request separately to keep missing-Jarbis state distinct from any transient RPC failure.
    void getJarbisStatus().then(async (fresh) => {
      if (!alive) return;
      setStatus(fresh);
      const [deviceData, candidateData] = await Promise.all([getJarbisDevices(), getJarbisCandidates()]);
      if (alive) { setDevices(deviceData.devices); setCandidates(candidateData.devices); }
    }).catch((cause: unknown) => {
      if (!alive) return;
      const msg = errorMessage(cause);
      if (/UBUS_4|UBUS_3|not found|object not found|method not found/i.test(msg) || (cause instanceof Error && /UBUS_[34]/.test(String((cause as { code?: string }).code)))) {
        setMissing(true);
      } else { setError(msg); }
    }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const run = async (key: string, action: () => Promise<unknown>, ok: string, reload = true) => {
    setBusy(key); setError(''); setMessage('');
    try {
      await action();
      if (reload) await refresh();
      setMessage(ok);
    } catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(''); }
  };

  const retry = async () => {
    setBusy('refresh'); setError('');
    try { await refresh(); setMissing(false); }
    catch (cause) { setError(errorMessage(cause)); }
    finally { setBusy(''); }
  };

  const toggleEnabled = async () => {
    if (!status) return;
    const next = !status.enabled;
    await run('enabled', () => setJarbisEnabled(next), next ? 'Jarbis가 활성화되었습니다.' : 'Jarbis가 비활성화되었습니다. 공유 MQTT Broker는 계속 실행될 수 있습니다.');
    setCredentials(null);
    setReveal(false);
  };

  const scan = async () => {
    await run('scan', async () => {
      const result = await scanJarbis();
      setCandidates(result.devices);
    }, '검색을 마쳤습니다. 전구가 없다면 Tasmota의 웹 관리 화면과 MQTT 설정을 확인해 주세요.');
  };

  const add = async (candidate: JarbisCandidate) => {
    const id = deviceIdForTopic(candidate.topic);
    if (!candidate.topic) { setError('MQTT Topic이 없습니다. Tasmota의 MQTT 설정을 완료하고 다시 검색해 주세요.'); return; }
    if (!window.confirm(`${candidate.name} 전구를 Jarbis에 등록할까요?`)) return;
    await run(`add:${id}`, () => addJarbisDevice(id, candidate.name, candidate.topic), '기기가 등록되었습니다. MQTT 설정이 일치하는지 확인한 후 전원을 제어해 보세요.');
  };

  const remove = async (device: JarbisDevice) => {
    if (!window.confirm(`${device.name} 기기를 삭제할까요? 실제 전구의 설정은 변경하지 않습니다.`)) return;
    await run(`remove:${device.id}`, () => removeJarbisDevice(device.id), '기기가 목록에서 삭제되었습니다.');
  };

  const loadCredentials = async () => {
    if (credentials) { setCredentials(null); setReveal(false); return; }
    await run('credentials', async () => { setCredentials(await getJarbisCredentials()); setReveal(false); }, 'MQTT 연결 정보를 가져왔습니다.', false);
  };

  if (loading) return <div class="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">스마트홈 상태를 확인하고 있습니다.</div>;
  if (missing) return <section class="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-6" aria-label="Jarbis 미설치">
    <h2 class="m-0 text-lg font-black text-amber-950">Jarbis를 설치해야 합니다</h2>
    <p class="m-0 text-sm leading-6 text-amber-900">현재 공유기에 Jarbis RPC가 없습니다. 공유기 모델에 맞는 Jarbis 0.1.0-r6 APK를 내부 저장소 또는 테스트 펌웨어로 설치하고 페이지를 새로고침하세요. 앱 설치 목록에 승인되지 않은 APK를 자동으로 설치하지 않습니다.</p>
    <button class={button} type="button" onClick={() => void retry()}>설치 후 다시 확인</button>
  </section>;

  return <div class="space-y-5">
    <section class="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div class="flex items-center gap-2"><h2 class="m-0 text-lg font-black text-slate-950">Jarbis</h2><span class="rounded-md bg-teal-50 px-2 py-1 text-xs font-bold text-teal-800">실기기 테스트</span></div>
          <p class="mt-1 mb-0 text-sm text-slate-600">Tasmota 전구의 검색·등록·전원·밝기를 로컬에서 제어합니다.</p>
        </div>
        <div class="flex flex-wrap gap-2"><button class={button} type="button" disabled={!!busy} onClick={() => void retry()}>새로고침</button><button class={status?.enabled ? button : primary} type="button" disabled={!!busy || !status} onClick={() => void toggleEnabled()}>{status?.enabled ? 'Jarbis 끄기' : 'Jarbis 켜기'}</button></div>
      </div>
      <div class="mt-4 grid gap-2 text-sm sm:grid-cols-3">
        <div class="rounded-xl bg-slate-50 p-3"><p class="m-0 text-xs text-slate-500">Jarbis</p><strong>{status?.enabled ? '활성화' : '비활성화'}</strong></div>
        <div class="rounded-xl bg-slate-50 p-3"><p class="m-0 text-xs text-slate-500">MQTT Broker 연결</p><strong>{status?.enabled ? (status.brokerReady ? '연결 확인' : '연결 실패 · 설정 확인') : '대기 중'}</strong></div>
        <div class="rounded-xl bg-slate-50 p-3"><p class="m-0 text-xs text-slate-500">등록된 기기</p><strong>{devices.length}대</strong></div>
      </div>
      <p class="mt-3 mb-0 text-xs text-slate-500">{status?.brokerMode === 'managed' ? '내장 MQTT Broker' : '외부 MQTT Broker'} · {status?.version || '-'} · 전원 명령 성공은 실제 전구 상태 수신을 의미하지 않습니다.</p>
      {status?.enabled && status.brokerMode === 'managed' ? <div class="mt-4 rounded-xl border border-slate-200 p-4">
        <div class="flex flex-wrap items-center justify-between gap-3"><strong class="text-sm text-slate-900">전구 MQTT 연결 설정</strong><button class={button} type="button" disabled={!!busy} onClick={() => void loadCredentials()}>{credentials ? '인증 정보 숨기기' : '인증 정보 확인'}</button></div>
        <p class="mt-2 mb-0 text-xs text-slate-600">전구의 Tasmota 웹 화면 → Configuration → Configure MQTT에서 호스트와 계정을 입력하세요. 이 정보는 다른 사람과 공유하지 마세요.</p>
        {credentials ? <div class="mt-3 space-y-2 rounded-lg bg-slate-50 p-3 text-sm">
          <p class="m-0 break-all">Host: <strong>{credentials.host}</strong> · Port: <strong>{credentials.port}</strong></p>
          <p class="m-0">User: <strong>{credentials.username}</strong></p>
          <div class="flex flex-wrap items-center gap-2">
            <span>Password</span>
            {reveal
              ? <input class="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2 py-2 font-mono text-xs" type="text" readOnly value={credentials.secret} aria-label="MQTT 비밀번호" />
              : <input class="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2 py-2 font-mono text-xs" type="password" readOnly value={credentials.secret} aria-label="MQTT 비밀번호" />}
            <button class={button} type="button" onClick={() => setReveal(!reveal)}>{reveal ? '가리기' : '보기'}</button>
          </div>
          <p class="m-0 text-xs text-slate-600">전구 MQTT Topic은 검색 결과에 표시되는 값으로 사용하세요. FullTopic은 %prefix%/%topic%/ 입니다.</p>
        </div> : null}
      </div> : null}
    </section>

    {error ? <div role="alert" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error} <button class="ml-2 underline" type="button" onClick={() => setError('')}>닫기</button></div> : null}
    {message ? <div role="status" class="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">{message}</div> : null}

    <section class="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div class="flex flex-wrap items-center justify-between gap-3"><div><h2 class="m-0 text-base font-black text-slate-950">기기 검색</h2><p class="mt-1 mb-0 text-sm text-slate-600">DHCP/HTTP 및 MQTT Discovery를 확인합니다. 최대 약 25초가 걸릴 수 있습니다.</p></div><button class={primary} type="button" disabled={!!busy || !status?.enabled} onClick={() => void scan()}>{busy === 'scan' ? '검색 중…' : '기기 검색'}</button></div>
      {candidates.length === 0 ? <p class="mt-4 mb-0 text-sm text-slate-500">검색된 기기가 없습니다. 전구가 같은 LAN에 연결되어 있는지 확인해 주세요.</p> : <ul class="mt-4 space-y-3 p-0" aria-label="검색된 기기">
        {candidates.map(candidate => <li key={`${candidate.topic}:${candidate.ip}:${candidate.source}`} class="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 p-3">
          <div class="min-w-0 flex-1"><strong class="block text-sm text-slate-900">{candidate.name}</strong><p class="mt-1 mb-0 break-all text-xs text-slate-600">{candidate.ip || 'IP 미확인'} · {candidate.source.toUpperCase()} · Topic: {candidate.topic || '미확인'}</p>{candidate.ip ? <a class="mt-1 inline-block text-xs font-bold text-teal-700 underline" href={`http://${candidate.ip}/`} target="_blank" rel="noopener noreferrer">Tasmota 관리 화면</a> : null}</div>
          <button class={button} type="button" disabled={!!busy || !status?.enabled || candidate.registered || !candidate.topic} onClick={() => void add(candidate)}>{candidate.registered ? '등록됨' : candidate.topic ? '기기 추가' : 'Topic 필요'}</button>
        </li>)}
      </ul>}
    </section>

    <section class="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 class="m-0 text-base font-black text-slate-950">등록된 전구</h2>
      {devices.length === 0 ? <p class="mt-3 mb-0 text-sm text-slate-500">아직 등록된 전구가 없습니다. 먼저 기기를 검색하고 추가해 주세요.</p> : <div class="mt-4 space-y-3">{devices.map(device => <div key={device.id} class="rounded-xl border border-slate-200 p-4">
        <div class="flex flex-wrap items-start justify-between gap-3"><div class="min-w-0"><strong class="text-sm text-slate-950">{device.name}</strong><p class="mt-1 mb-0 break-all text-xs text-slate-500">{device.id} · {device.topic}</p></div><div class="flex flex-wrap gap-2"><button class={button} type="button" disabled={!!busy} onClick={() => void run(`update:${device.id}`, () => updateJarbisDevice(device.id, device.name, !device.enabled), device.enabled ? '기기를 비활성화했습니다.' : '기기를 활성화했습니다.')}>{device.enabled ? '기기 끄기(관리)' : '기기 사용'}</button><button class={button} type="button" disabled={!!busy} onClick={() => void remove(device)}>삭제</button></div></div>
        <div class="mt-3 flex flex-wrap items-center gap-2"><button class={primary} type="button" disabled={!!busy || !status?.enabled || !device.enabled} onClick={() => void run(`on:${device.id}`, () => setJarbisLight(device.id, 'power', 'ON'), '켜기 명령을 전송했습니다. 실제 전구 점등을 확인하세요.', false)}>켜기</button><button class={button} type="button" disabled={!!busy || !status?.enabled || !device.enabled} onClick={() => void run(`off:${device.id}`, () => setJarbisLight(device.id, 'power', 'OFF'), '끄기 명령을 전송했습니다. 실제 전구 소등을 확인하세요.', false)}>끄기</button></div>
        <div class="mt-4 flex flex-wrap items-center gap-3"><label class="text-sm font-bold text-slate-700" for={`brightness-${device.id}`}>밝기</label><input id={`brightness-${device.id}`} class="min-w-24 flex-1 accent-teal-700" type="range" min="0" max="100" step="10" disabled={!!busy || !status?.enabled || !device.enabled} value={brightness[device.id] ?? 50} onInput={e => setBrightness({ ...brightness, [device.id]: Number(e.currentTarget.value) })} /><span class="w-10 text-right text-sm tabular-nums">{brightness[device.id] ?? 50}%</span><button class={button} type="button" disabled={!!busy || !status?.enabled || !device.enabled} onClick={() => void run(`dim:${device.id}`, () => setJarbisLight(device.id, 'brightness', String(brightness[device.id] ?? 50)), '밝기 명령을 전송했습니다. 실제 전구 밝기를 확인하세요.', false)}>적용</button></div>
      </div>)}</div>}
    </section>
    <p class="text-xs leading-5 text-slate-500">기기 자동 등록이나 Tasmota 설정 변경은 수행하지 않습니다. 검색한 기기는 승인 후 등록하며, MQTT 연결이 완료되지 않으면 전원·밝기 명령이 전구까지 도달하지 않을 수 있습니다.</p>
  </div>;
}
