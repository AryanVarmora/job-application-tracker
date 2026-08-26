import { useState } from "react";
import { getResumeSuggestion } from "../../api";
import type { Application, ResumeSuggestion } from "../../types";
import { glassPanel } from "../../lib/uiStyles";
import { SparkleIcon } from "../ui/icons";

export function ResumeSuggestionPanel({ application }: { application: Application }) {
  const [suggestion, setSuggestion] = useState<ResumeSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSuggest() {
    setLoading(true);
    setError(null);
    try {
      setSuggestion(await getResumeSuggestion(application.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get a suggestion");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`flex flex-col gap-3 ${glassPanel} p-4`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-200">
          Resume Suggestion
        </h3>
        <button
          type="button"
          onClick={handleSuggest}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300/80 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98] disabled:opacity-60 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/[0.06]"
        >
          <SparkleIcon className="h-3 w-3 text-violet-500 dark:text-violet-400" />
          {loading ? "Thinking..." : "Suggest Variant"}
        </button>
      </div>
      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      {suggestion && (
        <div className="rounded-lg bg-gradient-to-r from-violet-500/10 to-blue-500/10 p-3 ring-1 ring-inset ring-violet-500/15 dark:ring-violet-400/15">
          <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">
            {suggestion.variant}
          </p>
          <p className="mt-0.5 text-sm text-violet-600/90 dark:text-violet-300/80">
            {suggestion.reason}
          </p>
        </div>
      )}
    </div>
  );
}
