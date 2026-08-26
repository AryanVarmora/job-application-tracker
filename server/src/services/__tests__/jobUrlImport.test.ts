import { afterEach, describe, expect, it, vi } from "vitest";

// This suite only exercises the "not enough readable text" short-circuit, so the AI calls
// are stubbed and asserted to never run - a page that fails this check should never reach
// the LLM at all.
vi.mock("../jobAnalysis", () => ({
  extractJobPostingFromPageText: vi.fn(async () => ({
    companyName: "should not be reached",
    role: "",
    jobDescriptionText: "",
    requiredSkills: [],
    preferredSkills: [],
    seniorityLevel: "unspecified",
    summary: "",
  })),
  analyzeJobDescription: vi.fn(async () => ({
    requiredSkills: ["TypeScript"],
    preferredSkills: [],
    seniorityLevel: "senior",
    summary: "stubbed summary",
  })),
}));

import { parseJobPostingFromUrl } from "../jobUrlImport";
import { analyzeJobDescription, extractJobPostingFromPageText } from "../jobAnalysis";

const mockedExtract = vi.mocked(extractJobPostingFromPageText);
const mockedAnalyze = vi.mocked(analyzeJobDescription);
const originalFetch = global.fetch;

function mockFetchWithHtml(html: string) {
  global.fetch = vi.fn(
    async () =>
      new Response(html, {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      })
  ) as unknown as typeof fetch;
}

describe("parseJobPostingFromUrl - text-too-short failure path", () => {
  afterEach(() => {
    global.fetch = originalFetch;
    mockedExtract.mockClear();
    mockedAnalyze.mockClear();
  });

  it("rejects a JS-rendered SPA shell with almost no real text", async () => {
    mockFetchWithHtml(`
      <html>
        <head><title>Careers</title></head>
        <body>
          <div id="root"></div>
          <script src="/static/bundle.12345.js"></script>
        </body>
      </html>
    `);

    await expect(parseJobPostingFromUrl("https://example.com/jobs/123")).rejects.toMatchObject({
      status: 422,
      message: expect.stringMatching(/readable/i),
    });
    expect(mockedExtract).not.toHaveBeenCalled();
  });

  it("rejects a bot-detection interstitial page instead of analyzing the challenge text", async () => {
    mockFetchWithHtml(`
      <html>
        <body>
          <h1>Just a moment...</h1>
          <p>Please enable JavaScript and cookies to continue.</p>
        </body>
      </html>
    `);

    await expect(parseJobPostingFromUrl("https://example.com/jobs/456")).rejects.toMatchObject({
      status: 422,
    });
    expect(mockedExtract).not.toHaveBeenCalled();
  });

  // Regression test for a real LinkedIn job posting URL: the server-rendered HTML never
  // includes the actual job description (LinkedIn loads it separately via JS/XHR), but
  // Readability still finds a "Similar jobs" sidebar list that reads as article-shaped -
  // real chrome text like "Referrals increase your chances of interviewing... See who you
  // know" plus several unrelated job titles. That cleared the old 200-char floor and was
  // silently returned as if it were the posting. This fixture mirrors that shape, condensed
  // to land above the old 200-char threshold but below the new 500-char one.
  it("rejects a LinkedIn-style page whose only real text is nav/sidebar chrome", async () => {
    mockFetchWithHtml(`
      <html>
        <body>
          <div class="jobs-details">
            <p>Referrals increase your chances of interviewing at Twilio by 2x</p>
            <p>See who you know</p>
          </div>
          <aside>
            <h2>Similar jobs</h2>
            <ul>
              <li>Platform Engineer - Stitch Fix - United States - 1 week ago</li>
              <li>Software Engineer, Content Platform - Reddit, Inc. - San Francisco, CA - 6 days ago</li>
              <li>Software Engineer - Infrastructure - Mercury - United States - 3 days ago</li>
            </ul>
          </aside>
        </body>
      </html>
    `);

    await expect(
      parseJobPostingFromUrl(
        "https://www.linkedin.com/jobs/view/software-engineer-platform-engineering-l2-at-twilio-4449418629"
      )
    ).rejects.toMatchObject({ status: 422 });
    expect(mockedExtract).not.toHaveBeenCalled();
    expect(mockedAnalyze).not.toHaveBeenCalled();
  });
});

describe("parseJobPostingFromUrl - JSON-LD JobPosting path", () => {
  afterEach(() => {
    global.fetch = originalFetch;
    mockedExtract.mockClear();
    mockedAnalyze.mockClear();
  });

  it("uses the embedded JSON-LD JobPosting instead of scraping visible text when both are present", async () => {
    mockFetchWithHtml(`
      <html>
        <head>
          <script type="application/ld+json">
            {
              "@type": "JobPosting",
              "title": "Senior Backend Engineer",
              "hiringOrganization": { "@type": "Organization", "name": "Acme Corp" },
              "description": "<p>We are looking for a senior backend engineer to join our platform team and own critical services end to end, from design through production.</p><p>You will design APIs, mentor engineers, and drive technical decisions across the organization in close partnership with product and design.</p><ul><li>5+ years of backend experience with distributed systems</li><li>Strong TypeScript or Go skills</li><li>Experience owning services from design through on-call</li></ul><p>We offer competitive compensation, remote-friendly work, and a strong engineering culture focused on craftsmanship, mentorship, and thoughtful code review.</p>"
            }
          </script>
        </head>
        <body>
          <div id="root"><!-- real posting text is injected here by client-side JS --></div>
        </body>
      </html>
    `);

    const result = await parseJobPostingFromUrl("https://boards.example.com/acme/jobs/1");

    expect(result).toMatchObject({
      companyName: "Acme Corp",
      role: "Senior Backend Engineer",
      requiredSkills: ["TypeScript"],
      seniorityLevel: "senior",
      summary: "stubbed summary",
    });
    expect(result.jobDescriptionText).toContain("own critical services end to end");
    expect(mockedAnalyze).toHaveBeenCalledTimes(1);
    expect(mockedExtract).not.toHaveBeenCalled();
  });

  it("falls back to Readability when the JobPosting node has too little description text", async () => {
    mockFetchWithHtml(`
      <html>
        <head>
          <script type="application/ld+json">
            { "@type": "JobPosting", "title": "Ghost Role", "hiringOrganization": { "name": "Acme Corp" }, "description": "TBD" }
          </script>
        </head>
        <body>
          <article>
            <h1>Senior Backend Engineer</h1>
            <p>${"We are looking for a senior backend engineer to join our platform team. ".repeat(10)}</p>
          </article>
        </body>
      </html>
    `);

    await parseJobPostingFromUrl("https://boards.example.com/acme/jobs/2");

    expect(mockedAnalyze).not.toHaveBeenCalled();
    expect(mockedExtract).toHaveBeenCalledTimes(1);
  });
});
