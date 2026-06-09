#!/usr/bin/env tsx
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { renderBenchmarkMarkdown } from "../src/benchmark-report.js";
import { evaluateAllFixtures } from "../src/evaluate.js";
import type { ExtractedClaims, FixtureFile } from "../src/types.js";

interface Args {
  expectedPath: string;
  extractionDir: string;
  outputMarkdown: string;
  outputJson: string;
  title: string;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const fixtures = JSON.parse(await readFile(args.expectedPath, "utf8")) as FixtureFile;
  const extractedByFile = new Map<string, ExtractedClaims>();

  for (const fixture of fixtures.fixtures) {
    const extractionPath = path.join(args.extractionDir, path.basename(fixture.file).replace(/\.pdf$/i, ".claims.json"));
    try {
      extractedByFile.set(fixture.file, JSON.parse(await readFile(extractionPath, "utf8")) as ExtractedClaims);
    } catch {
      // Missing extraction is reported by evaluateAllFixtures.
    }
  }

  const results = evaluateAllFixtures(fixtures.fixtures, extractedByFile);
  const passed = results.every((result) => result.passed);
  const payload = {
    passed,
    generated_at: new Date().toISOString(),
    expectedPath: args.expectedPath,
    extractionDir: args.extractionDir,
    results
  };

  await mkdir(path.dirname(args.outputJson), { recursive: true });
  await mkdir(path.dirname(args.outputMarkdown), { recursive: true });
  await writeFile(args.outputJson, JSON.stringify(payload, null, 2) + "\n", "utf8");
  await writeFile(args.outputMarkdown, renderBenchmarkMarkdown({
    title: args.title,
    date: new Date().toISOString().slice(0, 10),
    extractionDir: args.extractionDir,
    results,
    commands: [
      `npm run benchmark -- --expected ${args.expectedPath} --dir ${args.extractionDir} --out ${args.outputMarkdown}`
    ],
    notes: [
      "This benchmark evaluates normalized extraction outputs against the committed expected claims.",
      "Passing this benchmark does not mean final adjudication is automated; human review rules still apply."
    ]
  }), "utf8");

  process.stdout.write(JSON.stringify(payload, null, 2) + "\n");
  if (!passed) {
    process.exitCode = 1;
  }
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    expectedPath: "fixtures/expected-claims.json",
    extractionDir: "reports/extractions/openai",
    outputMarkdown: "reports/openai-fixture-benchmark-latest.md",
    outputJson: "reports/openai-fixture-benchmark-latest.json",
    title: "OpenAI Fixture Extraction Benchmark"
  };

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (current === "--expected") {
      args.expectedPath = argv[++index];
    } else if (current === "--dir") {
      args.extractionDir = argv[++index];
    } else if (current === "--out") {
      args.outputMarkdown = argv[++index];
    } else if (current === "--json-out") {
      args.outputJson = argv[++index];
    } else if (current === "--title") {
      args.title = argv[++index];
    } else {
      throw new Error(`Unexpected argument: ${current}`);
    }
  }

  return args;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
