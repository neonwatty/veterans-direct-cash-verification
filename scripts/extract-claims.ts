#!/usr/bin/env tsx
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { extractClaimsFromFixtureExpectations } from "../src/providers/fixture.js";
import { extractClaimsWithOpenAi } from "../src/providers/openai.js";

interface Args {
  documentPath: string;
  provider: "fixture" | "openai";
  output?: string;
  image?: string[];
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const claims = args.provider === "openai"
    ? await extractClaimsWithOpenAi({ imagePaths: args.image ?? defaultRenderedImage(args.documentPath) })
    : await extractClaimsFromFixtureExpectations(args.documentPath);

  const json = JSON.stringify(claims, null, 2) + "\n";
  if (args.output) {
    await mkdir(path.dirname(args.output), { recursive: true });
    await writeFile(args.output, json, "utf8");
  } else {
    process.stdout.write(json);
  }
}

function parseArgs(argv: string[]): Args {
  const args: Args = {
    documentPath: "",
    provider: "fixture",
    image: []
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
    } else if (!args.documentPath) {
      args.documentPath = current;
    } else {
      throw new Error(`Unexpected argument: ${current}`);
    }
  }

  if (!args.documentPath) {
    throw new Error("Usage: npm run extract -- <document.pdf> [--provider fixture|openai] [--image page.png] [--output claims.json]");
  }

  return args;
}

function defaultRenderedImage(documentPath: string): string[] {
  const fileName = path.basename(documentPath);
  return [`fixtures/rendered-pages/${fileName}.png`];
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
