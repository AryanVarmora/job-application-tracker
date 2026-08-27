import { prisma } from "../lib/prisma";
import { requiredEnv } from "../lib/env";
import { todayBounds } from "../lib/dateRanges";
import { getAuthorizedGmailClient } from "./googleAuth";

// Set to the literal string "false" to turn the daily digest email off without touching any
// code - everything else (the route, the scheduler hitting it) stays in place and just no-ops.
function digestEmailEnabled(): boolean {
  return process.env.DIGEST_EMAIL_ENABLED !== "false";
}

function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

export interface DigestEmailStats {
  date: string;
  applicationsCreated: number;
  rejections: number;
  messagesSent: number;
  pendingSuggestions: number;
  appUrl: string;
}

// Pure and separate from sendDailyDigestEmail below so the content itself is testable
// without touching Prisma or the Gmail API.
export function buildDigestEmailContent(stats: DigestEmailStats): { subject: string; text: string } {
  const { date, applicationsCreated, rejections, messagesSent, pendingSuggestions, appUrl } = stats;

  const subject = `Sentinel Daily Digest — ${date}`;
  const text = [
    `Today's Digest (${date})`,
    "",
    `Applications: ${applicationsCreated}`,
    `Rejections: ${rejections}`,
    `Messages sent: ${messagesSent}`,
    `Pending Gmail suggestions: ${pendingSuggestions}`,
    "",
    `View in Sentinel: ${appUrl}`,
  ].join("\n");

  return { subject, text };
}

// Gmail's API takes a full RFC 2822 message, base64url-encoded, rather than separate
// to/subject/body fields.
function buildRawEmail(to: string, subject: string, text: string): string {
  const message = [`To: ${to}`, `Subject: ${subject}`, `Content-Type: text/plain; charset="UTF-8"`, "", text].join(
    "\r\n"
  );
  return Buffer.from(message, "utf-8").toString("base64url");
}

export type DigestEmailResult =
  | { sent: true }
  | { sent: false; reason: "disabled" | "weekend" };

// now is a parameter (rather than always `new Date()` internally) purely for deterministic
// tests - same convention as scanGmailForStatusUpdates's `now` parameter.
export async function sendDailyDigestEmail(now: Date = new Date()): Promise<DigestEmailResult> {
  if (!digestEmailEnabled()) {
    return { sent: false, reason: "disabled" };
  }
  if (!isWeekday(now)) {
    return { sent: false, reason: "weekend" };
  }

  const { start, end } = todayBounds(now);
  const [applicationsCreated, rejections, messagesSent, pendingSuggestions] = await Promise.all([
    prisma.application.count({ where: { createdAt: { gte: start, lt: end } } }),
    prisma.application.count({ where: { status: "rejected", statusChangedAt: { gte: start, lt: end } } }),
    prisma.outreachContact.count({ where: { createdAt: { gte: start, lt: end } } }),
    prisma.gmailSuggestion.count(),
  ]);

  const { subject, text } = buildDigestEmailContent({
    date: start.toISOString().slice(0, 10),
    applicationsCreated,
    rejections,
    messagesSent,
    pendingSuggestions,
    appUrl: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  });

  const to = requiredEnv("DIGEST_EMAIL_TO");
  const gmail = await getAuthorizedGmailClient();
  await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw: buildRawEmail(to, subject, text) },
  });

  return { sent: true };
}
