import fs from "node:fs";
import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../app";
import { prisma } from "../lib/prisma";
import { resolveResumePath } from "../services/resumeStorage";

const app = createApp();
const createdCompanyNames: string[] = [];
const createdApplicationIds: string[] = [];

afterAll(async () => {
  await prisma.application.deleteMany({
    where: { company: { name: { in: createdCompanyNames } } },
  });
  await prisma.company.deleteMany({ where: { name: { in: createdCompanyNames } } });
  await prisma.$disconnect();

  // Uploaded test files aren't always cleared via the DELETE endpoint within a test
  // (e.g. "replace" leaves the newest extension on disk) - sweep both possible
  // extensions for every application this file created so nothing orphans on disk.
  for (const id of createdApplicationIds) {
    for (const ext of [".pdf", ".docx"]) {
      fs.rmSync(resolveResumePath(`${id}${ext}`), { force: true });
    }
  }
});

async function createApplication(label: string) {
  const companyName = `Resume Route Test ${label} ${Date.now()}-${Math.random()}`;
  createdCompanyNames.push(companyName);

  const res = await request(app).post("/applications").send({
    companyName,
    role: "SWE",
    appliedDate: "2026-08-01",
    resumeVariant: "SWE",
  });
  expect(res.status).toBe(201);
  createdApplicationIds.push(res.body.id);
  return res.body.id as string;
}

describe("POST /applications/:id/resume", () => {
  it("uploads a PDF and stores the path + timestamp", async () => {
    const applicationId = await createApplication("upload-pdf");

    const res = await request(app)
      .post(`/applications/${applicationId}/resume`)
      .attach("resume", Buffer.from("%PDF-1.4 fake pdf"), {
        filename: "resume.pdf",
        contentType: "application/pdf",
      });

    expect(res.status).toBe(200);
    expect(res.body.resumeFilePath).toBe(`${applicationId}.pdf`);
    expect(res.body.resumeFileUploadedAt).toBeTruthy();
    expect(fs.existsSync(resolveResumePath(`${applicationId}.pdf`))).toBe(true);
  });

  it("uploads a DOCX file", async () => {
    const applicationId = await createApplication("upload-docx");

    const res = await request(app)
      .post(`/applications/${applicationId}/resume`)
      .attach("resume", Buffer.from("fake docx bytes"), {
        filename: "resume.docx",
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

    expect(res.status).toBe(200);
    expect(res.body.resumeFilePath).toBe(`${applicationId}.docx`);
  });

  it("rejects a non-PDF/DOCX file", async () => {
    const applicationId = await createApplication("reject-type");

    const res = await request(app)
      .post(`/applications/${applicationId}/resume`)
      .attach("resume", Buffer.from("just text"), {
        filename: "resume.txt",
        contentType: "text/plain",
      });

    expect(res.status).toBe(400);
  });

  it("rejects a file over the 5MB cap", async () => {
    const applicationId = await createApplication("reject-size");
    const oversized = Buffer.alloc(5 * 1024 * 1024 + 1);

    const res = await request(app)
      .post(`/applications/${applicationId}/resume`)
      .attach("resume", oversized, { filename: "resume.pdf", contentType: "application/pdf" });

    expect(res.status).toBe(400);
  });

  it("replaces a previous resume, deleting the old file from disk when the extension changes", async () => {
    const applicationId = await createApplication("replace");

    await request(app)
      .post(`/applications/${applicationId}/resume`)
      .attach("resume", Buffer.from("first pdf"), {
        filename: "first.pdf",
        contentType: "application/pdf",
      });
    expect(fs.existsSync(resolveResumePath(`${applicationId}.pdf`))).toBe(true);

    const res = await request(app)
      .post(`/applications/${applicationId}/resume`)
      .attach("resume", Buffer.from("second docx"), {
        filename: "second.docx",
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

    expect(res.status).toBe(200);
    expect(res.body.resumeFilePath).toBe(`${applicationId}.docx`);
    expect(fs.existsSync(resolveResumePath(`${applicationId}.pdf`))).toBe(false);
    expect(fs.existsSync(resolveResumePath(`${applicationId}.docx`))).toBe(true);
  });

  it("404s for an unknown application id", async () => {
    const res = await request(app)
      .post("/applications/00000000-0000-0000-0000-000000000000/resume")
      .attach("resume", Buffer.from("bytes"), {
        filename: "resume.pdf",
        contentType: "application/pdf",
      });
    expect(res.status).toBe(404);
  });
});

describe("GET /applications/:id/resume", () => {
  it("streams the file back for download", async () => {
    const applicationId = await createApplication("download");
    const content = "the actual resume bytes";

    await request(app)
      .post(`/applications/${applicationId}/resume`)
      .attach("resume", Buffer.from(content), {
        filename: "resume.pdf",
        contentType: "application/pdf",
      });

    const res = await request(app).get(`/applications/${applicationId}/resume`);
    expect(res.status).toBe(200);
    expect(Buffer.isBuffer(res.body) ? res.body.toString() : res.text).toBe(content);
  });

  it("404s when no resume has been uploaded", async () => {
    const applicationId = await createApplication("no-resume");
    const res = await request(app).get(`/applications/${applicationId}/resume`);
    expect(res.status).toBe(404);
  });
});

describe("DELETE /applications/:id/resume", () => {
  it("deletes the file from disk and clears the DB fields", async () => {
    const applicationId = await createApplication("manual-delete");

    await request(app)
      .post(`/applications/${applicationId}/resume`)
      .attach("resume", Buffer.from("bytes"), {
        filename: "resume.pdf",
        contentType: "application/pdf",
      });
    expect(fs.existsSync(resolveResumePath(`${applicationId}.pdf`))).toBe(true);

    const deleteRes = await request(app).delete(`/applications/${applicationId}/resume`);
    expect(deleteRes.status).toBe(204);
    expect(fs.existsSync(resolveResumePath(`${applicationId}.pdf`))).toBe(false);

    const application = await prisma.application.findUniqueOrThrow({
      where: { id: applicationId },
    });
    expect(application.resumeFilePath).toBeNull();
    expect(application.resumeFileUploadedAt).toBeNull();

    const getRes = await request(app).get(`/applications/${applicationId}/resume`);
    expect(getRes.status).toBe(404);
  });

  it("404s when there is no resume to delete", async () => {
    const applicationId = await createApplication("nothing-to-delete");
    const res = await request(app).delete(`/applications/${applicationId}/resume`);
    expect(res.status).toBe(404);
  });
});

describe("DELETE /applications/:id", () => {
  it("also removes the application's resume file from disk, not just the row", async () => {
    const applicationId = await createApplication("delete-application-cascade");

    await request(app)
      .post(`/applications/${applicationId}/resume`)
      .attach("resume", Buffer.from("bytes"), {
        filename: "resume.pdf",
        contentType: "application/pdf",
      });
    expect(fs.existsSync(resolveResumePath(`${applicationId}.pdf`))).toBe(true);

    const res = await request(app).delete(`/applications/${applicationId}`);
    expect(res.status).toBe(204);
    expect(fs.existsSync(resolveResumePath(`${applicationId}.pdf`))).toBe(false);
  });
});
