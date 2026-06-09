# OpenAI Fixture Extraction Benchmark

Date: 2026-06-09

## Summary

- Extraction directory: `reports/extractions/openai`
- Fixtures: 3
- Passed: 3
- Failed: 0

## Commands

```bash
npm run benchmark -- --expected fixtures/expected-claims.json --dir reports/extractions/openai --out reports/openai-fixture-benchmark-latest.md
```

## Results

| Fixture | Status | Failures |
|---|---|---|
| `fixtures/source-documents/va-civil-service-letter-sample.pdf` | pass |  |
| `fixtures/source-documents/statement-of-service-sample.pdf` | pass |  |
| `fixtures/source-documents/ngb22-example-nd.pdf` | pass |  |

## Notes

- This benchmark evaluates normalized extraction outputs against the committed expected claims.
- Passing this benchmark does not mean final adjudication is automated; human review rules still apply.
