import { useEffect, useState } from "react";
import { getOutreachContacts, updateOutreachContact } from "../../api";
import type { OutreachContact } from "../../types";
import { PLATFORM_STYLES } from "../../lib/outreachStyles";
import { formatFullTimestamp, formatRelativeTimestamp } from "../../lib/dateUtils";
import { Badge } from "../ui/Badge";
import { EmptyState } from "../ui/EmptyState";
import { glassPanel, secondaryButton } from "../../lib/uiStyles";

// Leads (isLead=true) are the outreach contacts worth remembering long-term - everything
// else auto-expires after 7 days server-side, so this view only ever shows the ones that
// were explicitly starred.
export function LeadsView() {
  const [leads, setLeads] = useState<OutreachContact[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getOutreachContacts(true)
      .then((data) => {
        if (!cancelled) setLeads(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load leads");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleUnmark(id: string) {
    setLeads((prev) => prev?.filter((lead) => lead.id !== id) ?? prev);
    try {
      await updateOutreachContact(id, { isLead: false });
    } catch {
      getOutreachContacts(true).then(setLeads);
    }
  }

  if (error) {
    return (
      <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-600 dark:text-rose-400">
        {error}
      </p>
    );
  }

  if (!leads) {
    return <p className="text-sm text-slate-400 dark:text-slate-500">Loading...</p>;
  }

  if (leads.length === 0) {
    return (
      <div className={`${glassPanel} p-5`}>
        <EmptyState message="No leads yet — mark outreach worth remembering when you log it" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {leads.map((lead) => (
        <div
          key={lead.id}
          className={`${glassPanel} flex items-center justify-between gap-4 p-4 transition-shadow duration-200 hover:shadow-md`}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                {lead.personName}
              </p>
              <Badge className={PLATFORM_STYLES[lead.platform].badge}>
                {PLATFORM_STYLES[lead.platform].label}
              </Badge>
            </div>
            {lead.company && (
              <p className="truncate text-sm text-slate-500 dark:text-slate-400">{lead.company}</p>
            )}
            {lead.notes && (
              <p className="mt-1 truncate text-xs text-slate-400 dark:text-slate-500">{lead.notes}</p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <span
              title={formatFullTimestamp(lead.messagedAt)}
              className="text-xs text-slate-400 dark:text-slate-500"
            >
              {formatRelativeTimestamp(lead.messagedAt)}
            </span>
            <button type="button" onClick={() => handleUnmark(lead.id)} className={secondaryButton}>
              Unmark
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
