import { useState } from "react";
import { createApplication, deleteApplication, updateApplication } from "../../api";
import type { Application, CreateApplicationInput } from "../../types";
import { Modal } from "../ui/Modal";
import { CloseIcon } from "../ui/icons";
import { ApplicationForm } from "./ApplicationForm";
import { AnalyzePanel } from "./AnalyzePanel";
import { SkillBreakdown } from "./SkillBreakdown";
import { ResumeSuggestionPanel } from "./ResumeSuggestionPanel";

interface Props {
  application: Application | null; // null => creating a new application
  onClose: () => void;
  onSaved: (application: Application) => void;
  onDeleted: (id: string) => void;
}

export function ApplicationModal({ application, onClose, onSaved, onDeleted }: Props) {
  // Tracks the saved record for this modal session. Starts null in create mode and
  // flips to the created record on first save, which reveals the analyze section
  // below without needing to close and reopen the modal.
  const [current, setCurrent] = useState<Application | null>(application);
  const [deleting, setDeleting] = useState(false);

  async function handleSubmit(input: CreateApplicationInput) {
    const result = current
      ? await updateApplication(current.id, input)
      : await createApplication(input);
    setCurrent(result);
    onSaved(result);
  }

  function handleAnalyzed(updated: Application) {
    setCurrent(updated);
    onSaved(updated);
  }

  async function handleDelete() {
    if (!current) return;
    setDeleting(true);
    try {
      await deleteApplication(current.id);
      onDeleted(current.id);
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
        <h2 className="truncate text-lg font-semibold text-slate-900 dark:text-slate-100">
          {current ? `${current.company.name} — ${current.role}` : "New Application"}
        </h2>
        <div className="flex shrink-0 items-center gap-2">
          {current && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 disabled:opacity-60 dark:text-rose-400 dark:hover:bg-rose-500/10"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex max-h-[75vh] flex-col gap-5 overflow-y-auto px-6 py-5">
        <ApplicationForm initial={current} onSubmit={handleSubmit} />

        {current && (
          <>
            <hr className="border-slate-100 dark:border-slate-800" />
            <AnalyzePanel application={current} onAnalyzed={handleAnalyzed} />

            {current.matchBreakdown && (
              <>
                <SkillBreakdown breakdown={current.matchBreakdown} />
                {current.roleSummary && (
                  <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                      Summary{current.seniorityLevel ? ` · ${current.seniorityLevel}` : ""}
                    </p>
                    {current.roleSummary}
                  </div>
                )}
                <ResumeSuggestionPanel application={current} />
              </>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
