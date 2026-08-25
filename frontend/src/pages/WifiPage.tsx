import { t } from '../utils/gettext';
import type { JSX } from 'preact';
import { useEffect, useState } from 'preact/hooks';

import { CheckCircleIcon, RouterIcon } from '../components/Icons';
import { ErrorPanel, LoadingPanel } from '../components/StatePanels';
import type { WifiFeedback } from '../hooks/useWifi';
import type {
  WifiNetworkSummary,
  WifiSecurityChoice,
  WifiSummary,
  WifiUpdateInput,
} from '../types/wifi';

interface WifiPageProps {
  data: WifiSummary | null;
  error: string | null;
  feedback: WifiFeedback;
  loading: boolean;
  updatingSection: string | null;
  onDismissFeedback: () => void;
  onRetry: () => void;
  onUpdate: (input: WifiUpdateInput) => Promise<boolean>;
}

const SECURITY_OPTIONS: ReadonlyArray<{
  value: Exclude<WifiSecurityChoice, 'keep'>;
  label: string;
}> = [
  { value: 'sae-mixed', label: t('WPA2/WPA3 Blend (Recommended)') },
  { value: 'sae', label: t('WPA3-Personal') },
  { value: 'psk2', label: t('WPA2-Personal') },
  { value: 'none', label: t('No encryption') },
];

function securityLabel(network: WifiNetworkSummary): string {
  switch (network.security) {
    case 'sae-mixed':
      return t('Mix WPA2/WPA3');
    case 'sae':
      return t('WPA3-Personal');
    case 'psk2':
      return t('WPA2-Personal');
    case 'none':
      return t('No encryption');
    default:
      return t('Advanced Settings (%s)', network.securityRaw);
  }
}

function isValidPassword(password: string): boolean {
  return (
    (password.length >= 8 && password.length <= 63) ||
    /^[0-9a-fA-F]{64}$/.test(password)
  );
}

function WifiNetworkCard({
  network,
  busy,
  saving,
  onUpdate,
}: {
  network: WifiNetworkSummary;
  busy: boolean;
  saving: boolean;
  onUpdate: (input: WifiUpdateInput) => Promise<boolean>;
}) {
  const [ssid, setSsid] = useState(network.ssid);
  const [enabled, setEnabled] = useState(network.enabled);
  const [security, setSecurity] = useState<WifiSecurityChoice>(
    network.security === 'custom' ? 'keep' : network.security,
  );
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setSsid(network.ssid);
    setEnabled(network.enabled);
    setSecurity(network.security === 'custom' ? 'keep' : network.security);
    setPassword('');
    setValidationError(null);
  }, [network]);

  const keepsCustomSecurity =
    network.security === 'custom' && security === 'keep';
  const securityRequiresPassword =
    security === 'psk2' || security === 'sae-mixed' || security === 'sae';

  const submit = async (
    event: JSX.TargetedSubmitEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    const normalizedSsid = ssid.trim();
    const ssidBytes = new TextEncoder().encode(normalizedSsid).length;

    if (ssidBytes < 1 || ssidBytes > 32) {
      setValidationError(t('Please enter SSID between 1 and 32 bytes based on UTF-8.'));
      return;
    }

    if (password && !isValidPassword(password)) {
      setValidationError(t('Password must be 8-63 characters or 64 hex digits.'));
      return;
    }

    if (
      securityRequiresPassword &&
      !network.passwordConfigured &&
      password.length === 0
    ) {
      setValidationError(t('Please enter your password to use secure Wi-Fi.'));
      return;
    }

    if (
      !window.confirm(
        t('Applying Wi-Fi settings may temporarily disconnect you from your current wireless connection. Are you sure you want to continue?'),
      )
    ) {
      return;
    }

    setValidationError(null);
    const updated = await onUpdate({
      section: network.section,
      ssid: normalizedSsid,
      security,
      password,
      enabled,
    });

    if (updated) {
      setPassword('');
    }
  };

  return (
    <form
      class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5 sm:p-6"
      onSubmit={(event) => void submit(event)}
    >
      <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div class="flex min-w-0 items-start gap-3">
          <span class="grid size-11 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700">
            <RouterIcon class="size-6" />
          </span>
          <div class="min-w-0">
            <p class="m-0 text-xs font-extrabold uppercase tracking-[0.16em] text-slate-500">
              {network.bandLabel}
            </p>
            <h2 class="mt-2 mb-0 break-words text-xl font-extrabold tracking-tight text-slate-950">
              {network.ssid || t('Unnamed Wi-Fi')}
            </h2>
            <p class="mt-2 mb-0 text-sm text-slate-600">
              {t('Channel')} {network.channel ?? t('AUTO')} {t('· Connected device')} {network.clientCount}{t('ea')}
            </p>
          </div>
        </div>
        <span
          class={`inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-extrabold ring-1 ring-inset ${
            network.runtimeUp
              ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
              : 'bg-slate-100 text-slate-600 ring-slate-200'
          }`}
        >
          <span
            class={`size-2 rounded-full ${network.runtimeUp ? 'bg-emerald-500' : 'bg-slate-400'}`}
          />
          {network.runtimeUp ? t('In Action') : network.enabled ? t('Waiting to start') : t('OFF')}
        </span>
      </div>

      <div class="mt-6 grid gap-5 lg:grid-cols-2">
        <label class="block">
          <span class="text-sm font-extrabold text-slate-800">{t('Wi-Fi name (SSID)')}</span>
          <input
            autocomplete="off"
            class="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-100 disabled:bg-slate-100"
            disabled={busy}
            maxLength={32}
            onInput={(event) => setSsid(event.currentTarget.value)}
            value={ssid}
          />
        </label>

        <label class="block">
          <span class="text-sm font-extrabold text-slate-800">{t('How security works')}</span>
          <select
            class="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition focus:border-teal-600 focus:ring-4 focus:ring-teal-100 disabled:bg-slate-100"
            disabled={busy}
            onChange={(event) => {
              const next = event.currentTarget.value as WifiSecurityChoice;
              setSecurity(next);
              if (next === 'none') {
                setPassword('');
              }
            }}
            value={security}
          >
            {network.security === 'custom' ? (
              <option value="keep">{t('Keep current advanced settings (%s)', network.securityRaw)}</option>
            ) : null}
            {SECURITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <span class="mt-2 block text-xs text-slate-500">
            {t('Current:')} {securityLabel(network)}
          </span>
        </label>

        <label class="block lg:col-span-2">
          <span class="text-sm font-extrabold text-slate-800">{t('New password')}</span>
          <input
            autocomplete="new-password"
            class="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-100 disabled:bg-slate-100"
            disabled={busy || security === 'none' || keepsCustomSecurity}
            onInput={(event) => setPassword(event.currentTarget.value)}
            placeholder={
              keepsCustomSecurity
                ? t('Change the advanced security settings from the existing LuCI')
                : network.passwordConfigured
                  ? t('Leave blank to keep existing password')
                  : t('Please enter a password that is at least 8 characters')
            }
            type="password"
            value={password}
          />
          <span class="mt-2 block text-xs text-slate-500">
            {t('Stored passwords will not be re-disclosed to the screen or API.')}
          </span>
        </label>
      </div>

      <div class="mt-6 flex flex-col gap-4 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <label class="inline-flex min-h-11 items-center gap-3 text-sm font-extrabold text-slate-800">
          <input
            checked={enabled}
            class="size-5 accent-teal-700"
            disabled={busy}
            onChange={(event) => setEnabled(event.currentTarget.checked)}
            type="checkbox"
          />
          {t('Use this Wi-Fi')}
        </label>
        <button
          class="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border-0 bg-teal-700 px-5 sm:w-auto py-2.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-teal-800 focus:outline-none focus-visible:ring-4 focus-visible:ring-teal-200 disabled:cursor-wait disabled:opacity-60"
          disabled={busy}
          type="submit"
        >
          <CheckCircleIcon class={`size-5 ${saving ? 'animate-pulse' : ''}`} />
          {saving ? t('Applying') : t('Save Config')}
        </button>
      </div>

      {validationError ? (
        <p class="mt-4 mb-0 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
          {validationError}
        </p>
      ) : null}
    </form>
  );
}

function FeedbackPanel({
  feedback,
  onDismiss,
}: {
  feedback: Exclude<WifiFeedback, null>;
  onDismiss: () => void;
}) {
  const classes =
    feedback.kind === 'success'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
      : feedback.kind === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-900'
        : 'border-red-200 bg-red-50 text-red-900';

  return (
    <div
      aria-live="polite"
      class={`mb-5 flex flex-col gap-3 rounded-2xl border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between ${classes}`}
    >
      <p class="m-0 font-bold leading-6">{feedback.message}</p>
      <button
        class="min-h-11 w-full shrink-0 rounded-lg border border-current bg-transparent sm:min-h-9 sm:w-auto px-3 py-1.5 text-xs font-extrabold"
        onClick={onDismiss}
        type="button"
      >
        {t('CLOSE')}
      </button>
    </div>
  );
}

export function WifiPage({
  data,
  error,
  feedback,
  loading,
  updatingSection,
  onDismissFeedback,
  onRetry,
  onUpdate,
}: WifiPageProps) {
  if (loading) {
    return <LoadingPanel />;
  }

  if (error) {
    return <ErrorPanel message={error} onRetry={onRetry} />;
  }

  if (!data) {
    return null;
  }

  return (
    <>
      {feedback ? (
        <FeedbackPanel feedback={feedback} onDismiss={onDismissFeedback} />
      ) : null}

      <section class="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950 sm:p-6">
        <p class="m-0 text-xs font-extrabold uppercase tracking-[0.16em] text-amber-700">
          {t('Connection Attention')}
        </p>
        <h2 class="mt-2 mb-0 text-lg font-extrabold">
          {t('Changing your Wi-Fi name or password will disconnect you')}
        </h2>
        <p class="mt-2 mb-0 text-sm leading-6 text-amber-900/80">
          {t('You can still use SmartSafeHub by reconnecting with your changed Wi-Fi name and password. VLANs, guest networks and advanced wireless options are managed by the existing LuCI.')}
        </p>
      </section>

      {data.networks.length ? (
        <section aria-label={t('Default Wi-Fi settings')} class="grid gap-5 xl:grid-cols-2">
          {data.networks.map((network) => (
            <WifiNetworkCard
              key={network.section}
              busy={updatingSection !== null}
              network={network}
              onUpdate={onUpdate}
              saving={updatingSection === network.section}
            />
          ))}
        </section>
      ) : (
        <section class="rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm shadow-slate-900/5 sm:p-8">
          <RouterIcon class="mx-auto size-10 text-slate-400" />
          <h2 class="mt-4 mb-0 text-lg font-extrabold text-slate-950">
            {t('Failed to find default Wi-Fi to manage')}
          </h2>
          <p class="mt-2 mb-0 text-sm leading-6 text-slate-600">
            {t('Please configure the AP mode wireless network in the existing LuCI first.')}
          </p>
        </section>
      )}
    </>
  );
}
