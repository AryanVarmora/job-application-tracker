import { timingSafeEqual } from "node:crypto";
import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requiredEnv } from "../lib/env";
import { todayBounds } from "../lib/dateRanges";
import { sendDailyDigestEmail } from "../services/dailyDigestEmail";

export const digestRouter = Router();

// Constant-time comparison so a wrong guess can't be narrowed down via response-time
// differences. timingSafeEqual throws on mismatched lengths, so check that up front -
// leaking the secret's length this way is an accepted, standard tradeoff.
function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// GET /digest/today
// Live counts computed directly from the Application/OutreachContact tables - no
// historical digest storage.
digestRouter.get("/today", async (_req, res, next) => {
  try {
    const { start, end } = todayBounds();

    const [applicationsCreated, rejections, messagesSent] = await Promise.all([
      prisma.application.count({
        where: { createdAt: { gte: start, lt: end } },
      }),
      prisma.application.count({
        where: { status: "rejected", statusChangedAt: { gte: start, lt: end } },
      }),
      prisma.outreachContact.count({
        where: { createdAt: { gte: start, lt: end } },
      }),
    ]);

    res.json({
      date: start.toISOString().slice(0, 10),
      applicationsCreated,
      rejections,
      messagesSent,
    });
  } catch (err) {
    next(err);
  }
});

// GET /digest/send-daily-email?secret=...
// Meant to be triggered by an external scheduler (e.g. cron-job.org) hitting this URL on a
// weekday-morning schedule, rather than an in-process cron: Render's free tier spins down
// when idle, and an in-process job scheduled for a specific time would just never fire if
// the dyno happened to be asleep then. An inbound ping here wakes it instead of depending on
// it already being awake. GET (not POST) so the plainest free cron-ping service can hit it.
// Also accepts the secret via X-Digest-Secret so it doesn't have to sit in a logged URL.
digestRouter.get("/send-daily-email", async (req, res, next) => {
  try {
    const expected = requiredEnv("DIGEST_CRON_SECRET");
    const provided = (req.header("x-digest-secret") ?? req.query.secret ?? "").toString();
    if (!provided || !secretMatches(provided, expected)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const result = await sendDailyDigestEmail();
    res.json(result);
  } catch (err) {
    next(err);
  }
});
