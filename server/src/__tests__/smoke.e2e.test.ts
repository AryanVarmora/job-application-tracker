import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";

// Exercises the real HTTP + Prisma/Postgres stack end-to-end but stubs the AI
// call so the smoke test never depends on Ollama/Gemini being reachable.
vi.mock("../services/jobAnalysis", () => ({
  analyzeJobDescription: vi.fn(async () => ({
    requiredSkills: ["TypeScript", "PostgreSQL"],
    preferredSkills: ["Docker"],
    seniorityLevel: "mid",
    summary: "A mid-level full-stack role. Focused on TypeScript and PostgreSQL.",
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

describe("smoke: create application -> analyze -> read back", () => {
  it("walks the full create -> paste JD -> analyze -> dashboard-read flow", async () => {
    const companyName = `Smoke Test Co ${Date.now()}`;
    createdCompanyNames.push(companyName);

    // 1. Create an application (mirrors the "create application" step in the UI)
    const createRes = await request(app)
      .post("/applications")
      .send({
        companyName,
        role: "Software Engineer",
        appliedDate: "2026-08-01",
        status: "applied",
        analyzeEnabled: true,
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.id).toBeTruthy();
    const applicationId = createRes.body.id as string;

    // 2. Paste a job description and analyze it
    const analyzeRes = await request(app)
      .post(`/applications/${applicationId}/analyze`)
      .send({ jobDescription: "We need a TypeScript + PostgreSQL engineer, Docker a plus." });
    expect(analyzeRes.status).toBe(200);
    expect(analyzeRes.body.fitScore).toBeTypeOf("number");
    expect(analyzeRes.body.seniorityLevel).toBe("mid");
    expect(analyzeRes.body.extractedRequiredSkills).toEqual(["TypeScript", "PostgreSQL"]);

    // 3. Fetch it back as the dashboard/list view would
    const listRes = await request(app).get("/applications");
    expect(listRes.status).toBe(200);
    const found = listRes.body.find((a: { id: string }) => a.id === applicationId);
    expect(found).toBeTruthy();
    expect(found.fitScore).toBe(analyzeRes.body.fitScore);
    expect(found.company.name).toBe(companyName);

    const getRes = await request(app).get(`/applications/${applicationId}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.roleSummary).toContain("TypeScript");

    // 4. Clean up via the API itself
    const deleteRes = await request(app).delete(`/applications/${applicationId}`);
    expect(deleteRes.status).toBe(204);
  });
});
