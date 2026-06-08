#!/usr/bin/env tsx
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { extractClaimsFromFixtureExpectations } from "../src/providers/fixture.js";
import {
  assertFixtureOnlyPath,
  buildOpenAiDryRunSummary,
  extractClaimsWithOpenAi
} from "../src/providers/openai.js";

interface Args {
  documentPath: string;
  provider: "fixture" | "openai";
  output?: string;
  image?: string[];
  dryRun: boolean;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const imagePaths = args.image?.length ? args.image : defaultRenderedImage(args.documentPath);
  const outputPath = args.output ?? defaultOutputPath(args.documentPath, args.provider);

  if (args.provider === "openai") {
    enforceOpenAiFixtureGuardrails(args.documentPath, imagePaths, outputPath);
    if (args.dryRun) {
      process.stdout.write(JSON.stringify(buildOpenAiDryRunSummary({
        model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
        documentPath: args.documentPath,
        imagePaths,
        outputPath
      }), null, 2) + "\n");
      return;
    }
  } else if (args.dryRun) {
    throw new Error("--dry-run is only supported for --provider openai");
  }

  const claims = args.provider === "openai"
    ? await extractClaimsWithOpenAi({ imagePaths })
    : await extractClaimsFromFixtureExpectations(args.documentPath);

  const json = JSON.stringify(claims, null, 2) + "\n";
  if (outputPath) {
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, json, "utf8");
  } else {
    process.stdout.write(json);
  }
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    documentPath: "",
    provider: "fixture",
    image: [],
    dryRun: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const current = argv[i];
    if (current === "--provider") {
      const provider = argv[++i];
      if (provider !== "fixture" && provider !== "openai") {
        throw new Error("--provider must be fixture or openai");
      }
      args.provider = provider;
    } else if (current === "--output") {
      args.output = argv[++i];
    } else if (current === "--image") {
      args.image!.push(argv[++i]);
    } else if (current === "--dry-run") {
      args.dryRun = true;
    } else if (!args.documentPath) {
      args.documentPath = current;
    } else {
      throw new Error(`Unexpected argument: ${current}`);
    }
  }

  if (!args.documentPath) {
    throw new Error("Usage: npm run extract -- <document.pdf> [--provider fixture|openai] [--image page.png] [--output claims.json] [--dry-run]");
  }

  return args;
}

function defaultRenderedImage(documentPath: string): string[] {
  const fileName = path.basename(documentPath);
  return [`fixtures/rendered-pages/${fileName}.png`];
}

function defaultOutputPath(documentPath: string, provider: Args["provider"]): string | undefined {
  if (provider !== "openai") return undefined;
  return `reports/extractions/openai/${path.basename(documentPath).replace(/\.pdf$/i, ".claims.json")}`;
}

function enforceOpenAiFixtureGuardrails(
  documentPath: string,
  imagePaths: string[],
  outputPath: string | undefined
): void {
  assertFixtureOnlyPath(documentPath, "document");
  for (const imagePath of imagePaths) {
    assertFixtureOnlyPath(imagePath, "image");
  }
  if (outputPath) {
    assertFixtureOnlyPath(outputPath, "output");
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
