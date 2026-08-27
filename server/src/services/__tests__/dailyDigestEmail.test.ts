import { describe, expect, it } from "vitest";
import { buildDigestEmailContent } from "../dailyDigestEmail";

describe("buildDigestEmailContent", () => {
  it("includes the date, all four counts, and the app link in the body", () => {
    const { subject, text } = buildDigestEmailContent({
      date: "2026-08-27",
      applicationsCreated: 3,
      rejections: 1,
      messagesSent: 2,
      pendingSuggestions: 4,
      appUrl: "https://trysentinelai.vercel.app",
    });

    expect(subject).toContain("2026-08-27");
    expect(text).toContain("Applications: 3");
    expect(text).toContain("Rejections: 1");
    expect(text).toContain("Messages sent: 2");
    expect(text).toContain("Pending Gmail suggestions: 4");
    expect(text).toContain("https://trysentinelai.vercel.app");
  });

  it("reports a pending-suggestions count of 0 explicitly rather than omitting the line", () => {
    const { text } = buildDigestEmailContent({
      date: "2026-08-27",
      applicationsCreated: 0,
      rejections: 0,
      messagesSent: 0,
      pendingSuggestions: 0,
      appUrl: "https://trysentinelai.vercel.app",
    });

    expect(text).toContain("Pending Gmail suggestions: 0");
  });
});
