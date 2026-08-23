import { afterEach, describe, expect, it } from "vitest";
import { resolveProvider } from "../jobAnalysis";

const ENV_KEYS = ["AI_PROVIDER", "NODE_ENV"] as const;
const originalEnv: Record<string, string | undefined> = {};
for (const key of ENV_KEYS) originalEnv[key] = process.env[key];

function resetEnv() {
  for (const key of ENV_KEYS) {
    if (originalEnv[key] === undefined) delete process.env[key];
    else process.env[key] = originalEnv[key];
  }
}

describe("resolveProvider", () => {
  afterEach(resetEnv);

  it("defaults to ollama when nothing is set", () => {
    delete process.env.AI_PROVIDER;
    delete process.env.NODE_ENV;
    expect(resolveProvider()).toBe("ollama");
  });

  it("defaults to ollama in development", () => {
    delete process.env.AI_PROVIDER;
    process.env.NODE_ENV = "development";
    expect(resolveProvider()).toBe("ollama");
  });

  it("defaults to gemini when NODE_ENV=production", () => {
    delete process.env.AI_PROVIDER;
    process.env.NODE_ENV = "production";
    expect(resolveProvider()).toBe("gemini");
  });

  it("AI_PROVIDER=gemini wins even in development", () => {
    process.env.AI_PROVIDER = "gemini";
    process.env.NODE_ENV = "development";
    expect(resolveProvider()).toBe("gemini");
  });

  it("AI_PROVIDER=ollama wins even in production", () => {
    process.env.AI_PROVIDER = "ollama";
    process.env.NODE_ENV = "production";
    expect(resolveProvider()).toBe("ollama");
  });

  it("is case-insensitive", () => {
    process.env.AI_PROVIDER = "GEMINI";
    expect(resolveProvider()).toBe("gemini");
  });
});
