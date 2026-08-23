import type { Application } from "../../types";
import { FitScoreBadge } from "../ui/FitScoreBadge";

// Pure presentational card body, with no drag hooks attached. Kept separate from
// ApplicationCard so it can also be rendered inside <DragOverlay> without registering
// a second draggable node under the same id.
export function ApplicationCardContent({ application }: { application: Application }) {
  return (
    <div className="cursor-pointer rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
      <p className="truncate font-semibold text-slate-900 dark:text-slate-100">
        {application.company.name}
      </p>
      <p className="truncate text-sm text-slate-500 dark:text-slate-400">{application.role}</p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <FitScoreBadge fitScore={application.fitScore} />
        <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">
          {new Date(application.appliedDate).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>
    </div>
  );
}
