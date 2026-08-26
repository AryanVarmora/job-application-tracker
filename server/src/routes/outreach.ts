import { Router } from "express";
import { prisma } from "../lib/prisma";
import { validateBody, validateParams } from "../middleware/validate";
import { HttpError } from "../middleware/errorHandler";
import {
  createOutreachContactSchema,
  outreachIdParamSchema,
  updateOutreachContactSchema,
} from "../validation/outreach";
import { purgeExpiredOutreachContacts } from "../services/outreachExpiry";

export const outreachRouter = Router();

// POST /outreach
// Quick-create: only personName + platform are required, everything else is optional
// so this can be filled out in a few seconds.
outreachRouter.post("/", validateBody(createOutreachContactSchema), async (req, res, next) => {
  try {
    const contact = await prisma.outreachContact.create({ data: req.body });
    res.status(201).json(contact);
  } catch (err) {
    next(err);
  }
});

// GET /outreach?leadsOnly=true
outreachRouter.get("/", async (req, res, next) => {
  try {
    await purgeExpiredOutreachContacts();

    const leadsOnly = req.query.leadsOnly === "true";
    const contacts = await prisma.outreachContact.findMany({
      where: leadsOnly ? { isLead: true } : {},
      orderBy: { messagedAt: "desc" },
    });
    res.json(contacts);
  } catch (err) {
    next(err);
  }
});

// PATCH /outreach/:id
outreachRouter.patch(
  "/:id",
  validateParams(outreachIdParamSchema),
  validateBody(updateOutreachContactSchema),
  async (req, res, next) => {
    try {
      const existing = await prisma.outreachContact.findUnique({
        where: { id: req.params.id },
      });
      if (!existing) {
        throw new HttpError(404, "Outreach contact not found");
      }

      const contact = await prisma.outreachContact.update({
        where: { id: req.params.id },
        data: req.body,
      });
      res.json(contact);
    } catch (err) {
      next(err);
    }
  }
);
