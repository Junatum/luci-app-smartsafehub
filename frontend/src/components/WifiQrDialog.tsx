import { useEffect, useState } from 'preact/hooks';
import { fetchWifiQr } from '../api/smartsafehub';
import { createQrMatrix } from '../utils/qrMatrix';

export function wifiQrPayload(ssid: string, security: string, password: string): string {
  const escape = (value: string) => value.replace(/([\\;,:"])/g, '\\$1');
  const type = security === 'none' ? 'nopass' : security === 'sae' ? 'WPA3' : 'WPA';
  return `WIFI:T:${type};S:${escape(ssid)};P:${escape(password)};;`;
}

export function WifiQrDialog({ section, onClose }: { section: string; onClose: () => void }) {
  const [qr, setQr] = useState<{ ssid: string; matrix: boolean[][] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void fetchWifiQr(section).then((data) => {
      if (!active) return;
      try { setQr({ ssid: data.ssid, matrix: createQrMatrix(wifiQrPayload(data.ssid, data.security, data.password)) }); }
      catch { setError('QR 코드를 생성할 수 없습니다.'); }
    }).catch(() => { if (active) setError('Wi-Fi 정보를 불러오지 못했습니다.'); });
    return () => { active = false; setQr(null); };
  }, [section]);
  const count = qr?.matrix.length ?? 0;
  return (
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4" role="presentation" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-label="Wi-Fi QR 코드" class="w-full max-w-sm rounded-2xl bg-white p-5 text-center text-slate-950 shadow-2xl sm:p-7">
        <h2 class="m-0 text-xl font-extrabold">Wi-Fi QR 코드</h2>
        <p class="mt-2 break-all text-sm font-semibold text-slate-600">{qr?.ssid ?? 'Wi-Fi 정보를 확인하는 중'}</p>
        {error ? <p role="alert" class="my-6 text-sm font-bold text-red-700">{error}</p> : null}
        {!qr && !error ? <p class="my-6 text-sm">QR 코드를 만드는 중...</p> : null}
        {qr ? <div class="mx-auto my-5 w-full max-w-[288px] rounded-xl border border-slate-200 bg-white p-3">
          <svg class="block h-auto w-full" viewBox={`0 0 ${count + 8} ${count + 8}`} role="img" aria-label={`${qr.ssid} Wi-Fi 연결 QR 코드`} shape-rendering="crispEdges">
            <rect width={count + 8} height={count + 8} fill="white" />
            {qr.matrix.map((row, y) => row.map((dark, x) => dark ? <rect key={`${y}-${x}`} x={x + 4} y={y + 4} width="1" height="1" fill="black" /> : null))}
          </svg>
        </div> : null}
        <p class="text-xs leading-5 text-slate-500">휴대전화 카메라로 스캔해 연결하세요. QR 코드에는 Wi-Fi 비밀번호가 포함됩니다.</p>
        <button class="mt-5 min-h-11 w-full rounded-xl bg-teal-700 px-4 font-extrabold text-white" onClick={onClose} type="button">닫기</button>
      </section>
    </div>
  );
}
