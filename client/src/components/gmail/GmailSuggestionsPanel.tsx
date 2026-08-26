import { useEffect, useState } from "react";
import { confirmGmailSuggestion, getGmailSuggestions, rejectGmailSuggestion } from "../../api";
import type { Application, GmailSuggestion } from "../../types";
import { Badge } from "../ui/Badge";
import { STATUS_STYLES } from "../../lib/statusStyles";
import { CONFIDENCE_BADGE } from "../../lib/confidenceStyles";
import { formatFullDate } from "../../lib/dateUtils";
import { glassPanel, gradientButton, secondaryButton, sectionEyebrow } from "../../lib/uiStyles";

interface Props {
  onApplied: (application: Application) => void;
}

function SuggestionContent({ suggestion }: { suggestion: GmailSuggestion }) {
  if (suggestion.type === "new_application") {
    return (
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300">
          New
        </Badge>
        <span className="font-semibold text-slate-700 dark:text-slate-200">
          {suggestion.companyName}
        </span>
        <span className="text-slate-500 dark:text-slate-400">{suggestion.role}</span>
        {suggestion.appliedDate && (
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Applied {formatFullDate(suggestion.appliedDate)}
          </span>
        )}
        <Badge className={CONFIDENCE_BADGE[suggestion.confidence]}>
          {suggestion.confidence} confidence
        </Badge>
      </div>
    );
  }

  const application = suggestion.application!;
  const suggestedStatus = suggestion.suggestedStatus!;
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="font-semibold text-slate-700 dark:text-slate-200">
        {application.company.name}
      </span>
      <Badge className={STATUS_STYLES[application.status].badge}>
        {STATUS_STYLES[application.status].label}
      </Badge>
      <span className="text-slate-400 dark:text-slate-500">&rarr;</span>
      <Badge className={STATUS_STYLES[suggestedStatus].badge}>
        {STATUS_STYLES[suggestedStatus].label}
      </Badge>
      <Badge className={CONFIDENCE_BADGE[suggestion.confidence]}>
        {suggestion.confidence} confidence
      </Badge>
    </div>
  );
}

// Reuses the same confirm/reject pattern as EmailImportModal, but as a persistent list
// (rather than one ephemeral parse result) since POST /gmail/scan can leave several pending
// suggestions behind a single "Scan Gmail" click. Renders nothing once the list is empty.
// Two suggestion shapes share this list: status_update (a status change for an application
// already on the board) and new_application (no existing application matched, but the email
// reads like a fresh "you applied" confirmation) - see SuggestionContent above.
export function GmailSuggestionsPanel({ onApplied }: Props) {
  const [suggestions, setSuggestions] = useState<GmailSuggestion[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getGmailSuggestions().then((data) => {
      if (!cancelled) setSuggestions(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleConfirm(suggestion: GmailSuggestion) {
    setBusyId(suggestion.id);
    setError(null);
    try {
      const application = await confirmGmailSuggestion(suggestion.id);
      onApplied(application);
      setSuggestions((prev) => prev?.filter((s) => s.id !== suggestion.id) ?? prev);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply suggestion");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(suggestion: GmailSuggestion) {
    setBusyId(suggestion.id);
    setError(null);
    try {
      await rejectGmailSuggestion(suggestion.id);
      setSuggestions((prev) => prev?.filter((s) => s.id !== suggestion.id) ?? prev);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to dismiss suggestion");
    } finally {
      setBusyId(null);
    }
  }

  if (!suggestions || suggestions.length === 0) return null;

  return (
    <div className={`${glassPanel} mb-4 flex flex-col gap-3 p-4`}>
      <p className={sectionEyebrow}>Gmail Suggestions</p>
      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      {suggestions.map((suggestion) => (
        <div
          key={suggestion.id}
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50/80 p-3 dark:bg-white/[0.03]"
        >
          <SuggestionContent suggestion={suggestion} />
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => handleConfirm(suggestion)}
              disabled={busyId === suggestion.id}
              className={gradientButton}
            >
              {suggestion.type === "new_application" ? "Add to Board" : "Confirm"}
            </button>
            <button
              type="button"
              onClick={() => handleReject(suggestion)}
              disabled={busyId === suggestion.id}
              className={secondaryButton}
            >
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
