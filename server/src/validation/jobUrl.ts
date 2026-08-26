import { z } from "zod";

export const parseJobUrlSchema = z.object({
  url: z.string().trim().min(1, "url is required").url("url must be a valid URL"),
});

export type ParseJobUrlInput = z.infer<typeof parseJobUrlSchema>;
