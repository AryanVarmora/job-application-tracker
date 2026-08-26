import { useState } from "react";
import { AllOutreachView } from "./AllOutreachView";
import { LeadsView } from "./LeadsView";

type Tab = "all" | "leads";

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All Outreach" },
  { id: "leads", label: "Leads" },
];

export function OutreachView() {
  const [tab, setTab] = useState<Tab>("all");

  return (
    <div className="flex flex-col gap-4">
      <div className="inline-flex w-fit rounded-lg border border-slate-200/70 bg-slate-100/70 p-1 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
              tab === id
                ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "all" ? <AllOutreachView /> : <LeadsView />}
    </div>
  );
}
