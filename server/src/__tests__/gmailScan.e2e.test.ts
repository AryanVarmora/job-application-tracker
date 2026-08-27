import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// Exercises the real Postgres stack (applications, suggestions, processed-message tracking)
// but stubs the two external boundaries: the Gmail API client and the AI email-parsing call
// - same approach as smoke.e2e.test.ts's stub of analyzeJobDescription.
const listMock = vi.fn();
const getMock = vi.fn();

vi.mock("../services/googleAuth", () => ({
  getAuthorizedGmailClient: vi.fn(async () => ({
    users: {
      messages: {
        list: listMock,
        get: getMock,
      },
    },
  })),
}));

const parseStatusEmailMock = vi.fn();
const extractRoleFromApplicationEmailMock = vi.fn();
vi.mock("../services/jobAnalysis", () => ({
  parseStatusEmail: (emailText: string) => parseStatusEmailMock(emailText),
  extractRoleFromApplicationEmail: (emailText: string) =>
    extractRoleFromApplicationEmailMock(emailText),
}));

import { prisma } from "../lib/prisma";
import { scanGmailForStatusUpdates } from "../services/gmailScan";

const createdCompanyNames: string[] = [];
const createdMessageIds: string[] = [];

// GmailScanState is a real singleton row shared with actual app usage against this same dev
// database (same convention as every other e2e test file here) - every scanGmailForStatusUpdates()
// call below writes real wall-clock time into it. Snapshot it here and restore it verbatim in
// afterAll so running this suite can never advance the live "last scanned" pointer out from
// under a real scan - which previously caused a real scan to see an empty window and silently
// find nothing, even with plenty of genuinely new mail in the inbox.
let originalScanState: { id: string; lastScannedAt: Date | null } | null = null;

beforeAll(async () => {
  originalScanState = await prisma.gmailScanState.findFirst();
});

afterEach(() => {
  listMock.mockReset();
  getMock.mockReset();
  parseStatusEmailMock.mockReset();
  extractRoleFromApplicationEmailMock.mockReset();
});

afterAll(async () => {
  if (originalScanState) {
    await prisma.gmailScanState.update({
      where: { id: originalScanState.id },
      data: { lastScannedAt: originalScanState.lastScannedAt },
    });
  } else {
    await prisma.gmailScanState.deleteMany({});
  }

  await prisma.gmailSuggestion.deleteMany({ where: { gmailMessageId: { in: createdMessageIds } } });
  await prisma.gmailProcessedMessage.deleteMany({
    where: { gmailMessageId: { in: createdMessageIds } },
  });
  await prisma.application.deleteMany({
    where: { company: { name: { in: createdCompanyNames } } },
  });
  await prisma.company.deleteMany({ where: { name: { in: createdCompanyNames } } });
  await prisma.$disconnect();
});

async function seedApplication(companyLabel: string) {
  const companyName = `Gmail Scan Test ${companyLabel} ${Date.now()}-${Math.random()}`;
  createdCompanyNames.push(companyName);

  const company = await prisma.company.create({ data: { name: companyName } });
  const application = await prisma.application.create({
    data: {
      companyId: company.id,
      role: "SWE",
      appliedDate: new Date("2026-08-01"),
      status: "applied",
    },
  });
  return { company, application };
}

function gmailMessage(
  id: string,
  subject: string,
  from: string,
  bodyText: string,
  internalDate?: Date
) {
  return {
    id,
    internalDate: internalDate ? String(internalDate.getTime()) : undefined,
    payload: {
      headers: [
        { name: "Subject", value: subject },
        { name: "From", value: from },
      ],
      mimeType: "text/plain",
      body: { data: Buffer.from(bodyText, "utf-8").toString("base64url") },
    },
  };
}

// Configures listMock/getMock to serve exactly the given messages, keyed by id.
function mockGmailInbox(messages: ReturnType<typeof gmailMessage>[]) {
  listMock.mockResolvedValue({ data: { messages: messages.map((m) => ({ id: m.id })) } });
  getMock.mockImplementation(async ({ id }: { id: string }) => ({
    data: messages.find((m) => m.id === id),
  }));
}

// Same as mockGmailInbox, but splits the message refs across multiple list() pages linked by
// nextPageToken, the way a real inbox with more results than one page's maxResults would.
function mockPaginatedGmailInbox(messages: ReturnType<typeof gmailMessage>[], pageSize: number) {
  const pages: ReturnType<typeof gmailMessage>[][] = [];
  for (let i = 0; i < messages.length; i += pageSize) {
    pages.push(messages.slice(i, i + pageSize));
  }

  listMock.mockImplementation(async ({ pageToken }: { pageToken?: string }) => {
    const pageIndex = pageToken ? Number(pageToken) : 0;
    const page = pages[pageIndex] ?? [];
    const nextPageToken = pageIndex + 1 < pages.length ? String(pageIndex + 1) : undefined;
    return { data: { messages: page.map((m) => ({ id: m.id })), nextPageToken } };
  });
  getMock.mockImplementation(async ({ id }: { id: string }) => ({
    data: messages.find((m) => m.id === id),
  }));
}

describe("scanGmailForStatusUpdates > confidence threshold", () => {
  it("auto-applies a high-confidence match without creating a suggestion", async () => {
    const { company, application } = await seedApplication("high-confidence");
    const messageId = `msg-high-${Date.now()}-${Math.random()}`;
    createdMessageIds.push(messageId);

    mockGmailInbox([
      gmailMessage(messageId, `Interview update from ${company.name}`, "hr@example.com", "..."),
    ]);
    parseStatusEmailMock.mockResolvedValueOnce({
      companyName: company.name,
      detectedStatus: "interviewing",
      confidence: "high",
    });

    const summary = await scanGmailForStatusUpdates();

    expect(summary.autoApplied).toBe(1);
    expect(summary.pending).toBe(0);

    const updated = await prisma.application.findUniqueOrThrow({ where: { id: application.id } });
    expect(updated.status).toBe("interviewing");
    expect(updated.statusChangedAt).not.toBeNull();

    const suggestion = await prisma.gmailSuggestion.findUnique({
      where: { gmailMessageId: messageId },
    });
    expect(suggestion).toBeNull();
  });

  it("creates a pending suggestion for a medium-confidence match, without changing status", async () => {
    const { company, application } = await seedApplication("medium-confidence");
    const messageId = `msg-medium-${Date.now()}-${Math.random()}`;
    createdMessageIds.push(messageId);

    mockGmailInbox([
      gmailMessage(messageId, `Application update from ${company.name}`, "hr@example.com", "..."),
    ]);
    parseStatusEmailMock.mockResolvedValueOnce({
      companyName: company.name,
      detectedStatus: "rejected",
      confidence: "medium",
    });

    const summary = await scanGmailForStatusUpdates();

    expect(summary.autoApplied).toBe(0);
    expect(summary.pending).toBe(1);

    const unchanged = await prisma.application.findUniqueOrThrow({
      where: { id: application.id },
    });
    expect(unchanged.status).toBe("applied");

    const suggestion = await prisma.gmailSuggestion.findUniqueOrThrow({
      where: { gmailMessageId: messageId },
    });
    expect(suggestion.applicationId).toBe(application.id);
    expect(suggestion.suggestedStatus).toBe("rejected");
    expect(suggestion.confidence).toBe("medium");
  });

  it("creates a pending suggestion for a low-confidence match too, not an auto-apply", async () => {
    const { company, application } = await seedApplication("low-confidence");
    const messageId = `msg-low-${Date.now()}-${Math.random()}`;
    createdMessageIds.push(messageId);

    mockGmailInbox([
      gmailMessage(messageId, `Your application to ${company.name}`, "hr@example.com", "..."),
    ]);
    parseStatusEmailMock.mockResolvedValueOnce({
      companyName: company.name,
      detectedStatus: "offer",
      confidence: "low",
    });

    const summary = await scanGmailForStatusUpdates();

    expect(summary.autoApplied).toBe(0);
    expect(summary.pending).toBe(1);

    const unchanged = await prisma.application.findUniqueOrThrow({
      where: { id: application.id },
    });
    expect(unchanged.status).toBe("applied");

    const suggestion = await prisma.gmailSuggestion.findUniqueOrThrow({
      where: { gmailMessageId: messageId },
    });
    expect(suggestion.confidence).toBe("low");
  });

  it("skips a matched email with unknown detected status - no auto-apply, no suggestion", async () => {
    const { company, application } = await seedApplication("unknown-status");
    const messageId = `msg-unknown-${Date.now()}-${Math.random()}`;
    createdMessageIds.push(messageId);

    mockGmailInbox([
      gmailMessage(messageId, `Application received - ${company.name}`, "hr@example.com", "..."),
    ]);
    parseStatusEmailMock.mockResolvedValueOnce({
      companyName: company.name,
      detectedStatus: "unknown",
      confidence: "high",
    });

    const summary = await scanGmailForStatusUpdates();

    expect(summary.autoApplied).toBe(0);
    expect(summary.pending).toBe(0);
    expect(summary.skipped).toBe(1);

    const unchanged = await prisma.application.findUniqueOrThrow({
      where: { id: application.id },
    });
    expect(unchanged.status).toBe("applied");
  });
});

describe("scanGmailForStatusUpdates > per-message error resilience", () => {
  it("skips a message that keeps failing (e.g. a rate limit) without losing the rest of the batch", async () => {
    const { company: companyA, application: applicationA } = await seedApplication("error-resilience-a");
    const { company: companyB, application: applicationB } = await seedApplication("error-resilience-b");
    const { company: companyC, application: applicationC } = await seedApplication("error-resilience-c");

    const messageIdA = `msg-err-a-${Date.now()}-${Math.random()}`;
    const messageIdB = `msg-err-b-${Date.now()}-${Math.random()}`;
    const messageIdC = `msg-err-c-${Date.now()}-${Math.random()}`;
    createdMessageIds.push(messageIdA, messageIdB, messageIdC);

    mockGmailInbox([
      gmailMessage(messageIdA, `Interview update from ${companyA.name}`, "hr@example.com", "..."),
      gmailMessage(messageIdB, `Interview update from ${companyB.name}`, "hr@example.com", "..."),
      gmailMessage(messageIdC, `Interview update from ${companyC.name}`, "hr@example.com", "..."),
    ]);

    // B simulates a message that still fails after jobAnalysis.ts's own 429 retries are
    // exhausted (that retry/backoff is exercised separately in jobAnalysis.test.ts) - this
    // level only needs to prove the scan doesn't crash and keeps processing A and C.
    parseStatusEmailMock.mockImplementation(async (emailText: string) => {
      if (emailText.includes(companyB.name)) {
        throw new Error("429 Rate limit exceeded - retries exhausted");
      }
      const company = [companyA, companyC].find((c) => emailText.includes(c.name))!;
      return { companyName: company.name, detectedStatus: "interviewing", confidence: "high" };
    });

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const summary = await scanGmailForStatusUpdates();

    expect(summary.scanned).toBe(3);
    expect(summary.autoApplied).toBe(2);
    expect(summary.skipped).toBe(0);
    expect(summary.skippedDueToError).toBe(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining(messageIdB),
      expect.any(Error)
    );
    consoleErrorSpy.mockRestore();

    const [updatedA, updatedB, updatedC] = await Promise.all([
      prisma.application.findUniqueOrThrow({ where: { id: applicationA.id } }),
      prisma.application.findUniqueOrThrow({ where: { id: applicationB.id } }),
      prisma.application.findUniqueOrThrow({ where: { id: applicationC.id } }),
    ]);
    expect(updatedA.status).toBe("interviewing");
    expect(updatedB.status).toBe("applied");
    expect(updatedC.status).toBe("interviewing");

    // The failed message is still marked processed - consistent with every other skip path -
    // so a re-scan of the same window doesn't retry it forever.
    const processedCount = await prisma.gmailProcessedMessage.count({
      where: { gmailMessageId: { in: [messageIdA, messageIdB, messageIdC] } },
    });
    expect(processedCount).toBe(3);

    const rescan = await scanGmailForStatusUpdates();
    expect(rescan.scanned).toBe(0);
  });
});

describe("scanGmailForStatusUpdates > duplicate-processing prevention", () => {
  it("never reprocesses a message already recorded as processed, across separate scan calls", async () => {
    const { company } = await seedApplication("duplicate-prevention");
    const messageId = `msg-dup-${Date.now()}-${Math.random()}`;
    createdMessageIds.push(messageId);

    mockGmailInbox([
      gmailMessage(messageId, `Interview update from ${company.name}`, "hr@example.com", "..."),
    ]);
    parseStatusEmailMock.mockResolvedValue({
      companyName: company.name,
      detectedStatus: "interviewing",
      confidence: "high",
    });

    const first = await scanGmailForStatusUpdates();
    expect(first.autoApplied).toBe(1);
    expect(parseStatusEmailMock).toHaveBeenCalledTimes(1);

    const processedCountAfterFirst = await prisma.gmailProcessedMessage.count({
      where: { gmailMessageId: messageId },
    });
    expect(processedCountAfterFirst).toBe(1);

    // Second scan sees the exact same inbox (as a real re-scan of an overlapping window
    // would) - the message must not be parsed or acted on again.
    const second = await scanGmailForStatusUpdates();
    expect(second.scanned).toBe(0);
    expect(second.autoApplied).toBe(0);
    expect(parseStatusEmailMock).toHaveBeenCalledTimes(1);

    const processedCountAfterSecond = await prisma.gmailProcessedMessage.count({
      where: { gmailMessageId: messageId },
    });
    expect(processedCountAfterSecond).toBe(1);
  });

  it("does not duplicate a pending suggestion on a repeated scan", async () => {
    const { company, application } = await seedApplication("duplicate-suggestion");
    const messageId = `msg-dup-suggestion-${Date.now()}-${Math.random()}`;
    createdMessageIds.push(messageId);

    mockGmailInbox([
      gmailMessage(messageId, `Application update from ${company.name}`, "hr@example.com", "..."),
    ]);
    parseStatusEmailMock.mockResolvedValue({
      companyName: company.name,
      detectedStatus: "rejected",
      confidence: "medium",
    });

    await scanGmailForStatusUpdates();
    await scanGmailForStatusUpdates();

    const suggestionCount = await prisma.gmailSuggestion.count({
      where: { applicationId: application.id },
    });
    expect(suggestionCount).toBe(1);
    expect(parseStatusEmailMock).toHaveBeenCalledTimes(1);
  });
});

describe("scanGmailForStatusUpdates > pagination", () => {
  it("pages through every result in the window, not just the first page", async () => {
    // 3 pages of 2 (6 total) - well past a single page, so this fails if the scan stops
    // after the first list() call the way it used to (a hard maxResults cap, no pageToken).
    const seeded = await Promise.all(
      Array.from({ length: 6 }, (_, i) => seedApplication(`pagination-${i}`))
    );
    const messages = seeded.map(({ company }, i) => {
      const messageId = `msg-page-${i}-${Date.now()}-${Math.random()}`;
      createdMessageIds.push(messageId);
      return { messageId, company, gmail: gmailMessage(messageId, `Application update from ${company.name}`, "hr@example.com", "...") };
    });

    mockPaginatedGmailInbox(messages.map((m) => m.gmail), 2);
    parseStatusEmailMock.mockImplementation(async (emailText: string) => {
      const found = messages.find((m) => emailText.includes(m.company.name))!;
      return { companyName: found.company.name, detectedStatus: "interviewing", confidence: "high" };
    });

    const summary = await scanGmailForStatusUpdates();

    expect(summary.scanned).toBe(6);
    expect(summary.autoApplied).toBe(6);
    expect(listMock).toHaveBeenCalledTimes(3);

    const processedCount = await prisma.gmailProcessedMessage.count({
      where: { gmailMessageId: { in: messages.map((m) => m.messageId) } },
    });
    expect(processedCount).toBe(6);

    for (const { company } of seeded) {
      const updated = await prisma.application.findFirst({ where: { companyId: company.id } });
      expect(updated?.status).toBe("interviewing");
    }
  });
});

// A UUID prefix rather than a shared descriptive word (like every other name in this file,
// "Gmail Scan Test <label> ...") - the weak-duplicate-match check below (>=0.5 similarity) is
// edit-distance-based, so any two names here sharing a long common substring would score well
// above the threshold against EACH OTHER, not just against other describe blocks' leftover
// companies (which also stay in the DB all run, since cleanup is afterAll, not afterEach).
// Learned this the hard way: an earlier version used a shared "Zephyrion" prefix across these
// same tests and they falsely deduplicated against one another.
function newApplicationCandidateName(label: string): string {
  return `${randomUUID()} ${label}`;
}

describe("scanGmailForStatusUpdates > new-application detection", () => {
  it("auto-creates an Application for a high-confidence unmatched application-confirmation email", async () => {
    const companyName = newApplicationCandidateName("New Co");
    createdCompanyNames.push(companyName);
    const messageId = `msg-newapp-high-${Date.now()}-${Math.random()}`;
    createdMessageIds.push(messageId);
    const sentAt = new Date("2026-08-19T12:00:00.000Z");

    mockGmailInbox([
      gmailMessage(
        messageId,
        `Thank you for applying to ${companyName}`,
        "no-reply@example.com",
        "...",
        sentAt
      ),
    ]);
    parseStatusEmailMock.mockResolvedValueOnce({
      companyName,
      detectedStatus: "applied",
      confidence: "high",
    });
    extractRoleFromApplicationEmailMock.mockResolvedValueOnce({
      role: "Software Engineer",
      confidence: "high",
    });

    const summary = await scanGmailForStatusUpdates();

    expect(summary.newApplicationsCreated).toBe(1);
    expect(summary.newApplicationSuggestions).toBe(0);

    const created = await prisma.application.findFirstOrThrow({
      where: { company: { name: companyName } },
      include: { company: true },
    });
    expect(created.role).toBe("Software Engineer");
    expect(created.status).toBe("applied");
    expect(created.notes).toBe("Auto-imported from Gmail scan");
    expect(created.appliedDate.toISOString()).toBe(sentAt.toISOString());

    const suggestion = await prisma.gmailSuggestion.findUnique({
      where: { gmailMessageId: messageId },
    });
    expect(suggestion).toBeNull();
  });

  it("creates a new_application suggestion when confidence is medium or low, without creating an Application", async () => {
    const companyName = newApplicationCandidateName("Pending New Co");
    const messageId = `msg-newapp-medium-${Date.now()}-${Math.random()}`;
    createdMessageIds.push(messageId);

    mockGmailInbox([
      gmailMessage(messageId, `Thank you for applying to ${companyName}`, "no-reply@example.com", "..."),
    ]);
    parseStatusEmailMock.mockResolvedValueOnce({
      companyName,
      detectedStatus: "applied",
      confidence: "high",
    });
    extractRoleFromApplicationEmailMock.mockResolvedValueOnce({
      role: "Backend Engineer",
      confidence: "medium",
    });

    const summary = await scanGmailForStatusUpdates();

    expect(summary.newApplicationsCreated).toBe(0);
    expect(summary.newApplicationSuggestions).toBe(1);

    const application = await prisma.application.findFirst({ where: { company: { name: companyName } } });
    expect(application).toBeNull();

    const suggestion = await prisma.gmailSuggestion.findUniqueOrThrow({
      where: { gmailMessageId: messageId },
    });
    expect(suggestion.type).toBe("new_application");
    expect(suggestion.companyName).toBe(companyName);
    expect(suggestion.role).toBe("Backend Engineer");
    // Combined confidence is the WEAKER of the two independent assessments (company/status
    // was "high", role was "medium") - "high" only when neither one is weak.
    expect(suggestion.confidence).toBe("medium");
    expect(suggestion.applicationId).toBeNull();
    expect(suggestion.suggestedStatus).toBeNull();
  });

  it("does not auto-create when a company already tracked is a weak (but not strict) name match - defers instead", async () => {
    // Fixed literal name, chosen (verified via companyNameSimilarity directly) for a score
    // in the [0.5, 0.72) gap against "Kestral Dynamic Systems" below: close enough to flag
    // as "probably the same company", not close enough for the strict 0.72 status-update
    // match threshold. Guard against a leftover row from an interrupted previous run.
    const trackedCompanyName = "Kestrel Dynamics";
    await prisma.company.deleteMany({ where: { name: trackedCompanyName } });
    createdCompanyNames.push(trackedCompanyName);

    const company = await prisma.company.create({ data: { name: trackedCompanyName } });
    await prisma.application.create({
      data: { companyId: company.id, role: "SWE", appliedDate: new Date("2026-08-01"), status: "applied" },
    });

    const messageId = `msg-newapp-weak-${Date.now()}-${Math.random()}`;
    createdMessageIds.push(messageId);

    mockGmailInbox([
      gmailMessage(messageId, "Thank you for applying to Kestral Dynamic Systems", "no-reply@example.com", "..."),
    ]);
    parseStatusEmailMock.mockResolvedValueOnce({
      companyName: "Kestral Dynamic Systems",
      detectedStatus: "applied",
      confidence: "high",
    });

    const summary = await scanGmailForStatusUpdates();

    expect(summary.newApplicationsCreated).toBe(0);
    expect(summary.newApplicationSuggestions).toBe(0);
    expect(summary.skipped).toBe(1);
    // The weak-match check short-circuits before the role extraction call - no need to
    // spend a second AI call on something we're not going to act on either way.
    expect(extractRoleFromApplicationEmailMock).not.toHaveBeenCalled();

    const application = await prisma.application.findFirst({
      where: { company: { name: "Kestral Dynamic Systems" } },
    });
    expect(application).toBeNull();
  });

  it("skips a status-update email (not an application confirmation) about an untracked company", async () => {
    const companyName = newApplicationCandidateName("Untracked Rejection");
    const messageId = `msg-newapp-rejection-${Date.now()}-${Math.random()}`;
    createdMessageIds.push(messageId);

    mockGmailInbox([
      gmailMessage(messageId, `Update on your application to ${companyName}`, "no-reply@example.com", "..."),
    ]);
    parseStatusEmailMock.mockResolvedValueOnce({
      companyName,
      detectedStatus: "rejected",
      confidence: "high",
    });

    const summary = await scanGmailForStatusUpdates();

    expect(summary.newApplicationsCreated).toBe(0);
    expect(summary.newApplicationSuggestions).toBe(0);
    expect(summary.skipped).toBe(1);
    expect(extractRoleFromApplicationEmailMock).not.toHaveBeenCalled();

    const application = await prisma.application.findFirst({ where: { company: { name: companyName } } });
    expect(application).toBeNull();
  });

  it("skips when no usable role can be extracted", async () => {
    const companyName = newApplicationCandidateName("No Role Co");
    const messageId = `msg-newapp-norole-${Date.now()}-${Math.random()}`;
    createdMessageIds.push(messageId);

    mockGmailInbox([
      gmailMessage(messageId, `Thank you for applying to ${companyName}`, "no-reply@example.com", "..."),
    ]);
    parseStatusEmailMock.mockResolvedValueOnce({
      companyName,
      detectedStatus: "applied",
      confidence: "high",
    });
    extractRoleFromApplicationEmailMock.mockResolvedValueOnce({ role: "", confidence: "low" });

    const summary = await scanGmailForStatusUpdates();

    expect(summary.newApplicationsCreated).toBe(0);
    expect(summary.newApplicationSuggestions).toBe(0);
    expect(summary.skipped).toBe(1);

    const application = await prisma.application.findFirst({ where: { company: { name: companyName } } });
    expect(application).toBeNull();
  });

  it("does not recreate or re-suggest a new application on a repeated scan", async () => {
    const companyName = newApplicationCandidateName("Dup New App");
    createdCompanyNames.push(companyName);
    const messageId = `msg-newapp-dup-${Date.now()}-${Math.random()}`;
    createdMessageIds.push(messageId);

    mockGmailInbox([
      gmailMessage(messageId, `Thank you for applying to ${companyName}`, "no-reply@example.com", "..."),
    ]);
    parseStatusEmailMock.mockResolvedValue({
      companyName,
      detectedStatus: "applied",
      confidence: "high",
    });
    extractRoleFromApplicationEmailMock.mockResolvedValue({
      role: "Software Engineer",
      confidence: "high",
    });

    await scanGmailForStatusUpdates();
    await scanGmailForStatusUpdates();

    const applicationCount = await prisma.application.count({ where: { company: { name: companyName } } });
    expect(applicationCount).toBe(1);
    expect(parseStatusEmailMock).toHaveBeenCalledTimes(1);
    expect(extractRoleFromApplicationEmailMock).toHaveBeenCalledTimes(1);
  });
});
