import fs from "node:fs";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "../lib/prisma";
import { purgeExpiredResumeFiles } from "../services/resumeExpiry";
import { resolveResumePath } from "../services/resumeStorage";

const createdCompanyNames: string[] = [];
const createdResumeRelativePaths: string[] = [];

afterAll(async () => {
  await prisma.application.deleteMany({
    where: { company: { name: { in: createdCompanyNames } } },
  });
  await prisma.company.deleteMany({ where: { name: { in: createdCompanyNames } } });
  await prisma.$disconnect();

  // Files the purge itself deleted are already gone; this only catches files from
  // cases the purge intentionally leaves alone (e.g. the "kept" boundary case).
  for (const relativePath of createdResumeRelativePaths) {
    fs.rmSync(resolveResumePath(relativePath), { force: true });
  }
});

const DAY_MS = 24 * 60 * 60 * 1000;

// Seeds an application with a real file on disk at RESUME_UPLOAD_DIR/<id>.pdf, so the
// purge test can assert the file is actually unlinked, not just the DB reference cleared.
async function seedWithResumeFile(label: string, daysAgo: number | null) {
  const companyName = `Resume Expiry Test ${label} ${Date.now()}-${Math.random()}`;
  createdCompanyNames.push(companyName);

  const company = await prisma.company.create({ data: { name: companyName } });
  const uploadedAt = daysAgo === null ? null : new Date(Date.now() - daysAgo * DAY_MS);

  const application = await prisma.application.create({
    data: {
      companyId: company.id,
      role: "SWE",
      appliedDate: new Date("2026-08-01"),
      resumeVariant: "SWE",
      resumeFilePath: uploadedAt ? `${company.id}.pdf` : null,
      resumeFileUploadedAt: uploadedAt,
    },
  });

  if (uploadedAt) {
    createdResumeRelativePaths.push(application.resumeFilePath!);
    fs.writeFileSync(resolveResumePath(application.resumeFilePath!), "fake pdf bytes");
  }

  return application;
}

function fileExists(relativePath: string): boolean {
  return fs.existsSync(resolveResumePath(relativePath));
}

describe("purgeExpiredResumeFiles", () => {
  it("keeps a resume uploaded just under 30 days ago", async () => {
    const application = await seedWithResumeFile("just-under", 29.9);

    await purgeExpiredResumeFiles(new Date());

    const reloaded = await prisma.application.findUniqueOrThrow({
      where: { id: application.id },
    });
    expect(reloaded.resumeFilePath).toBe(`${application.companyId}.pdf`);
    expect(reloaded.resumeFileUploadedAt).not.toBeNull();
    expect(fileExists(`${application.companyId}.pdf`)).toBe(true);
  });

  it("deletes a resume uploaded just over 30 days ago, from disk and the DB", async () => {
    const application = await seedWithResumeFile("just-over", 30.1);
    const relativePath = application.resumeFilePath!;
    expect(fileExists(relativePath)).toBe(true);

    const deletedCount = await purgeExpiredResumeFiles(new Date());

    expect(deletedCount).toBeGreaterThanOrEqual(1);
    const reloaded = await prisma.application.findUniqueOrThrow({
      where: { id: application.id },
    });
    expect(reloaded.resumeFilePath).toBeNull();
    expect(reloaded.resumeFileUploadedAt).toBeNull();
    expect(fileExists(relativePath)).toBe(false);
  });

  it("leaves applications with no resume file untouched", async () => {
    const application = await seedWithResumeFile("none", null);

    await purgeExpiredResumeFiles(new Date());

    const reloaded = await prisma.application.findUniqueOrThrow({
      where: { id: application.id },
    });
    expect(reloaded.resumeFilePath).toBeNull();
  });

  it("is exercised automatically by GET /applications/:id (check-on-read)", async () => {
    const { createApp } = await import("../app");
    const request = (await import("supertest")).default;
    const app = createApp();

    const application = await seedWithResumeFile("via-http", 45);
    const relativePath = application.resumeFilePath!;

    const res = await request(app).get(`/applications/${application.id}`);
    expect(res.status).toBe(200);
    expect(res.body.resumeFilePath).toBeNull();
    expect(fileExists(relativePath)).toBe(false);
  });
});
