// Common legal-entity suffixes that show up inconsistently between a job description's
// company name and how the same company signs its emails (e.g. "Acme" vs "Acme Inc.").
const LEGAL_SUFFIXES =
  /\b(inc|incorporated|corp|corporation|co|company|ltd|limited|llc|llp|plc|gmbh)\b\.?/gi;

export function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(LEGAL_SUFFIXES, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Levenshtein edit distance between two strings.
function editDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const dist = Array.from({ length: rows }, (_, i) => [
    i,
    ...Array<number>(cols - 1).fill(0),
  ]);
  for (let j = 1; j < cols; j++) dist[0][j] = j;

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dist[i][j] = Math.min(
        dist[i - 1][j] + 1, // deletion
        dist[i][j - 1] + 1, // insertion
        dist[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return dist[rows - 1][cols - 1];
}

// 1.0 = identical (after normalization), 0.0 = completely different.
export function companyNameSimilarity(a: string, b: string): number {
  const normA = normalizeCompanyName(a);
  const normB = normalizeCompanyName(b);

  if (!normA || !normB) return 0;
  if (normA === normB) return 1;

  // One name fully contains the other (e.g. "Acme" vs "Acme Digital") — treat as a
  // strong match rather than penalizing for the length difference.
  if (normA.includes(normB) || normB.includes(normA)) {
    return 0.9;
  }

  const distance = editDistance(normA, normB);
  const maxLen = Math.max(normA.length, normB.length);
  return maxLen === 0 ? 0 : 1 - distance / maxLen;
}

export interface CompanyMatchCandidate {
  applicationId: string;
  companyName: string;
}

export interface CompanyMatchResult {
  applicationId: string;
  companyName: string;
  score: number;
}

const MATCH_THRESHOLD = 0.72;

// Returns the best-scoring candidate at or above the match threshold, or null if
// nothing is a confident enough match. Ties break in favor of the first candidate.
export function findBestCompanyMatch(
  extractedCompanyName: string,
  candidates: CompanyMatchCandidate[]
): CompanyMatchResult | null {
  let best: CompanyMatchResult | null = null;

  for (const candidate of candidates) {
    const score = companyNameSimilarity(extractedCompanyName, candidate.companyName);
    if (score >= MATCH_THRESHOLD && (!best || score > best.score)) {
      best = { applicationId: candidate.applicationId, companyName: candidate.companyName, score };
    }
  }

  return best;
}
