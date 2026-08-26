import { Router } from "express";
import { prisma } from "../lib/prisma";

export const digestRouter = Router();

// Local calendar-day boundaries (not UTC) so "today" matches the server's local day,
// consistent with how the client treats "today" for the applied-date field.
function todayBounds() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

// GET /digest/today
// Live counts computed directly from the Application/OutreachContact tables - no
// historical digest storage.
digestRouter.get("/today", async (_req, res, next) => {
  try {
    const { start, end } = todayBounds();

    const [applicationsCreated, rejections, messagesSent] = await Promise.all([
      prisma.application.count({
        where: { createdAt: { gte: start, lt: end } },
      }),
      prisma.application.count({
        where: { status: "rejected", statusChangedAt: { gte: start, lt: end } },
      }),
      prisma.outreachContact.count({
        where: { createdAt: { gte: start, lt: end } },
      }),
    ]);

    res.json({
      date: start.toISOString().slice(0, 10),
      applicationsCreated,
      rejections,
      messagesSent,
    });
  } catch (err) {
    next(err);
  }
});
