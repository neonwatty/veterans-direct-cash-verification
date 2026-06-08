import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ExtractedClaims } from "../types.js";

export interface OpenAiExtractionOptions {
  apiKey?: string;
  model?: string;
  imagePaths: string[];
}

export interface OpenAiRequestBodyOptions {
  model: string;
  prompt: string;
  imageDataUrls: string[];
}

export interface OpenAiDryRunSummaryOptions {
  model: string;
  documentPath: string;
  imagePaths: string[];
  outputPath?: string;
}

export interface OpenAiDryRunSummary {
  provider: "openai";
  endpoint: "https://api.openai.com/v1/responses";
  model: string;
  documentPath: string;
  imagePaths: string[];
  outputPath: string | null;
  store: false;
  liveCallWouldSendImages: true;
  liveCallRequiresApiKey: true;
}

export function buildOpenAiExtractionPrompt(): string {
  return [
    "Extract only facts explicitly visible in the document.",
    "Do not infer combat service, deployment count, veteran status, disability rating, service duration, or discharge completion unless the document directly states it.",
    "Return strict JSON matching the verified veteran claims schema.",
    "For every non-null field, include the shortest evidence text that supports it when possible.",
    "Use null or unknown when a field is absent or unreadable.",
    "Flag human review when the document is a sample, fields are blank, the subject name is missing, or a claim depends on interpretation."
  ].join("\n");
}

export function buildOpenAiRequestBody(options: OpenAiRequestBodyOptions): Record<string, unknown> {
  return {
    model: options.model,
    store: false,
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: options.prompt },
          ...options.imageDataUrls.map((imageUrl) => ({
            type: "input_image",
            image_url: imageUrl
          }))
        ]
      }
    ]
  };
}

export function buildOpenAiDryRunSummary(options: OpenAiDryRunSummaryOptions): OpenAiDryRunSummary {
  return {
    provider: "openai",
    endpoint: "https://api.openai.com/v1/responses",
    model: options.model,
    documentPath: options.documentPath,
    imagePaths: options.imagePaths,
    outputPath: options.outputPath ?? null,
    store: false,
    liveCallWouldSendImages: true,
    liveCallRequiresApiKey: true
  };
}

export function assertFixtureOnlyPath(filePath: string, label: "document" | "image" | "output"): void {
  const normalized = normalizePath(filePath);
  const allowed = label === "output"
    ? normalized.startsWith("reports/extractions/openai/")
    : normalized.startsWith("fixtures/");

  if (!allowed) {
    const allowedRoot = label === "output" ? "reports/extractions/openai/" : "fixtures/";
    throw new Error(`Refusing to use non-fixture ${label} path: ${filePath}. Expected path under ${allowedRoot}`);
  }
}

export function parseOpenAiJsonResponse(outputText: string): ExtractedClaims {
  const trimmed = outputText.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const jsonText = fenced ? fenced[1] : trimmed;
  return JSON.parse(jsonText) as ExtractedClaims;
}

export async function extractClaimsWithOpenAi(
  options: OpenAiExtractionOptions
): Promise<ExtractedClaims> {
  const apiKey = options.apiKey ?? process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for --provider openai");
  }

  const model = options.model ?? process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
  const imageContent = await Promise.all(
    options.imagePaths.map((imagePath) => toDataUrl(imagePath))
  );
  const body = buildOpenAiRequestBody({
    model,
    prompt: buildOpenAiExtractionPrompt(),
    imageDataUrls: imageContent
  });

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI extraction failed: HTTP ${response.status} ${body}`);
  }

  const payload = await response.json() as { output_text?: string; output?: unknown };
  const outputText = payload.output_text ?? extractOutputText(payload.output);
  if (!outputText) {
    throw new Error("OpenAI response did not include output_text");
  }

  return parseOpenAiJsonResponse(outputText);
}

async function toDataUrl(imagePath: string): Promise<string> {
  const extension = path.extname(imagePath).toLowerCase();
  const mimeType = extension === ".jpg" || extension === ".jpeg" ? "image/jpeg" : "image/png";
  const data = await readFile(imagePath);
  return `data:${mimeType};base64,${data.toString("base64")}`;
}

function extractOutputText(output: unknown): string | undefined {
  if (!Array.isArray(output)) return undefined;
  const chunks: string[] = [];
  for (const item of output) {
    if (!isRecord(item) || !Array.isArray(item.content)) continue;
    for (const content of item.content) {
      if (isRecord(content) && typeof content.text === "string") {
        chunks.push(content.text);
      }
    }
  }
  return chunks.length ? chunks.join("\n") : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizePath(value: string): string {
  return value.replaceAll("\\", "/").replace(/^\.\//, "");
}
