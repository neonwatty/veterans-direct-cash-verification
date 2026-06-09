# OpenAI Fixture Extraction Benchmark

Date: 2026-06-08

## Scope

This benchmark ran live OpenAI vision extraction against the three committed public fixture documents only:

- `fixtures/source-documents/va-civil-service-letter-sample.pdf`
- `fixtures/source-documents/statement-of-service-sample.pdf`
- `fixtures/source-documents/ngb22-example-nd.pdf`

The run used rendered fixture images under `fixtures/rendered-pages/` and wrote normalized JSON outputs under `reports/extractions/openai/`.

No real applicant documents were processed.

## Commands

```bash
set -a
source .env
set +a

npm run extract -- fixtures/source-documents/va-civil-service-letter-sample.pdf --provider openai --image fixtures/rendered-pages/va-civil-service-letter-sample.pdf.png
npm run extract -- fixtures/source-documents/statement-of-service-sample.pdf --provider openai --image fixtures/rendered-pages/statement-of-service-sample.pdf.png
npm run extract -- fixtures/source-documents/ngb22-example-nd.pdf --provider openai --image fixtures/rendered-pages/ngb22-example-nd.pdf.png
npm run evaluate fixtures/expected-claims.json reports/extractions/openai
```

## Result

```json
{
  "passed": true,
  "results": [
    {
      "file": "fixtures/source-documents/va-civil-service-letter-sample.pdf",
      "passed": true,
      "failures": []
    },
    {
      "file": "fixtures/source-documents/statement-of-service-sample.pdf",
      "passed": true,
      "failures": []
    },
    {
      "file": "fixtures/source-documents/ngb22-example-nd.pdf",
      "passed": true,
      "failures": []
    }
  ]
}
```

## Outputs

- `reports/extractions/openai/va-civil-service-letter-sample.claims.json`
- `reports/extractions/openai/statement-of-service-sample.claims.json`
- `reports/extractions/openai/ngb22-example-nd.claims.json`

## Findings

- Structured Outputs were necessary. Prompt-only JSON extraction produced valid JSON but not the expected internal schema.
- Deterministic post-processing was necessary. The model extracted useful facts but needed normalization for dates, uppercase branch/issuer names, character-of-service phrases, VA disability threshold wording, and NGB-22 sample annotations.
- The statement-of-service fixture must be routed to human review because it supports current service and expected discharge, not completed veteran status.
- The NGB-22 sample remains a weak fixture because it is mostly blank and annotated. It is useful for form/table extraction and guardrail behavior, but not enough to validate real Guard/Reserve adjudication.

## Current Assessment

OpenAI vision plus structured outputs plus deterministic normalization is viable for the first fixture benchmark. The pipeline should still be treated as candidate extraction, not final adjudication. Human review remains required for current-service documents, blank/annotated forms, name mismatches, and any claim involving veteran status, discharge, deployment, or service duration that is not directly supported by the document.
