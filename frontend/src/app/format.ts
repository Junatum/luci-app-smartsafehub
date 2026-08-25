import { getLocale, t } from '../utils/gettext';
import type { RuntimeMemory } from '../types/status';

const NUMBER_FORMATTER = new Intl.NumberFormat(getLocale());
const TIMESTAMP_FORMATTER = new Intl.DateTimeFormat(getLocale(), {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export function formatUptime(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) {
    return t('Inaccessible');
  }

  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);

  if (days > 0) {
    return t('%s days and %s hours', days, hours);
  }

  if (hours > 0) {
    return t('%s h %s m', hours, minutes);
  }

  return t('%s minute', Math.max(minutes, 1));
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return t('Inaccessible');
  }

  const units = [t('B'), t('KB'), t('MB'), t('GB')];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex] ?? t('B')}`;
}

export function formatLoadAverage(value: number): string {
  return Number.isFinite(value) ? (value / 65_536).toFixed(2) : '-';
}

export function formatNumber(value: number): string {
  return Number.isFinite(value) ? NUMBER_FORMATTER.format(value) : '-';
}

export function formatBootTime(localtime: number, uptime: number): string {
  if (
    !Number.isFinite(localtime) ||
    localtime <= 0 ||
    !Number.isFinite(uptime) ||
    uptime < 0
  ) {
    return t('Inaccessible');
  }

  return formatTimestamp(localtime - uptime);
}

export function formatTimestamp(timestamp: number): string {
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return t('No records');
  }

  return TIMESTAMP_FORMATTER.format(new Date(timestamp * 1000));
}

export function formatInterval(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return t('Inaccessible');
  }

  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);

  if (hours > 0) {
    return minutes > 0 ? t('%s h %s m', hours, minutes) : t('%s hour', hours);
  }

  return t('%s minute', minutes);
}

export function getMemoryUsage(memory: RuntimeMemory): {
  used: number;
  percent: number;
} {
  const total = Math.max(0, memory.total);
  const fallbackAvailable = memory.free + memory.buffered + memory.cached;
  const available = Math.min(
    total,
    Math.max(0, memory.available > 0 ? memory.available : fallbackAvailable),
  );
  const used = Math.max(0, total - available);
  const percent = total > 0 ? (used / total) * 100 : 0;

  return { used, percent };
}
