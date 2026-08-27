import { Router } from "express";
import { prisma } from "../lib/prisma";
import { validateParams } from "../middleware/validate";
import { HttpError } from "../middleware/errorHandler";
import { gmailSuggestionIdParamSchema } from "../validation/gmail";
import { scanGmailForStatusUpdates } from "../services/gmailScan";
import { applicationInclude } from "./applications";

export const gmailRouter = Router();

const suggestionInclude = {
  application: { include: applicationInclude },
} as const;

// POST /gmail/scan
gmailRouter.post("/scan", async (_req, res, next) => {
  try {
    const summary = await scanGmailForStatusUpdates();
    console.log(
      `Gmail scan: scanned=${summary.scanned} autoApplied=${summary.autoApplied} ` +
        `pending=${summary.pending} skipped=${summary.skipped} ` +
        `skippedDueToError=${summary.skippedDueToError}`
    );
    res.json(summary);
  } catch (err) {
    console.error("Gmail scan failed:", err);
    next(err);
  }
});

// GET /gmail/suggestions
// Pending medium/low-confidence status-update guesses awaiting confirm/reject. High-
// confidence matches are applied directly during the scan and never appear here.
gmailRouter.get("/suggestions", async (_req, res, next) => {
  try {
    const suggestions = await prisma.gmailSuggestion.findMany({
      include: suggestionInclude,
      orderBy: { createdAt: "desc" },
    });
    res.json(suggestions);
  } catch (err) {
    next(err);
  }
});

// POST /gmail/suggestions/:id/confirm
// Applies the suggestion and removes it - nothing changes until this is called, same
// contract as POST /applications/:id/apply-suggested-status. Branches on suggestion type:
// status_update applies a status to an existing application; new_application creates one.
gmailRouter.post(
  "/suggestions/:id/confirm",
  validateParams(gmailSuggestionIdParamSchema),
  async (req, res, next) => {
    try {
      const suggestion = await prisma.gmailSuggestion.findUnique({
        where: { id: req.params.id },
        include: { application: true },
      });
      if (!suggestion) {
        throw new HttpError(404, "Suggestion not found");
      }

      if (suggestion.type === "new_application") {
        if (!suggestion.companyName || !suggestion.role || !suggestion.appliedDate) {
          throw new HttpError(500, "Malformed new-application suggestion");
        }

        const company = await prisma.company.upsert({
          where: { name: suggestion.companyName },
          update: {},
          create: { name: suggestion.companyName },
        });
        const application = await prisma.application.create({
          data: {
            companyId: company.id,
            role: suggestion.role,
            status: "applied",
            appliedDate: suggestion.appliedDate,
            notes: "Auto-imported from Gmail scan",
          },
          include: applicationInclude,
        });

        await prisma.gmailSuggestion.delete({ where: { id: suggestion.id } });
        res.status(201).json(application);
        return;
      }

      if (!suggestion.applicationId || !suggestion.suggestedStatus || !suggestion.application) {
        throw new HttpError(500, "Malformed status-update suggestion");
      }

      const application = await prisma.application.update({
        where: { id: suggestion.applicationId },
        data: {
          status: suggestion.suggestedStatus,
          ...(suggestion.suggestedStatus !== suggestion.application.status
            ? { statusChangedAt: new Date() }
            : {}),
        },
        include: applicationInclude,
      });

      await prisma.gmailSuggestion.delete({ where: { id: suggestion.id } });

      res.json(application);
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /gmail/suggestions/:id
// Dismisses a suggestion without applying it. The underlying email stays recorded in
// GmailProcessedMessage, so it never resurfaces on a later scan.
gmailRouter.delete(
  "/suggestions/:id",
  validateParams(gmailSuggestionIdParamSchema),
  async (req, res, next) => {
    try {
      const suggestion = await prisma.gmailSuggestion.findUnique({
        where: { id: req.params.id },
      });
      if (!suggestion) {
        throw new HttpError(404, "Suggestion not found");
      }
      await prisma.gmailSuggestion.delete({ where: { id: req.params.id } });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
);
