# API Testing Plan

This plan defines the self-loop for evaluating APIs.

## Phase 1: Public Surface Verification

Goal: prove which APIs have reachable docs, OpenAPI specs, sandbox URLs, and auth-protected live endpoints.

Command:

```bash
python3 scripts/probe_apis.py --write-report
```

Pass criteria:

- VA OpenAPI specs download and expose real endpoint paths.
- Commercial provider docs load.
- Live endpoint boundary probes return expected auth or validation failures instead of silent success.

## Phase 2: Credentialed Sandbox Tests

Goal: use real sandbox/vendor credentials to complete one minimal success path per provider.

Required credentials:

- VA API key or OAuth client.
- ID.me partner credentials.
- SheerID API token and military program ID.
- Persona API key and inquiry template.
- Stripe secret key.
- Plaid sandbox client ID and secret.

Pass criteria:

- Identity provider returns a completed/pass or deterministic sandbox verification result.
- Veteran-status provider returns a success/failure eligibility outcome for a test user.
- Plaid/Stripe bank ownership flow can create a link/session object and retrieve account ownership metadata in sandbox.
- Income provider can create or retrieve a sandbox income verification result.

## Phase 3: Decision Matrix Update

Goal: convert probe results into product decisions.

For each claim, record:

- Automatable now, automatable after contract/approval, or not realistically automatable.
- Required applicant consent.
- Required PII.
- Estimated user friction.
- Manual fallback.
- Whether the signal is safe to use in grant scoring.

## Current Expected Product Decision

Use commercial APIs for MVP automation and treat VA API integration as a strategic unlock:

- ID.me/SheerID: veteran status.
- Persona/Stripe Identity: personhood and duplicate prevention.
- Plaid/Stripe Financial Connections: bank ownership.
- Plaid Income: optional need verification for larger grants.
- Manual document review: required for edge cases, housing proof, and detailed service history until VA access is approved.
