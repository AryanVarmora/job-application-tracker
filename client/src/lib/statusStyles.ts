import type { ApplicationStatus } from "../types";

interface StatusStyle {
  label: string;
  badge: string;
  accent: string;
  chartColor: string;
}

export const STATUS_STYLES: Record<ApplicationStatus, StatusStyle> = {
  applied: {
    label: "Applied",
    badge: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400",
    accent: "bg-indigo-500",
    chartColor: "#6366f1",
  },
  interviewing: {
    label: "Interviewing",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
    accent: "bg-amber-500",
    chartColor: "#f59e0b",
  },
  rejected: {
    label: "Rejected",
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
    accent: "bg-rose-500",
    chartColor: "#f43f5e",
  },
  offer: {
    label: "Offer",
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
    accent: "bg-emerald-500",
    chartColor: "#10b981",
  },
};
