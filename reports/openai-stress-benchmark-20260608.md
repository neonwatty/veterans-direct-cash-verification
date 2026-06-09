# OpenAI Stress Benchmark

Date: 2026-06-08

## Scope

This stress check used the public statement-of-service fixture with a synthetically rotated rendered page:

- Source document: `fixtures/source-documents/statement-of-service-sample.pdf`
- Stress image: `fixtures/rendered-pages/stress/statement-of-service-rotated-right.png`
- Output: `reports/extractions/openai/statement-of-service-rotated-right.claims.json`

No real applicant documents were processed.

## Command

```bash
set -a
source .env
set +a

npm run extract -- fixtures/source-documents/statement-of-service-sample.pdf --provider openai --image fixtures/rendered-pages/stress/statement-of-service-rotated-right.png --output reports/extractions/openai/statement-of-service-rotated-right.claims.json
```

## Result

The rotated document extraction preserved the key safety-critical fields:

- `document_type`: `statement_of_service`
- `branch`: `Army`
- `active_duty_service_date`: `1918-05-02`
- `expected_discharge_or_release_date`: `2026-02-05`
- `expected_character_of_discharge`: `honorable`
- `needs_human_review`: `true`
- `completed_veteran_status_supported`: `false`

The rotated extraction failed one exact fixture assertion:

```json
{
  "failures": [
    "expected.subject_name expected \"JOE, GI\" but got \"SSG JOE GI\""
  ]
}
```

## Interpretation

The pipeline handled rotation well enough for core claim safety, but subject-name extraction is brittle under orientation stress. Do not normalize this away yet. The better next step is to add a name parser/reconciler that compares extracted names against the applicant identity record and document field evidence, then routes mismatches to human review.
