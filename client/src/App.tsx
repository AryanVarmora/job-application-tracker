import { useState } from "react";
import { AppHeader } from "./components/layout/AppHeader";
import { KanbanBoard } from "./components/kanban/KanbanBoard";
import { Dashboard } from "./components/dashboard/Dashboard";
import { ApplicationModal } from "./components/detail/ApplicationModal";
import { useApplications } from "./hooks/useApplications";
import { useDarkMode } from "./hooks/useDarkMode";
import { updateApplication } from "./api";
import type { Application, ApplicationStatus } from "./types";

type ModalState = { mode: "create" } | { mode: "edit"; application: Application } | null;

function App() {
  const { applications, loading, error, upsert, remove, reload } = useApplications();
  const { isDark, toggle } = useDarkMode();
  const [view, setView] = useState<"board" | "dashboard">("board");
  const [modalState, setModalState] = useState<ModalState>(null);

  function openApplication(id: string) {
    const application = applications.find((a) => a.id === id);
    if (application) setModalState({ mode: "edit", application });
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
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <AppHeader
        view={view}
        onViewChange={setView}
        isDark={isDark}
        onToggleDark={toggle}
        onCreate={() => setModalState({ mode: "create" })}
      />

      <main className="mx-auto max-w-7xl px-6 py-6">
        {error && (
          <p className="mb-4 rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">Loading...</p>
        ) : view === "board" ? (
          <KanbanBoard
            applications={applications}
            onOpen={openApplication}
            onStatusChange={handleStatusChange}
          />
        ) : (
          <Dashboard applications={applications} isDark={isDark} />
        )}
      </main>

      {modalState && (
        <ApplicationModal
          application={modalState.mode === "edit" ? modalState.application : null}
          onClose={() => setModalState(null)}
          onSaved={upsert}
          onDeleted={(id) => {
            remove(id);
            setModalState(null);
          }}
        />
      )}
    </div>
  );
}

export default App;
