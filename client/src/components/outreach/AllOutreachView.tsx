import { useEffect, useState } from "react";
import { getOutreachContacts, updateOutreachContact } from "../../api";
import type { OutreachContact } from "../../types";
import { PLATFORM_STYLES } from "../../lib/outreachStyles";
import { formatFullTimestamp, formatRelativeTimestamp } from "../../lib/dateUtils";
import { Badge } from "../ui/Badge";
import { EmptyState } from "../ui/EmptyState";
import { StarIcon } from "../ui/icons";
import { glassPanel } from "../../lib/uiStyles";

// Every OutreachContact regardless of lead status, most-recent first (the server already
// sorts this way and purges expired non-leads on every GET /outreach). Non-leads still
// auto-expire after 7 days server-side, so this naturally only ever shows the last 7 days
// of non-leads plus all-time leads - the banner/empty-state text below exists so that isn't
// mistaken for a bug.
export function AllOutreachView() {
  const [contacts, setContacts] = useState<OutreachContact[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getOutreachContacts()
      .then((data) => {
        if (!cancelled) setContacts(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load outreach");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggleLead(contact: OutreachContact) {
    const nextIsLead = !contact.isLead;
    setContacts(
      (prev) => prev?.map((c) => (c.id === contact.id ? { ...c, isLead: nextIsLead } : c)) ?? prev
    );
    try {
      await updateOutreachContact(contact.id, { isLead: nextIsLead });
    } catch {
      setContacts(
        (prev) => prev?.map((c) => (c.id === contact.id ? { ...c, isLead: contact.isLead } : c)) ?? prev
      );
    }
  }

  if (error) {
    return (
      <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-600 dark:text-rose-400">
        {error}
      </p>
    );
  }

  if (!contacts) {
    return <p className="text-sm text-slate-400 dark:text-slate-500">Loading...</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-slate-400 dark:text-slate-500">
        Non-lead entries are kept for 7 days, then auto-expire. Leads are kept indefinitely -
        star an entry to hang onto it.
      </p>

      {contacts.length === 0 ? (
        <div className={`${glassPanel} p-5`}>
          <EmptyState message="No outreach in the last 7 days - non-lead entries older than that have expired. Log new outreach, or star someone to keep them around indefinitely." />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className={`${glassPanel} flex items-center justify-between gap-4 p-4 transition-shadow duration-200 hover:shadow-md`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                    {contact.personName}
                  </p>
                  <Badge className={PLATFORM_STYLES[contact.platform].badge}>
                    {PLATFORM_STYLES[contact.platform].label}
                  </Badge>
                </div>
                {contact.company && (
                  <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                    {contact.company}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span
                  title={formatFullTimestamp(contact.messagedAt)}
                  className="text-xs text-slate-400 dark:text-slate-500"
                >
                  {formatRelativeTimestamp(contact.messagedAt)}
                </span>
                <button
                  type="button"
                  onClick={() => toggleLead(contact)}
                  aria-label={contact.isLead ? "Unmark as lead" : "Mark as lead"}
                  title={contact.isLead ? "Unmark as lead" : "Mark as lead"}
                  className={`rounded-lg p-1.5 transition-all duration-200 hover:bg-amber-500/10 active:scale-[0.92] ${
                    contact.isLead
                      ? "text-amber-500"
                      : "text-slate-300 hover:text-amber-500 dark:text-slate-600"
                  }`}
                >
                  <StarIcon className="h-5 w-5" filled={contact.isLead} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
