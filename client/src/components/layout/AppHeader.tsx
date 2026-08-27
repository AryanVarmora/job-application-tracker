import { MoonIcon, SunIcon } from "../ui/icons";
import { gradientButton, secondaryButton } from "../../lib/uiStyles";
import { GmailConnectButton } from "../gmail/GmailConnectButton";

type View = "board" | "dashboard" | "outreach";

interface Props {
  view: View;
  onViewChange: (view: View) => void;
  isDark: boolean;
  onToggleDark: () => void;
  onCreate: () => void;
  onImportEmail: () => void;
  onLogOutreach: () => void;
  onGmailScanned: () => void;
}

const VIEWS: { id: View; label: string }[] = [
  { id: "board", label: "Board" },
  { id: "dashboard", label: "Dashboard" },
  { id: "outreach", label: "Outreach" },
];

export function AppHeader({
  view,
  onViewChange,
  isDark,
  onToggleDark,
  onCreate,
  onImportEmail,
  onLogOutreach,
  onGmailScanned,
}: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/60">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-3">
        <div className="flex items-center gap-2.5">
          <span className="h-6 w-6 rounded-lg bg-gradient-to-br from-violet-500 to-blue-500 shadow-[0_0_16px_-2px_rgba(124,58,237,0.6)]" />
          <h1 className="bg-gradient-to-r from-slate-900 to-slate-600 bg-clip-text text-base font-bold tracking-tight text-transparent dark:from-white dark:to-slate-300">
            Sentinel
          </h1>
        </div>

        <nav className="ml-2 flex rounded-lg border border-slate-200/70 bg-slate-100/70 p-1 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.04]">
          {VIEWS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => onViewChange(id)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200 ${
                view === id
                  ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <GmailConnectButton onScanned={onGmailScanned} />
          <button onClick={onImportEmail} className={secondaryButton}>
            Paste Email
          </button>
          <button onClick={onLogOutreach} className={secondaryButton}>
            Log Outreach
          </button>
          <button onClick={onCreate} className={gradientButton}>
            + New Application
          </button>
          <button
            onClick={onToggleDark}
            aria-label="Toggle dark mode"
            className="rounded-lg p-2 text-slate-500 transition-all duration-300 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-slate-200"
          >
            <span
              className={`inline-block transition-transform duration-500 ${isDark ? "rotate-180" : "rotate-0"}`}
            >
              {isDark ? <SunIcon className="h-4 w-4" /> : <MoonIcon className="h-4 w-4" />}
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
