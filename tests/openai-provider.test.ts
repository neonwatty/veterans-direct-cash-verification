import assert from "node:assert/strict";
import test from "node:test";
import {
  buildOpenAiExtractionPrompt,
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
