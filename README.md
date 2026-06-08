# Veterans Direct Cash Verification Research

This repository researches which parts of a direct-cash veteran relief app can be automated through real APIs.

The working product hypothesis:

- Verify identity and prevent duplicate applicants.
- Verify veteran status.
- Verify need with low-friction evidence proportional to grant size.
- Verify payout account ownership before sending funds.
- Publish radical transparency reports without exposing private applicant data.

## Current Conclusion

The most automatable MVP path is:

1. Identity: Persona or Stripe Identity.
2. Veteran status: ID.me Attribute Exchange or SheerID military verification.
3. Need: self-attestation for small grants; Plaid Income or bank-income/document-income for higher or repeat grants.
4. Bank ownership: Plaid Auth + Identity/Match or Stripe Financial Connections.
5. Payouts: Stripe Connect, Dwolla, or another payout provider with recipient onboarding.

The most authoritative long-term path is to pursue VA API production access for Veteran Confirmation, Service History and Eligibility, and VA Letter Generator APIs.

## Repo Contents

- `docs/verification-matrix.md`: matrix of claims, API methods, automation level, access limits, and fallbacks.
- `docs/api-access-authentication-research.md`: per-API setup/authentication difficulty and recommended access strategy.
- `docs/api-testing-plan.md`: testing loop for public, sandbox, and credentialed API probes.
- `docs/verified-claims-pipeline-plan.md`: plan for turning uploaded service documents into normalized verified claims.
- `fixtures/`: safe public sample documents and expected claims for an OCR/vision extraction benchmark.
- `scripts/probe_apis.py`: repeatable API probe harness.
- `.env.example`: environment variables for deeper credentialed tests.

## Run the Probes

The default run uses only public documentation/OpenAPI endpoints plus unauthenticated boundary checks.

```bash
python3 scripts/probe_apis.py --write-report
```

Outputs are written to `reports/`.

Credentialed probes can be added by exporting the variables in `.env.example`; the script is structured so deeper checks can be added without changing the matrix format.

## Run the TypeScript Claims Benchmark

Install dependencies:

```bash
npm install
```

Run tests and type checks:

```bash
npm test
npm run typecheck
```

Generate deterministic fixture extractions:

```bash
mkdir -p reports/extractions
npm run extract -- fixtures/source-documents/va-civil-service-letter-sample.pdf --output reports/extractions/va-civil-service-letter-sample.claims.json
npm run extract -- fixtures/source-documents/statement-of-service-sample.pdf --output reports/extractions/statement-of-service-sample.claims.json
npm run extract -- fixtures/source-documents/ngb22-example-nd.pdf --output reports/extractions/ngb22-example-nd.claims.json
npm run evaluate
```

Run a live OpenAI vision extraction once `OPENAI_API_KEY` is available:

```bash
npm run extract -- fixtures/source-documents/statement-of-service-sample.pdf --provider openai --image fixtures/rendered-pages/statement-of-service-sample.pdf.png
```

## Important Limitation

Many target APIs are partner-gated. A failed unauthenticated probe does not mean an API is unusable; it means we have confirmed that production automation requires a vendor contract, API key, OAuth client, VA approval, or a similar access path.

This repo is meant to make those boundaries concrete.
