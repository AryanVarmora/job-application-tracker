import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../lib/prisma";
import { purgeExpiredOutreachContacts } from "../services/outreachExpiry";

const createdIds: string[] = [];

afterAll(async () => {
  await prisma.outreachContact.deleteMany({ where: { id: { in: createdIds } } });
  await prisma.$disconnect();
});

const DAY_MS = 24 * 60 * 60 * 1000;

async function seed(personName: string, daysAgo: number, isLead: boolean) {
  const contact = await prisma.outreachContact.create({
    data: {
      personName,
      platform: "linkedin",
      isLead,
      messagedAt: new Date(Date.now() - daysAgo * DAY_MS),
    },
  });
  createdIds.push(contact.id);
  return contact;
}

async function stillExists(id: string): Promise<boolean> {
  return (await prisma.outreachContact.findUnique({ where: { id } })) !== null;
}

describe("purgeExpiredOutreachContacts", () => {
  it("deletes non-leads older than 7 days, keeps everything else", async () => {
    const now = new Date();
    const tag = `${Date.now()}-${Math.random()}`;

    const expiredNonLead = await seed(`Expiry Test ${tag} expired-non-lead`, 8, false);
    const justPastCutoff = await seed(`Expiry Test ${tag} just-past-cutoff`, 7.1, false);
    const freshNonLead = await seed(`Expiry Test ${tag} fresh-non-lead`, 6, false);
    const justBeforeCutoff = await seed(`Expiry Test ${tag} just-before-cutoff`, 6.9, false);
    const oldLead = await seed(`Expiry Test ${tag} old-lead`, 30, true);

    const deletedCount = await purgeExpiredOutreachContacts(now);

    expect(deletedCount).toBeGreaterThanOrEqual(2);
    expect(await stillExists(expiredNonLead.id)).toBe(false);
    expect(await stillExists(justPastCutoff.id)).toBe(false);
    expect(await stillExists(freshNonLead.id)).toBe(true);
    expect(await stillExists(justBeforeCutoff.id)).toBe(true);
    expect(await stillExists(oldLead.id)).toBe(true);
  });

  it("never deletes a lead regardless of age", async () => {
    const tag = `${Date.now()}-${Math.random()}`;
    const ancientLead = await seed(`Expiry Test ${tag} ancient-lead`, 365, true);

    await purgeExpiredOutreachContacts(new Date());

    expect(await stillExists(ancientLead.id)).toBe(true);
  });

  it("is exercised automatically by GET /outreach (check-on-read)", async () => {
    const { createApp } = await import("../app");
    const request = (await import("supertest")).default;
    const app = createApp();

    const tag = `${Date.now()}-${Math.random()}`;
    const expired = await seed(`Expiry Test ${tag} via-http`, 10, false);

    const res = await request(app).get("/outreach");
    expect(res.status).toBe(200);
    expect(await stillExists(expired.id)).toBe(false);
  });
});
