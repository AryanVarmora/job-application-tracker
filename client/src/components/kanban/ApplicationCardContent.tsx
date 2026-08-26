import type { Application } from "../../types";
import { FitScoreBadge } from "../ui/FitScoreBadge";
import { ResumeVariantBadge } from "../ui/ResumeVariantBadge";
import { LinkIcon } from "../ui/icons";
import { formatFullDate, formatRelativeDate } from "../../lib/dateUtils";

// Pure presentational card body, with no drag hooks attached. Kept separate from
// ApplicationCard so it can also be rendered inside <DragOverlay> without registering
// a second draggable node under the same id.
export function ApplicationCardContent({ application }: { application: Application }) {
  return (
    <div className="cursor-pointer rounded-xl border border-slate-200/70 bg-white/90 p-3 shadow-sm backdrop-blur-sm transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-violet-300/60 hover:shadow-lg hover:shadow-violet-500/10 dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-violet-400/30 dark:hover:bg-white/[0.06] dark:hover:shadow-violet-500/10">
      <p className="truncate font-semibold tracking-tight text-slate-900 dark:text-slate-100">
        {application.company.name}
      </p>
      <p className="truncate text-sm text-slate-500 dark:text-slate-400">{application.role}</p>
      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {application.analyzeEnabled && <FitScoreBadge fitScore={application.fitScore} />}
          {application.resumeVariant && <ResumeVariantBadge variant={application.resumeVariant} />}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {application.jobUrl && (
            <a
              href={application.jobUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              aria-label="Open job posting"
              className="rounded-md p-1 text-slate-400 transition-colors duration-200 hover:bg-slate-100 hover:text-violet-600 dark:text-slate-500 dark:hover:bg-white/[0.06] dark:hover:text-violet-300"
            >
              <LinkIcon className="h-3.5 w-3.5" />
            </a>
          )}
          <span
            title={formatFullDate(application.appliedDate)}
            className="text-xs text-slate-400 dark:text-slate-500"
          >
            {formatRelativeDate(application.appliedDate)}
          </span>
        </div>
      </div>
    </div>
  );
}
