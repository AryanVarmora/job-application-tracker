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
  statusChangedAt: string | null;

  // Locally-stored resume file (see POST/GET/DELETE /applications/:id/resume). Auto-expires
  // 30 days after upload — both fields go back to null once that happens.
  resumeFilePath: string | null;
  resumeFileUploadedAt: string | null;

  // Gates the "Analyze fit with AI" flow. Off by default; POST /applications/:id/analyze
  // is rejected server-side while this is false.
  analyzeEnabled: boolean;

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
  analyzeEnabled?: boolean;
}

export type UpdateApplicationInput = Partial<CreateApplicationInput>;

export interface DigestToday {
  date: string;
  applicationsCreated: number;
  rejections: number;
  messagesSent: number;
}

export interface ResumeSuggestion {
  variant: string;
  reason: string;
}

export type EmailConfidence = "high" | "medium" | "low";
export type DetectedEmailStatus = ApplicationStatus | "unknown";

export interface EmailParseMatch {
  matchedApplicationId: string;
  matchedCompanyName: string;
  currentStatus: ApplicationStatus;
  suggestedStatus: DetectedEmailStatus;
  confidence: EmailConfidence;
}

export interface EmailParseNoMatch {
  matchedApplicationId: null;
  extractedCompanyName: string | null;
  detectedStatus: DetectedEmailStatus;
  confidence: EmailConfidence;
}

export type EmailParseResult = EmailParseMatch | EmailParseNoMatch;

// Response shape of POST /applications/parse-url. requiredSkills/preferredSkills/seniorityLevel/
// summary come along for free from the shared analysis pipeline but aren't used by the URL
// auto-fill flow - only companyName/role/jobDescriptionText get copied into the form.
export interface JobUrlExtraction {
  companyName: string;
  role: string;
  jobDescriptionText: string;
  requiredSkills: string[];
  preferredSkills: string[];
  seniorityLevel: string;
  summary: string;
}

export type OutreachPlatform = "linkedin" | "email" | "other";

export const OUTREACH_PLATFORMS: OutreachPlatform[] = ["linkedin", "email", "other"];

export interface OutreachContact {
  id: string;
  personName: string;
  company: string | null;
  platform: OutreachPlatform;
  messagedAt: string;
  isLead: boolean;
  notes: string | null;
  linkedApplicationId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOutreachContactInput {
  personName: string;
  platform: OutreachPlatform;
  company?: string;
  messagedAt?: string;
  isLead?: boolean;
  notes?: string;
  linkedApplicationId?: string;
}

export interface UpdateOutreachContactInput {
  personName?: string;
  platform?: OutreachPlatform;
  company?: string;
  messagedAt?: string;
  isLead?: boolean;
  notes?: string;
  linkedApplicationId?: string | null;
}

export interface GoogleAuthStatus {
  connected: boolean;
}

export interface GmailScanSummary {
  scanned: number;
  autoApplied: number;
  pending: number;
  skipped: number;
  skippedDueToError: number;
  newApplicationsCreated: number;
  newApplicationSuggestions: number;
}

export type GmailSuggestionType = "status_update" | "new_application";

// A medium/low-confidence guess from a scanned Gmail message, awaiting confirm/reject (see
// GmailSuggestionsPanel). High-confidence matches are applied/created directly by the scan
// and never show up here. Two shapes share this type, discriminated by `type`:
// - status_update: applicationId/application/suggestedStatus are set; company/role/appliedDate
//   are null - it's a status change proposed for an EXISTING tracked application.
// - new_application: company/role/appliedDate are set; applicationId/application/
//   suggestedStatus are null - no existing application matched, so confirming this creates one.
export interface GmailSuggestion {
  id: string;
  gmailMessageId: string;
  type: GmailSuggestionType;
  confidence: EmailConfidence;
  createdAt: string;

  applicationId: string | null;
  application: Application | null;
  suggestedStatus: ApplicationStatus | null;

  companyName: string | null;
  role: string | null;
  appliedDate: string | null;
}
