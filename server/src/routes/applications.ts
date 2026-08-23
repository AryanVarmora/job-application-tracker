import { Router } from "express";
import { prisma } from "../lib/prisma";
import { validateBody, validateParams } from "../middleware/validate";
import { HttpError } from "../middleware/errorHandler";
import {
  applicationIdParamSchema,
  createApplicationSchema,
  updateApplicationSchema,
} from "../validation/application";
import { analyzeApplicationSchema } from "../validation/analyze";
import { analyzeJobDescription } from "../services/jobAnalysis";
import { computeMatchScore } from "../services/matchScore";
import { suggestResumeVariant } from "../services/resumeVariants";

export const applicationsRouter = Router();

const applicationInclude = {
  company: true,
  contacts: true,
} as const;

// GET /applications
applicationsRouter.get("/", async (req, res, next) => {
  try {
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
      await prisma.application.delete({ where: { id: req.params.id } });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);
