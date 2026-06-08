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
- `scripts/probe_apis.py`: repeatable API probe harness.
- `.env.example`: environment variables for deeper credentialed tests.

## Run the Probes

The default run uses only public documentation/OpenAPI endpoints plus unauthenticated boundary checks.

```bash
python3 scripts/probe_apis.py --write-report
```

Outputs are written to `reports/`.

Credentialed probes can be added by exporting the variables in `.env.example`; the script is structured so deeper checks can be added without changing the matrix format.

## Important Limitation

Many target APIs are partner-gated. A failed unauthenticated probe does not mean an API is unusable; it means we have confirmed that production automation requires a vendor contract, API key, OAuth client, VA approval, or a similar access path.

This repo is meant to make those boundaries concrete.
