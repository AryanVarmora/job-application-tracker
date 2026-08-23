import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

export interface JobDescriptionAnalysis {
  requiredSkills: string[];
  preferredSkills: string[];
  seniorityLevel: string;
  summary: string;
}

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3.1:8b";

const GEMINI_BASE_URL =
  process.env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta/openai/";
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-3.6-flash";

// AI_PROVIDER wins when set; otherwise NODE_ENV=production defaults to Gemini so
// prod never silently depends on a local Ollama server. Local dev defaults to Ollama.
type Provider = "ollama" | "gemini";

export function resolveProvider(): Provider {
  const explicit = process.env.AI_PROVIDER?.toLowerCase();
  if (explicit === "gemini" || explicit === "ollama") return explicit;
  return process.env.NODE_ENV === "production" ? "gemini" : "ollama";
}

// Both providers are driven through the OpenAI-compatible chat completions API
// (Ollama natively, Gemini via its OpenAI-compat endpoint), so the same client
// shape and prompt-based JSON enforcement work for either one. Neither provider
// reliably supports response_format: json_schema across all models, so the schema
// is enforced via prompt instead, and we defensively parse + retry rather than
// trusting the model to always comply.
const SYSTEM_PROMPT = `You extract structured hiring data from raw job description text.
Only report skills that are actually stated or clearly implied in the text.

Respond with ONLY a single JSON object and nothing else - no markdown code fences, no
commentary before or after it. The object must match exactly this shape:

{
  "requiredSkills": string[],
  "preferredSkills": string[],
  "seniorityLevel": "internship" | "entry" | "mid" | "senior" | "staff" | "principal" | "unspecified",
  "summary": string (exactly two sentences summarizing the role)
}`;

const RETRY_INSTRUCTION =
  "Your last response was not valid JSON. Return only JSON, matching the required shape, with no other text.";

let client: OpenAI | null = null;
let clientProvider: Provider | null = null;
let clientModel: string | null = null;

function getClient(): { openai: OpenAI; model: string } {
  const provider = resolveProvider();

  if (!client || clientProvider !== provider) {
    if (provider === "gemini") {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error(
          "GEMINI_API_KEY is required when AI_PROVIDER=gemini (or NODE_ENV=production)"
        );
      }
      client = new OpenAI({ baseURL: GEMINI_BASE_URL, apiKey });
      clientModel = GEMINI_MODEL;
    } else {
      // Ollama ignores the API key but the SDK requires a non-empty string; no real
      // credential is needed anywhere for this integration to work.
      client = new OpenAI({ baseURL: OLLAMA_BASE_URL, apiKey: "ollama" });
      clientModel = OLLAMA_MODEL;
    }
    clientProvider = provider;
  }

  return { openai: client, model: clientModel! };
}

// Strips ```json ... ``` fences some local models add despite instructions not to.
function stripCodeFence(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return (fenced ? fenced[1] : raw).trim();
}

async function requestCompletion(
  openai: OpenAI,
  model: string,
  messages: ChatCompletionMessageParam[]
): Promise<string> {
  const completion = await openai.chat.completions.create({
    model,
    messages,
    temperature: 0,
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error(`${model} returned no content for job description analysis`);
  }
  return raw;
}

export async function analyzeJobDescription(
  jobDescriptionText: string
): Promise<JobDescriptionAnalysis> {
  const { openai, model } = getClient();

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: jobDescriptionText },
  ];

  const first = await requestCompletion(openai, model, messages);

  try {
    return JSON.parse(stripCodeFence(first)) as JobDescriptionAnalysis;
  } catch {
    messages.push({ role: "assistant", content: first });
    messages.push({ role: "user", content: RETRY_INSTRUCTION });

    const second = await requestCompletion(openai, model, messages);

    try {
      return JSON.parse(stripCodeFence(second)) as JobDescriptionAnalysis;
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      throw new Error(
        `${model} returned malformed JSON after one retry: ${reason}. ` +
          `Last response: ${second.slice(0, 500)}`
      );
    }
  }
}
