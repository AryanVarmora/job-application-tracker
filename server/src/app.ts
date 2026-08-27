import express from "express";
import cors from "cors";
import { applicationsRouter } from "./routes/applications";
import { digestRouter } from "./routes/digest";
import { outreachRouter } from "./routes/outreach";
import { authRouter } from "./routes/auth";
import { gmailRouter } from "./routes/gmail";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

// Vercel names preview/branch deployments "<project>-<hash>-aryan-varmoras-projects.vercel.app".
// Matching that suffix lets new preview URLs work without touching CLIENT_ORIGIN on Render,
// while staying scoped to this Vercel account instead of allowing all of *.vercel.app.
const VERCEL_PREVIEW_ORIGIN = /^https:\/\/[a-z0-9-]+-aryan-varmoras-projects\.vercel\.app$/;

const staticAllowedOrigins = new Set(
  ["https://trysentinelai.vercel.app", process.env.CLIENT_ORIGIN, "http://localhost:5173"].filter(
    (origin): origin is string => Boolean(origin)
  )
);

function isAllowedOrigin(origin: string): boolean {
  return staticAllowedOrigins.has(origin) || VERCEL_PREVIEW_ORIGIN.test(origin);
}

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || isAllowedOrigin(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} is not allowed by CORS`));
        }
      },
    })
  );
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
