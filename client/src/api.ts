import type {
  Application,
  ApplicationStatus,
  CreateApplicationInput,
  CreateOutreachContactInput,
  DigestToday,
  EmailParseResult,
  JobUrlExtraction,
  OutreachContact,
  ResumeSuggestion,
  UpdateApplicationInput,
  UpdateOutreachContactInput,
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

export function parseStatusEmail(subject: string, body: string): Promise<EmailParseResult> {
  return fetch(`${API_URL}/applications/parse-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subject, body }),
  }).then((res) => handle(res));
}

export function applySuggestedStatus(
  id: string,
  status: ApplicationStatus
): Promise<Application> {
  return fetch(`${API_URL}/applications/${id}/apply-suggested-status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  }).then((res) => handle(res));
}

export function parseJobUrl(url: string): Promise<JobUrlExtraction> {
  return fetch(`${API_URL}/applications/parse-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  }).then((res) => handle(res));
}

export function uploadResume(id: string, file: File): Promise<Application> {
  const formData = new FormData();
  formData.append("resume", file);
  return fetch(`${API_URL}/applications/${id}/resume`, {
    method: "POST",
    body: formData,
  }).then((res) => handle(res));
}

export function getResumeDownloadUrl(id: string): string {
  return `${API_URL}/applications/${id}/resume`;
}

export function deleteResume(id: string): Promise<void> {
  return fetch(`${API_URL}/applications/${id}/resume`, { method: "DELETE" }).then((res) =>
    handle(res)
  );
}

export function getTodayDigest(): Promise<DigestToday> {
  return fetch(`${API_URL}/digest/today`).then((res) => handle(res));
}

export function createOutreachContact(
  input: CreateOutreachContactInput
): Promise<OutreachContact> {
  return fetch(`${API_URL}/outreach`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((res) => handle(res));
}

export function getOutreachContacts(leadsOnly?: boolean): Promise<OutreachContact[]> {
  const query = leadsOnly ? "?leadsOnly=true" : "";
  return fetch(`${API_URL}/outreach${query}`).then((res) => handle(res));
}

export function updateOutreachContact(
  id: string,
  input: UpdateOutreachContactInput
): Promise<OutreachContact> {
  return fetch(`${API_URL}/outreach/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  }).then((res) => handle(res));
}
