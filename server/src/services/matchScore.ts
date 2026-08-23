// Pure, dependency-free scoring logic so it can be unit tested without a DB or network call.

export interface MatchScoreInput {
  requiredSkills: string[];
  preferredSkills: string[];
  userSkills: string[];
}

export interface MatchScoreResult {
  fitScore: number;
  matchedRequired: string[];
  missingRequired: string[];
  matchedPreferred: string[];
  missingPreferred: string[];
}

// Required skills count for more of the score than preferred skills, since missing a
// "required" skill is a stronger signal of poor fit than missing a "preferred" one.
// Kept as integer percentage points (not 0.7/0.3) so the weighting multiplies in before
// dividing — e.g. (3 * 70) / 4 — rather than after, which avoids binary floating-point
// error from decimals like 0.7 (0.75 * 0.7 === 0.5249999999999999, not 0.525).
const REQUIRED_WEIGHT = 70;
const PREFERRED_WEIGHT = 30;

function normalize(skill: string): string {
  return skill.trim().toLowerCase();
}

function partitionMatches(
  jdSkills: string[],
  userSkillSet: Set<string>
): { matched: string[]; missing: string[] } {
  const matched: string[] = [];
  const missing: string[] = [];

  for (const skill of jdSkills) {
    if (userSkillSet.has(normalize(skill))) {
      matched.push(skill);
    } else {
      missing.push(skill);
    }
  }

  return { matched, missing };
}

export function computeMatchScore({
  requiredSkills,
  preferredSkills,
  userSkills,
}: MatchScoreInput): MatchScoreResult {
  const userSkillSet = new Set(userSkills.map(normalize));

  const { matched: matchedRequired, missing: missingRequired } = partitionMatches(
    requiredSkills,
    userSkillSet
  );
  const { matched: matchedPreferred, missing: missingPreferred } = partitionMatches(
    preferredSkills,
    userSkillSet
  );

  // A JD that lists no skills in a bucket can't ding you for missing skills in that
  // bucket, so an empty bucket contributes its full weight rather than zero.
  const requiredContribution =
    requiredSkills.length === 0
      ? REQUIRED_WEIGHT
      : (matchedRequired.length * REQUIRED_WEIGHT) / requiredSkills.length;
  const preferredContribution =
    preferredSkills.length === 0
      ? PREFERRED_WEIGHT
      : (matchedPreferred.length * PREFERRED_WEIGHT) / preferredSkills.length;

  const fitScore = Math.round(requiredContribution + preferredContribution);

  return {
    fitScore,
    matchedRequired,
    missingRequired,
    matchedPreferred,
    missingPreferred,
  };
}
