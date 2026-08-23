import { describe, expect, it } from "vitest";
import { suggestResumeVariant } from "../resumeVariants";

describe("suggestResumeVariant", () => {
  it("picks AI/ML when matched skills overlap that variant's keywords most", () => {
    const result = suggestResumeVariant(["Python", "PyTorch", "NLP", "LLM"]);
    expect(result.variant).toBe("AI/ML");
    expect(result.reason).toContain("AI/ML");
  });

  it("picks Cloud when matched skills are infra-heavy", () => {
    const result = suggestResumeVariant(["AWS", "Docker", "Kubernetes", "Terraform"]);
    expect(result.variant).toBe("Cloud");
  });

  it("falls back to the first listed variant when there is no keyword overlap", () => {
    const result = suggestResumeVariant(["Photoshop"]);
    expect(result.variant).toBe("SWE");
    expect(result.reason).toMatch(/no strong keyword overlap/i);
  });

  it("matches case-insensitively", () => {
    const result = suggestResumeVariant(["python", "pandas", "numpy"]);
    expect(["AI/ML", "Data Analyst"]).toContain(result.variant);
  });
});
