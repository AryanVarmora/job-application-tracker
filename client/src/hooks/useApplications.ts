import { useCallback, useEffect, useState } from "react";
import { getApplications } from "../api";
import type { Application } from "../types";

export function useApplications() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getApplications();
      setApplications(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load applications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // Inserts a new application or replaces an existing one by id. Used for create,
  // update, analyze results, and optimistic drag-and-drop status changes.
  function upsert(updated: Application) {
    setApplications((prev) => {
      const exists = prev.some((a) => a.id === updated.id);
      return exists ? prev.map((a) => (a.id === updated.id ? updated : a)) : [updated, ...prev];
    });
  }

  function remove(id: string) {
    setApplications((prev) => prev.filter((a) => a.id !== id));
  }

  return { applications, loading, error, reload, upsert, remove };
}
