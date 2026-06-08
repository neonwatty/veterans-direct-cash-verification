# API Access and Authentication Research

Date: 2026-06-08

This document evaluates how hard it is to get credentials, set up authentication, and run useful tests for each API in the veteran direct-cash verification matrix.

## Difficulty Scale

- 1 = self-serve sandbox, same day, no sales call required.
- 2 = self-serve sandbox, production review likely.
- 3 = partner/vendor account required, but docs and sandbox are clear.
- 4 = sales/approval/security review required before meaningful testing.
- 5 = government or enterprise production approval; timeline is a major product risk.

## Summary Ranking

| API / vendor | Best use | Sandbox setup | Production setup | Auth method | Difficulty | MVP recommendation |
|---|---|---:|---:|---|---:|---|
| Stripe Identity | Legal identity, document/selfie checks | Easy | Medium | Stripe secret key; Verification Sessions | 2 | Strong MVP candidate |
| Stripe Financial Connections | Bank ownership, balances, account data | Easy | Medium | Stripe secret key; FC sessions | 2 | Strong if Stripe is payout rail |
| Stripe Connect | Recipient onboarding and payouts | Easy in test mode | Medium-hard | Stripe secret key; Connect accounts/account links | 3 | Strong payout candidate, but use-case review matters |
| Plaid Auth / Identity | ACH details, bank account ownership | Easy | Medium | `client_id` + `secret` | 2 | Strong MVP candidate |
| Plaid Income | Income/payroll/bank-income verification | Easy-ish sandbox | Medium-hard | `client_id` + `secret`; Link tokens | 3 | Use for larger/repeat grants, not all grants |
| Persona | Government ID, selfie, duplicate workflow | Easy sandbox | Medium | Bearer API key; inquiry templates | 2 | Strong MVP candidate |
| ID.me OAuth / Attribute Exchange | Veteran/military community status | Medium | Medium-hard | OAuth 2.0 / OIDC; partner scopes | 3 | Strong veteran-status MVP candidate |
| ID.me Services API | Government ID verification | Medium | Medium-hard | API bearer token | 3 | Secondary identity option |
| SheerID Military Verification | Veteran/retiree eligibility | Medium | Medium-hard | Bearer token; program ID; client credentials available | 3 | Strong veteran-status MVP candidate |
| Socure RiskOS / Verify | KYC/fraud/risk orchestration | Medium if provisioned | Hard | Bearer API key; workflow ID | 4 | Later phase unless fraud/compliance requires |
| Alloy Identity Decisioning | KYC/AML/fraud decisioning | Medium if provisioned | Hard | Basic auth or OAuth 2.0 with token/secret | 4 | Later phase unless compliance requires |
| Pinwheel Income & Employment | Payroll-sourced income/employment | Medium | Hard | API secret header; version header | 4 | Later phase, maybe too heavy for microgrants |
| Equifax VOE/I / The Work Number | Employment/income verification | Medium in portal | Hard | OAuth 2.0 client credentials | 4 | Later phase; legal/compliance-heavy |
| VA Veteran Confirmation | Authoritative Title 38 status | Easy sandbox | Hard | API key | 4 | Strategic target; not MVP blocker |
| VA Service History and Eligibility | Service history, disability summaries, benefits | Easy sandbox | Very hard | OAuth/API key depending endpoint | 5 | Strategic target; high access risk |
| VA Letter Generator | Official VA proof letters | Easy sandbox | Very hard | OAuth user authorization | 5 | Strategic target; do not depend on MVP |

## Provider Details

### VA Veteran Confirmation API

What it unlocks:

- Authoritative confirmation that a person is or is not confirmed as a Title 38 veteran.
- Best official source for basic veteran status, but not for years served, deployment history, or need.

Access/auth:

- Sandbox access is automatic when requested from the API overview page.
- Production access requires a VA production access request, review, possible demo, and security/privacy posture.
- VA states production timelines vary; open-data APIs usually take 1 to 3 months, while other APIs can take 1 to 6 months.
- VA production consumers must be U.S.-based and may not monetize or sell Veteran data.
- APIs without PII/PHI can use API keys; APIs involving user data may use OAuth.

Difficulty:

- Sandbox: 2
- Production: 4
- Overall: 4

Product implication:

- Pursue early because it is authoritative.
- Do not make MVP dependent on production approval.
- If approved, use as a high-confidence status check before falling back to ID.me/SheerID/manual review.

Sources:

- https://developer.va.gov/production-access
- https://developer.va.gov/production-access/request-prod-access
- https://developer.va.gov/production-access/working-with-va-apis
- https://developer.va.gov/explore/api/veteran-confirmation/docs

### VA Service History and Eligibility API

What it unlocks:

- Service history.
- Disability rating summaries.
- Title 38 status.
- Benefits/enrollment-related signals.

Access/auth:

- Sandbox OpenAPI spec is public and endpoints are real.
- Production access is likely harder than Veteran Confirmation because the data is more sensitive and endpoint access varies.
- OAuth/user authorization is likely required for user-specific data.
- Some endpoints are explicitly restricted.

Difficulty:

- Sandbox: 2
- Production: 5
- Overall: 5

Product implication:

- This is the best source for years served/service history if access is granted.
- It should be treated as a strategic unlock, not an MVP dependency.
- Until access is granted, service-history scoring should be small and backed by document review.

Sources:

- https://developer.va.gov/explore/api/veteran-service-history-and-eligibility/docs
- https://developer.va.gov/production-access
- https://developer.va.gov/production-access/working-with-va-apis

### VA Letter Generator API

What it unlocks:

- Official VA letters: proof of service, benefit summary/award letters, and related generated documents.

Access/auth:

- Public docs/OpenAPI exist.
- User-specific letter generation implies OAuth and careful consent/data retention.
- Production access goes through the VA production process.

Difficulty:

- Sandbox: 2
- Production: 5
- Overall: 5

Product implication:

- Useful later as a user-consented official proof path.
- For MVP, ask applicants to upload a redacted VA letter instead.

Sources:

- https://developer.va.gov/explore/api/va-letter-generator/docs
- https://developer.va.gov/production-access

### ID.me OAuth / Attribute Exchange

What it unlocks:

- User-consented identity/community attributes through OAuth.
- Military community payloads include group `military` and subgroups such as `Veteran`, `Retiree`, `Service Member`, `Military Spouse`, and `Military Family`.

Access/auth:

- OAuth 2.0 / OIDC flow.
- Requires an ID.me developer account to obtain client ID, client secret, and redirect URI.
- User-specific access tokens expire quickly; docs say access tokens expire after 5 minutes.
- Community verification attributes require the right partner configuration/scopes.

Difficulty:

- Sandbox/prototype: 3
- Production: 3-4
- Overall: 3

Product implication:

- Strong MVP candidate for veteran/military eligibility.
- Good UX if applicants already have ID.me accounts.
- Must define exactly which subgroup qualifies; "military family" and "spouse" should probably be excluded unless the program expands.

Sources:

- https://docs.id.me/guides/o-auth-2-0/overview
- https://docs.id.me/guides/o-auth-2-0/integration
- https://docs.id.me/guides/o-auth-2-0/community-group-payloads
- https://docs.id.me/guides/learn-more/attributes-exchange/overview

### ID.me Services API

What it unlocks:

- Government ID verification workflows through ID.me's Services API.
- A verification object can be created and later retrieved.

Access/auth:

- API bearer-token style access.
- More useful for identity proofing than veteran status.
- Partner access likely required for meaningful testing beyond docs.

Difficulty:

- Sandbox/prototype: 3
- Production: 3-4
- Overall: 3

Product implication:

- Use only if ID.me becomes the central identity layer.
- Otherwise Persona or Stripe Identity may be easier for general identity verification.

Sources:

- https://docs.id.me/services-api/verification
- https://docs.id.me/services-api/documents

### SheerID Military Verification

What it unlocks:

- Military/veteran eligibility verification through a configured SheerID program.
- Handles instant verification, pending states, and document upload/review flows.

Access/auth:

- Requires a MySheerID account and a configured verification program ID.
- Direct API usage can use bearer tokens.
- SheerID supports static tokens and dynamic OAuth2 client-credentials tokens.
- Static tokens are being replaced with Applications; SheerID says to update integrations before August 1, 2026.
- Only users with the API Access role can generate/view tokens.

Difficulty:

- Sandbox/prototype: 3
- Production: 3-4
- Overall: 3

Product implication:

- Strong MVP candidate for veteran status.
- Likely easier than VA production access.
- Keep an appeal/manual path because document review and edge-case failures are common in this category.

Sources:

- https://developer.sheerid.com/api-quickstart
- https://developer.sheerid.com/tutorials/api-tokens-detail
- https://developer.sheerid.com/tutorials/apis/api-walkthrough

### Persona

What it unlocks:

- Hosted identity flows.
- Government ID checks.
- Selfie/liveness checks.
- Inquiry templates and server-side inquiry creation.
- Sandbox forced pass/fail testing.

Access/auth:

- API keys have distinct sandbox and production prefixes.
- Create Inquiry calls use bearer auth with a Persona API key.
- Hosted flow can be launched from an inquiry template ID.
- Sandbox is available for testing without usage charges, but real verifications are not performed in sandbox.
- Production requires contacting Persona to discuss pricing and enable production.

Difficulty:

- Sandbox/prototype: 1-2
- Production: 3
- Overall: 2

Product implication:

- One of the easiest identity-verification MVP paths.
- Good for personhood, duplicate prevention, and identity proofing.
- Does not verify veteran status.

Sources:

- https://docs.withpersona.com/docs/quickstart-hosted-flow
- https://docs.withpersona.com/api-quickstart-tutorial
- https://docs.withpersona.com/environments
- https://help.withpersona.com/articles/5BXtEAVKgWEUucY9uH7Uvj/

### Stripe Identity

What it unlocks:

- Government ID document authenticity.
- Selfie/face similarity.
- SSN/ID-number style checks depending configuration.
- Verification Sessions API.

Access/auth:

- Requires a Stripe account and activation of Identity in the Dashboard.
- Uses Stripe API keys.
- Test-mode keys allow non-live testing.
- First implementation is straightforward if already using Stripe.

Difficulty:

- Sandbox/prototype: 1-2
- Production: 2-3
- Overall: 2

Product implication:

- Strong MVP candidate, especially if Stripe Connect is also used for payouts.
- Stripe can become the unified stack for identity plus payout onboarding, but charitable direct-cash use should be reviewed against Stripe's allowed/use-case rules.

Sources:

- https://docs.stripe.com/identity
- https://docs.stripe.com/api/identity/verification_sessions
- https://docs.stripe.com/identity/verification-sessions

### Stripe Financial Connections

What it unlocks:

- User-consented bank account connection.
- Account ownership.
- Balances and transaction data depending permissions.

Access/auth:

- Uses Stripe test/sandbox API keys.
- Stripe provides test institutions for Financial Connections; linked accounts return test data.
- Client-side automated testing is discouraged by Stripe because the auth flow can change.

Difficulty:

- Sandbox/prototype: 1-2
- Production: 2-3
- Overall: 2

Product implication:

- Strong if Stripe is the payout rail or if bank ownership must be verified before grants.
- Do not require full bank-data access for small grants unless necessary.

Sources:

- https://docs.stripe.com/financial-connections
- https://docs.stripe.com/financial-connections/testing

### Stripe Connect

What it unlocks:

- Recipient onboarding.
- Payouts to individuals.
- Stripe-hosted KYC/identity verification for connected accounts.

Access/auth:

- Uses Stripe API keys.
- Express connected accounts let Stripe handle much of onboarding and identity verification.
- Test mode is available, but live payout flows depend on account activation, use case, region, and risk/compliance review.
- The "add funds and pay out" flow has restrictions around permitted use cases.

Difficulty:

- Sandbox/prototype: 2
- Production: 3-4
- Overall: 3

Product implication:

- Best first payout candidate if Stripe accepts the nonprofit/direct-aid model.
- Need an early Stripe support/risk conversation before committing.

Sources:

- https://docs.stripe.com/connect/accounts
- https://docs.stripe.com/connect/add-and-pay-out-guide

### Socure RiskOS / Verify

What it unlocks:

- KYC-style identity/risk decisioning.
- Fraud signals.
- Document verification flows.
- Configurable RiskOS workflows.

Access/auth:

- RiskOS uses bearer API keys.
- Sandbox endpoint is `https://riskos.sandbox.socure.com/api/evaluation`.
- Production endpoint is `https://riskos.socure.com/api/evaluation`.
- API and SDK keys are managed in Developer Workbench.
- Socure says key creation/deletion requires Socure Support.
- Workflows must be configured and published before evaluations are useful.

Difficulty:

- Sandbox/prototype: 3-4
- Production: 4
- Overall: 4

Product implication:

- Very strong fraud/compliance product, but probably too heavy for the first veteran-relief MVP.
- Revisit if fraud rates spike, if payout partners require stronger KYC, or if automated decisions need sophisticated case management.

Sources:

- https://help.socure.com/riskos/docs/integrating-with-riskos
- https://help.socure.com/riskos/docs/integration-guide-authentication
- https://help.socure.com/riskos/docs/verify-integration-guide

### Alloy Identity Decisioning

What it unlocks:

- KYC/AML/fraud workflow orchestration.
- Decisioning around applications/entities.
- Configurable Journeys.

Access/auth:

- Alloy supports basic HTTP authentication and OAuth 2.0 depending on configuration.
- API access uses token/secret pairs, now moving toward account-level API keys.
- API keys can be created/rotated/revoked in settings if the agent has permissions.
- Alloy's Implementations team configures initial Journeys; API usage starts after a Journey exists.

Difficulty:

- Sandbox/prototype: 3-4
- Production: 4
- Overall: 4

Product implication:

- Strong for a fintech-grade compliance system.
- Likely too much overhead until the app has real fraud/compliance load.

Sources:

- https://developer.alloy.com/public/docs/getting-started
- https://developer.alloy.com/public/docs/authentication-guide
- https://developer.alloy.com/public/docs/account-level-api-keys

### Plaid Auth / Identity / Identity Match

What it unlocks:

- ACH account/routing details.
- Bank account ownership.
- Bank-file name/address/phone/email where available.
- Identity Match between applicant-provided identity and bank owner data.

Access/auth:

- Create a Plaid Dashboard account to get `client_id` and `secret`.
- Sandbox is free and fully featured for test items.
- Almost all API endpoints require `client_id` and `secret`.
- Production access is requested through the Dashboard.
- Trial plans have replaced Limited Production for Plaid teams created on or after April 15, 2026.

Difficulty:

- Sandbox/prototype: 1-2
- Production: 3
- Overall: 2

Product implication:

- Strong MVP candidate for payout account ownership.
- Works well as an optional fast path, but offer non-bank-link fallback.

Sources:

- https://plaid.com/docs/api/
- https://plaid.com/docs/sandbox/
- https://plaid.com/docs/api/products/identity/
- https://plaid.com/docs/auth/

### Plaid Income

What it unlocks:

- Payroll income.
- Bank income.
- Document income from paystubs/W-2/1099-style documents.

Access/auth:

- Same Plaid `client_id` + `secret` model.
- Sandbox/test accounts exist.
- Product access may require Dashboard approval and production review.

Difficulty:

- Sandbox/prototype: 2
- Production: 3-4
- Overall: 3

Product implication:

- Use for larger/repeat grants or when an applicant wants a faster review.
- Do not make Plaid Income mandatory for a $100 microgrant; the friction and privacy cost are too high.

Sources:

- https://plaid.com/docs/api/products/income/
- https://plaid.com/docs/sandbox/
- https://plaid.com/docs/api/

### Pinwheel Income and Employment

What it unlocks:

- Payroll-connected income and employment data.
- Employment status and pay-related data from connected payroll/merchant accounts.

Access/auth:

- Dashboard access is not fully self-serve; Pinwheel directs developers to contact them.
- Initially, accounts receive Sandbox mode with an API key.
- Development and Production access must be requested from Pinwheel.
- API secret is passed in the `x-api-secret` header.
- Requests also require a `Pinwheel-Version` header.

Difficulty:

- Sandbox/prototype: 3
- Production: 4
- Overall: 4

Product implication:

- Useful later for stronger income verification.
- Too heavy for a low-friction MVP unless grant sizes are large enough to justify payroll connection.

Sources:

- https://docs.pinwheelapi.com/public/docs/api
- https://docs.pinwheelapi.com/public/docs/platform-overview
- https://docs.pinwheelapi.com/public/docs/sandbox

### Equifax Verification of Employment and Income / The Work Number

What it unlocks:

- Employment and income verification from The Work Number / Equifax coverage.
- Potential manual waterfall when automated records are unavailable.

Access/auth:

- Requires Equifax Developer Portal registration to evaluate/connect to API products.
- Must create an app, add API products, and obtain approved Client ID / Client Secret for an environment.
- Equifax uses OAuth 2.0 client credentials for API access.
- Sandbox/Test/Live environments exist.
- Live production requires approved credentials and production API access from whitelisted IP addresses.
- Becoming a customer / product approval is a meaningful business process.

Difficulty:

- Sandbox/prototype: 3
- Production: 4-5
- Overall: 4

Product implication:

- Good for high-assurance income/employment checks.
- Probably too compliance-heavy for MVP charitable microgrants.
- Use only if grant sizes, fraud risk, or partner requirements justify it.

Sources:

- https://developer.equifax.com/documentation
- https://developer.equifax.com/help-support/user-guide
- https://developer.equifax.com/products/apiproducts/verification-employment-and-income
- https://developer.equifax.com/index.php/products/apiproducts/work-numberr-id

## Recommended Access Strategy

### Week 1: fastest test credentials

1. Stripe account: Identity, Financial Connections, Connect test mode.
2. Plaid dashboard: Auth, Identity, Income sandbox.
3. Persona sandbox: hosted flow and API inquiry template.

These should produce the fastest real sandbox artifacts.

### Week 2: veteran status vendors

1. ID.me partner/developer account and military attribute scope discussion.
2. SheerID MySheerID/program setup for military veteran/retiree verification.

These are the most important MVP unknowns because they decide whether veteran status can be automated before VA production approval.

### Parallel strategic track

1. Request VA sandbox access immediately.
2. Prepare VA production materials: privacy policy, terms, data retention/deletion policy, security controls, duplicate-request controls, 508/accessibility posture, and demo.
3. Apply first for Veteran Confirmation; treat Service History and Letter Generator as later, harder approvals.

### Defer

1. Socure.
2. Alloy.
3. Pinwheel.
4. Equifax.

These are valuable, but each increases enterprise/compliance friction. They make sense after the app has clearer grant size, fraud profile, and payout-provider constraints.

## Product Decision

The likely MVP stack should be:

- Identity: Stripe Identity or Persona.
- Veteran status: ID.me or SheerID.
- Bank ownership: Plaid Auth/Identity or Stripe Financial Connections.
- Payouts: Stripe Connect if approved for the use case.
- Need: self-attestation first; Plaid Income only for larger/repeat grants.

VA should be pursued early, but should not block the first pilot.
