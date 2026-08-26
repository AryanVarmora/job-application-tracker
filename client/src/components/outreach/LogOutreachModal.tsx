import { useState, type FormEvent } from "react";
import { createOutreachContact } from "../../api";
import { OUTREACH_PLATFORMS, type OutreachContact, type OutreachPlatform } from "../../types";
import { Modal } from "../ui/Modal";
import { CloseIcon } from "../ui/icons";
import { PLATFORM_STYLES } from "../../lib/outreachStyles";
import { gradientButton, inputClasses, labelClasses } from "../../lib/uiStyles";

interface Props {
  onClose: () => void;
  onLogged: (contact: OutreachContact) => void;
}

// Deliberately terse: name + platform (pre-selected to LinkedIn) is the entire fast
// path - type a name, hit Enter. Everything else lives behind "+ Add details" so it
// never slows down the common case of logging a DM you just sent.
export function LogOutreachModal({ onClose, onLogged }: Props) {
  const [personName, setPersonName] = useState("");
  const [platform, setPlatform] = useState<OutreachPlatform>("linkedin");
  const [showDetails, setShowDetails] = useState(false);
  const [company, setCompany] = useState("");
  const [messagedAt, setMessagedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [isLead, setIsLead] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!personName.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const contact = await createOutreachContact({
        personName: personName.trim(),
        platform,
        company: company.trim() || undefined,
        messagedAt: messagedAt || undefined,
        notes: notes.trim() || undefined,
        isLead,
      });
      onLogged(contact);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log outreach");
      setSubmitting(false);
    }
  }

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-white/10">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Log Outreach
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

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-6 py-5">
        <label className={labelClasses}>
          Name
          {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
          <input
            autoFocus
            required
            className={inputClasses}
            placeholder="Who did you message?"
            value={personName}
            onChange={(e) => setPersonName(e.target.value)}
          />
        </label>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Platform</span>
          <div className="flex gap-2">
            {OUTREACH_PLATFORMS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPlatform(p)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                  platform === p
                    ? `${PLATFORM_STYLES[p].badge} ring-2 ring-offset-1 ring-offset-white dark:ring-offset-slate-900`
                    : "border border-slate-200/70 text-slate-500 hover:bg-slate-100 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/[0.06]"
                }`}
              >
                {PLATFORM_STYLES[p].label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowDetails((v) => !v)}
          className="self-start text-xs font-medium text-slate-400 underline-offset-2 hover:text-violet-600 hover:underline dark:text-slate-500 dark:hover:text-violet-300"
        >
          {showDetails ? "Hide details" : "+ Add details (optional)"}
        </button>

        {showDetails && (
          <div className="flex flex-col gap-3 rounded-lg border border-slate-200/70 p-3 dark:border-white/10">
            <div className="grid grid-cols-2 gap-3">
              <label className={labelClasses}>
                Company
                <input
                  className={inputClasses}
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                />
              </label>
              <label className={labelClasses}>
                Messaged On
                <input
                  type="date"
                  className={inputClasses}
                  value={messagedAt}
                  onChange={(e) => setMessagedAt(e.target.value)}
                />
              </label>
            </div>
            <label className={labelClasses}>
              Notes
              <textarea
                rows={2}
                className={inputClasses}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={isLead}
                onChange={(e) => setIsLead(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 accent-violet-600 dark:border-white/20"
              />
              Mark as a lead (kept indefinitely; non-leads auto-expire after 7 days)
            </label>
          </div>
        )}

        {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !personName.trim()}
          className={`self-start ${gradientButton}`}
        >
          {submitting ? "Logging..." : "Log Outreach"}
        </button>
      </form>
    </Modal>
  );
}
