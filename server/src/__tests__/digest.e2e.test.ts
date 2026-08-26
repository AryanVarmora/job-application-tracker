import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";

import { createApp } from "../app";
import { prisma } from "../lib/prisma";

const app = createApp();
const createdCompanyNames: string[] = [];
const createdOutreachIds: string[] = [];

afterAll(async () => {
  await prisma.application.deleteMany({
    where: { company: { name: { in: createdCompanyNames } } },
  });
  await prisma.company.deleteMany({ where: { name: { in: createdCompanyNames } } });
  await prisma.outreachContact.deleteMany({ where: { id: { in: createdOutreachIds } } });
  await prisma.$disconnect();
});

async function createApplication(overrides: Record<string, unknown> = {}) {
  const companyName = `Digest Co ${Date.now()}-${Math.random()}`;
  createdCompanyNames.push(companyName);
  const res = await request(app)
    .post("/applications")
    .send({
      companyName,
      role: "Software Engineer",
      appliedDate: "2026-08-01",
      status: "applied",
      ...overrides,
    });
  return res;
}

describe("GET /digest/today", () => {
  it("returns today's date and a numeric messagesSent count", async () => {
    const res = await request(app).get("/digest/today");
    expect(res.status).toBe(200);
    expect(res.body.date).toBe(new Date().toISOString().slice(0, 10));
    expect(res.body.messagesSent).toBeTypeOf("number");
  });

  it("counts an outreach contact created just now toward messagesSent", async () => {
    // >= rather than === : other e2e test files run concurrently against the same
    // database and may log their own outreach contacts in between these calls.
    const before = await request(app).get("/digest/today");
    const baseline = before.body.messagesSent as number;

    const createRes = await request(app)
      .post("/outreach")
      .send({ personName: `Digest Outreach ${Date.now()}`, platform: "linkedin" });
    expect(createRes.status).toBe(201);
    createdOutreachIds.push(createRes.body.id);

    const after = await request(app).get("/digest/today");
    expect(after.body.messagesSent).toBeGreaterThanOrEqual(baseline + 1);
  });

  it("counts an application created just now toward applicationsCreated", async () => {
    // >= rather than === : other e2e test files run concurrently against the same
    // database and may create their own "today" applications in between these calls.
    const before = await request(app).get("/digest/today");
    const baseline = before.body.applicationsCreated as number;

    const createRes = await createApplication();
    expect(createRes.status).toBe(201);

    const after = await request(app).get("/digest/today");
    expect(after.body.applicationsCreated).toBeGreaterThanOrEqual(baseline + 1);
  });

  it("counts a status change to rejected made just now, but not a same-day non-status edit", async () => {
    const createRes = await createApplication();
    const applicationId = createRes.body.id as string;

    const before = await request(app).get("/digest/today");
    const baseline = before.body.rejections as number;

    // Editing notes without touching status must not bump the rejected count.
    await request(app).patch(`/applications/${applicationId}`).send({ notes: "no-op edit" });
    const afterNoop = await request(app).get("/digest/today");
    expect(afterNoop.body.rejections).toBe(baseline);

    await request(app).patch(`/applications/${applicationId}`).send({ status: "rejected" });
    const afterRejected = await request(app).get("/digest/today");
    expect(afterRejected.body.rejections).toBe(baseline + 1);
  });
});
