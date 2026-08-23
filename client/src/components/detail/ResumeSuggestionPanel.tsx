import { useState } from "react";
import { getResumeSuggestion } from "../../api";
import type { Application, ResumeSuggestion } from "../../types";

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
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Resume Suggestion
        </h3>
        <button
          type="button"
          onClick={handleSuggest}
          disabled={loading}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {loading ? "Thinking..." : "Suggest Variant"}
        </button>
      </div>
      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      {suggestion && (
        <div className="rounded-lg bg-indigo-50 p-3 dark:bg-indigo-500/10">
          <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-400">
            {suggestion.variant}
          </p>
          <p className="mt-0.5 text-sm text-indigo-600/90 dark:text-indigo-300/80">
            {suggestion.reason}
          </p>
        </div>
      )}
    </div>
  );
}
