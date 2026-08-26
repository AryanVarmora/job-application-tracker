import { useEffect, useState } from "react";
import { getGoogleAuthStatus, getGoogleConnectUrl, scanGmail } from "../../api";
import type { GmailScanSummary } from "../../types";
import { secondaryButton } from "../../lib/uiStyles";

interface Props {
  onScanned: () => void;
}

// Always says something concrete, even "found nothing" - a bare success/error split left
// "the scan ran but found 0 candidates" indistinguishable from "the scan silently failed",
// which is exactly what happened the first time this shipped (see gmailScan.ts's window-size
// bug write-up).
function formatScanSummary(summary: GmailScanSummary): string {
  if (summary.scanned === 0) {
    return "No new emails since the last scan.";
  }

  const plural = summary.scanned === 1 ? "" : "s";
  const outcomes: string[] = [];
  if (summary.autoApplied > 0) outcomes.push(`${summary.autoApplied} status auto-applied`);
  if (summary.pending > 0) outcomes.push(`${summary.pending} status update${summary.pending === 1 ? "" : "s"} to review`);
  if (summary.newApplicationsCreated > 0) {
    outcomes.push(
      `${summary.newApplicationsCreated} new application${summary.newApplicationsCreated === 1 ? "" : "s"} added`
    );
  }
  if (summary.newApplicationSuggestions > 0) {
    outcomes.push(
      `${summary.newApplicationSuggestions} new application${summary.newApplicationSuggestions === 1 ? "" : "s"} to review`
    );
  }
  if (summary.skipped > 0) outcomes.push(`${summary.skipped} not job-related`);

  return `Scanned ${summary.scanned} new email${plural} — ${outcomes.join(", ")}.`;
}

// "Connect Gmail" starts a full page navigation (Google's consent screen can't be reached
// via a CORS fetch from the SPA) - once connected, this becomes a "Connected" indicator plus
// a manual "Scan Gmail" trigger for POST /gmail/scan.
export function GmailConnectButton({ onScanned }: Props) {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<GmailScanSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    getGoogleAuthStatus()
      .then((status) => {
        if (!cancelled) setConnected(status.connected);
      })
      .catch(() => {
        if (!cancelled) setConnected(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleScan() {
    setScanning(true);
    setError(null);
    setLastResult(null);
    try {
      const summary = await scanGmail();
      setLastResult(summary);
      onScanned();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  }

  if (connected === null) return null;

  if (!connected) {
    return (
      <a href={getGoogleConnectUrl()} className={secondaryButton}>
        Connect Gmail
      </a>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {error && <span className="text-xs text-rose-500 dark:text-rose-400">{error}</span>}
      {!error && lastResult && (
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {formatScanSummary(lastResult)}
        </span>
      )}
      <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Connected
      </span>
      <button type="button" onClick={handleScan} disabled={scanning} className={secondaryButton}>
        {scanning ? "Scanning..." : "Scan Gmail"}
      </button>
    </div>
  );
}
