# Verified Veteran Claims Pipeline Plan

Date: 2026-06-08

## Goal

Build an internal verification engine that converts user-consented veteran/service documents into privacy-preserving verified claims.

This is not a government-record lookup service. It is a consented document-and-API workflow that can later become a plug-and-play API for other veteran-serving organizations.

## Core Product Shape

Applicant uploads or connects proof. The system returns normalized claims:

```json
{
  "claim_set_id": "vclaim_123",
  "subject_identity_id": "ident_456",
  "veteran_status": {
    "value": "verified",
    "confidence": "high",
    "sources": ["va_letter"]
  },
  "service_periods": [
    {
      "branch": "Army",
      "start_date": "2005-01-12",
      "end_date": "2005-04-29",
      "character_of_service": "honorable",
      "confidence": "high"
    }
  ],
  "service_years": {
    "value": 4.3,
    "confidence": "medium",
    "calculation": "sum_verified_periods"
  },
  "review_status": "approved",
  "redaction_status": "safe_to_store_claims_only"
}
```

## Claims To Support

### Phase 1 claims

- Document type.
- Issuer / apparent source.
- Applicant name.
- Branch.
- Active duty or Guard/Reserve indicator.
- Service start date.
- Service end date or expected separation date.
- Character of service.
- Rank/pay grade.
- Disability rating band if shown on a VA letter.
- Service-connected disability present: yes/no/unknown.
- Whether evidence supports basic veteran status.
- Whether evidence supports current service / pending discharge.

### Phase 2 claims

- Multiple service periods.
- Total verified service duration.
- Reserve/Guard total service for pay or retired pay.
- Awards/campaign medals as low-confidence deployment indicators.
- Separation/reentry codes.
- Document authenticity signals.
- Cross-document consistency.

### Explicitly avoid in early scoring

- Combat status as a primary score driver.
- Tour count unless independently supported.
- Diagnosis details.
- Narrative reason for separation.
- Raw disability/medical details beyond coarse bands.

## System Architecture

### 1. Intake

- Accept PDF, JPEG, PNG, HEIC.
- Require applicant consent.
- Assign upload ID.
- Virus scan.
- Detect document page count and MIME type.
- Render every page to normalized images.
- Store raw upload in short-retention encrypted storage.

### 2. Preprocessing

- Deskew and rotate pages.
- Convert to 300 DPI grayscale or RGB images.
- Run PII detector on extracted text and image metadata.
- Create per-page thumbnails for review.
- Generate page hashes to detect duplicate uploads.

### 3. Extraction

Use a two-lane approach:

- Conventional OCR: Textract, Google Document AI, Azure Document Intelligence, Tesseract, or Vision OCR.
- Vision LLM document understanding: Codex/OpenAI vision or Claude vision using strict JSON schema prompts.

The LLM should not be treated as an authority. It should produce structured candidate claims with quoted evidence spans or visual anchors. Deterministic validators and human reviewers make final decisions.

### 4. Normalization

- Normalize dates to ISO 8601.
- Normalize branch names.
- Normalize character-of-service values.
- Convert service duration fields into numeric years/months/days.
- Map source-specific document types to internal document classes.

### 5. Validation

Run rules such as:

- Applicant identity must match document subject or trigger review.
- End date must be after start date.
- Character of service must be one of known categories or unknown.
- DD-214 Copy 1 may not show character of service; copy type matters.
- NGB-22 block 10 can support Guard service totals but does not prove federal active-duty status by itself.
- VA civil-service letters can support honorable active-duty separation and disability threshold, but may not show dates.

### 6. Confidence Scoring

Confidence should depend on source, extraction clarity, and consistency:

- VA API: very high.
- VA-generated PDF/letter with clear fields: high.
- DD-214/NGB-22 with readable fields: high after manual review.
- Statement of service: medium-high for current service, lower for future discharge.
- Self-attestation: low unless backed by another source.
- Awards/campaign medals: low for deployment/tour count unless program explicitly accepts them.

### 7. Human Review

Human review is required when:

- Veteran status is eligibility-critical and no API check succeeds.
- Document type is unknown.
- OCR/LLM confidence is low.
- Name mismatch exists.
- Discharge character is ambiguous.
- The applicant requests appeal.
- The system is asked to verify deployments/tours.

### 8. Output

Store verified claims, not raw documents:

- `verified_claims`
- `source_documents`
- `review_events`
- `claim_evidence_spans`
- `redaction_events`

Raw documents should have short retention by default, with longer retention only if legally required or explicitly consented.

## Suggested Extraction Schema

```json
{
  "document_type": "va_civil_service_letter | va_benefit_summary_letter | statement_of_service | dd214 | ngb22 | unknown",
  "issuer": "string | null",
  "document_date": "YYYY-MM-DD | null",
  "subject": {
    "name": "string | null",
    "date_of_birth": "YYYY-MM-DD | null",
    "identifiers_present": ["ssn_redacted", "claim_number", "dod_id", "unknown"]
  },
  "service": {
    "branch": "Army | Navy | Air Force | Marine Corps | Coast Guard | Space Force | National Guard | unknown",
    "component": "active | reserve | guard | unknown",
    "rank_or_pay_grade": "string | null",
    "service_periods": [
      {
        "start_date": "YYYY-MM-DD | null",
        "end_date": "YYYY-MM-DD | null",
        "expected_end_date": "YYYY-MM-DD | null",
        "character_of_service": "honorable | general_under_honorable | other_than_honorable | dishonorable | uncharacterized | unknown",
        "evidence_text": "short supporting quote"
      }
    ],
    "total_service": {
      "years": "number | null",
      "months": "number | null",
      "days": "number | null",
      "source_field": "string | null"
    },
    "awards_or_campaigns": ["string"]
  },
  "benefits": {
    "service_connected_disability": "yes | no | unknown",
    "combined_rating_percent": "number | null",
    "rating_band": "none | 0-29 | 30-49 | 50-69 | 70-99 | 100 | unknown"
  },
  "extraction_confidence": "high | medium | low",
  "needs_human_review": true,
  "review_reasons": ["string"]
}
```

## LLM Extraction Prompt Shape

Use vision input plus this instruction:

> Extract only facts explicitly visible in the document. Do not infer combat service, deployment count, veteran status, or disability rating unless the document directly states it. Return JSON matching the schema. For every non-null field, include the shortest evidence text that supports it. If a field is absent or unreadable, return null or unknown. Flag human review when the document is a sample, when fields are blank, when the subject name is missing, or when a claim depends on interpretation.

## Test Corpus Found

The repository now includes safe public fixtures under `fixtures/source-documents/`:

| Fixture | Source | Why useful | Caveat |
|---|---|---|---|
| `va-civil-service-letter-sample.pdf` | North Dakota Department of Veterans Affairs sample civil service letter | Tests VA-letter extraction for honorable active-duty separation and disability threshold | Does not include service dates |
| `statement-of-service-sample.pdf` | North Dakota Department of Veterans Affairs sample command letter | Tests active-duty current-service letter extraction | Future/expected discharge should not be treated as completed veteran status |
| `ngb22-example-nd.pdf` | North Dakota Department of Veterans Affairs NGB-22 review example | Tests Guard service and form/table extraction | Example is annotated and mostly blank |

Excluded from fixtures:

- A North Dakota sample VA annual/disability letter appears to contain realistic personal information. It should be treated as a privacy-risk reference and not used as a committed fixture.
- Random DD-214s found on the open web often appear to be real or third-party reposted records. Do not ingest them.

Potential future fixtures:

- VA Letter Generator sandbox PDFs, if VA sandbox credentials are approved.
- Synthetic DD-214-like documents generated from public form instructions, clearly watermarked as synthetic.
- User-donated redacted documents with written consent.

## Evaluation Harness

For each fixture, run:

1. Render PDF pages to images.
2. Extract candidate JSON through OCR + LLM.
3. Compare to expected fixture claims in `fixtures/expected-claims.json`.
4. Fail if required fields are missing, over-inferred, or hallucinated.
5. Flag documents that should require human review.

Suggested metrics:

- Field precision.
- Field recall.
- Over-inference rate.
- Human-review routing accuracy.
- PII minimization score.
- Processing cost per document.

## Build Phases

### Phase 0: research and fixtures

- Collect safe sample documents.
- Define schema.
- Define expected claims.
- Confirm renderer works.
- Do not process real applicant PII.

### Phase 1: local prototype

- Build CLI: `verify-doc fixtures/source-documents/*.pdf`.
- Render pages locally.
- Use a selected LLM vision provider for extraction.
- Write JSON output.
- Compare against expected claims.

### Phase 2: reviewer workflow

- Add review UI or review JSON workflow.
- Let reviewer accept, edit, or reject extracted claims.
- Store audit events.
- Create appeal path.

### Phase 3: product integration

- Tie claim set to applicant identity.
- Combine with ID.me/SheerID veteran-status check.
- Combine with payout/bank verification.
- Use only verified claims in grant scoring.

### Phase 4: external API

- Expose verified-claim API.
- Expose webhooks for review completion.
- Support consent revocation and deletion.
- Add organization-level audit logs.

## Major Risks

- LLMs may over-infer deployment/combat/tour claims from awards.
- Documents contain SSNs, claim numbers, addresses, DOBs, and medical/benefit information.
- DD-214 copy type matters; short copies can omit critical fields.
- Guard/Reserve documents prove different things than active-duty DD-214s.
- Public samples may accidentally include real PII.
- Fraud detection cannot rely on OCR alone.

## Current TypeScript Benchmark

The repo now includes a TypeScript benchmark harness:

- `scripts/extract-claims.ts`: extracts claims with `--provider fixture` or `--provider openai`.
- `scripts/evaluate-claims.ts`: compares generated claim JSON files against `fixtures/expected-claims.json`.
- `src/evaluate.ts`: catches missed expected fields, forbidden over-inference, and missed human-review routing.
- `src/providers/openai.ts`: OpenAI Responses API vision provider using rendered fixture pages and strict JSON parsing.

The fixture provider is deterministic and exists to test the evaluator/output path. The OpenAI provider is the first real model-backed extraction path, but requires `OPENAI_API_KEY` for live calls.

OpenAI readiness guardrails:

- `--dry-run` prints request shape without sending images, base64, or secrets.
- OpenAI document and image inputs must live under `fixtures/`.
- OpenAI outputs must live under `reports/extractions/openai/`.
- OpenAI Responses API requests include `store: false`.
- The live OpenAI command defaults output to `reports/extractions/openai/<fixture>.claims.json`.

## Immediate Next Step

Run live model extraction and compare it against the expected claims:

- Input: the three fixture PDFs.
- Output: normalized JSON.
- Method A: vision LLM only.
- Method B: conventional OCR only.
- Method C: OCR text + vision LLM.
- Success: correct extraction without over-claiming veteran status, service duration, or disability details.

## Sources

- VA letters available online: https://www.va.gov/records/download-va-letters/
- VA Letter Generator API: https://developer.va.gov/explore/api/va-letter-generator/docs
- VA Service History and Eligibility API: https://developer.va.gov/explore/api/veteran-service-history-and-eligibility/docs
- VA records overview: https://www.va.gov/records/
- VA complete list of discharge documents: https://www.va.gov/records/discharge-documents/
- DoD forms list showing DD-214 controlled status: https://www.esd.whs.mil/directives/forms/dd0001_0499/
- DoDI 1336.01, DD Form 214/5 series: https://www.esd.whs.mil/Portals/54/Documents/DD/issuances/dodi/133601p.pdf
- North Dakota required documentation and sample letters: https://www.veterans.nd.gov/benefits-and-services/veterans-preference-nd/documentation-required-applicant
- National Guard Bureau NGB-22 sample source: https://www.ngbpmc.ng.mil/portals/27/forms/sample/ngb22_sample.pdf
