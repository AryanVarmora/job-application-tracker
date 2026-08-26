import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "../lib/prisma";

const app = createApp();
const createdCompanyNames: string[] = [];
const createdMessageIds: string[] = [];

afterAll(async () => {
  await prisma.gmailSuggestion.deleteMany({ where: { gmailMessageId: { in: createdMessageIds } } });
  await prisma.application.deleteMany({
    where: { company: { name: { in: createdCompanyNames } } },
  });
  await prisma.company.deleteMany({ where: { name: { in: createdCompanyNames } } });
  await prisma.$disconnect();
});

async function seedApplication() {
  const companyName = `${randomUUID()} Gmail Route Test Co`;
  createdCompanyNames.push(companyName);
  const res = await request(app).post("/applications").send({
    companyName,
    role: "SWE",
    appliedDate: "2026-08-01",
  });
  expect(res.status).toBe(201);
  return res.body as { id: string; status: string; company: { name: string } };
}

async function seedStatusUpdateSuggestion(applicationId: string) {
  const messageId = `msg-route-status-${randomUUID()}`;
  createdMessageIds.push(messageId);
  return prisma.gmailSuggestion.create({
    data: {
      gmailMessageId: messageId,
      type: "status_update",
      applicationId,
      suggestedStatus: "interviewing",
      confidence: "medium",
    },
  });
}

async function seedNewApplicationSuggestion() {
  const companyName = `${randomUUID()} Gmail Route Test New Co`;
  const messageId = `msg-route-newapp-${randomUUID()}`;
  createdMessageIds.push(messageId);
  const suggestion = await prisma.gmailSuggestion.create({
    data: {
      gmailMessageId: messageId,
      type: "new_application",
      companyName,
      role: "Backend Engineer",
      appliedDate: new Date("2026-08-15"),
      confidence: "medium",
    },
  });
  return { suggestion, companyName };
}

describe("GET /gmail/suggestions", () => {
  it("returns both status_update and new_application suggestions", async () => {
    const application = await seedApplication();
    const statusSuggestion = await seedStatusUpdateSuggestion(application.id);
    const { suggestion: newAppSuggestion } = await seedNewApplicationSuggestion();

    const res = await request(app).get("/gmail/suggestions");
    expect(res.status).toBe(200);

    const ids = res.body.map((s: { id: string }) => s.id);
    expect(ids).toContain(statusSuggestion.id);
    expect(ids).toContain(newAppSuggestion.id);

    const returnedStatusSuggestion = res.body.find((s: { id: string }) => s.id === statusSuggestion.id);
    expect(returnedStatusSuggestion.application.id).toBe(application.id);
    expect(returnedStatusSuggestion.suggestedStatus).toBe("interviewing");

    const returnedNewAppSuggestion = res.body.find((s: { id: string }) => s.id === newAppSuggestion.id);
    expect(returnedNewAppSuggestion.application).toBeNull();
    expect(returnedNewAppSuggestion.role).toBe("Backend Engineer");
  });
});

describe("POST /gmail/suggestions/:id/confirm", () => {
  it("creates a new Application for a new_application suggestion, then removes it", async () => {
    const { suggestion, companyName } = await seedNewApplicationSuggestion();

    const res = await request(app).post(`/gmail/suggestions/${suggestion.id}/confirm`);
    expect(res.status).toBe(201);
    expect(res.body.company.name).toBe(companyName);
    expect(res.body.role).toBe("Backend Engineer");
    expect(res.body.status).toBe("applied");
    expect(res.body.notes).toBe("Auto-imported from Gmail scan");
    createdCompanyNames.push(companyName);

    const remaining = await prisma.gmailSuggestion.findUnique({ where: { id: suggestion.id } });
    expect(remaining).toBeNull();
  });

  it("still applies a status_update suggestion to its existing application, then removes it", async () => {
    const application = await seedApplication();
    const suggestion = await seedStatusUpdateSuggestion(application.id);

    const res = await request(app).post(`/gmail/suggestions/${suggestion.id}/confirm`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(application.id);
    expect(res.body.status).toBe("interviewing");

    const remaining = await prisma.gmailSuggestion.findUnique({ where: { id: suggestion.id } });
    expect(remaining).toBeNull();
  });

  it("404s for an unknown suggestion id", async () => {
    const res = await request(app).post(
      "/gmail/suggestions/00000000-0000-0000-0000-000000000000/confirm"
    );
    expect(res.status).toBe(404);
  });
});

describe("DELETE /gmail/suggestions/:id", () => {
  it("dismisses a new_application suggestion without creating anything", async () => {
    const { suggestion, companyName } = await seedNewApplicationSuggestion();

    const res = await request(app).delete(`/gmail/suggestions/${suggestion.id}`);
    expect(res.status).toBe(204);

    const application = await prisma.application.findFirst({ where: { company: { name: companyName } } });
    expect(application).toBeNull();
  });
});
