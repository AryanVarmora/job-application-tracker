import multer from "multer";
import path from "node:path";
import { HttpError } from "./errorHandler";
import {
  ALLOWED_RESUME_EXTENSIONS,
  ALLOWED_RESUME_MIME_TYPES,
  MAX_RESUME_FILE_SIZE_BYTES,
} from "../services/resumeStorage";

// Buffered in memory rather than streamed straight to disk: the route handler needs the
// application to exist (and its previous resumeFilePath, to clean up on extension change)
// before committing bytes anywhere, and 5MB in memory is negligible.
export const resumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_RESUME_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_RESUME_EXTENSIONS.has(ext) || !ALLOWED_RESUME_MIME_TYPES.has(file.mimetype)) {
      cb(new HttpError(400, "Only PDF and DOCX files are allowed"));
      return;
    }
    cb(null, true);
  },
});
