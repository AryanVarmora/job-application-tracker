import fs from "node:fs";
import path from "node:path";

// Local-disk-only storage for uploaded resume files, per spec - not committed to git (see
// .gitignore). Files auto-expire after 30 days regardless (see resumeExpiry.ts), so this
// isn't meant to be a durable store; losing them on redeploy is an accepted tradeoff.
export const RESUME_UPLOAD_DIR = path.resolve(__dirname, "../../uploads/resumes");

fs.mkdirSync(RESUME_UPLOAD_DIR, { recursive: true });

export const ALLOWED_RESUME_EXTENSIONS = new Set([".pdf", ".docx"]);

export const ALLOWED_RESUME_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export const MAX_RESUME_FILE_SIZE_BYTES = 5 * 1024 * 1024;

// Naming by applicationId (a server-validated UUID route param) + a fixed-allowlist extension,
// rather than any part of the client-supplied original filename, avoids collisions and keeps
// the stored path free of path-traversal or other user-controlled path segments.
export function resumeFileNameFor(applicationId: string, ext: string): string {
  return `${applicationId}${ext}`;
}

// resumeFilePath on the Application record is stored relative to RESUME_UPLOAD_DIR (just the
// filename) rather than as an absolute path, so it stays portable across deploys and doesn't
// leak the server's filesystem layout through the API.
export function resolveResumePath(relativePath: string): string {
  return path.join(RESUME_UPLOAD_DIR, relativePath);
}

export async function deleteResumeFileFromDisk(relativePath: string): Promise<void> {
  try {
    await fs.promises.unlink(resolveResumePath(relativePath));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
}
