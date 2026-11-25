import type { ExamLanguage, LocalizedText } from '../types/exam';

export function getLocalizedText(
  value: LocalizedText | undefined,
  lang: ExamLanguage = 'en'
): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (lang === 'hi' && value.hi && value.hi.trim().length > 0) {
    return value.hi;
  }
  return value.en ?? value.hi ?? '';
}

export function hasHindiTranslation(value: LocalizedText | undefined): boolean {
  return Boolean(value && typeof value === 'object' && value.hi && value.hi.trim().length > 0);
}

export function formatTimerHMS(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return [hours, minutes, seconds].map((v) => String(v).padStart(2, '0')).join(':');
}

export function formatTimerMMSS(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatDurationHuman(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  if (safe < 60) return `${safe}s`;
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hrs > 0) {
    return secs > 0 ? `${hrs}h ${mins}m ${secs}s` : `${hrs}h ${mins}m`;
  }
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

export function roundMarks(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const sign = value < 0 ? -1 : 1;
  const rounded = (sign * Math.round((Math.abs(value) + Number.EPSILON) * 100)) / 100;
  return Object.is(rounded, -0) ? 0 : rounded;
}

export function formatMarks(value: number): string {
  const rounded = roundMarks(value);
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, '');
}

export function formatDateTime(timestamp: number): string {
  if (!Number.isFinite(timestamp)) return '—';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function optionIndexToLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

export function generateId(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function downloadTextFile(
  filename: string,
  content: string,
  mimeType = 'application/json'
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
