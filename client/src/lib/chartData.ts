import type { Application, ApplicationStatus } from "../types";
import { addDaysUTC, startOfWeekUTC, todayAsPlainUTCDate, toPlainUTCDate } from "./dateUtils";

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

export interface ResumeVariantPerformance {
  variant: string;
  applied: number;
  rejected: number;
  responded: number; // interviewing or offer - i.e. got some reply back
  total: number;
}

// Groups by resumeVariant (skipping applications where it's unset), one row per variant
// actually used at least once, sorted by most-used first.
export function resumeVariantPerformance(applications: Application[]): ResumeVariantPerformance[] {
  const counts = new Map<string, ResumeVariantPerformance>();
  for (const app of applications) {
    const variant = app.resumeVariant?.trim();
    if (!variant) continue;

    const entry = counts.get(variant) ?? { variant, applied: 0, rejected: 0, responded: 0, total: 0 };
    entry.total += 1;
    if (app.status === "applied") entry.applied += 1;
    else if (app.status === "rejected") entry.rejected += 1;
    else entry.responded += 1; // interviewing | offer
    counts.set(variant, entry);
  }
  return [...counts.values()].sort((a, b) => b.total - a.total);
}

export interface WeekdayCount {
  day: string;
  count: number;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Counts applications by the weekday of appliedDate, restricted to Mon-Fri (the window
// applications actually get submitted in).
export function applicationsByWeekday(applications: Application[]): WeekdayCount[] {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const app of applications) {
    counts[toPlainUTCDate(app.appliedDate).getUTCDay()] += 1;
  }
  return [1, 2, 3, 4, 5].map((day) => ({ day: WEEKDAY_LABELS[day], count: counts[day] }));
}

// Average days between appliedDate and statusChangedAt for applications currently
// rejected. Returns null when there's nothing to average (skip the card entirely rather
// than showing a misleading 0). statusChangedAt is only set once a status transition has
// been recorded, so a rejected application from before that tracking existed is excluded.
export function averageDaysToRejection(applications: Application[]): number | null {
  const rejected = applications.filter(
    (app): app is Application & { statusChangedAt: string } =>
      app.status === "rejected" && app.statusChangedAt !== null
  );
  if (rejected.length === 0) return null;

  const totalDays = rejected.reduce((sum, app) => {
    const days =
      (new Date(app.statusChangedAt).getTime() - new Date(app.appliedDate).getTime()) /
      (1000 * 60 * 60 * 24);
    return sum + days;
  }, 0);
  return totalDays / rejected.length;
}

export interface FitScoreBucket {
  bucket: string;
  count: number;
}

const FIT_SCORE_BUCKETS = [
  { bucket: "0–25", min: 0, max: 25 },
  { bucket: "26–50", min: 26, max: 50 },
  { bucket: "51–75", min: 51, max: 75 },
  { bucket: "76–100", min: 76, max: 100 },
];

// Histogram of fitScore for applications that have opted into analysis and been scored.
export function fitScoreDistribution(applications: Application[]): FitScoreBucket[] {
  const counts = FIT_SCORE_BUCKETS.map(({ bucket }) => ({ bucket, count: 0 }));
  for (const app of applications) {
    if (!app.analyzeEnabled || app.fitScore === null) continue;
    const index = FIT_SCORE_BUCKETS.findIndex(
      ({ min, max }) => app.fitScore! >= min && app.fitScore! <= max
    );
    if (index !== -1) counts[index].count += 1;
  }
  return counts;
}

export interface WeeklyMomentum {
  thisWeek: number;
  lastWeek: number;
}

// Mon-Sun window counts for "this week" vs "last week", anchored to the viewer's local
// today so it lines up with their sense of what week it is.
export function weeklyMomentum(applications: Application[]): WeeklyMomentum {
  const thisWeekStart = startOfWeekUTC(todayAsPlainUTCDate());
  const thisWeekEnd = addDaysUTC(thisWeekStart, 7);
  const lastWeekStart = addDaysUTC(thisWeekStart, -7);

  let thisWeek = 0;
  let lastWeek = 0;
  for (const app of applications) {
    const applied = toPlainUTCDate(app.appliedDate).getTime();
    if (applied >= thisWeekStart.getTime() && applied < thisWeekEnd.getTime()) {
      thisWeek += 1;
    } else if (applied >= lastWeekStart.getTime() && applied < thisWeekStart.getTime()) {
      lastWeek += 1;
    }
  }
  return { thisWeek, lastWeek };
}
