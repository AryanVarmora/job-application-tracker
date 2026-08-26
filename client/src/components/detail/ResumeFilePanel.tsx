import { useRef, useState, type ChangeEvent } from "react";
import { deleteResume, getResumeDownloadUrl, uploadResume } from "../../api";
import type { Application } from "../../types";
import { formatFullTimestamp, formatRelativeTimestamp } from "../../lib/dateUtils";
import { ghostDangerButton, glassPanelSubtle, secondaryButton } from "../../lib/uiStyles";
import { DownloadIcon, TrashIcon, UploadIcon } from "../ui/icons";

interface Props {
  application: Application;
  onChanged: (updated: Application) => void;
}

// resumeVariant and the uploaded file are conceptually paired (there's no separate
// "original filename" field), so the variant name doubles as the display filename.
function resumeDisplayName(application: Application): string {
  const ext = application.resumeFilePath?.split(".").pop() ?? "pdf";
  return `${application.resumeVariant}.${ext}`;
}

export function ResumeFilePanel({ application, onChanged }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFileSelected(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const updated = await uploadResume(application.id, file);
      onChanged(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      await deleteResume(application.id);
      onChanged({ ...application, resumeFilePath: null, resumeFileUploadedAt: null });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete resume");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className={`flex flex-col gap-3 ${glassPanelSubtle} p-4`}>
      <h3 className="text-sm font-semibold tracking-tight text-slate-700 dark:text-slate-200">
        Resume File
      </h3>

      {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}

      {application.resumeFilePath ? (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">
              {resumeDisplayName(application)}
            </p>
            {application.resumeFileUploadedAt && (
              <p
                title={formatFullTimestamp(application.resumeFileUploadedAt)}
                className="text-xs text-slate-400 dark:text-slate-500"
              >
                Uploaded {formatRelativeTimestamp(application.resumeFileUploadedAt)}
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href={getResumeDownloadUrl(application.id)}
              className={`inline-flex items-center gap-1.5 ${secondaryButton}`}
            >
              <DownloadIcon className="h-3.5 w-3.5" />
              Download
            </a>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className={`inline-flex items-center gap-1.5 ${ghostDangerButton}`}
            >
              <TrashIcon className="h-3.5 w-3.5" />
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className={`inline-flex items-center gap-1.5 self-start ${secondaryButton}`}
        >
          <UploadIcon className="h-3.5 w-3.5" />
          {uploading ? "Uploading..." : "Upload Resume"}
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={handleFileSelected}
      />

      <p className="text-xs text-slate-400 dark:text-slate-500">
        Auto-deletes 30 days after upload.
      </p>
    </div>
  );
}
