import { afterAll, describe, expect, it, vi } from "vitest";
import request from "supertest";

// Stubs the AI call so this test never depends on Ollama/Gemini being reachable -
// it's only exercising the analyzeEnabled gate, not the analysis itself.
vi.mock("../services/jobAnalysis", () => ({
  analyzeJobDescription: vi.fn(async () => ({
    requiredSkills: ["TypeScript"],
    preferredSkills: [],
    seniorityLevel: "mid",
    summary: "A mid-level role. Focused on TypeScript.",
  })),
}));

import { createApp } from "../app";
import { prisma } from "../lib/prisma";

const app = createApp();
const createdCompanyNames: string[] = [];

afterAll(async () => {
  await prisma.application.deleteMany({
    where: { company: { name: { in: createdCompanyNames } } },
  });
  await prisma.company.deleteMany({ where: { name: { in: createdCompanyNames } } });
  await prisma.$disconnect();
});

async function createApplication(overrides: Record<string, unknown> = {}) {
  const companyName = `Analyze Toggle Co ${Date.now()}-${Math.random()}`;
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

describe("analyzeEnabled toggle", () => {
  it("defaults to off and shows no fit score on the created record", async () => {
    const createRes = await createApplication();
    expect(createRes.status).toBe(201);
    expect(createRes.body.analyzeEnabled).toBe(false);
    expect(createRes.body.fitScore).toBeNull();
  });

  it("rejects POST /applications/:id/analyze when the toggle is off", async () => {
    const createRes = await createApplication({ analyzeEnabled: false });
    const applicationId = createRes.body.id as string;

    const analyzeRes = await request(app)
      .post(`/applications/${applicationId}/analyze`)
      .send({ jobDescription: "We need a TypeScript engineer." });

    expect(analyzeRes.status).toBe(400);
    expect(analyzeRes.body.error).toMatch(/turned off/i);
  });

  it("allows POST /applications/:id/analyze when the toggle is on", async () => {
    const createRes = await createApplication({ analyzeEnabled: true });
    expect(createRes.body.analyzeEnabled).toBe(true);
    const applicationId = createRes.body.id as string;

    const analyzeRes = await request(app)
      .post(`/applications/${applicationId}/analyze`)
      .send({ jobDescription: "We need a TypeScript engineer." });

    expect(analyzeRes.status).toBe(200);
    expect(analyzeRes.body.fitScore).toBeTypeOf("number");
  });

  it("can be flipped on later via PATCH", async () => {
    const createRes = await createApplication();
    const applicationId = createRes.body.id as string;

    const patchRes = await request(app)
      .patch(`/applications/${applicationId}`)
      .send({ analyzeEnabled: true });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.analyzeEnabled).toBe(true);

    const analyzeRes = await request(app)
      .post(`/applications/${applicationId}/analyze`)
      .send({ jobDescription: "We need a TypeScript engineer." });
    expect(analyzeRes.status).toBe(200);
  });
});
