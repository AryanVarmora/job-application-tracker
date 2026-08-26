import { prisma } from "../lib/prisma";
import { deleteResumeFileFromDisk } from "./resumeStorage";

const EXPIRY_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

// Check-on-read cleanup rather than a real cron job: called at the top of the application
// read routes so an expired resume is never served or shown as still present, without
// needing a scheduler process. Mirrors outreachExpiry.ts's purgeExpiredOutreachContacts.
export async function purgeExpiredResumeFiles(now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - EXPIRY_WINDOW_MS);
  const expired = await prisma.application.findMany({
    where: {
      resumeFilePath: { not: null },
      resumeFileUploadedAt: { lt: cutoff },
    },
    select: { id: true, resumeFilePath: true },
  });

  if (expired.length === 0) return 0;

  for (const application of expired) {
    await deleteResumeFileFromDisk(application.resumeFilePath!);
  }

  const result = await prisma.application.updateMany({
    where: { id: { in: expired.map((a) => a.id) } },
    data: { resumeFilePath: null, resumeFileUploadedAt: null },
  });
  return result.count;
}
