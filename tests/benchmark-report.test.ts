import assert from "node:assert/strict";
import test from "node:test";
import { renderBenchmarkMarkdown } from "../src/benchmark-report.js";
import type { EvaluationResult } from "../src/types.js";

test("renders benchmark markdown with summary and failures", () => {
  const results: EvaluationResult[] = [
    { file: "fixtures/a.pdf", passed: true, failures: [] },
    { file: "fixtures/b.pdf", passed: false, failures: ["missing field", "over-inferred deployment"] }
  ];

  const markdown = renderBenchmarkMarkdown({
    title: "Example Benchmark",
    date: "2026-06-08",
    extractionDir: "reports/extractions/openai",
    results,
    commands: ["npm run evaluate fixtures/expected-claims.json reports/extractions/openai"],
    notes: ["Structured outputs were used."]
  });

  assert.match(markdown, /# Example Benchmark/);
  assert.match(markdown, /Passed: 1/);
  assert.match(markdown, /Failed: 1/);
  assert.match(markdown, /fixtures\/b\.pdf/);
  assert.match(markdown, /missing field/);
});
