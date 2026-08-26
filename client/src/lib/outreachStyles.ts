import type { OutreachPlatform } from "../types";

interface PlatformStyle {
  label: string;
  badge: string;
}

export const PLATFORM_STYLES: Record<OutreachPlatform, PlatformStyle> = {
  linkedin: {
    label: "LinkedIn",
    badge:
      "bg-gradient-to-r from-sky-500/15 to-blue-500/15 text-sky-600 ring-1 ring-inset ring-sky-500/20 dark:from-sky-500/20 dark:to-blue-500/20 dark:text-sky-300 dark:ring-sky-400/20",
  },
  email: {
    label: "Email",
    badge:
      "bg-gradient-to-r from-violet-500/15 to-purple-500/15 text-violet-600 ring-1 ring-inset ring-violet-500/20 dark:from-violet-500/20 dark:to-purple-500/20 dark:text-violet-300 dark:ring-violet-400/20",
  },
  other: {
    label: "Other",
    badge:
      "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200 dark:bg-white/5 dark:text-slate-400 dark:ring-white/10",
  },
};
