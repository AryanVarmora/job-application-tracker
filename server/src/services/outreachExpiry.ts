import { prisma } from "../lib/prisma";

const EXPIRY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

// Check-on-read cleanup rather than a real cron job: called at the top of GET /outreach
// so stale entries never actually get served, without needing a scheduler process.
// Leads (isLead=true) are exempt regardless of age - only non-leads expire.
export async function purgeExpiredOutreachContacts(now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - EXPIRY_WINDOW_MS);
  const result = await prisma.outreachContact.deleteMany({
    where: {
      isLead: false,
      messagedAt: { lt: cutoff },
    },
  });
  return result.count;
}
