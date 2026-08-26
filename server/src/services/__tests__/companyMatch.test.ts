import { describe, expect, it } from "vitest";
import {
  companyNameSimilarity,
  findBestCompanyMatch,
  normalizeCompanyName,
} from "../companyMatch";

describe("normalizeCompanyName", () => {
  it("lowercases and strips legal suffixes", () => {
    expect(normalizeCompanyName("Acme Corp")).toBe("acme");
    expect(normalizeCompanyName("Acme, Inc.")).toBe("acme");
    expect(normalizeCompanyName("Acme LLC")).toBe("acme");
    expect(normalizeCompanyName("Acme Corporation")).toBe("acme");
  });

  it("strips punctuation and collapses whitespace", () => {
    expect(normalizeCompanyName("  Acme   Digital, Co.  ")).toBe("acme digital");
  });
});

describe("companyNameSimilarity", () => {
  it("scores an exact match (after normalization) as 1", () => {
    expect(companyNameSimilarity("Acme Corp", "acme corp")).toBe(1);
    expect(companyNameSimilarity("Acme Inc.", "Acme Corporation")).toBe(1);
  });

  it("scores a containment match highly", () => {
    expect(companyNameSimilarity("Acme", "Acme Digital")).toBeGreaterThanOrEqual(0.9);
  });

  it("scores minor formatting differences highly", () => {
    expect(companyNameSimilarity("Acme Digital", "Acme-Digital")).toBeGreaterThan(0.8);
  });

  it("scores unrelated company names low", () => {
    expect(companyNameSimilarity("Acme Corp", "Globex Industries")).toBeLessThan(0.4);
  });

  it("returns 0 for empty input", () => {
    expect(companyNameSimilarity("", "Acme Corp")).toBe(0);
    expect(companyNameSimilarity("Acme Corp", "")).toBe(0);
  });
});

describe("findBestCompanyMatch", () => {
  const candidates = [
    { applicationId: "1", companyName: "Acme Corp" },
    { applicationId: "2", companyName: "Globex Industries" },
    { applicationId: "3", companyName: "Initech" },
  ];

  it("matches an exact company name", () => {
    const match = findBestCompanyMatch("Acme Corp", candidates);
    expect(match?.applicationId).toBe("1");
  });

  it("matches despite a legal-suffix difference", () => {
    const match = findBestCompanyMatch("Acme, Inc.", candidates);
    expect(match?.applicationId).toBe("1");
  });

  it("matches case-insensitively", () => {
    const match = findBestCompanyMatch("GLOBEX INDUSTRIES", candidates);
    expect(match?.applicationId).toBe("2");
  });

  it("returns null when nothing is close enough", () => {
    const match = findBestCompanyMatch("Umbrella Corporation", candidates);
    expect(match).toBeNull();
  });

  it("returns the highest-scoring candidate when multiple are plausible", () => {
    const closeCandidates = [
      { applicationId: "a", companyName: "Initech Solutions" },
      { applicationId: "b", companyName: "Initech" },
    ];
    const match = findBestCompanyMatch("Initech", closeCandidates);
    expect(match?.applicationId).toBe("b");
  });
});
