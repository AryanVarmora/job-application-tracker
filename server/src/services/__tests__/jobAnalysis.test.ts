import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Real OpenAI SDK, real error classes (RateLimitError etc.) - only the client class itself is
// swapped out, so `instanceof OpenAI.RateLimitError` checks in jobAnalysis.ts still work
// against errors constructed here with the same class reference.
const createCompletionMock = vi.hoisted(() => vi.fn());

vi.mock("openai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("openai")>();
  class MockOpenAI {
    static APIError = actual.APIError;
    static RateLimitError = actual.RateLimitError;
    chat = { completions: { create: createCompletionMock } };
  }
  return { ...actual, default: MockOpenAI };
});

import OpenAI from "openai";
import { parseStatusEmail, resolveProvider } from "../jobAnalysis";

function jsonCompletion(body: unknown) {
  return { choices: [{ message: { content: JSON.stringify(body) } }] };
}

function rateLimitError(message = "Rate limit exceeded") {
  return new OpenAI.RateLimitError(429, { message } as any, message, {} as any);
}

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

describe("parseStatusEmail retry/backoff on 429", () => {
  beforeEach(() => {
    process.env.AI_PROVIDER = "ollama";
    createCompletionMock.mockReset();
  });

  afterEach(() => {
    resetEnv();
    vi.useRealTimers();
  });

  it("retries a 429 with backoff and succeeds on the next attempt", async () => {
    vi.useFakeTimers();
    createCompletionMock
      .mockRejectedValueOnce(rateLimitError())
      .mockResolvedValueOnce(
        jsonCompletion({ companyName: "Acme", detectedStatus: "applied", confidence: "high" })
      );

    const resultPromise = parseStatusEmail("Subject: test\n\nBody");
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result).toEqual({ companyName: "Acme", detectedStatus: "applied", confidence: "high" });
    expect(createCompletionMock).toHaveBeenCalledTimes(2);
  });

  it("gives up and throws after exhausting retries on a persistent 429", async () => {
    vi.useFakeTimers();
    createCompletionMock.mockRejectedValue(rateLimitError());

    const resultPromise = parseStatusEmail("Subject: test\n\nBody");
    const expectation = expect(resultPromise).rejects.toThrow();
    await vi.runAllTimersAsync();
    await expectation;

    // Initial attempt + 2 retries = 3 total calls.
    expect(createCompletionMock).toHaveBeenCalledTimes(3);
  });

  it("does not retry a non-rate-limit error", async () => {
    createCompletionMock.mockRejectedValueOnce(new Error("connection refused"));

    await expect(parseStatusEmail("Subject: test\n\nBody")).rejects.toThrow("connection refused");
    expect(createCompletionMock).toHaveBeenCalledTimes(1);
  });
});
