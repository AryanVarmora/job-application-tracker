import { useState, type FormEvent, type KeyboardEvent } from "react";
import { parseJobUrl } from "../../api";
import {
  APPLICATION_STATUSES,
  type Application,
  type ApplicationStatus,
  type CreateApplicationInput,
} from "../../types";
import { STATUS_STYLES } from "../../lib/statusStyles";
import { RESUME_VARIANT_OPTIONS } from "../../lib/resumeVariants";
import { gradientButton, inputClasses, labelClasses, secondaryButton } from "../../lib/uiStyles";
import { LinkIcon } from "../ui/icons";

interface Props {
  initial: Application | null;
  prefillCompanyName?: string;
  prefillStatus?: ApplicationStatus;
  onSubmit: (input: CreateApplicationInput) => Promise<void>;
}

// A <input type="date"> needs the browser's local calendar date. Date#toISOString()
// always renders UTC, which rolls over to tomorrow for any timezone behind UTC once
// it's late enough in the local day — this builds the date from local components instead.
function todayAsLocalDateInput(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

function toFormState(
  application: Application | null,
  prefillCompanyName?: string,
  prefillStatus?: ApplicationStatus
): CreateApplicationInput {
  if (!application) {
    return {
      companyName: prefillCompanyName ?? "",
      role: "",
      status: prefillStatus ?? "applied",
      appliedDate: todayAsLocalDateInput(),
      jobUrl: "",
      resumeVariant: "",
      notes: "",
      analyzeEnabled: false,
    };
  }
  return {
    companyName: application.company.name,
    industry: application.company.industry ?? "",
    companySize: application.company.size ?? "",
    role: application.role,
    status: application.status,
    appliedDate: application.appliedDate.slice(0, 10),
    jobUrl: application.jobUrl ?? "",
    resumeVariant: application.resumeVariant ?? "",
    notes: application.notes ?? "",
    analyzeEnabled: application.analyzeEnabled,
  };
}

// The server rejects "" for optional-but-non-empty fields (industry, companySize,
// resumeVariant) — it only allows them to be absent. Blank inputs must become
// undefined so JSON.stringify drops the key instead of sending an empty string.
function toPayload(form: CreateApplicationInput): CreateApplicationInput {
  return {
    ...form,
    industry: form.industry || undefined,
    companySize: form.companySize || undefined,
    resumeVariant: form.resumeVariant || undefined,
  };
}

export function ApplicationForm({ initial, prefillCompanyName, prefillStatus, onSubmit }: Props) {
  const [form, setForm] = useState<CreateApplicationInput>(() =>
    toFormState(initial, prefillCompanyName, prefillStatus)
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [jobUrlInput, setJobUrlInput] = useState("");
  const [fetchingUrl, setFetchingUrl] = useState(false);
  const [urlFetchError, setUrlFetchError] = useState<string | null>(null);

  function update<K extends keyof CreateApplicationInput>(
    key: K,
    value: CreateApplicationInput[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleFetchDetails() {
    const url = jobUrlInput.trim();
    if (!url) return;
    setFetchingUrl(true);
    setUrlFetchError(null);
    try {
      const extraction = await parseJobUrl(url);
      setForm((prev) => ({
        ...prev,
        companyName: extraction.companyName || prev.companyName,
        role: extraction.role || prev.role,
        jobUrl: url,
        notes: extraction.jobDescriptionText || prev.notes,
      }));
    } catch (err) {
      setUrlFetchError(err instanceof Error ? err.message : "Couldn't fetch that URL");
    } finally {
      setFetchingUrl(false);
    }
  }

  function handleJobUrlInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleFetchDetails();
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(toPayload(form));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save application");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {!initial && (
        <div className="flex flex-col gap-2 rounded-lg border border-dashed border-slate-300/80 p-3 dark:border-white/10">
          <label className={labelClasses}>
            Paste job URL
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://company.com/careers/role"
                className={inputClasses}
                value={jobUrlInput}
                onChange={(e) => setJobUrlInput(e.target.value)}
                onKeyDown={handleJobUrlInputKeyDown}
              />
              <button
                type="button"
                onClick={handleFetchDetails}
                disabled={fetchingUrl || jobUrlInput.trim().length === 0}
                className={`inline-flex shrink-0 items-center gap-1.5 ${secondaryButton}`}
              >
                <LinkIcon className="h-3.5 w-3.5" />
                {fetchingUrl ? "Fetching..." : "Fetch details"}
              </button>
            </div>
          </label>
          {urlFetchError && (
            <p className="text-sm text-rose-600 dark:text-rose-400">{urlFetchError}</p>
          )}
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Fills in company, role, job URL, and notes below from the posting — review before
            saving. If it fails, just fill in the form manually.
          </p>
        </div>
      )}
      {error && (
        <p className="rounded-lg border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <label className={labelClasses}>
          Company
          <input
            required
            className={inputClasses}
            value={form.companyName}
            onChange={(e) => update("companyName", e.target.value)}
          />
        </label>
        <label className={labelClasses}>
          Role
          <input
            required
            className={inputClasses}
            value={form.role}
            onChange={(e) => update("role", e.target.value)}
          />
        </label>
        <label className={labelClasses}>
          Status
          <select
            className={inputClasses}
            value={form.status}
            onChange={(e) => update("status", e.target.value as ApplicationStatus)}
          >
            {APPLICATION_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_STYLES[s].label}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClasses}>
          Applied Date
          <input
            type="date"
            required
            className={inputClasses}
            value={form.appliedDate}
            onChange={(e) => update("appliedDate", e.target.value)}
          />
        </label>
        <label className={labelClasses}>
          Industry
          <input
            className={inputClasses}
            value={form.industry ?? ""}
            onChange={(e) => update("industry", e.target.value)}
          />
        </label>
        <label className={labelClasses}>
          Company Size
          <input
            className={inputClasses}
            value={form.companySize ?? ""}
            onChange={(e) => update("companySize", e.target.value)}
          />
        </label>
        <label className={labelClasses}>
          Job URL
          <input
            className={inputClasses}
            value={form.jobUrl ?? ""}
            onChange={(e) => update("jobUrl", e.target.value)}
          />
        </label>
        <label className={labelClasses}>
          Resume Used
          <input
            list="resume-variant-options"
            placeholder="e.g. SWE"
            className={inputClasses}
            value={form.resumeVariant ?? ""}
            onChange={(e) => update("resumeVariant", e.target.value)}
          />
          <datalist id="resume-variant-options">
            {RESUME_VARIANT_OPTIONS.map((variant) => (
              <option key={variant} value={variant} />
            ))}
          </datalist>
        </label>
        <label className={`${labelClasses} col-span-2`}>
          Notes
          <textarea
            rows={3}
            className={inputClasses}
            value={form.notes ?? ""}
            onChange={(e) => update("notes", e.target.value)}
          />
        </label>
      </div>

      <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200/80 px-3 py-2.5 dark:border-white/10">
        <span className="flex flex-col">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
            Analyze fit with AI
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            When off, no job description analysis runs and no fit score is shown.
          </span>
        </span>
        <input
          type="checkbox"
          role="switch"
          aria-checked={form.analyzeEnabled ?? false}
          className="h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full bg-slate-300 transition-colors duration-200 before:block before:h-4 before:w-4 before:translate-x-0.5 before:translate-y-0.5 before:rounded-full before:bg-white before:shadow-sm before:transition-transform before:duration-200 checked:bg-gradient-to-r checked:from-violet-600 checked:to-blue-600 checked:before:translate-x-[18px] dark:bg-white/10"
          checked={form.analyzeEnabled ?? false}
          onChange={(e) => update("analyzeEnabled", e.target.checked)}
        />
      </label>

      <button type="submit" disabled={submitting} className={`self-start ${gradientButton}`}>
        {submitting ? "Saving..." : initial ? "Save Changes" : "Create Application"}
      </button>
    </form>
  );
}
