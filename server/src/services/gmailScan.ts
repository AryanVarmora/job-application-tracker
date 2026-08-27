import type { gmail_v1 } from "googleapis";
import { prisma } from "../lib/prisma";
import { extractRoleFromApplicationEmail, parseStatusEmail } from "./jobAnalysis";
import { companyNameSimilarity, findBestCompanyMatch, normalizeCompanyName } from "./companyMatch";
import { getAuthorizedGmailClient } from "./googleAuth";
import type { EmailConfidence } from "@prisma/client";

const DAY_MS = 24 * 60 * 60 * 1000;
const SCAN_WINDOW_MS = 7 * DAY_MS;
// Gmail's per-page cap for messages.list is 500; 100 keeps each individual request light.
// Not a total-per-scan cap - see the pageToken loop below, which pages through every result
// in the time window. Safe to leave uncapped in total because the window itself is always
// bounded to at most 7 days by construction (see `since` below), so total volume per scan is
// naturally bounded by how much mail actually arrives in a week, not by this constant.
const LIST_PAGE_SIZE = 100;

// A first-time scan can queue up dozens of sequential AI calls (a full 7-day window), which
// is enough to trip a personal-tier per-minute quota (Gemini's free tier especially) even
// before any single call gets a 429. This is just a throttle to reduce how often that
// happens - actual 429s are still handled via the retry/backoff in jobAnalysis.ts.
const AI_CALL_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Deliberately blunt per spec ("keep this simple, false negatives are fine, this is a
// convenience feature not a critical system") - a subject keyword or a sender domain that
// resembles a company already on the board is enough to warrant the (more expensive) AI
// extraction step below. Anything that misses both is silently skipped.
//
// Broadened twice after a real scan came back with a too-narrow list: "applicant" doesn't
// substring-match "apply"/"application"/"applying", and a lot of real ATS-sent status/
// rejection subjects lean on soft, generic phrasing ("unfortunately", "moving forward",
// "thank you for your interest") rather than the word "reject" itself, with a sender domain
// (the ATS platform's) that doesn't resemble the company name either. This is now
// intentionally on the broad side - more subjects will pass through to the (more expensive)
// AI extraction step, including some that turn out not to be job-related, in exchange for
// catching more of the real ones.
const JOB_KEYWORDS = [
  "apply",
  "application",
  "applying",
  "applicant",
  "interview",
  "reject",
  "rejection",
  "offer",
  "position",
  "candidacy",
  "candidate",
  "hiring",
  "recruit",
  "recruiting",
  "decision",
  "unfortunately",
  "regret",
  "update on your application",
  "thank you for your interest",
  "moving forward",
  "next steps",
  "we've decided",
  "not selected",
  "application status",
];

export interface GmailScanSummary {
  scanned: number;
  autoApplied: number;
  pending: number;
  skipped: number;
  skippedDueToError: number;
  newApplicationsCreated: number;
  newApplicationSuggestions: number;
}

// Deliberately looser than findBestCompanyMatch's 0.72 MATCH_THRESHOLD, and used only to
// decide "is this close enough to something already tracked that creating a new Application
// would likely be a duplicate" - never to actually apply a status change (that still requires
// clearing the stricter threshold). A missed duplicate check just means an extra row the user
// deletes by hand; a false one here just means a real new application waits for the (still
// company-matching-based) status-update path to catch up on a later scan, which is the exact
// tradeoff asked for.
const WEAK_DUPLICATE_MATCH_THRESHOLD = 0.5;

function findWeakCompanyMatch(companyName: string, knownCompanyNames: string[]): string | null {
  return knownCompanyNames.find((name) => companyNameSimilarity(companyName, name) >= WEAK_DUPLICATE_MATCH_THRESHOLD) ?? null;
}

const CONFIDENCE_RANK: Record<EmailConfidence, number> = { low: 0, medium: 1, high: 2 };

// The weaker of two independent confidence assessments (company/status from parseStatusEmail,
// role from extractRoleFromApplicationEmail) - "high confidence on company name AND role" per
// spec means neither one is allowed to be weak.
function weakerConfidence(a: EmailConfidence, b: EmailConfidence): EmailConfidence {
  return CONFIDENCE_RANK[a] <= CONFIDENCE_RANK[b] ? a : b;
}

function extractSenderDomainLabel(fromHeader: string): string | null {
  const match = fromHeader.match(/@([\w.-]+)/);
  if (!match) return null;
  const labels = match[1].toLowerCase().split(".");
  // "greenhouse-mail.acme.com" -> "acme": the second-to-last label is usually the
  // registrable/company name, skipping subdomain noise and the TLD.
  return labels.length >= 2 ? labels[labels.length - 2] : labels[0];
}

function looksLikeJobApplicationEmail(
  subject: string,
  fromHeader: string,
  knownCompanyNames: string[]
): boolean {
  // Real subjects (especially from web-based ATS platforms) often use a typographic right
  // single quote (’) instead of a straight apostrophe - normalize so "we've decided"
  // still matches "we’ve decided".
  const subjectLower = subject.toLowerCase().replace(/’/g, "'");
  if (JOB_KEYWORDS.some((keyword) => subjectLower.includes(keyword))) {
    return true;
  }

  const domainLabel = extractSenderDomainLabel(fromHeader);
  if (!domainLabel) return false;

  return knownCompanyNames.some((name) => {
    const normalized = normalizeCompanyName(name).replace(/\s+/g, "");
    return normalized.length > 0 && (normalized.includes(domainLabel) || domainLabel.includes(normalized));
  });
}

function decodeBase64Url(data: string): string {
  return Buffer.from(data, "base64url").toString("utf-8");
}

// Gmail messages are a tree of MIME parts - recurse to find the first part of the given
// type, since a real message is almost always multipart/alternative (plain + html) wrapped
// in an outer multipart/mixed (for attachments), rather than a flat single-part body.
function findPart(part: gmail_v1.Schema$MessagePart | undefined, mimeType: string): string | null {
  if (!part) return null;
  if (part.mimeType === mimeType && part.body?.data) {
    return decodeBase64Url(part.body.data);
  }
  for (const child of part.parts ?? []) {
    const found = findPart(child, mimeType);
    if (found) return found;
  }
  return null;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractMessageContent(message: gmail_v1.Schema$Message): {
  subject: string;
  from: string;
  bodyText: string;
} {
  const headers = message.payload?.headers ?? [];
  const subject = headers.find((h) => h.name?.toLowerCase() === "subject")?.value ?? "";
  const from = headers.find((h) => h.name?.toLowerCase() === "from")?.value ?? "";

  const plain = findPart(message.payload, "text/plain");
  if (plain) return { subject, from, bodyText: plain };

  const html = findPart(message.payload, "text/html");
  if (html) return { subject, from, bodyText: stripHtml(html) };

  const fallbackData = message.payload?.body?.data;
  const bodyText = fallbackData ? decodeBase64Url(fallbackData) : (message.snippet ?? "");
  return { subject, from, bodyText };
}

async function getScanState() {
  const existing = await prisma.gmailScanState.findFirst();
  return existing ?? (await prisma.gmailScanState.create({ data: {} }));
}

async function markProcessed(gmailMessageId: string): Promise<void> {
  await prisma.gmailProcessedMessage.create({ data: { gmailMessageId } });
}

// Orchestrates a single Gmail scan: fetch every message since the last scan (or the last 7
// days, whichever is more recent) - paging through the full result set, not just the first
// page - skip anything already processed, run the rest through the existing parseStatusEmail
// pipeline, and either auto-apply (high confidence) or leave a pending GmailSuggestion
// (medium/low) for a matched application. Safe to call repeatedly - every candidate message
// is recorded in GmailProcessedMessage exactly once, regardless of outcome, so a re-scan
// never reconsiders it.
export async function scanGmailForStatusUpdates(now: Date = new Date()): Promise<GmailScanSummary> {
  const gmail = await getAuthorizedGmailClient();

  const scanState = await getScanState();
  const windowStart = new Date(now.getTime() - SCAN_WINDOW_MS);
  const since =
    scanState.lastScannedAt && scanState.lastScannedAt > windowStart
      ? scanState.lastScannedAt
      : windowStart;

  const applications = await prisma.application.findMany({ include: { company: true } });
  const knownCompanyNames = applications.map((a) => a.company.name);

  // Pages through every result in the window rather than taking just the first page -
  // messages.list returns newest-first, so stopping at one page previously meant a busy
  // inbox's oldest (and often most relevant - actual rejections/interviews) messages in the
  // window could be dropped entirely and never reconsidered, since the window only ever
  // moves forward from here.
  const messageRefs: gmail_v1.Schema$Message[] = [];
  let pageToken: string | undefined;
  do {
    const listResponse = await gmail.users.messages.list({
      userId: "me",
      q: `after:${Math.floor(since.getTime() / 1000)}`,
      maxResults: LIST_PAGE_SIZE,
      pageToken,
    });
    messageRefs.push(...(listResponse.data.messages ?? []));
    pageToken = listResponse.data.nextPageToken ?? undefined;
  } while (pageToken);

  const summary: GmailScanSummary = {
    scanned: 0,
    autoApplied: 0,
    pending: 0,
    skipped: 0,
    skippedDueToError: 0,
    newApplicationsCreated: 0,
    newApplicationSuggestions: 0,
  };

  for (const ref of messageRefs) {
    const messageId = ref.id;
    if (!messageId) continue;

    const alreadyProcessed = await prisma.gmailProcessedMessage.findUnique({
      where: { gmailMessageId: messageId },
    });
    if (alreadyProcessed) continue;

    summary.scanned++;

    const full = await gmail.users.messages.get({ userId: "me", id: messageId, format: "full" });
    const { subject, from, bodyText } = extractMessageContent(full.data);

    if (!looksLikeJobApplicationEmail(subject, from, knownCompanyNames)) {
      await markProcessed(messageId);
      summary.skipped++;
      continue;
    }

    // Everything from here on makes AI calls (which can still fail even after the
    // retry/backoff in jobAnalysis.ts exhausts itself, e.g. a sustained rate limit or an
    // outright provider outage). One bad email shouldn't sink the whole scan - catch per
    // message, mark it processed so it isn't retried forever, and move on.
    try {
      const emailText = subject ? `Subject: ${subject}\n\n${bodyText}` : bodyText;
      await sleep(AI_CALL_DELAY_MS);
      const extraction = await parseStatusEmail(emailText);

      const match = extraction.companyName
        ? findBestCompanyMatch(
            extraction.companyName,
            applications.map((a) => ({ applicationId: a.id, companyName: a.company.name }))
          )
        : null;

      // No confidently-matched existing application - candidate for a brand new one, but only
      // when this reads like a genuine "you just applied" confirmation. A rejection/interview/
      // offer about a company we don't track isn't something we can act on (there's nothing to
      // attribute the status to), so it's skipped exactly as before.
      if (!match) {
        if (!extraction.companyName || extraction.detectedStatus !== "applied") {
          await markProcessed(messageId);
          summary.skipped++;
          continue;
        }

        if (findWeakCompanyMatch(extraction.companyName, knownCompanyNames)) {
          // Close enough to something already tracked that a new row would likely be a
          // duplicate - leave it alone rather than guess; the existing (stricter-threshold)
          // status-update match may catch it on a future scan once names line up better.
          await markProcessed(messageId);
          summary.skipped++;
          continue;
        }

        await sleep(AI_CALL_DELAY_MS);
        const roleExtraction = await extractRoleFromApplicationEmail(emailText);
        if (!roleExtraction.role) {
          // Can't create or usefully suggest an application without a role.
          await markProcessed(messageId);
          summary.skipped++;
          continue;
        }

        const combinedConfidence = weakerConfidence(extraction.confidence, roleExtraction.confidence);
        const appliedDate = full.data.internalDate ? new Date(Number(full.data.internalDate)) : now;

        if (combinedConfidence === "high") {
          const company = await prisma.company.upsert({
            where: { name: extraction.companyName },
            update: {},
            create: { name: extraction.companyName },
          });
          await prisma.application.create({
            data: {
              companyId: company.id,
              role: roleExtraction.role,
              status: "applied",
              appliedDate,
              notes: "Auto-imported from Gmail scan",
            },
          });
          // Seen within this same scan run, so a second confirmation email for the same new
          // company later in this batch is caught by the weak-match check above too.
          knownCompanyNames.push(extraction.companyName);
          await markProcessed(messageId);
          summary.newApplicationsCreated++;
        } else {
          await prisma.gmailSuggestion.create({
            data: {
              gmailMessageId: messageId,
              type: "new_application",
              companyName: extraction.companyName,
              role: roleExtraction.role,
              appliedDate,
              confidence: combinedConfidence,
            },
          });
          await markProcessed(messageId);
          summary.newApplicationSuggestions++;
        }
        continue;
      }

      if (extraction.detectedStatus === "unknown") {
        await markProcessed(messageId);
        summary.skipped++;
        continue;
      }

      if (extraction.confidence === "high") {
        const current = await prisma.application.findUnique({ where: { id: match.applicationId } });
        if (current && current.status !== extraction.detectedStatus) {
          await prisma.application.update({
            where: { id: match.applicationId },
            data: { status: extraction.detectedStatus, statusChangedAt: now },
          });
        }
        await markProcessed(messageId);
        summary.autoApplied++;
      } else {
        await prisma.gmailSuggestion.create({
          data: {
            gmailMessageId: messageId,
            type: "status_update",
            applicationId: match.applicationId,
            suggestedStatus: extraction.detectedStatus,
            confidence: extraction.confidence,
          },
        });
        await markProcessed(messageId);
        summary.pending++;
      }
    } catch (err) {
      console.error(`Gmail scan: skipping message ${messageId} after a processing error:`, err);
      await markProcessed(messageId);
      summary.skippedDueToError++;
    }
  }

  await prisma.gmailScanState.update({ where: { id: scanState.id }, data: { lastScannedAt: now } });

  return summary;
}
