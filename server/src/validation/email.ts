import { z } from "zod";
import { applicationStatusEnum } from "./application";

export const parseEmailSchema = z.object({
  subject: z.string().trim().optional().default(""),
  body: z.string().trim().min(1, "body is required"),
});

export const applySuggestedStatusSchema = z.object({
  status: applicationStatusEnum,
});

export type ParseEmailInput = z.infer<typeof parseEmailSchema>;
export type ApplySuggestedStatusInput = z.infer<typeof applySuggestedStatusSchema>;
