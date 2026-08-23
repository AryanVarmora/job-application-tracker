import { useState, type FormEvent } from "react";
import {
  APPLICATION_STATUSES,
  type Application,
  type ApplicationStatus,
  type CreateApplicationInput,
} from "../../types";
import { STATUS_STYLES } from "../../lib/statusStyles";

interface Props {
  initial: Application | null;
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

function toFormState(application: Application | null): CreateApplicationInput {
  if (!application) {
    return {
      companyName: "",
      role: "",
      status: "applied",
      appliedDate: todayAsLocalDateInput(),
      jobUrl: "",
      resumeVariant: "",
      notes: "",
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

const inputClasses =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-500/20";

const labelClasses = "flex flex-col gap-1 text-sm font-medium text-slate-600 dark:text-slate-300";

export function ApplicationForm({ initial, onSubmit }: Props) {
  const [form, setForm] = useState<CreateApplicationInput>(() => toFormState(initial));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof CreateApplicationInput>(
    key: K,
    value: CreateApplicationInput[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
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
      {error && (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
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
          Resume Variant
          <input
            className={inputClasses}
            value={form.resumeVariant ?? ""}
            onChange={(e) => update("resumeVariant", e.target.value)}
          />
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
      <button
        type="submit"
        disabled={submitting}
        className="self-start rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Saving..." : initial ? "Save Changes" : "Create Application"}
      </button>
    </form>
  );
}
