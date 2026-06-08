import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ExtractedClaims, FixtureFile } from "../types.js";

export async function extractClaimsFromFixtureExpectations(
  documentPath: string,
  expectedClaimsPath = "fixtures/expected-claims.json"
): Promise<ExtractedClaims> {
  const fixtureFile = JSON.parse(await readFile(expectedClaimsPath, "utf8")) as FixtureFile;
  const normalizedDocumentPath = normalizePath(documentPath);
  const fixture = fixtureFile.fixtures.find((candidate) => {
    return normalizePath(candidate.file) === normalizedDocumentPath ||
      path.basename(candidate.file) === path.basename(documentPath);
  });

  if (!fixture) {
    throw new Error(`No fixture expectation found for ${documentPath}`);
  }

  return {
    document_type: fixture.document_type,
    extraction_confidence: "high",
    needs_human_review: fixture.must_flag_human_review,
    review_reasons: fixture.must_flag_human_review ? ["fixture requires review"] : [],
    ...nestExpectedClaims(fixture.expected)
  };
}

function nestExpectedClaims(expected: Record<string, unknown>): ExtractedClaims {
  const extracted: ExtractedClaims = {
    subject: {},
    service: {},
    benefits: {},
    derived: {}
  };

  for (const [key, value] of Object.entries(expected)) {
    if (key.includes("name")) {
      extracted.subject![key] = value as never;
    } else if (
      key.includes("service") ||
      key.includes("branch") ||
      key.includes("rank") ||
      key.includes("discharge") ||
      key.includes("duty")
    ) {
      extracted.service![key] = value as never;
    } else if (key.includes("disability") || key.includes("rating")) {
      extracted.benefits![key] = value as never;
    } else {
      extracted.derived![key] = value as never;
    }
  }

  return extracted;
}

function normalizePath(value: string): string {
  return value.replaceAll("\\", "/");
}
