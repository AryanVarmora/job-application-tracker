import { useState } from "react";
import { analyzeApplication } from "../../api";
import type { Application } from "../../types";

interface Props {
  application: Application;
  onAnalyzed: (updated: Application) => void;
}

export function AnalyzePanel({ application, onAnalyzed }: Props) {
  const [jobDescription, setJobDescription] = useState(application.jobDescriptionText ?? "");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    setAnalyzing(true);
    setError(null);
    try {
      const updated = await analyzeApplication(application.id, jobDescription);
      onAnalyzed(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Job Description Analysis
        </h3>
        {application.analyzedAt && (
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Last analyzed {new Date(application.analyzedAt).toLocaleString()}
          </span>
        )}
      </div>
      <textarea
        rows={6}
        placeholder="Paste the job description here..."
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-500/20"
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
      />
      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      <button
        type="button"
        onClick={handleAnalyze}
        disabled={analyzing || jobDescription.trim().length === 0}
        className="self-start rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-indigo-600 dark:hover:bg-indigo-500"
      >
        {analyzing ? "Analyzing (can take up to a minute)..." : "Analyze Job Description"}
      </button>
    </div>
  );
}
