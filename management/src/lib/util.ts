// Date + formatting helpers used across the UI.

const DAY_MS = 24 * 60 * 60 * 1000;

export function parseDate(s: string): Date {
  // Treat YYYY-MM-DD as UTC midnight so day-arithmetic is stable across TZs.
  return new Date(s.length === 10 ? `${s}T00:00:00Z` : s);
}

export function daysBetween(fromIso: string, toIso: string): number {
  const a = parseDate(fromIso).getTime();
  const b = parseDate(toIso).getTime();
  return Math.round((b - a) / DAY_MS);
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function fmtDate(s: string): string {
  const d = parseDate(s);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function fmtDateLong(s: string): string {
  const d = parseDate(s);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function fmtRelativeTime(s: string): string {
  const ms = Date.now() - new Date(s).getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return fmtDateLong(s);
}

export function cls(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export const KIND_LABELS: Record<string, string> = {
  IM: "INV.MEMO",
  MD: "MARKET",
  IO: "INDUSTRY",
  ER: "EQUITY",
  PUB_LINKEDIN: "LINKEDIN",
  PUB_IG: "IG",
  PUB_WEBSITE: "WEBSITE",
  CUSTOM: "CUSTOM",
};

export const STATE_LABELS: Record<string, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  submitted: "Submitted",
  approved: "Approved",
  published: "Published",
};
