import { z } from "zod";

export const gmailSuggestionIdParamSchema = z.object({
  id: z.string().uuid("id must be a valid UUID"),
});
