import { t } from '../utils/gettext';
import type { ComponentChildren, JSX } from 'preact';
import { useMemo, useState } from 'preact/hooks';

import {
  CableIcon,
  ClockIcon,
  DevicesIcon,
  SearchIcon,
  WifiIcon,
} from '../components/Icons';
import { ErrorPanel, LoadingPanel } from '../components/StatePanels';
import type {
  ConnectedDevice,
  ConnectedDevicesSummary,
  DeviceConnection,
} from '../types/devices';

interface ConnectedDevicesPageProps {
  data: ConnectedDevicesSummary | null;
  error: string | null;
  loading: boolean;
  onRetry: () => void;
}

type DeviceFilter = 'all' | 'online' | 'wifi' | 'ethernet' | 'offline';

const FILTERS: Array<{ value: DeviceFilter; label: string }> = [
  { value: 'all', label: t('ALL') },
  { value: 'online', label: t('Current connection') },
  { value: 'wifi', label: t('Wi-Fi') },
  { value: 'ethernet', label: t('Wired/Other') },
  { value: 'offline', label: t('Recent Devices') },
];

const DEVICE_NAME_COLLATOR = new Intl.Collator('ko');
const LEASE_DATE_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  month: 'numeric',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function connectionLabel(connection: DeviceConnection): string {
  switch (connection) {
    case 'wifi':
      return t('Wi-Fi');
    case 'ethernet':
      return t('Wired/Other');
    default:
      return t('Connection not confirmed');
  }
}

function deviceName(device: ConnectedDevice): string {
  return device.hostname ?? device.ipv4Address ?? t('Unnamed Device');
}

function signalLabel(signal: number | null): string | null {
  if (signal === null) {
    return null;
  }
  if (signal >= -50) {
    return t('I like it very much');
  }
  if (signal >= -60) {
    return t('I like it');
  }
  if (signal >= -70) {
    return t('Neutral');
  }
  return t('Weak');
}

function formatDuration(seconds: number | null): string | null {
  if (seconds === null || seconds < 0) {
    return null;
  }

  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);

  if (days > 0) {
    return t('%s days and %s hours', days, hours);
  }
  if (hours > 0) {
    return t('%s h %s m', hours, minutes);
  }
  return t('%s minute', Math.max(minutes, 1));
}

function leaseLabel(device: ConnectedDevice): string | null {
  if (!device.leaseActive) {
    return null;
  }
  if (device.leaseExpiresAt === null) {
    return t('DHCP Lease Active');
  }

  return t('Up to DHCP %s', LEASE_DATE_FORMATTER.format(
    new Date(device.leaseExpiresAt * 1000),
  ));
}

function matchesFilter(device: ConnectedDevice, filter: DeviceFilter): boolean {
  switch (filter) {
    case 'online':
      return device.online;
    case 'wifi':
      return device.online && device.connection === 'wifi';
    case 'ethernet':
      return device.online && device.connection === 'ethernet';
    case 'offline':
      return !device.online;
    default:
      return true;
  }
}

function DeviceStatusBadge({ device }: { device: ConnectedDevice }) {
  return (
    <span
      class={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-extrabold ring-1 ring-inset ${
        device.online
          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
          : 'bg-slate-100 text-slate-600 ring-slate-200'
      }`}
    >
      <span
        class={`size-2 rounded-full ${device.online ? 'bg-emerald-500' : 'bg-slate-400'}`}
      />
      {device.online ? t('Current connection') : t('Recent leases')}
    </span>
  );
}

function DeviceCard({ device }: { device: ConnectedDevice }) {
  const signal = signalLabel(device.signalDbm);
  const connected = formatDuration(device.connectedSeconds);
  const lease = leaseLabel(device);

  return (
    <article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5 sm:p-5">
      <div class="flex min-w-0 flex-col items-start gap-4 sm:flex-row sm:justify-between">
        <div class="flex min-w-0 items-start gap-3">
          <span
            class={`grid size-11 shrink-0 place-items-center rounded-xl ${
              device.connection === 'wifi'
                ? 'bg-teal-50 text-teal-700'
                : device.connection === 'ethernet'
                  ? 'bg-blue-50 text-blue-700'
                  : 'bg-slate-100 text-slate-600'
            }`}
          >
            {device.connection === 'wifi' ? (
              <WifiIcon class="size-6" />
            ) : device.connection === 'ethernet' ? (
              <CableIcon class="size-6" />
            ) : (
              <DevicesIcon class="size-6" />
            )}
          </span>
          <div class="min-w-0">
            <h3 class="m-0 break-words text-base font-extrabold text-slate-950">
              {deviceName(device)}
            </h3>
            <p class="mt-1 mb-0 break-all font-mono text-xs leading-5 text-slate-500">
              {device.mac}
            </p>
          </div>
        </div>
        <span class="shrink-0 self-start"><DeviceStatusBadge device={device} /></span>
      </div>

      <dl class="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <div class="rounded-xl bg-slate-50 p-3.5">
          <dt class="text-xs font-bold text-slate-500">{t('IP address')}</dt>
          <dd class="mt-1.5 mb-0 ml-0 font-extrabold text-slate-900">
            {device.ipv4Address ?? t('Not determined')}
          </dd>
        </div>
        <div class="rounded-xl bg-slate-50 p-3.5">
          <dt class="text-xs font-bold text-slate-500">{t('Connection Type')}</dt>
          <dd class="mt-1.5 mb-0 ml-0 font-extrabold text-slate-900">
            {connectionLabel(device.connection)}
          </dd>
        </div>
      </dl>

      <div class="mt-4 flex flex-wrap gap-2 text-xs font-bold text-slate-600">
        {device.ssid ? (
          <span class="rounded-full bg-teal-50 px-3 py-1.5 text-teal-800">
            {device.ssid}{device.bandLabel ? ` · ${device.bandLabel}` : ''}
          </span>
        ) : null}
        {signal ? (
          <span class="rounded-full bg-slate-100 px-3 py-1.5">
            {t('Signal %s · %s dBm', signal, device.signalDbm)}
          </span>
        ) : null}
        {connected ? (
          <span class="rounded-full bg-slate-100 px-3 py-1.5">
            {t('CONNECTION')} {connected}
          </span>
        ) : null}
        {lease ? (
          <span class="rounded-full bg-slate-100 px-3 py-1.5">{lease}</span>
        ) : null}
        {device.interface ? (
          <span class="rounded-full bg-slate-100 px-3 py-1.5">
            {device.interface}
          </span>
        ) : null}
      </div>
    </article>
  );
}

export function ConnectedDevicesPage({
  data,
  error,
  loading,
  onRetry,
}: ConnectedDevicesPageProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<DeviceFilter>('all');

  const devices = useMemo(() => {
    if (!data) {
      return [];
    }

    const normalized = query.trim().toLocaleLowerCase();
    return [...data.devices]
      .filter((device) => matchesFilter(device, filter))
      .filter((device) => {
        if (!normalized) {
          return true;
        }

        return [device.hostname, device.ipv4Address, device.mac, device.ssid]
          .filter((value): value is string => Boolean(value))
          .some((value) => value.toLocaleLowerCase().includes(normalized));
      })
      .sort((left, right) => {
        if (left.online !== right.online) {
          return left.online ? -1 : 1;
        }
        if (left.connection !== right.connection) {
          return left.connection === 'wifi' ? -1 : 1;
        }
        return DEVICE_NAME_COLLATOR.compare(deviceName(left), deviceName(right));
      });
  }, [data, filter, query]);

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
      <section aria-label={t('Connected Device Summary')} class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          description={t('%s confirmed in recent DHCP leases', data.totals.offline)}
          icon={<DevicesIcon class="size-6" />}
          label={t('Confirmed device')}
          value={data.totals.known}
        />
        <SummaryCard
          description={t('Currently verified on Wi-Fi or ARP')}
          icon={<ClockIcon class="size-6" />}
          label={t('Current connection')}
          value={data.totals.online}
        />
        <SummaryCard
          description={t('Devices connected to wireless APs')}
          icon={<WifiIcon class="size-6" />}
          label={t('Wi-Fi')}
          value={data.totals.wireless}
        />
        <SummaryCard
          description={t('Non-wireless devices identified in LAN ARP')}
          icon={<CableIcon class="size-6" />}
          label={t('Wired/Other')}
          value={data.totals.ethernet}
        />
      </section>

      <section class="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5 sm:p-5">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p class="m-0 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              {t('Device inventory')}
            </p>
            <h2 class="mt-2 mb-0 text-xl font-extrabold text-slate-950">
              {t('Device List')}
            </h2>
          </div>
          <label class="relative block w-full lg:max-w-sm">
            <span class="sr-only">{t('Search devices')}</span>
            <SearchIcon class="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-slate-400" />
            <input
              class="min-h-11 w-full rounded-xl border border-slate-300 bg-white pr-4 pl-11 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-100"
              onInput={(event: JSX.TargetedEvent<HTMLInputElement>) =>
                setQuery(event.currentTarget.value)
              }
              placeholder={t('Search by name, IP, Mac or SSID')}
              type="search"
              value={query}
            />
          </label>
        </div>

        <div class="ssh-touch-scroll mt-4 flex gap-2 overflow-x-auto pb-1" role="group" aria-label={t('Machine Filters')}>
          {FILTERS.map((item) => (
            <button
              aria-pressed={filter === item.value}
              class={`min-h-10 shrink-0 rounded-xl border px-4 py-2 text-sm font-extrabold transition ${
                filter === item.value
                  ? 'border-teal-700 bg-teal-700 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-950'
              }`}
              key={item.value}
              onClick={() => setFilter(item.value)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {devices.length ? (
        <section aria-live="polite" class="mt-5 grid gap-4 lg:grid-cols-2">
          {devices.map((device) => (
            <DeviceCard device={device} key={device.id} />
          ))}
        </section>
      ) : (
        <section class="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-5 text-center sm:p-8">
          <DevicesIcon class="mx-auto size-10 text-slate-400" />
          <h2 class="mt-4 mb-0 text-lg font-extrabold text-slate-950">
            {t('There are no devices that match your criteria')}
          </h2>
          <p class="mt-2 mb-0 text-sm text-slate-600">
            {t('Please change your search terms or filters.')}
          </p>
        </section>
      )}

      <p class="mt-5 mb-0 rounded-xl bg-slate-100 px-4 py-3 text-xs leading-5 text-slate-600">
        {t('Wired/other statuses are based on ARP tables, and recent DHCP leases may still have some time left after the device is disconnected.')}
      </p>
    </>
  );
}

function SummaryCard({
  description,
  icon,
  label,
  value,
}: {
  description: string;
  icon: ComponentChildren;
  label: string;
  value: number;
}) {
  return (
    <article class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5 sm:p-5">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="m-0 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
            {label}
          </p>
          <p class="mt-3 mb-0 text-3xl font-black tracking-tight text-slate-950">
            {value}
          </p>
        </div>
        <span class="grid size-11 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700">
          {icon}
        </span>
      </div>
      <p class="mt-3 mb-0 text-xs leading-5 text-slate-500">{description}</p>
    </article>
  );
}
