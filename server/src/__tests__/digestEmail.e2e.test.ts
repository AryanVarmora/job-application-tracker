import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";

// Same boundary-stubbing approach as gmailScan.e2e.test.ts: exercise the real route/service
// and real Prisma counts, stub only the actual Gmail API client so no email is ever really sent.
const sendMock = vi.fn(async (_args: { userId: string; requestBody: { raw: string } }) => ({
  data: {},
}));

vi.mock("../services/googleAuth", () => ({
  getAuthorizedGmailClient: vi.fn(async () => ({
    users: { messages: { send: sendMock } },
  })),
}));

import { createApp } from "../app";
import { prisma } from "../lib/prisma";
import { sendDailyDigestEmail } from "../services/dailyDigestEmail";

const app = createApp();
const SECRET = process.env.DIGEST_CRON_SECRET as string;

// Fixed reference dates so weekday/weekend behavior doesn't depend on which day this suite
// happens to run - 2026-08-26 is a Wednesday, 2026-08-29 is a Saturday.
const A_WEEKDAY = new Date("2026-08-26T13:00:00.000Z");
const A_WEEKEND_DAY = new Date("2026-08-29T13:00:00.000Z");

beforeAll(() => {
  if (!SECRET) {
    throw new Error("DIGEST_CRON_SECRET must be set in the test environment (see .env)");
  }
});

afterEach(() => {
  sendMock.mockClear();
  vi.unstubAllEnvs();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("GET /digest/send-daily-email", () => {
  it("rejects a missing secret", async () => {
    const res = await request(app).get("/digest/send-daily-email");
    expect(res.status).toBe(401);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("rejects a wrong secret", async () => {
    const res = await request(app).get("/digest/send-daily-email").query({ secret: "wrong" });
    expect(res.status).toBe(401);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("accepts a correct secret via the X-Digest-Secret header and reports a result", async () => {
    const res = await request(app).get("/digest/send-daily-email").set("X-Digest-Secret", SECRET);
    expect(res.status).toBe(200);
    expect(typeof res.body.sent).toBe("boolean");
  });

  it("accepts a correct secret via the query string too", async () => {
    const res = await request(app).get("/digest/send-daily-email").query({ secret: SECRET });
    expect(res.status).toBe(200);
  });

  it("skips sending, without error, when DIGEST_EMAIL_ENABLED=false - even on a weekday", async () => {
    vi.stubEnv("DIGEST_EMAIL_ENABLED", "false");

    const res = await request(app).get("/digest/send-daily-email").query({ secret: SECRET });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ sent: false, reason: "disabled" });
    expect(sendMock).not.toHaveBeenCalled();
  });
});

// Exercises sendDailyDigestEmail directly (rather than through the route) with an injected
// `now`, so weekday/weekend behavior is deterministic regardless of which day this runs on.
describe("sendDailyDigestEmail", () => {
  it("skips on a weekend, without calling Gmail's send API", async () => {
    const result = await sendDailyDigestEmail(A_WEEKEND_DAY);
    expect(result).toEqual({ sent: false, reason: "weekend" });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("skips when disabled, checked before the weekday check", async () => {
    vi.stubEnv("DIGEST_EMAIL_ENABLED", "false");
    const result = await sendDailyDigestEmail(A_WEEKDAY);
    expect(result).toEqual({ sent: false, reason: "disabled" });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("sends on a weekday with the toggle on, addressed to DIGEST_EMAIL_TO", async () => {
    const result = await sendDailyDigestEmail(A_WEEKDAY);

    expect(result).toEqual({ sent: true });
    expect(sendMock).toHaveBeenCalledTimes(1);

    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "me", requestBody: expect.objectContaining({ raw: expect.any(String) }) })
    );
    const call = sendMock.mock.calls[0]?.[0];
    if (!call) throw new Error("sendMock was not called");
    const raw = Buffer.from(call.requestBody.raw, "base64url").toString("utf-8");
    expect(raw).toContain(`To: ${process.env.DIGEST_EMAIL_TO}`);
    expect(raw).toContain("Subject: Sentinel Daily Digest — 2026-08-26");
  });
});
