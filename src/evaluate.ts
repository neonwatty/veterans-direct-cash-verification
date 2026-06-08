import type { EvaluationResult, ExtractedClaims, FixtureExpectation, JsonValue } from "./types.js";

const CLAIM_LOCATIONS = ["", "subject", "service", "benefits", "derived"] as const;

export function evaluateFixtureClaims(
  fixture: FixtureExpectation,
  extracted: ExtractedClaims
): EvaluationResult {
  const failures: string[] = [];

  if (extracted.document_type !== fixture.document_type) {
    failures.push(
      `document_type expected ${fixture.document_type} but got ${formatValue(extracted.document_type)}`
    );
  }

  for (const [claim, expectedValue] of Object.entries(fixture.expected)) {
    const actualValue = findClaimValue(extracted, claim);
    if (!jsonEquals(actualValue, expectedValue)) {
      failures.push(
        `expected.${claim} expected ${formatValue(expectedValue)} but got ${formatValue(actualValue)}`
      );
    }
  }

  if (fixture.must_flag_human_review && extracted.needs_human_review !== true) {
    failures.push("needs_human_review expected true");
  }

  for (const forbiddenClaim of fixture.must_not_infer) {
    const actualValue = findClaimValue(extracted, forbiddenClaim);
    if (actualValue !== undefined && actualValue !== null && actualValue !== false) {
      failures.push(`must_not_infer.${forbiddenClaim} was present as ${formatValue(actualValue)}`);
    }
  }

  return {
    file: fixture.file,
    passed: failures.length === 0,
    failures
  };
}

export function evaluateAllFixtures(
  fixtures: FixtureExpectation[],
  extractedByFile: Map<string, ExtractedClaims>
): EvaluationResult[] {
  return fixtures.map((fixture) => {
    const extracted = extractedByFile.get(fixture.file);
    if (!extracted) {
      return {
        file: fixture.file,
        passed: false,
        failures: [`missing extraction for ${fixture.file}`]
      };
    }
    return evaluateFixtureClaims(fixture, extracted);
  });
}

export function findClaimValue(extracted: ExtractedClaims, claim: string): JsonValue | undefined {
  for (const location of CLAIM_LOCATIONS) {
    const container = location ? extracted[location] : extracted;
    if (isRecord(container) && Object.prototype.hasOwnProperty.call(container, claim)) {
      return container[claim] as JsonValue;
    }
  }
  return undefined;
}

function jsonEquals(left: JsonValue | undefined, right: JsonValue): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function formatValue(value: unknown): string {
  return value === undefined ? "undefined" : JSON.stringify(value);
}
