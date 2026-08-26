import { Router } from "express";
import path from "node:path";
import fs from "node:fs/promises";
import { prisma } from "../lib/prisma";
import { validateBody, validateParams } from "../middleware/validate";
import { HttpError } from "../middleware/errorHandler";
import { resumeUpload } from "../middleware/resumeUpload";
import {
  applicationIdParamSchema,
  createApplicationSchema,
  updateApplicationSchema,
} from "../validation/application";
import { analyzeApplicationSchema } from "../validation/analyze";
import { applySuggestedStatusSchema, parseEmailSchema } from "../validation/email";
import { parseJobUrlSchema } from "../validation/jobUrl";
import { analyzeJobDescription, parseStatusEmail } from "../services/jobAnalysis";
import { parseJobPostingFromUrl } from "../services/jobUrlImport";
import { computeMatchScore } from "../services/matchScore";
import { suggestResumeVariant } from "../services/resumeVariants";
import { findBestCompanyMatch } from "../services/companyMatch";
import { purgeExpiredResumeFiles } from "../services/resumeExpiry";
import {
  deleteResumeFileFromDisk,
  resolveResumePath,
  resumeFileNameFor,
} from "../services/resumeStorage";

export const applicationsRouter = Router();

export const applicationInclude = {
  company: true,
  contacts: true,
} as const;

// GET /applications
applicationsRouter.get("/", async (req, res, next) => {
  try {
    await purgeExpiredResumeFiles();

    const { status } = req.query;
    const where =
      typeof status === "string" && status.length > 0 ? { status: status as any } : {};

    const applications = await prisma.application.findMany({
      where,
      include: applicationInclude,
      orderBy: { appliedDate: "desc" },
    });
    res.json(applications);
  } catch (err) {
    next(err);
  }
});

// GET /applications/:id
applicationsRouter.get(
  "/:id",
  validateParams(applicationIdParamSchema),
  async (req, res, next) => {
    try {
      await purgeExpiredResumeFiles();

      const application = await prisma.application.findUnique({
        where: { id: req.params.id },
        include: applicationInclude,
      });
      if (!application) {
        throw new HttpError(404, "Application not found");
      }
      res.json(application);
    } catch (err) {
      next(err);
    }
  }
);

// POST /applications
applicationsRouter.post(
  "/",
  validateBody(createApplicationSchema),
  async (req, res, next) => {
    try {
      const { companyName, industry, companySize, jobUrl, ...rest } = req.body;

      const company = await prisma.company.upsert({
        where: { name: companyName },
        update: {
          ...(industry !== undefined ? { industry } : {}),
          ...(companySize !== undefined ? { size: companySize } : {}),
        },
        create: {
          name: companyName,
          industry: industry ?? null,
          size: companySize ?? null,
        },
      });

      const application = await prisma.application.create({
        data: {
          ...rest,
          jobUrl: jobUrl || null,
          companyId: company.id,
        },
        include: applicationInclude,
      });

      res.status(201).json(application);
    } catch (err) {
      next(err);
    }
  }
);

// POST /applications/parse-email
// Read-only: parses the email and (if a matching application is found) proposes a
// status update, but never writes to the database. Confirming the suggestion is a
// separate explicit call to POST /applications/:id/apply-suggested-status.
applicationsRouter.post(
  "/parse-email",
  validateBody(parseEmailSchema),
  async (req, res, next) => {
    try {
      const { subject, body } = req.body;
      const emailText = subject ? `Subject: ${subject}\n\n${body}` : body;

      const extraction = await parseStatusEmail(emailText);

      const applications = await prisma.application.findMany({
        include: applicationInclude,
        orderBy: { appliedDate: "desc" },
      });

      const match = extraction.companyName
        ? findBestCompanyMatch(
            extraction.companyName,
            applications.map((a) => ({ applicationId: a.id, companyName: a.company.name }))
          )
        : null;

      if (!match) {
        res.json({
          matchedApplicationId: null,
          extractedCompanyName: extraction.companyName || null,
          detectedStatus: extraction.detectedStatus,
          confidence: extraction.confidence,
        });
        return;
      }

      const matchedApplication = applications.find((a) => a.id === match.applicationId)!;

      res.json({
        matchedApplicationId: matchedApplication.id,
        matchedCompanyName: matchedApplication.company.name,
        currentStatus: matchedApplication.status,
        suggestedStatus: extraction.detectedStatus,
        confidence: extraction.confidence,
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /applications/parse-url
// Read-only: fetches a job posting URL server-side, strips it to readable text, and runs it
// through the same AI extraction pipeline as /analyze plus company/role/description extraction,
// so the "New Application" modal can auto-fill from a pasted URL in one call. Never writes to
// the database.
applicationsRouter.post(
  "/parse-url",
  validateBody(parseJobUrlSchema),
  async (req, res, next) => {
    try {
      const extraction = await parseJobPostingFromUrl(req.body.url);
      res.json(extraction);
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /applications/:id
applicationsRouter.patch(
  "/:id",
  validateParams(applicationIdParamSchema),
  validateBody(updateApplicationSchema),
  async (req, res, next) => {
    try {
      const { companyName, industry, companySize, jobUrl, ...rest } = req.body;

      const existing = await prisma.application.findUnique({
        where: { id: req.params.id },
      });
      if (!existing) {
        throw new HttpError(404, "Application not found");
      }

      let companyId = existing.companyId;
      if (companyName !== undefined || industry !== undefined || companySize !== undefined) {
        const targetName = companyName ?? (await prisma.company.findUniqueOrThrow({
          where: { id: existing.companyId },
        })).name;

        const company = await prisma.company.upsert({
          where: { name: targetName },
          update: {
            ...(industry !== undefined ? { industry } : {}),
            ...(companySize !== undefined ? { size: companySize } : {}),
          },
          create: {
            name: targetName,
            industry: industry ?? null,
            size: companySize ?? null,
          },
        });
        companyId = company.id;
      }

      const application = await prisma.application.update({
        where: { id: req.params.id },
        data: {
          ...rest,
          ...(jobUrl !== undefined ? { jobUrl: jobUrl || null } : {}),
          ...(rest.status !== undefined && rest.status !== existing.status
            ? { statusChangedAt: new Date() }
            : {}),
          companyId,
        },
        include: applicationInclude,
      });

      res.json(application);
    } catch (err) {
      next(err);
    }
  }
);

// POST /applications/:id/analyze
applicationsRouter.post(
  "/:id/analyze",
  validateParams(applicationIdParamSchema),
  validateBody(analyzeApplicationSchema),
  async (req, res, next) => {
    try {
      const existing = await prisma.application.findUnique({
        where: { id: req.params.id },
      });
      if (!existing) {
        throw new HttpError(404, "Application not found");
      }
      if (!existing.analyzeEnabled) {
        throw new HttpError(
          400,
          "Analyze fit with AI is turned off for this application. Enable the toggle before analyzing."
        );
      }

      const { jobDescription } = req.body;
      const analysis = await analyzeJobDescription(jobDescription);

      const userSkills = await prisma.userSkill.findMany({
        include: { skill: true },
      });
      const userSkillNames = userSkills.map((us) => us.skill.name);

      const breakdown = computeMatchScore({
        requiredSkills: analysis.requiredSkills,
        preferredSkills: analysis.preferredSkills,
        userSkills: userSkillNames,
      });

      const application = await prisma.application.update({
        where: { id: req.params.id },
        data: {
          jobDescriptionText: jobDescription,
          extractedRequiredSkills: analysis.requiredSkills,
          extractedPreferredSkills: analysis.preferredSkills,
          seniorityLevel: analysis.seniorityLevel,
          roleSummary: analysis.summary,
          fitScore: breakdown.fitScore,
          matchBreakdown: { ...breakdown },
          analyzedAt: new Date(),
        },
        include: applicationInclude,
      });

      res.json(application);
    } catch (err) {
      next(err);
    }
  }
);

// POST /applications/:id/apply-suggested-status
// The explicit confirm step for a POST /applications/parse-email suggestion — nothing
// is written to the database until this is called.
applicationsRouter.post(
  "/:id/apply-suggested-status",
  validateParams(applicationIdParamSchema),
  validateBody(applySuggestedStatusSchema),
  async (req, res, next) => {
    try {
      const existing = await prisma.application.findUnique({
        where: { id: req.params.id },
      });
      if (!existing) {
        throw new HttpError(404, "Application not found");
      }

      const application = await prisma.application.update({
        where: { id: req.params.id },
        data: { status: req.body.status },
        include: applicationInclude,
      });

      res.json(application);
    } catch (err) {
      next(err);
    }
  }
);

// GET /applications/:id/resume-suggestion
applicationsRouter.get(
  "/:id/resume-suggestion",
  validateParams(applicationIdParamSchema),
  async (req, res, next) => {
    try {
      const application = await prisma.application.findUnique({
        where: { id: req.params.id },
      });
      if (!application) {
        throw new HttpError(404, "Application not found");
      }
      if (!application.matchBreakdown) {
        throw new HttpError(
          400,
          "Application has not been analyzed yet. Call POST /applications/:id/analyze first."
        );
      }

      const breakdown = application.matchBreakdown as {
        matchedRequired: string[];
        matchedPreferred: string[];
      };
      const matchedSkills = [...breakdown.matchedRequired, ...breakdown.matchedPreferred];

      const suggestion = suggestResumeVariant(matchedSkills);
      res.json(suggestion);
    } catch (err) {
      next(err);
    }
  }
);

// POST /applications/:id/resume
// Replaces any existing resume file for this application (even one with a different
// extension) - only ever one resume on disk per application at a time.
applicationsRouter.post(
  "/:id/resume",
  validateParams(applicationIdParamSchema),
  resumeUpload.single("resume"),
  async (req, res, next) => {
    try {
      const existing = await prisma.application.findUnique({
        where: { id: req.params.id },
      });
      if (!existing) {
        throw new HttpError(404, "Application not found");
      }
      if (!req.file) {
        throw new HttpError(400, "No file uploaded (expected a 'resume' form field)");
      }

      const ext = path.extname(req.file.originalname).toLowerCase();
      const fileName = resumeFileNameFor(existing.id, ext);

      if (existing.resumeFilePath) {
        await deleteResumeFileFromDisk(existing.resumeFilePath);
      }
      await fs.writeFile(resolveResumePath(fileName), req.file.buffer);

      const application = await prisma.application.update({
        where: { id: existing.id },
        data: { resumeFilePath: fileName, resumeFileUploadedAt: new Date() },
        include: applicationInclude,
      });

      res.json(application);
    } catch (err) {
      next(err);
    }
  }
);

// GET /applications/:id/resume
applicationsRouter.get(
  "/:id/resume",
  validateParams(applicationIdParamSchema),
  async (req, res, next) => {
    try {
      await purgeExpiredResumeFiles();

      const application = await prisma.application.findUnique({
        where: { id: req.params.id },
      });
      if (!application?.resumeFilePath) {
        throw new HttpError(404, "No resume file found for this application");
      }

      const ext = path.extname(application.resumeFilePath);
      const downloadName = `${application.resumeVariant ?? "resume"}${ext}`;

      res.download(resolveResumePath(application.resumeFilePath), downloadName, (err) => {
        if (err && !res.headersSent) {
          next(new HttpError(404, "Resume file not found on disk"));
        }
      });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /applications/:id/resume
applicationsRouter.delete(
  "/:id/resume",
  validateParams(applicationIdParamSchema),
  async (req, res, next) => {
    try {
      const existing = await prisma.application.findUnique({
        where: { id: req.params.id },
      });
      if (!existing) {
        throw new HttpError(404, "Application not found");
      }
      if (!existing.resumeFilePath) {
        throw new HttpError(404, "No resume file to delete");
      }

      await deleteResumeFileFromDisk(existing.resumeFilePath);
      await prisma.application.update({
        where: { id: existing.id },
        data: { resumeFilePath: null, resumeFileUploadedAt: null },
      });

      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /applications/:id
applicationsRouter.delete(
  "/:id",
  validateParams(applicationIdParamSchema),
  async (req, res, next) => {
    try {
      const existing = await prisma.application.findUnique({
        where: { id: req.params.id },
      });
      if (!existing) {
        throw new HttpError(404, "Application not found");
      }
      // Once the row is gone, purgeExpiredResumeFiles can never find this resume file again
      // to clean it up - it has to happen here, or it leaks on disk permanently.
      if (existing.resumeFilePath) {
        await deleteResumeFileFromDisk(existing.resumeFilePath);
      }
      await prisma.application.delete({ where: { id: req.params.id } });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);
