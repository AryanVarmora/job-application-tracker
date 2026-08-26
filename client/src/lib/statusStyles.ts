import type { ApplicationStatus } from "../types";

interface StatusStyle {
  label: string;
  badge: string;
  accent: string;
  chartColor: string;
  barGradient: string;
}

export const STATUS_STYLES: Record<ApplicationStatus, StatusStyle> = {
  applied: {
    label: "Applied",
    badge:
      "bg-gradient-to-r from-indigo-500/15 to-blue-500/15 text-indigo-600 ring-1 ring-inset ring-indigo-500/20 dark:from-indigo-500/20 dark:to-blue-500/20 dark:text-indigo-300 dark:ring-indigo-400/20",
    accent: "bg-indigo-400 shadow-[0_0_0_3px_rgba(99,102,241,0.15),0_0_9px_1px_rgba(99,102,241,0.7)]",
    chartColor: "#6366f1",
    barGradient: "from-indigo-500 to-blue-500",
  },
  interviewing: {
    label: "Interviewing",
    badge:
      "bg-gradient-to-r from-amber-500/15 to-orange-500/15 text-amber-600 ring-1 ring-inset ring-amber-500/20 dark:from-amber-500/20 dark:to-orange-500/20 dark:text-amber-300 dark:ring-amber-400/20",
    accent: "bg-amber-400 shadow-[0_0_0_3px_rgba(245,158,11,0.15),0_0_9px_1px_rgba(245,158,11,0.7)]",
    chartColor: "#f59e0b",
    barGradient: "from-amber-500 to-orange-500",
  },
  rejected: {
    label: "Rejected",
    badge:
      "bg-gradient-to-r from-rose-500/15 to-pink-500/15 text-rose-600 ring-1 ring-inset ring-rose-500/20 dark:from-rose-500/20 dark:to-pink-500/20 dark:text-rose-300 dark:ring-rose-400/20",
    accent: "bg-rose-400 shadow-[0_0_0_3px_rgba(244,63,94,0.15),0_0_9px_1px_rgba(244,63,94,0.7)]",
    chartColor: "#f43f5e",
    barGradient: "from-rose-500 to-pink-500",
  },
  offer: {
    label: "Offer",
    badge:
      "bg-gradient-to-r from-emerald-500/15 to-teal-500/15 text-emerald-600 ring-1 ring-inset ring-emerald-500/20 dark:from-emerald-500/20 dark:to-teal-500/20 dark:text-emerald-300 dark:ring-emerald-400/20",
    accent: "bg-emerald-400 shadow-[0_0_0_3px_rgba(16,185,129,0.15),0_0_9px_1px_rgba(16,185,129,0.7)]",
    chartColor: "#10b981",
    barGradient: "from-emerald-500 to-teal-500",
  },
};
