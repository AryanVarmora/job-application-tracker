export interface ResumeVariant {
  name: string;
  keywords: string[];
}

// Hardcoded per user request. Keywords are the skill/tech terms each resume variant
// leans into, used only to rank variants against a job's matched skills.
export const RESUME_VARIANTS: ResumeVariant[] = [
  {
    name: "SWE",
    keywords: [
      "javascript",
      "typescript",
      "node.js",
      "react",
      "sql",
      "rest api",
      "git",
      "system design",
      "algorithms",
      "data structures",
    ],
  },
  {
    name: "AI/ML",
    keywords: [
      "python",
      "pytorch",
      "tensorflow",
      "machine learning",
      "deep learning",
      "nlp",
      "llm",
      "openai api",
      "pandas",
      "numpy",
      "scikit-learn",
    ],
  },
  {
    name: "Cloud",
    keywords: [
      "aws",
      "azure",
      "gcp",
      "docker",
      "kubernetes",
      "terraform",
      "ci/cd",
      "devops",
      "linux",
      "networking",
    ],
  },
  {
    name: "Data Analyst",
    keywords: [
      "sql",
      "excel",
      "tableau",
      "power bi",
      "data visualization",
      "statistics",
      "python",
      "pandas",
      "a/b testing",
    ],
  },
  {
    name: "Support Engineer",
    keywords: [
      "troubleshooting",
      "customer support",
      "linux",
      "sql",
      "networking",
      "incident management",
      "zendesk",
      "communication",
      "debugging",
    ],
  },
];

export interface ResumeSuggestion {
  variant: string;
  reason: string;
}

function normalize(skill: string): string {
  return skill.trim().toLowerCase();
}

// Ranks variants by how many of the JD's matched skills overlap with that variant's
// keyword profile. Ties are broken by RESUME_VARIANTS order (first listed wins).
export function suggestResumeVariant(matchedSkills: string[]): ResumeSuggestion {
  const matchedSet = new Set(matchedSkills.map(normalize));

  let best: { variant: ResumeVariant; overlap: string[] } | null = null;

  for (const variant of RESUME_VARIANTS) {
    const overlap = variant.keywords.filter((keyword) => matchedSet.has(normalize(keyword)));
    if (!best || overlap.length > best.overlap.length) {
      best = { variant, overlap };
    }
  }

  // best is always set: RESUME_VARIANTS is a non-empty constant.
  const { variant, overlap } = best!;

  if (overlap.length === 0) {
    return {
      variant: variant.name,
      reason: `No strong keyword overlap found; defaulting to ${variant.name} as the baseline variant.`,
    };
  }

  return {
    variant: variant.name,
    reason: `Matches ${overlap.length} skill(s) this JD wants (${overlap.slice(0, 3).join(", ")}) that the ${variant.name} resume emphasizes.`,
  };
}
