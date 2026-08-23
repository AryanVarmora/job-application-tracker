import { describe, expect, it } from "vitest";
import { computeMatchScore } from "../matchScore";

describe("computeMatchScore", () => {
  it("scores 100 when all required and preferred skills are matched", () => {
    const result = computeMatchScore({
      requiredSkills: ["TypeScript", "SQL"],
      preferredSkills: ["Docker"],
      userSkills: ["TypeScript", "SQL", "Docker", "React"],
    });

    expect(result.fitScore).toBe(100);
    expect(result.matchedRequired).toEqual(["TypeScript", "SQL"]);
    expect(result.missingRequired).toEqual([]);
    expect(result.matchedPreferred).toEqual(["Docker"]);
    expect(result.missingPreferred).toEqual([]);
  });

  it("scores 0 when nothing is matched", () => {
    const result = computeMatchScore({
      requiredSkills: ["Rust"],
      preferredSkills: ["Kubernetes"],
      userSkills: ["TypeScript"],
    });

    expect(result.fitScore).toBe(0);
    expect(result.missingRequired).toEqual(["Rust"]);
    expect(result.missingPreferred).toEqual(["Kubernetes"]);
  });

  it("weights required skills more heavily than preferred (70/30)", () => {
    // All required matched, none preferred -> should land on the 70% floor.
    const requiredOnly = computeMatchScore({
      requiredSkills: ["TypeScript", "SQL"],
      preferredSkills: ["Docker", "Kubernetes"],
      userSkills: ["TypeScript", "SQL"],
    });
    expect(requiredOnly.fitScore).toBe(70);

    // None required matched, all preferred matched -> should land on the 30% ceiling.
    const preferredOnly = computeMatchScore({
      requiredSkills: ["TypeScript", "SQL"],
      preferredSkills: ["Docker", "Kubernetes"],
      userSkills: ["Docker", "Kubernetes"],
    });
    expect(preferredOnly.fitScore).toBe(30);
  });

  it("computes partial credit proportionally within each bucket", () => {
    // 1/2 required (35) + 1/2 preferred (15) = 50
    const result = computeMatchScore({
      requiredSkills: ["TypeScript", "SQL"],
      preferredSkills: ["Docker", "Kubernetes"],
      userSkills: ["TypeScript", "Docker"],
    });

    expect(result.fitScore).toBe(50);
    expect(result.matchedRequired).toEqual(["TypeScript"]);
    expect(result.missingRequired).toEqual(["SQL"]);
    expect(result.matchedPreferred).toEqual(["Docker"]);
    expect(result.missingPreferred).toEqual(["Kubernetes"]);
  });

  it("rounds .5 boundaries correctly despite binary floating-point representation", () => {
    // 3/4 required (52.5) + 0/3 preferred (0) = 52.5 -> should round up to 53.
    // Naive (ratio * 0.7) arithmetic computes 0.5249999999999999 here due to 0.7 not
    // being exactly representable in binary, which would wrongly floor this to 52.
    const result = computeMatchScore({
      requiredSkills: ["Node.js", "TypeScript", "SQL", "REST API design"],
      preferredSkills: ["Docker", "AWS", "GraphQL"],
      userSkills: ["Node.js", "TypeScript", "SQL"],
    });

    expect(result.fitScore).toBe(53);
  });

  it("treats an empty skill bucket as fully satisfied rather than penalizing it", () => {
    const noPreferredListed = computeMatchScore({
      requiredSkills: ["TypeScript"],
      preferredSkills: [],
      userSkills: ["TypeScript"],
    });
    expect(noPreferredListed.fitScore).toBe(100);

    const noRequiredListed = computeMatchScore({
      requiredSkills: [],
      preferredSkills: ["Docker"],
      userSkills: ["Docker"],
    });
    expect(noRequiredListed.fitScore).toBe(100);
  });

  it("returns 100 when the JD lists no skills at all", () => {
    const result = computeMatchScore({
      requiredSkills: [],
      preferredSkills: [],
      userSkills: ["TypeScript"],
    });

    expect(result.fitScore).toBe(100);
    expect(result.matchedRequired).toEqual([]);
    expect(result.matchedPreferred).toEqual([]);
  });

  it("matches skills case-insensitively and ignores surrounding whitespace", () => {
    const result = computeMatchScore({
      requiredSkills: [" typescript ", "SQL"],
      preferredSkills: [],
      userSkills: ["TypeScript", "sql"],
    });

    expect(result.fitScore).toBe(100);
    expect(result.missingRequired).toEqual([]);
  });

  it("preserves original JD casing/spacing in matched/missing output", () => {
    const result = computeMatchScore({
      requiredSkills: ["  TypeScript  "],
      preferredSkills: [],
      userSkills: ["typescript"],
    });

    expect(result.matchedRequired).toEqual(["  TypeScript  "]);
  });
});
