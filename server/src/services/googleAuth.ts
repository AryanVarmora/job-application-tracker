import { OAuth2Client } from "google-auth-library";
import { google, type gmail_v1 } from "googleapis";
import { HttpError } from "../middleware/errorHandler";
import { prisma } from "../lib/prisma";
import { requiredEnv } from "../lib/env";

// Isolated from gmailScan.ts on purpose: this file only ever deals with acquiring and
// storing Google credentials, never with what we do with them once we have a client.
const GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";
// Needed to send the daily digest email (see services/dailyDigestEmail.ts). Anyone who
// authorized before this scope was added needs to reconnect - Google doesn't grant a new
// scope onto an already-issued refresh token, even with prompt=consent on the next run.
const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";

export function createOAuth2Client(): OAuth2Client {
  return new OAuth2Client(
    requiredEnv("GOOGLE_CLIENT_ID"),
    requiredEnv("GOOGLE_CLIENT_SECRET"),
    requiredEnv("GOOGLE_REDIRECT_URI")
  );
}

// access_type=offline + prompt=consent together guarantee a refresh_token comes back.
// Google only issues one on a user's very first consent otherwise - without prompt=consent,
// reconnecting after revoking access at myaccount.google.com would silently stop working.
export function getGoogleAuthUrl(): string {
  const client = createOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [GMAIL_READONLY_SCOPE, GMAIL_SEND_SCOPE],
  });
}

async function storeRefreshToken(refreshToken: string): Promise<void> {
  const existing = await prisma.googleAuthToken.findFirst();
  if (existing) {
    await prisma.googleAuthToken.update({ where: { id: existing.id }, data: { refreshToken } });
  } else {
    await prisma.googleAuthToken.create({ data: { refreshToken } });
  }
}

export async function exchangeCodeForTokens(code: string): Promise<void> {
  const client = createOAuth2Client();
  const { tokens } = await client.getToken(code);

  if (!tokens.refresh_token) {
    throw new HttpError(
      400,
      "Google didn't return a refresh token. Revoke this app's access at " +
        "https://myaccount.google.com/permissions and try connecting again."
    );
  }

  await storeRefreshToken(tokens.refresh_token);
}

export async function hasStoredRefreshToken(): Promise<boolean> {
  return (await prisma.googleAuthToken.findFirst()) !== null;
}

// The googleapis client refreshes the access token from the stored refresh token
// transparently on each call - no manual expiry tracking needed here.
export async function getAuthorizedGmailClient(): Promise<gmail_v1.Gmail> {
  const stored = await prisma.googleAuthToken.findFirst();
  if (!stored) {
    throw new HttpError(400, "Gmail is not connected. Visit GET /auth/google first.");
  }

  const client = createOAuth2Client();
  client.setCredentials({ refresh_token: stored.refreshToken });

  return google.gmail({ version: "v1", auth: client });
}
