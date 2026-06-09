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
    text: {
      format: {
        type: "json_schema",
        name: "verified_veteran_claims",
        strict: true,
        schema: extractedClaimsJsonSchema()
      }
    },
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

function extractedClaimsJsonSchema(): Record<string, unknown> {
  const nullableString = { anyOf: [{ type: "string" }, { type: "null" }] };
  const nullableNumber = { anyOf: [{ type: "number" }, { type: "null" }] };
  const nullableBoolean = { anyOf: [{ type: "boolean" }, { type: "null" }] };

  return {
    type: "object",
    additionalProperties: false,
    required: [
      "document_type",
      "extraction_confidence",
      "needs_human_review",
      "review_reasons",
      "subject",
      "service",
      "benefits",
      "derived"
    ],
    properties: {
      document_type: {
        enum: [
          "va_civil_service_letter",
          "va_benefit_summary_letter",
          "statement_of_service",
          "dd214",
          "ngb22",
          "unknown"
        ]
      },
      extraction_confidence: { enum: ["high", "medium", "low"] },
      needs_human_review: { type: "boolean" },
      review_reasons: { type: "array", items: { type: "string" } },
      subject: {
        type: "object",
        additionalProperties: false,
        required: ["subject_name", "date_of_birth"],
        properties: {
          subject_name: nullableString,
          date_of_birth: nullableString
        }
      },
      service: {
        type: "object",
        additionalProperties: false,
        required: [
          "branch",
          "rank_or_pay_grade",
          "active_duty_service_date",
          "expected_discharge_or_release_date",
          "expected_character_of_discharge",
          "current_service_supported",
          "completed_discharge",
          "veteran_status_verified",
          "completed_veteran_status_supported",
          "service_periods_present",
          "character_of_service",
          "active_duty_supported",
          "service_connected_disability",
          "record_of_service_net_years",
          "record_of_service_net_months",
          "record_of_service_net_days",
          "guard_service_supported",
          "federal_active_duty_status",
          "deployment_count",
          "combat_status",
          "va_disability_rating"
        ],
        properties: {
          branch: nullableString,
          rank_or_pay_grade: nullableString,
          active_duty_service_date: nullableString,
          expected_discharge_or_release_date: nullableString,
          expected_character_of_discharge: nullableString,
          current_service_supported: nullableBoolean,
          completed_discharge: nullableBoolean,
          veteran_status_verified: nullableBoolean,
          completed_veteran_status_supported: nullableBoolean,
          service_periods_present: nullableBoolean,
          character_of_service: nullableString,
          active_duty_supported: nullableBoolean,
          service_connected_disability: nullableString,
          record_of_service_net_years: nullableNumber,
          record_of_service_net_months: nullableNumber,
          record_of_service_net_days: nullableNumber,
          guard_service_supported: nullableBoolean,
          federal_active_duty_status: nullableBoolean,
          deployment_count: nullableNumber,
          combat_status: nullableBoolean,
          va_disability_rating: nullableNumber
        }
      },
      benefits: {
        type: "object",
        additionalProperties: false,
        required: ["rating_threshold"],
        properties: {
          rating_threshold: nullableString
        }
      },
      derived: {
        type: "object",
        additionalProperties: false,
        required: [
          "issuer",
          "document_date",
          "veteran_status_supported",
          "completed_veteran_status_supported"
        ],
        properties: {
          issuer: nullableString,
          document_date: nullableString,
          veteran_status_supported: nullableBoolean,
          completed_veteran_status_supported: nullableBoolean
        }
      }
    }
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

  return normalizeExtractedClaims(parseOpenAiJsonResponse(outputText));
}

export function normalizeExtractedClaims(claims: ExtractedClaims): ExtractedClaims {
  const normalized: ExtractedClaims = {
    ...claims,
    subject: { ...(claims.subject ?? {}) },
    service: { ...(claims.service ?? {}) },
    benefits: { ...(claims.benefits ?? {}) },
    derived: { ...(claims.derived ?? {}) },
    review_reasons: [...(claims.review_reasons ?? [])]
  };

  normalizeDerived(normalized);
  normalizeService(normalized);
  applyReviewRules(normalized);

  return normalized;
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

function normalizeDerived(claims: ExtractedClaims): void {
  if (!claims.derived) return;
  const issuer = claims.derived.issuer;
  if (typeof issuer === "string") {
    claims.derived.issuer = normalizeIssuer(issuer);
  } else if (claims.document_type === "ngb22") {
    claims.derived.issuer = "National Guard";
  }
  const documentDate = claims.derived.document_date;
  if (typeof documentDate === "string") {
    claims.derived.document_date = normalizeDate(documentDate);
  }
  if (claims.document_type === "va_civil_service_letter" && claims.service?.active_duty_supported === true) {
    claims.derived.veteran_status_supported = true;
  }
}

function normalizeService(claims: ExtractedClaims): void {
  if (!claims.service) return;
  const service = claims.service;
  if (typeof service.branch === "string") {
    service.branch = normalizeBranch(service.branch);
  }
  for (const field of ["active_duty_service_date", "expected_discharge_or_release_date"] as const) {
    if (typeof service[field] === "string") {
      service[field] = normalizeDate(service[field]);
    }
  }
  if (typeof service.expected_character_of_discharge === "string") {
    service.expected_character_of_discharge = normalizeCharacter(service.expected_character_of_discharge);
  }
  if (typeof service.character_of_service === "string") {
    service.character_of_service = normalizeCharacter(service.character_of_service);
  }
  if (claims.document_type === "va_civil_service_letter") {
    service.service_periods_present = false;
  }
  if (typeof service.service_connected_disability === "string") {
    service.service_connected_disability = normalizeServiceConnectedDisability(service.service_connected_disability);
  }
  if (claims.document_type === "ngb22" && hasRecordOfService(service)) {
    service.guard_service_supported = true;
  }
  if (claims.benefits && typeof claims.benefits.rating_threshold === "string") {
    claims.benefits.rating_threshold = normalizeRatingThreshold(claims.benefits.rating_threshold);
  }
}

function applyReviewRules(claims: ExtractedClaims): void {
  if (!claims.service || !claims.derived) return;
  const isCurrentServiceLetter = claims.document_type === "statement_of_service" ||
    claims.service.current_service_supported === true ||
    Boolean(claims.service.expected_discharge_or_release_date);

  if (isCurrentServiceLetter) {
    claims.needs_human_review = true;
    claims.derived.completed_veteran_status_supported = false;
    claims.service.completed_veteran_status_supported = false;
    addReviewReason(claims, "current service or expected discharge document requires human review");
  }
}

function addReviewReason(claims: ExtractedClaims, reason: string): void {
  const existing = claims.review_reasons ?? [];
  if (!existing.includes(reason)) {
    existing.push(reason);
  }
  claims.review_reasons = existing;
}

function normalizeIssuer(value: string): string {
  const upper = value.toUpperCase();
  if (upper.includes("DEPARTMENT OF THE ARMY")) return "Department of the Army";
  if (upper.includes("DEPARTMENT OF VETERANS AFFAIRS")) return "Department of Veterans Affairs";
  if (upper.includes("NATIONAL GUARD")) return "National Guard";
  return toTitleCase(value);
}

function normalizeBranch(value: string): string {
  const upper = value.toUpperCase();
  if (upper === "ARMY") return "Army";
  if (upper === "NAVY") return "Navy";
  if (upper === "AIR FORCE") return "Air Force";
  if (upper === "MARINE CORPS") return "Marine Corps";
  if (upper === "COAST GUARD") return "Coast Guard";
  if (upper === "SPACE FORCE") return "Space Force";
  if (upper.includes("NATIONAL GUARD")) return "National Guard";
  return toTitleCase(value);
}

function normalizeCharacter(value: string): string {
  const normalized = value.trim().toLowerCase().replaceAll(/\s+/g, "_");
  if (normalized === "honorable_conditions" || normalized === "must_be_honorable") {
    return "honorable";
  }
  return normalized;
}

function normalizeDate(value: string): string {
  const trimmed = value.trim();
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, month, day, year] = slashMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const textMatch = trimmed.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (textMatch) {
    const [, day, monthName, year] = textMatch;
    const month = monthNumber(monthName);
    if (month) {
      return `${year}-${month}-${day.padStart(2, "0")}`;
    }
  }

  const commaTextMatch = trimmed.match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/);
  if (commaTextMatch) {
    const [, monthName, day, year] = commaTextMatch;
    const month = monthNumber(monthName);
    if (month) {
      return `${year}-${month}-${day.padStart(2, "0")}`;
    }
  }

  return trimmed;
}

function normalizeServiceConnectedDisability(value: string): string {
  const lower = value.toLowerCase();
  return lower.includes("service-connected") || (lower.includes("30") && lower.includes("disabling"))
    ? "yes"
    : value;
}

function normalizeRatingThreshold(value: string): string {
  const lower = value.toLowerCase();
  if (lower.includes("30") && lower.includes("percent")) {
    return "30_percent_or_more";
  }
  return value;
}

function hasRecordOfService(service: Record<string, unknown>): boolean {
  return typeof service.record_of_service_net_years === "number" ||
    typeof service.record_of_service_net_months === "number" ||
    typeof service.record_of_service_net_days === "number";
}

function monthNumber(monthName: string): string | undefined {
  const months = new Map([
    ["january", "01"],
    ["february", "02"],
    ["march", "03"],
    ["april", "04"],
    ["may", "05"],
    ["june", "06"],
    ["july", "07"],
    ["august", "08"],
    ["september", "09"],
    ["october", "10"],
    ["november", "11"],
    ["december", "12"]
  ]);
  return months.get(monthName.toLowerCase());
}

function toTitleCase(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replaceAll(/\b[a-z]/g, (letter) => letter.toUpperCase());
}
