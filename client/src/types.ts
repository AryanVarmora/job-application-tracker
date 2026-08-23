// Mirrors server/src/validation/application.ts and the Prisma schema. Duplicated here
// rather than shared via a workspace package, since client/server aren't set up as an
// npm workspace — see README for the tradeoff.

export type ApplicationStatus = "applied" | "interviewing" | "rejected" | "offer";

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  "applied",
  "interviewing",
  "rejected",
  "offer",
];

export interface Company {
  id: string;
  name: string;
  industry: string | null;
  size: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  linkedinUrl: string | null;
  applicationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface MatchBreakdown {
  fitScore: number;
  matchedRequired: string[];
  missingRequired: string[];
  matchedPreferred: string[];
  missingPreferred: string[];
}

export interface Application {
  id: string;
  companyId: string;
  company: Company;
  role: string;
  status: ApplicationStatus;
  appliedDate: string;
  jobUrl: string | null;
  resumeVariant: string | null;
  notes: string | null;
  contacts: Contact[];
  createdAt: string;
  updatedAt: string;

  // AI analysis, populated by POST /applications/:id/analyze
  jobDescriptionText: string | null;
  extractedRequiredSkills: string[] | null;
  extractedPreferredSkills: string[] | null;
  seniorityLevel: string | null;
  roleSummary: string | null;
  fitScore: number | null;
  matchBreakdown: MatchBreakdown | null;
  analyzedAt: string | null;
}

export interface CreateApplicationInput {
  companyName: string;
  industry?: string;
  companySize?: string;
  role: string;
  status?: ApplicationStatus;
  appliedDate: string;
  jobUrl?: string;
  resumeVariant?: string;
  notes?: string;
}

export type UpdateApplicationInput = Partial<CreateApplicationInput>;

export interface ResumeSuggestion {
  variant: string;
  reason: string;
}
