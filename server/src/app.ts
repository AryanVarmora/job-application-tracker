import express from "express";
import cors from "cors";
import { applicationsRouter } from "./routes/applications";
import { digestRouter } from "./routes/digest";
import { outreachRouter } from "./routes/outreach";
import { authRouter } from "./routes/auth";
import { gmailRouter } from "./routes/gmail";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

export function createApp() {
  const app = express();

  app.use(cors({ origin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173" }));
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/applications", applicationsRouter);
  app.use("/digest", digestRouter);
  app.use("/outreach", outreachRouter);
  app.use("/auth", authRouter);
  app.use("/gmail", gmailRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
