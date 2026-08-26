import { HttpError } from "../middleware/errorHandler";
import { extractJsonLdJobPosting, extractReadableText } from "./htmlExtraction";
import { analyzeJobDescription, extractJobPostingFromPageText, type JobUrlExtraction } from "./jobAnalysis";

const FETCH_TIMEOUT_MS = 10_000;
const MAX_HTML_BYTES = 2 * 1024 * 1024; // 2MB

// Below this, treat the page as having no real content worth analyzing. Raised from an
// earlier 200 after finding real pages (LinkedIn job listings among them) that clear a
// low bar with several KB of unrelated chrome - a "Similar jobs" sidebar, nav links, a
// "See who you know" prompt - while the actual posting is loaded separately via JS and
// never appears in the server-rendered HTML at all. This is still a blunt length check,
// not a content-quality one, so a long enough irrelevant page can still slip through;
// the JSON-LD path below is what actually fixes those cases when the site supports it.
const MIN_EXTRACTED_TEXT_LENGTH = 500;

const USER_AGENT =
  "job-application-tracker/1.0 (+personal job-search tool; fetches a URL you paste in to prefill a form)";

// Blocks the obvious loopback/private/link-local hosts a pasted URL could point at, so this
// endpoint can't be turned into a way to make the server fetch its own internal network. This
// is a hostname-only check, not real SSRF hardening (it doesn't stop DNS rebinding), but it's a
// cheap guard against the common accidental/malicious case for a single-user tool like this.
const BLOCKED_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^::1$/,
  /^169\.254\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^192\.168\./,
];

function assertSafeUrl(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new HttpError(400, "That doesn't look like a valid URL.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new HttpError(400, "Only http:// and https:// URLs are supported.");
  }
  if (BLOCKED_HOSTNAME_PATTERNS.some((pattern) => pattern.test(parsed.hostname))) {
    throw new HttpError(400, "That URL points at a local/private address, which isn't allowed.");
  }
  return parsed;
}

function doFetch(url: URL, signal: AbortSignal): Promise<Response> {
  return fetch(url, {
    signal,
    redirect: "follow",
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml",
    },
  });
}

function ensureOk(response: Response): void {
  if (!response.ok) {
    throw new HttpError(
      502,
      `That page returned an error (HTTP ${response.status}). Some sites block automated requests.`
    );
  }
}

function ensureContentLengthWithinCap(response: Response): void {
  const header = response.headers.get("content-length");
  if (header && Number(header) > MAX_HTML_BYTES) {
    throw new HttpError(413, "That page is too large to process.");
  }
}

// Reads the response body in a stream, aborting once it exceeds the cap, rather than buffering
// the whole thing first - a server without a Content-Length header could otherwise stream
// unbounded data before the cap check ever runs.
async function readBodyWithCap(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new HttpError(413, "That page is too large to process.");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf-8");
}

function normalizeFetchError(err: unknown): HttpError {
  if (err instanceof HttpError) return err;
  if (err instanceof Error && err.name === "AbortError") {
    return new HttpError(504, `Timed out fetching that page after ${FETCH_TIMEOUT_MS / 1000}s.`);
  }
  const reason = err instanceof Error ? err.message : String(err);
  return new HttpError(502, `Could not reach that URL: ${reason}`);
}

async function fetchHtml(url: URL): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await doFetch(url, controller.signal);
    ensureOk(response);
    ensureContentLengthWithinCap(response);
    return await readBodyWithCap(response, MAX_HTML_BYTES);
  } catch (err) {
    throw normalizeFetchError(err);
  } finally {
    clearTimeout(timeout);
  }
}

// Orchestrates the "paste a job URL" flow: fetch the page, prefer its embedded JSON-LD
// JobPosting data when present (structured, and immune to the "which div is the real
// content" problem), otherwise fall back to stripping the page to readable text. Bails
// out with a clear error if neither source has enough real content to analyze (bot
// detection and JS-rendered pages both land here). Read-only - never touches the database.
export async function parseJobPostingFromUrl(rawUrl: string): Promise<JobUrlExtraction> {
  const url = assertSafeUrl(rawUrl);
  const html = await fetchHtml(url);

  const jsonLd = extractJsonLdJobPosting(html, url.toString());
  if (jsonLd && jsonLd.descriptionText.length >= MIN_EXTRACTED_TEXT_LENGTH) {
    const analysis = await analyzeJobDescription(jsonLd.descriptionText);
    return {
      companyName: jsonLd.companyName,
      role: jsonLd.role,
      jobDescriptionText: jsonLd.descriptionText,
      ...analysis,
    };
  }

  const { text } = extractReadableText(html, url.toString());

  if (text.length < MIN_EXTRACTED_TEXT_LENGTH) {
    throw new HttpError(
      422,
      "Couldn't find enough readable job content on that page. Some sites block automated " +
        "requests or render their content with JavaScript, which this can't read. Try pasting " +
        "the job details in manually."
    );
  }

  return extractJobPostingFromPageText(text);
}
