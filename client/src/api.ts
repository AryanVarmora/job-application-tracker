import type {
  Application,
  ApplicationStatus,
  CreateApplicationInput,
  ResumeSuggestion,
  UpdateApplicationInput,
} from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? body.error ?? `Request failed with ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export function getApplications(status?: ApplicationStatus): Promise<Application[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return fetch(`${API_URL}/applications${query}`).then((res) => handle(res));
}

export function getApplication(id: string): Promise<Application> {
  return fetch(`${API_URL}/applications/${id}`).then((res) => handle(res));
}

export function createApplication(input: CreateApplicationInput): Promise<Application> {
  return fetch(`${API_URL}/applications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((res) => handle(res));
}

export function updateApplication(
  id: string,
  input: UpdateApplicationInput
): Promise<Application> {
  return fetch(`${API_URL}/applications/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((res) => handle(res));
}

export function deleteApplication(id: string): Promise<void> {
  return fetch(`${API_URL}/applications/${id}`, { method: "DELETE" }).then((res) =>
    handle(res)
  );
}

export function analyzeApplication(id: string, jobDescription: string): Promise<Application> {
  return fetch(`${API_URL}/applications/${id}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobDescription }),
  }).then((res) => handle(res));
}

export function getResumeSuggestion(id: string): Promise<ResumeSuggestion> {
  return fetch(`${API_URL}/applications/${id}/resume-suggestion`).then((res) => handle(res));
}
