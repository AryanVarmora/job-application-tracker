import { glassPanel, sectionEyebrow } from "../../lib/uiStyles";

interface Props {
  label: string;
  value: string;
  hint?: string;
}

// Shared shell for single-number dashboard cards (weekly momentum, time-to-rejection).
export function StatCard({ label, value, hint }: Props) {
  return (
    <div className={`${glassPanel} min-w-[180px] flex-1 p-5`}>
      <p className={sectionEyebrow}>{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
    </div>
  );
}
