import { z } from "zod";

export const applicationStatusEnum = z.enum([
  "applied",
  "interviewing",
  "rejected",
  "offer",
]);

const baseFields = {
  companyName: z.string().trim().min(1, "companyName is required"),
  industry: z.string().trim().min(1).optional(),
  companySize: z.string().trim().min(1).optional(),
  role: z.string().trim().min(1, "role is required"),
  status: applicationStatusEnum.optional().default("applied"),
  appliedDate: z.coerce.date(),
  jobUrl: z.string().trim().url().optional().or(z.literal("")).optional(),
  resumeVariant: z.string().trim().min(1).optional(),
  notes: z.string().trim().optional(),
  analyzeEnabled: z.boolean().optional().default(false),
};

export const createApplicationSchema = z.object(baseFields);

export const updateApplicationSchema = z
  .object({
    companyName: baseFields.companyName.optional(),
    industry: baseFields.industry,
    companySize: baseFields.companySize,
    role: baseFields.role.optional(),
    status: applicationStatusEnum.optional(),
    appliedDate: z.coerce.date().optional(),
    jobUrl: baseFields.jobUrl,
    resumeVariant: baseFields.resumeVariant,
    notes: baseFields.notes,
    analyzeEnabled: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const applicationIdParamSchema = z.object({
  id: z.string().uuid("id must be a valid UUID"),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
export type UpdateApplicationInput = z.infer<typeof updateApplicationSchema>;
