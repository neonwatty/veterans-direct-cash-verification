export type Confidence = "high" | "medium" | "low";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

export interface FixtureExpectation {
  file: string;
  document_type: string;
  expected: Record<string, JsonValue>;
  must_flag_human_review: boolean;
  must_not_infer: string[];
}

export interface FixtureFile {
  fixtures: FixtureExpectation[];
}

export interface ExtractedClaims {
  document_type?: string;
  issuer?: string | null;
  document_date?: string | null;
  extraction_confidence?: Confidence;
  needs_human_review?: boolean;
  review_reasons?: string[];
  subject?: Record<string, JsonValue>;
  service?: Record<string, JsonValue>;
  benefits?: Record<string, JsonValue>;
  derived?: Record<string, JsonValue>;
  [key: string]: JsonValue | undefined;
}

export interface EvaluationResult {
  file: string;
  passed: boolean;
  failures: string[];
}
