import { useState } from "react";
import { analyzeApplication } from "../../api";
import type { Application } from "../../types";
import { glassPanelSubtle, gradientButton, inputClasses } from "../../lib/uiStyles";
import { SparkleIcon } from "../ui/icons";

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
    <div className={`flex flex-col gap-3 ${glassPanelSubtle} p-4`}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-200">
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
        className={inputClasses}
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
      />
      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
      <button
        type="button"
        onClick={handleAnalyze}
        disabled={analyzing || jobDescription.trim().length === 0}
        className={`inline-flex items-center gap-1.5 self-start ${gradientButton}`}
      >
        <SparkleIcon className="h-3.5 w-3.5" />
        {analyzing ? "Analyzing (can take up to a minute)..." : "Analyze Job Description"}
      </button>
    </div>
  );
}
