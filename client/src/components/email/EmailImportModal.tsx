import { useState } from "react";
import { applySuggestedStatus, parseStatusEmail } from "../../api";
import type { Application, ApplicationStatus, EmailParseResult } from "../../types";
import { Modal } from "../ui/Modal";
import { Badge } from "../ui/Badge";
import { CloseIcon } from "../ui/icons";
import { STATUS_STYLES } from "../../lib/statusStyles";
import { gradientButton, glassPanelSubtle, inputClasses, labelClasses, secondaryButton } from "../../lib/uiStyles";

interface Props {
  onClose: () => void;
  onApplied: (application: Application) => void;
  onCreateNew: (companyName: string) => void;
}

const CONFIDENCE_BADGE: Record<string, string> = {
  high: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  low: "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400",
};

function statusLabel(status: string): string {
  return STATUS_STYLES[status as ApplicationStatus]?.label ?? "Unclear";
}

export function EmailImportModal({ onClose, onApplied, onCreateNew }: Props) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [parsing, setParsing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EmailParseResult | null>(null);

  async function handleParse() {
    setParsing(true);
    setError(null);
    setResult(null);
    try {
      setResult(await parseStatusEmail(subject, body));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse email");
    } finally {
      setParsing(false);
    }
  }

  async function handleConfirm() {
    if (!result || result.matchedApplicationId === null) return;
    if (result.suggestedStatus === "unknown") return;

    setApplying(true);
    setError(null);
    try {
      const updated = await applySuggestedStatus(
        result.matchedApplicationId,
        result.suggestedStatus
      );
      onApplied(updated);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setApplying(false);
    }
  }

  function handleReject() {
    setResult(null);
  }

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-white/10">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Paste Email
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-lg p-1.5 text-slate-400 transition-all duration-200 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/[0.06] dark:hover:text-slate-300"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col gap-4 px-6 py-5">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Paste a status-update email (rejection, interview invite, offer, etc.). Nothing is
          saved until you confirm the suggested update below.
        </p>

        <label className={labelClasses}>
          Subject
          <input
            className={inputClasses}
            placeholder="e.g. Update on your application to Acme Corp"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </label>

        <label className={labelClasses}>
          Body
          <textarea
            rows={8}
            className={inputClasses}
            placeholder="Paste the raw email text here..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </label>

        {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

        <button
          type="button"
          onClick={handleParse}
          disabled={parsing || body.trim().length === 0}
          className={`self-start ${gradientButton}`}
        >
          {parsing ? "Parsing (can take up to a minute)..." : "Parse Email"}
        </button>

        {result && result.matchedApplicationId !== null && (
          <div className={`flex flex-col gap-3 ${glassPanelSubtle} p-4`}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-200">
                {result.matchedCompanyName}
              </h3>
              <Badge className={CONFIDENCE_BADGE[result.confidence]}>
                {result.confidence} confidence
              </Badge>
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <Badge className={STATUS_STYLES[result.currentStatus].badge}>
                {statusLabel(result.currentStatus)}
              </Badge>
              <span className="text-slate-400 dark:text-slate-500">&rarr;</span>
              {result.suggestedStatus === "unknown" ? (
                <Badge className="bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400">
                  Unclear from email
                </Badge>
              ) : (
                <Badge className={STATUS_STYLES[result.suggestedStatus].badge}>
                  {statusLabel(result.suggestedStatus)}
                </Badge>
              )}
            </div>

            {result.suggestedStatus === "unknown" ? (
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Couldn't confidently detect a status from this email, so there's nothing to
                confirm.
              </p>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={applying}
                  className={gradientButton}
                >
                  {applying ? "Updating..." : `Confirm → ${statusLabel(result.suggestedStatus)}`}
                </button>
                <button type="button" onClick={handleReject} disabled={applying} className={secondaryButton}>
                  Dismiss
                </button>
              </div>
            )}
          </div>
        )}

        {result && result.matchedApplicationId === null && (
          <div className={`flex flex-col gap-3 ${glassPanelSubtle} p-4`}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-200">
                {result.extractedCompanyName || "No company detected"}
              </h3>
              <Badge className={CONFIDENCE_BADGE[result.confidence]}>
                {result.confidence} confidence
              </Badge>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No existing application matched this company
              {result.detectedStatus !== "unknown"
                ? ` (detected status: ${statusLabel(result.detectedStatus)})`
                : ""}
              .
            </p>
            {result.extractedCompanyName && (
              <button
                type="button"
                onClick={() => onCreateNew(result.extractedCompanyName!)}
                className={`self-start ${gradientButton}`}
              >
                Create New Application
              </button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
