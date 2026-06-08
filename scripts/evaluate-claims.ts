#!/usr/bin/env tsx
import { readFile } from "node:fs/promises";
import { evaluateAllFixtures } from "../src/evaluate.js";
import type { ExtractedClaims, FixtureFile } from "../src/types.js";

async function main(): Promise<void> {
  const expectedPath = process.argv[2] ?? "fixtures/expected-claims.json";
  const extractionsDir = process.argv[3] ?? "reports/extractions";
  const fixtures = JSON.parse(await readFile(expectedPath, "utf8")) as FixtureFile;
  const extractedByFile = new Map<string, ExtractedClaims>();

  for (const fixture of fixtures.fixtures) {
    const safeName = fixture.file.split("/").pop()!.replace(/\.pdf$/i, ".claims.json");
    const extractionPath = `${extractionsDir}/${safeName}`;
    try {
      extractedByFile.set(fixture.file, JSON.parse(await readFile(extractionPath, "utf8")) as ExtractedClaims);
    } catch {
      // Missing extraction is reported by the evaluator.
    }
  }

  const results = evaluateAllFixtures(fixtures.fixtures, extractedByFile);
  process.stdout.write(JSON.stringify({ passed: results.every((result) => result.passed), results }, null, 2) + "\n");
  if (results.some((result) => !result.passed)) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
