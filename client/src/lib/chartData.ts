import type { Application, ApplicationStatus } from "../types";

function monthKey(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  // "numeric" year (not "2-digit") so e.g. "Aug 2026" can't be misread as day-of-month.
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

export interface MonthlyCount {
  key: string;
  label: string;
  count: number;
}

// Counts applications submitted per calendar month, sorted chronologically.
export function applicationsPerMonth(applications: Application[]): MonthlyCount[] {
  const counts = new Map<string, number>();
  for (const app of applications) {
    const key = monthKey(app.appliedDate);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => ({ key, label: monthLabel(key), count }));
}

export interface StatusCount {
  status: ApplicationStatus;
  count: number;
}

export function countByStatus(applications: Application[]): StatusCount[] {
  const counts = new Map<ApplicationStatus, number>();
  for (const app of applications) {
    counts.set(app.status, (counts.get(app.status) ?? 0) + 1);
  }
  return [...counts.entries()].map(([status, count]) => ({ status, count }));
}

export interface MonthlyAverageFitScore {
  key: string;
  label: string;
  averageFitScore: number;
}

// Averages fitScore per month of analyzedAt, skipping applications that haven't
// been analyzed yet (fitScore/analyzedAt are null until POST .../analyze runs).
export function averageFitScorePerMonth(applications: Application[]): MonthlyAverageFitScore[] {
  const sums = new Map<string, { total: number; count: number }>();
  for (const app of applications) {
    if (app.fitScore === null || !app.analyzedAt) continue;
    const key = monthKey(app.analyzedAt);
    const entry = sums.get(key) ?? { total: 0, count: 0 };
    entry.total += app.fitScore;
    entry.count += 1;
    sums.set(key, entry);
  }
  return [...sums.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, { total, count }]) => ({
      key,
      label: monthLabel(key),
      averageFitScore: Math.round(total / count),
    }));
}
