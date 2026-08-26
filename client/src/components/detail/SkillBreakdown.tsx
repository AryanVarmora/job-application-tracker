import type { MatchBreakdown } from "../../types";
import { FitScoreBadge } from "../ui/FitScoreBadge";
import { glassPanel, sectionEyebrow } from "../../lib/uiStyles";

interface ListProps {
  title: string;
  skills: string[];
  tone: "matched" | "missing";
}

const TONE_CLASSES: Record<ListProps["tone"], string> = {
  matched:
    "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-400/20",
  missing:
    "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-500/10 dark:text-rose-400 dark:ring-rose-400/20",
};

function SkillList({ title, skills, tone }: ListProps) {
  return (
    <div>
      <p className={`mb-1.5 ${sectionEyebrow}`}>
        {title} ({skills.length})
      </p>
      {skills.length === 0 ? (
        <p className="text-xs text-slate-400 dark:text-slate-500">None</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {skills.map((skill) => (
            <span
              key={skill}
              className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset transition-colors duration-200 ${TONE_CLASSES[tone]}`}
            >
              {skill}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function SkillBreakdown({ breakdown }: { breakdown: MatchBreakdown }) {
  return (
    <div className={`flex flex-col gap-4 ${glassPanel} p-4`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-200">
          Skill Match
        </h3>
        <FitScoreBadge fitScore={breakdown.fitScore} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <SkillList title="Matched Required" skills={breakdown.matchedRequired} tone="matched" />
        <SkillList title="Missing Required" skills={breakdown.missingRequired} tone="missing" />
        <SkillList title="Matched Preferred" skills={breakdown.matchedPreferred} tone="matched" />
        <SkillList title="Missing Preferred" skills={breakdown.missingPreferred} tone="missing" />
      </div>
    </div>
  );
}
