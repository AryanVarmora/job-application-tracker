import { useDroppable } from "@dnd-kit/core";
import type { Application, ApplicationStatus } from "../../types";
import { STATUS_STYLES } from "../../lib/statusStyles";
import { ApplicationCard } from "./ApplicationCard";
import { InboxIcon, PlusIcon } from "../ui/icons";

interface Props {
  status: ApplicationStatus;
  applications: Application[];
  onOpen: (id: string) => void;
  onQuickAdd: (status: ApplicationStatus) => void;
}

export function KanbanColumn({ status, applications, onOpen, onQuickAdd }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const { label, accent, barGradient } = STATUS_STYLES[status];

  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200/60 bg-slate-100/50 backdrop-blur-md transition-all duration-200 dark:border-white/[0.06] dark:bg-white/[0.02] ${
        isOver
          ? "border-violet-400/50 bg-violet-500/[0.06] shadow-[0_0_0_1px_rgba(139,92,246,0.25),0_12px_30px_-10px_rgba(139,92,246,0.4)] dark:border-violet-400/40"
          : ""
      }`}
    >
      <div className={`h-[3px] w-full shrink-0 bg-gradient-to-r ${barGradient}`} />
      <div className="flex flex-1 flex-col p-3">
        <div className="mb-3 flex items-center gap-2 px-1">
          <span className={`h-2 w-2 shrink-0 rounded-full animate-pulse ${accent}`} />
          <h2 className="text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-200">
            {label}
          </h2>
          <span className="ml-auto rounded-full border border-slate-200/70 bg-white/80 px-2 py-0.5 text-xs font-medium text-slate-500 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-400">
            {applications.length}
          </span>
        </div>
        <div className="flex flex-1 flex-col gap-2">
          {applications.map((application) => (
            <ApplicationCard key={application.id} application={application} onOpen={onOpen} />
          ))}
          {applications.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300/70 p-6 text-center opacity-70 dark:border-white/10">
              <InboxIcon className="h-5 w-5 text-slate-300 dark:text-slate-600" />
              <p className="text-xs text-slate-400 dark:text-slate-500">No applications</p>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => onQuickAdd(status)}
          className="mt-2 flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300/70 py-2 text-xs font-medium text-slate-400 transition-all duration-200 hover:border-violet-400/50 hover:bg-violet-500/[0.06] hover:text-violet-600 active:scale-[0.98] dark:border-white/10 dark:text-slate-500 dark:hover:border-violet-400/40 dark:hover:bg-violet-500/[0.08] dark:hover:text-violet-300"
        >
          <PlusIcon className="h-3.5 w-3.5" />
          Add
        </button>
      </div>
    </div>
  );
}
