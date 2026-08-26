import { useState } from "react";
import { AppHeader } from "./components/layout/AppHeader";
import { KanbanBoard } from "./components/kanban/KanbanBoard";
import { Dashboard } from "./components/dashboard/Dashboard";
import { DigestPanel } from "./components/dashboard/DigestPanel";
import { ApplicationModal } from "./components/detail/ApplicationModal";
import { EmailImportModal } from "./components/email/EmailImportModal";
import { LogOutreachModal } from "./components/outreach/LogOutreachModal";
import { LeadsView } from "./components/outreach/LeadsView";
import { GmailSuggestionsPanel } from "./components/gmail/GmailSuggestionsPanel";
import { useApplications } from "./hooks/useApplications";
import { useDarkMode } from "./hooks/useDarkMode";
import { updateApplication } from "./api";
import type { Application, ApplicationStatus } from "./types";

type View = "board" | "dashboard" | "leads";

type ModalState =
  | { mode: "create"; prefillCompanyName?: string; prefillStatus?: ApplicationStatus }
  | { mode: "edit"; application: Application }
  | null;

function App() {
  const { applications, loading, error, upsert, remove, reload } = useApplications();
  const { isDark, toggle } = useDarkMode();
  const [view, setView] = useState<View>("board");
  const [modalState, setModalState] = useState<ModalState>(null);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [outreachModalOpen, setOutreachModalOpen] = useState(false);
  // Bumped whenever a new outreach contact is logged as a lead, so a mounted LeadsView
  // (via its key) refetches instead of showing stale data.
  const [leadsRefreshToken, setLeadsRefreshToken] = useState(0);
  // Same remount-to-refetch pattern, bumped after a Gmail scan completes.
  const [gmailRefreshToken, setGmailRefreshToken] = useState(0);

  function openApplication(id: string) {
    const application = applications.find((a) => a.id === id);
    if (application) setModalState({ mode: "edit", application });
  }

  function openCreateWithStatus(status: ApplicationStatus) {
    setModalState({ mode: "create", prefillStatus: status });
  }

  async function handleStatusChange(id: string, status: ApplicationStatus) {
    const application = applications.find((a) => a.id === id);
    if (!application) return;

    upsert({ ...application, status }); // optimistic move, reconciled below
    try {
      upsert(await updateApplication(id, { status }));
    } catch {
      reload();
    }
  }

  return (
    <div className="min-h-screen text-slate-900 selection:bg-violet-500/30 dark:text-slate-100">
      <AppHeader
        view={view}
        onViewChange={setView}
        isDark={isDark}
        onToggleDark={toggle}
        onCreate={() => setModalState({ mode: "create" })}
        onImportEmail={() => setEmailModalOpen(true)}
        onLogOutreach={() => setOutreachModalOpen(true)}
        onGmailScanned={() => {
          // A scan can auto-apply status changes or auto-create applications directly
          // (bypassing the suggestions list, which only shows medium/low-confidence
          // guesses) - reload so those show up on the board without a manual refresh.
          setGmailRefreshToken((t) => t + 1);
          reload();
        }}
      />

      <main className="mx-auto max-w-7xl px-6 py-6">
        {error && (
          <p className="mb-4 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-sm text-rose-600 backdrop-blur-sm dark:text-rose-400">
            {error}
          </p>
        )}

        <DigestPanel />
        <GmailSuggestionsPanel key={gmailRefreshToken} onApplied={upsert} />

        {loading ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">Loading...</p>
        ) : (
          <div key={view} className="animate-fade-in">
            {view === "board" && (
              <KanbanBoard
                applications={applications}
                onOpen={openApplication}
                onStatusChange={handleStatusChange}
                onQuickAdd={openCreateWithStatus}
              />
            )}
            {view === "dashboard" && <Dashboard applications={applications} isDark={isDark} />}
            {view === "leads" && <LeadsView key={leadsRefreshToken} />}
          </div>
        )}
      </main>

      {modalState && (
        <ApplicationModal
          application={modalState.mode === "edit" ? modalState.application : null}
          prefillCompanyName={
            modalState.mode === "create" ? modalState.prefillCompanyName : undefined
          }
          prefillStatus={modalState.mode === "create" ? modalState.prefillStatus : undefined}
          onClose={() => setModalState(null)}
          onSaved={upsert}
          onDeleted={(id) => {
            remove(id);
            setModalState(null);
          }}
        />
      )}

      {emailModalOpen && (
        <EmailImportModal
          onClose={() => setEmailModalOpen(false)}
          onApplied={upsert}
          onCreateNew={(companyName) => {
            setEmailModalOpen(false);
            setModalState({ mode: "create", prefillCompanyName: companyName });
          }}
        />
      )}

      {outreachModalOpen && (
        <LogOutreachModal
          onClose={() => setOutreachModalOpen(false)}
          onLogged={(contact) => {
            if (contact.isLead) setLeadsRefreshToken((t) => t + 1);
          }}
        />
      )}
    </div>
  );
}

export default App;
