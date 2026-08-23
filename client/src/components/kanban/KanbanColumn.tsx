import { useDroppable } from "@dnd-kit/core";
import type { Application, ApplicationStatus } from "../../types";
import { STATUS_STYLES } from "../../lib/statusStyles";
import { ApplicationCard } from "./ApplicationCard";

interface Props {
  status: ApplicationStatus;
  applications: Application[];
  onOpen: (id: string) => void;
}

export function KanbanColumn({ status, applications, onOpen }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const { label, accent } = STATUS_STYLES[status];

  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-2xl bg-slate-100/70 p-3 transition dark:bg-slate-800/40 ${
        isOver ? "ring-2 ring-indigo-400 dark:ring-indigo-500" : ""
      }`}
    >
      <div className="mb-3 flex items-center gap-2 px-1">
        <span className={`h-2 w-2 rounded-full ${accent}`} />
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{label}</h2>
        <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500 shadow-sm dark:bg-slate-900 dark:text-slate-400">
          {applications.length}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        {applications.map((application) => (
          <ApplicationCard key={application.id} application={application} onOpen={onOpen} />
        ))}
        {applications.length === 0 && (
          <p className="rounded-lg border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400 dark:border-slate-700 dark:text-slate-500">
            No applications
          </p>
        )}
      </div>
    </div>
  );
}
