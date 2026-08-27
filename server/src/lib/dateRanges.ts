// Local calendar-day boundaries (not UTC) so "today" matches the server's local day,
// consistent with how the client treats "today" for the applied-date field.
export function todayBounds(now: Date = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}
