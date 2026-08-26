import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";

export interface ExtractedPageText {
  title: string | null;
  text: string;
}

export interface JsonLdJobPosting {
  companyName: string;
  role: string;
  descriptionText: string;
}

function normalizeWhitespace(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/[ \t\f\v]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isJobPostingNode(node: unknown): node is Record<string, unknown> {
  if (!node || typeof node !== "object") return false;
  const type = (node as Record<string, unknown>)["@type"];
  if (typeof type === "string") return type === "JobPosting";
  if (Array.isArray(type)) return type.includes("JobPosting");
  return false;
}

// JSON-LD allows a single node, an array of nodes, or a top-level `@graph` array
// (used when a page bundles multiple schema.org entities in one script block) -
// this walks all three shapes down to a flat list of candidate nodes.
function flattenJsonLdNodes(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) return parsed.flatMap(flattenJsonLdNodes);
  if (parsed && typeof parsed === "object") {
    const graph = (parsed as Record<string, unknown>)["@graph"];
    if (Array.isArray(graph)) return graph.flatMap(flattenJsonLdNodes);
    return [parsed];
  }
  return [];
}

const BLOCK_TAG_SELECTOR = "p, div, li, h1, h2, h3, h4, h5, h6, tr, blockquote";

// schema.org's `description` is commonly an HTML string (ATS platforms render the
// same markup they show visitors into the JSON-LD block), so this decodes entities
// and strips tags by round-tripping it through a detached element rather than
// regexing tags out by hand. Safe: this JSDOM instance never runs scripts. Plain
// `.textContent` runs adjacent block elements together with no separator ("</p><ul>"
// becomes "...software.5+ years..."), so block boundaries and <br> are turned into
// explicit newlines first.
function htmlFragmentToText(document: Document, html: string): string {
  const container = document.createElement("div");
  container.innerHTML = html;
  container.querySelectorAll("br").forEach((el) => el.replaceWith(document.createTextNode("\n")));
  container.querySelectorAll(BLOCK_TAG_SELECTOR).forEach((el) => {
    el.append(document.createTextNode("\n"));
  });
  return normalizeWhitespace(container.textContent ?? "");
}

// Looks for a schema.org JobPosting embedded via <script type="application/ld+json">,
// which most major ATS platforms (Greenhouse, Lever, Workday, iCIMS, SmartRecruiters,
// and LinkedIn among them) render server-side purely for search-engine indexing - even
// on pages where the visible content is otherwise assembled client-side by JS. When
// present, it's a far more reliable source for company/role/description than scraping
// visible text, since it's structured data rather than whatever chrome/nav/sidebar
// content happens to look "article-shaped" to Readability.
export function extractJsonLdJobPosting(html: string, url: string): JsonLdJobPosting | null {
  const dom = new JSDOM(html, { url });
  const document = dom.window.document;
  const scripts = document.querySelectorAll('script[type="application/ld+json"]');

  for (const script of Array.from(scripts)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(script.textContent ?? "");
    } catch {
      continue;
    }

    for (const node of flattenJsonLdNodes(parsed)) {
      if (!isJobPostingNode(node)) continue;

      const title = node.title;
      const role = typeof title === "string" ? title.trim() : "";

      const org = node.hiringOrganization;
      const companyName =
        typeof org === "string"
          ? org.trim()
          : typeof org === "object" && org && typeof (org as Record<string, unknown>).name === "string"
            ? ((org as Record<string, unknown>).name as string).trim()
            : "";

      const description = node.description;
      const descriptionText =
        typeof description === "string" ? htmlFragmentToText(document, description) : "";

      if (!descriptionText) continue;

      return { companyName, role, descriptionText };
    }
  }

  return null;
}

// Prefers Readability (the same content-extraction heuristics behind Firefox's Reader View)
// to isolate the actual posting from navigation/footer/sidebar chrome. Readability mutates
// the document it scores, so it runs against a clone - if it can't find an article-shaped
// region (common on job boards that render the posting as a plain content div rather than
// an <article>), the untouched original document is still available for the manual fallback.
export function extractReadableText(html: string, url: string): ExtractedPageText {
  const dom = new JSDOM(html, { url });
  const document = dom.window.document;

  try {
    const clone = document.cloneNode(true) as Document;
    const article = new Readability(clone).parse();
    if (article?.textContent && article.textContent.trim().length > 0) {
      return { title: article.title ?? null, text: normalizeWhitespace(article.textContent) };
    }
  } catch {
    // Readability can throw on atypical documents - fall through to the manual strip below.
  }

  document
    .querySelectorAll("script, style, nav, header, footer, noscript, svg, iframe")
    .forEach((el) => el.remove());
  const bodyText = document.body?.textContent ?? "";
  return { title: document.title || null, text: normalizeWhitespace(bodyText) };
}
