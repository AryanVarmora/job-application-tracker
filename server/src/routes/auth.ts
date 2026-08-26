import { Router } from "express";
import {
  exchangeCodeForTokens,
  getGoogleAuthUrl,
  hasStoredRefreshToken,
} from "../services/googleAuth";

export const authRouter = Router();

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? "http://localhost:5173";

// GET /auth/google
authRouter.get("/google", (_req, res) => {
  res.redirect(getGoogleAuthUrl());
});

// GET /auth/google/callback
// A browser-navigated endpoint (Google redirects here directly), not something the SPA
// fetches - so errors redirect back into the app with a flag rather than going through the
// JSON error middleware, which would otherwise show the user a raw API error page.
authRouter.get("/google/callback", async (req, res) => {
  const code = req.query.code;
  if (typeof code !== "string") {
    res.redirect(`${CLIENT_ORIGIN}?gmail=error`);
    return;
  }

  try {
    await exchangeCodeForTokens(code);
    res.redirect(`${CLIENT_ORIGIN}?gmail=connected`);
  } catch (err) {
    console.error("Google OAuth callback failed:", err);
    res.redirect(`${CLIENT_ORIGIN}?gmail=error`);
  }
});

// GET /auth/google/status
authRouter.get("/google/status", async (_req, res, next) => {
  try {
    const connected = await hasStoredRefreshToken();
    res.json({ connected });
  } catch (err) {
    next(err);
  }
});
