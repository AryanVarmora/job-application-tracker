import { z } from "zod";

export const outreachPlatformEnum = z.enum(["linkedin", "email", "other"]);

// Only personName + platform are required - this endpoint is meant to be fillable in
// under 10 seconds, so everything else has to be optional.
export const createOutreachContactSchema = z.object({
  personName: z.string().trim().min(1, "personName is required"),
  platform: outreachPlatformEnum,
  company: z.string().trim().min(1).optional(),
  messagedAt: z.coerce.date().optional(),
  isLead: z.boolean().optional().default(false),
  notes: z.string().trim().optional(),
  linkedApplicationId: z.string().uuid().optional(),
});

export const updateOutreachContactSchema = z
  .object({
    personName: z.string().trim().min(1).optional(),
    platform: outreachPlatformEnum.optional(),
    company: z.string().trim().min(1).optional(),
    messagedAt: z.coerce.date().optional(),
    isLead: z.boolean().optional(),
    notes: z.string().trim().optional(),
    // Nullable (not just optional) so a PATCH can explicitly unlink an application.
    linkedApplicationId: z.string().uuid().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const outreachIdParamSchema = z.object({
  id: z.string().uuid("id must be a valid UUID"),
});

export type CreateOutreachContactInput = z.infer<typeof createOutreachContactSchema>;
export type UpdateOutreachContactInput = z.infer<typeof updateOutreachContactSchema>;
