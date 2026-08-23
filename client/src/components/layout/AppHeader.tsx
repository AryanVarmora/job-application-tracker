import { MoonIcon, SunIcon } from "../ui/icons";

type View = "board" | "dashboard";

interface Props {
  view: View;
  onViewChange: (view: View) => void;
  isDark: boolean;
  onToggleDark: () => void;
  onCreate: () => void;
}

const VIEWS: { id: View; label: string }[] = [
  { id: "board", label: "Board" },
  { id: "dashboard", label: "Dashboard" },
];

export function AppHeader({ view, onViewChange, isDark, onToggleDark, onCreate }: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-3">
        <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
          Job Tracker
        </h1>

        <nav className="ml-2 flex rounded-lg bg-slate-100 p-1 dark:bg-slate-900">
          {VIEWS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => onViewChange(id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                view === id
                  ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={onCreate}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
          >
            + New Application
          </button>
          <button
            onClick={onToggleDark}
            aria-label="Toggle dark mode"
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          >
            {isDark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}
