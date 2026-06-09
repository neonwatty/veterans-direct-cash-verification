import assert from "node:assert/strict";
import test from "node:test";
import {
  buildOpenAiExtractionPrompt,
  buildOpenAiRequestBody,
  buildOpenAiDryRunSummary,
  assertFixtureOnlyPath,
  normalizeExtractedClaims,
  parseOpenAiJsonResponse
} from "../src/providers/openai.js";

test("OpenAI extraction prompt forbids unsupported inference", () => {
  const prompt = buildOpenAiExtractionPrompt();

  assert.match(prompt, /Extract only facts explicitly visible/i);
  assert.match(prompt, /Do not infer/i);
  assert.match(prompt, /deployment count/i);
  assert.match(prompt, /human review/i);
});

test("parses JSON from plain or fenced model output", () => {
  const plain = parseOpenAiJsonResponse('{"document_type":"ngb22","needs_human_review":true}');
  const fenced = parseOpenAiJsonResponse(
    '```json\n{"document_type":"statement_of_service","needs_human_review":false}\n```'
  );

  assert.equal(plain.document_type, "ngb22");
  assert.equal(fenced.document_type, "statement_of_service");
});

test("OpenAI request body opts out of storage", () => {
  const body = buildOpenAiRequestBody({
    model: "gpt-test",
    prompt: "extract",
    imageDataUrls: ["data:image/png;base64,abc"]
  });

  assert.equal(body.store, false);
  assert.equal(body.model, "gpt-test");
  assert.deepEqual((body.text as { format: { type: string; strict: boolean } }).format.type, "json_schema");
  assert.equal((body.text as { format: { strict: boolean } }).format.strict, true);
});

test("fixture-only guard rejects non-fixture paths", () => {
  assert.doesNotThrow(() => assertFixtureOnlyPath("fixtures/rendered-pages/sample.png", "image"));
  assert.throws(
    () => assertFixtureOnlyPath("/tmp/private-dd214.png", "image"),
    /Refusing to use non-fixture image path/
  );
});

test("dry-run summary omits secrets and image base64", () => {
  const summary = buildOpenAiDryRunSummary({
    model: "gpt-test",
    documentPath: "fixtures/source-documents/statement-of-service-sample.pdf",
    imagePaths: ["fixtures/rendered-pages/statement-of-service-sample.pdf.png"],
    outputPath: "reports/extractions/openai/statement-of-service-sample.claims.json"
  });
  const rendered = JSON.stringify(summary);

  assert.equal(summary.provider, "openai");
  assert.doesNotMatch(rendered, /OPENAI_API_KEY/);
  assert.doesNotMatch(rendered, /base64/);
  assert.match(rendered, /statement-of-service-sample/);
});

test("normalizes OpenAI statement-of-service claims and forces human review", () => {
  const normalized = normalizeExtractedClaims({
    document_type: "statement_of_service",
    extraction_confidence: "high",
    needs_human_review: false,
    review_reasons: [],
    subject: {
      subject_name: "JOE, GI",
      date_of_birth: "01/01/1902"
    },
    service: {
      branch: "ARMY",
      active_duty_service_date: "05/02/1918",
      expected_discharge_or_release_date: "02/05/2026",
      expected_character_of_discharge: "HONORABLE",
      current_service_supported: true,
      completed_veteran_status_supported: null
    },
    benefits: {},
    derived: {
      issuer: "DEPARTMENT OF THE ARMY",
      document_date: "17 December 2025",
      completed_veteran_status_supported: null
    }
  });

  assert.equal(normalized.needs_human_review, true);
  assert.equal(normalized.derived?.issuer, "Department of the Army");
  assert.equal(normalized.derived?.document_date, "2025-12-17");
  assert.equal(normalized.service?.branch, "Army");
  assert.equal(normalized.service?.active_duty_service_date, "1918-05-02");
  assert.equal(normalized.service?.expected_discharge_or_release_date, "2026-02-05");
  assert.equal(normalized.service?.expected_character_of_discharge, "honorable");
  assert.equal(normalized.derived?.completed_veteran_status_supported, false);
});
