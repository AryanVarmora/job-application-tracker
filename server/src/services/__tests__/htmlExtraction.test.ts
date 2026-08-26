import { describe, expect, it } from "vitest";
import { extractJsonLdJobPosting } from "../htmlExtraction";

describe("extractJsonLdJobPosting", () => {
  it("extracts company/role/description from a single JobPosting node", () => {
    const html = `
      <html>
        <head>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org/",
              "@type": "JobPosting",
              "title": "Senior Software Engineer",
              "hiringOrganization": { "@type": "Organization", "name": "Acme Corp" },
              "description": "<p>Build and ship <strong>great</strong> software.</p><ul><li>5+ years experience</li></ul>"
            }
          </script>
        </head>
        <body><div id="root"></div></body>
      </html>
    `;

    const result = extractJsonLdJobPosting(html, "https://example.com/jobs/1");

    expect(result).toEqual({
      companyName: "Acme Corp",
      role: "Senior Software Engineer",
      descriptionText: "Build and ship great software.\n5+ years experience",
    });
  });

  it("finds a JobPosting nested inside a top-level @graph array", () => {
    const html = `
      <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@graph": [
            { "@type": "Organization", "name": "Acme Corp" },
            {
              "@type": "JobPosting",
              "title": "Data Analyst",
              "hiringOrganization": "Acme Corp",
              "description": "Analyze data and report findings to stakeholders."
            }
          ]
        }
      </script>
    `;

    const result = extractJsonLdJobPosting(html, "https://example.com/jobs/2");

    expect(result).toEqual({
      companyName: "Acme Corp",
      role: "Data Analyst",
      descriptionText: "Analyze data and report findings to stakeholders.",
    });
  });

  it("skips a malformed ld+json block and keeps checking later ones", () => {
    const html = `
      <script type="application/ld+json">{ not valid json </script>
      <script type="application/ld+json">
        {
          "@type": "JobPosting",
          "title": "Support Engineer",
          "hiringOrganization": { "name": "Acme Corp" },
          "description": "Help customers resolve technical issues quickly."
        }
      </script>
    `;

    const result = extractJsonLdJobPosting(html, "https://example.com/jobs/3");

    expect(result?.role).toBe("Support Engineer");
  });

  it("returns null when no JobPosting node is present", () => {
    const html = `
      <script type="application/ld+json">
        { "@type": "Organization", "name": "Acme Corp" }
      </script>
    `;

    expect(extractJsonLdJobPosting(html, "https://example.com/jobs/4")).toBeNull();
  });

  it("returns null when there is no ld+json script at all", () => {
    const html = `<html><body><div id="root"></div></body></html>`;

    expect(extractJsonLdJobPosting(html, "https://example.com/jobs/5")).toBeNull();
  });

  it("returns null when the JobPosting node has no usable description", () => {
    const html = `
      <script type="application/ld+json">
        { "@type": "JobPosting", "title": "Ghost Role", "hiringOrganization": { "name": "Acme Corp" } }
      </script>
    `;

    expect(extractJsonLdJobPosting(html, "https://example.com/jobs/6")).toBeNull();
  });
});
