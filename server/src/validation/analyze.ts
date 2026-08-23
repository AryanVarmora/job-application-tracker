import { z } from "zod";

export const analyzeApplicationSchema = z.object({
  jobDescription: z.string().trim().min(1, "jobDescription is required"),
});

export type AnalyzeApplicationInput = z.infer<typeof analyzeApplicationSchema>;
