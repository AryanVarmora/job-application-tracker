import { useEffect, useState } from "react";
import { getTodayDigest } from "../../api";
import type { DigestToday } from "../../types";
import { glassPanel, sectionEyebrow } from "../../lib/uiStyles";

function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

const stats: { key: keyof DigestToday; label: string }[] = [
  { key: "applicationsCreated", label: "Applications Today" },
  { key: "rejections", label: "Rejections Today" },
  { key: "messagesSent", label: "Messages Sent Today" },
];

// Weekday-only daily digest. Renders nothing (and never fetches) on weekends.
export function DigestPanel() {
  const [digest, setDigest] = useState<DigestToday | null>(null);

  const showDigest = isWeekday(new Date());

  useEffect(() => {
    if (!showDigest) return;
    let cancelled = false;
    getTodayDigest().then((data) => {
      if (!cancelled) setDigest(data);
    });
    return () => {
      cancelled = true;
    };
  }, [showDigest]);

  if (!showDigest || !digest) return null;

  return (
    <div className={`${glassPanel} mb-4 flex flex-wrap items-center gap-x-8 gap-y-3 p-4`}>
      <p className={sectionEyebrow}>Today's Digest</p>
      <div className="flex flex-wrap gap-x-8 gap-y-2">
        {stats.map(({ key, label }) => (
          <div key={key} className="flex items-baseline gap-1.5">
            <span className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
              {digest[key]}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
