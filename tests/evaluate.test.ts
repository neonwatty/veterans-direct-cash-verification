import assert from "node:assert/strict";
import test from "node:test";
import { evaluateFixtureClaims } from "../src/evaluate.js";
import type { ExtractedClaims, FixtureExpectation } from "../src/types.js";

const statementFixture: FixtureExpectation = {
  file: "statement-of-service-sample.pdf",
  document_type: "statement_of_service",
  expected: {
    branch: "Army",
    active_duty_service_date: "1918-05-02",
    completed_veteran_status_supported: false
  },
  must_flag_human_review: true,
  must_not_infer: ["veteran_status_verified", "deployment_count"]
};

test("passes when required fields match and human review is correctly flagged", () => {
  const extracted: ExtractedClaims = {
    document_type: "statement_of_service",
    extraction_confidence: "high",
    needs_human_review: true,
    review_reasons: ["current service letter requires reviewer confirmation"],
    service: {
      branch: "Army",
      active_duty_service_date: "1918-05-02"
    },
    derived: {
      completed_veteran_status_supported: false
    }
  };

  const result = evaluateFixtureClaims(statementFixture, extracted);

  assert.equal(result.passed, true);
  assert.deepEqual(result.failures, []);
});

test("fails when an extractor over-infers forbidden claims", () => {
  const extracted: ExtractedClaims = {
    document_type: "statement_of_service",
    extraction_confidence: "high",
    needs_human_review: true,
    service: {
      branch: "Army",
      active_duty_service_date: "1918-05-02",
      deployment_count: 2
    },
    derived: {
      completed_veteran_status_supported: false,
      veteran_status_verified: true
    }
  };

  const result = evaluateFixtureClaims(statementFixture, extracted);

  assert.equal(result.passed, false);
  assert.match(result.failures.join("\n"), /must_not_infer\.veteran_status_verified/);
  assert.match(result.failures.join("\n"), /must_not_infer\.deployment_count/);
});

test("fails when a fixture requires human review and extractor does not route it", () => {
  const extracted: ExtractedClaims = {
    document_type: "statement_of_service",
    extraction_confidence: "high",
    needs_human_review: false,
    service: {
      branch: "Army",
      active_duty_service_date: "1918-05-02"
    },
    derived: {
      completed_veteran_status_supported: false
    }
  };

  const result = evaluateFixtureClaims(statementFixture, extracted);

  assert.equal(result.passed, false);
  assert.match(result.failures.join("\n"), /needs_human_review/);
});
