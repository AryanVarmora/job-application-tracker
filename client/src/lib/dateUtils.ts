// appliedDate is a pure calendar date (no meaningful time-of-day), serialized as UTC
// midnight. Reading it back with local getters (getDay/getMonth/...) reinterprets that
// instant in the viewer's timezone and can roll it back a day for anyone west of UTC -
// the same class of bug ApplicationForm's todayAsLocalDateInput works around for input
// fields. These helpers keep all "which calendar day is this" math in UTC so appliedDate
// never gets reinterpreted, while "today"/"this week" are still anchored to the viewer's
// local calendar day.

export function toPlainUTCDate(dateStr: string): Date {
  const d = new Date(dateStr);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function todayAsPlainUTCDate(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export function addDaysUTC(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

// Monday-anchored start of the week containing `date` (date must already be a plain
// UTC-midnight date, e.g. from toPlainUTCDate/todayAsPlainUTCDate).
export function startOfWeekUTC(date: Date): Date {
  const day = date.getUTCDay(); // 0 = Sun .. 6 = Sat
  const offsetToMonday = day === 0 ? -6 : 1 - day;
  return addDaysUTC(date, offsetToMonday);
}

// Re-anchors a plain UTC-midnight date to a local Date carrying the same Y/M/D, purely
// so toLocaleDateString formats the intended calendar day instead of re-deriving it from
// a UTC instant (which risks the same off-by-one this file exists to avoid).
function toLocalDateForDisplay(date: Date): Date {
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

// "Today" / "Yesterday" / "Nd ago" for the compact card display. Falls back to an
// absolute date for same-day-or-future dates that don't fit that phrasing.
export function formatRelativeDate(dateStr: string): string {
  const applied = toPlainUTCDate(dateStr);
  const today = todayAsPlainUTCDate();
  const diffDays = Math.round((today.getTime() - applied.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays > 1) return `${diffDays}d ago`;
  return toLocalDateForDisplay(applied).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

// Full date for a title/tooltip attribute, e.g. "August 21, 2026".
export function formatFullDate(dateStr: string): string {
  return toLocalDateForDisplay(toPlainUTCDate(dateStr)).toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// --- Genuine timestamps (e.g. OutreachContact.messagedAt/createdAt) ---
// Unlike appliedDate above, these carry a real time-of-day and aren't pinned to UTC
// midnight, so ordinary local-time Date methods are correct here - no UTC re-anchoring
// needed (and using toPlainUTCDate on one of these would truncate away real information).

export function formatRelativeTimestamp(dateStr: string): string {
  const then = new Date(dateStr).getTime();
  const diffMs = Date.now() - then;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours <= 0) return "Just now";
    return diffHours === 1 ? "1h ago" : `${diffHours}h ago`;
  }
  if (diffDays === 1) return "Yesterday";
  return `${diffDays}d ago`;
}

export function formatFullTimestamp(dateStr: string): string {
  return new Date(dateStr).toLocaleString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
