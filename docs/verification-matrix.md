# Veteran Relief Verification Matrix

Date: 2026-06-07

## Recommendation

Build verification as a waterfall, not as one monolithic check.

1. Confirm legal identity and prevent duplicates.
2. Confirm veteran status.
3. Pull service history only when it is available through an authoritative source or a high-confidence document path.
4. Verify need with the lightest proof sufficient for the grant size.
5. Verify payout account ownership before sending funds.

The MVP should use ID.me or SheerID for veteran status, Persona or Stripe Identity for legal identity, Plaid or Stripe Financial Connections for bank ownership, and Plaid Income or bank-income signals for need. The ideal long-term version should pursue VA API production access for veteran confirmation, service history, disability summaries, and VA-generated proof letters.

## Verification Matrix

| Claim to verify | API-driven method | What it can verify | Automation level | Access reality | Fit for MVP | Risk / limitation | Recommended fallback |
|---|---|---|---|---|---|---|---|
| Person is real and unique | Persona Inquiry + Government ID + Selfie, or Stripe Identity Verification Session | Government ID authenticity, extracted name/DOB/address, liveness/selfie match, verification status | High | Commercial signup; production access generally available after vendor onboarding | Yes | Does not prove veteran status; false rejects happen for name/document mismatches | Manual review queue; allow alternate ID; compare against veteran document names with fuzzy matching |
| Person is a Title 38 veteran | VA Veteran Confirmation API `POST /status` | Confirmed / not confirmed Title 38 veteran status; not-confirmed reason | High | Sandbox easy; production requires VA approval/API key | Strong if access granted; otherwise not MVP blocker | Does not return service details; "not confirmed" does not necessarily mean not a veteran | ID.me / SheerID veteran verification; manual document review |
| Person is a veteran and can consent through VA-linked identity | VA Veteran Service History and Eligibility API `GET/POST /status` with OAuth | Title 38 status using authenticated user context or demographics | High | Sandbox available; production access varies and may require VA agreements | Later phase | More complex authorization; access-gated; some data restricted | VA Confirmation API, then ID.me/SheerID, then document review |
| Years of service / service episodes | VA Veteran Service History and Eligibility API `GET/POST /service_history` | Military service episodes and summary data | High if approved | Production likely access-gated; OAuth/CCG setup required | Not MVP unless access is approved early | Not all records may match; sensitive data; approval timeline uncertain | DD-214/NGB-22 upload plus OCR extraction and manual approval |
| Disability rating summary for need weighting | VA Veteran Service History and Eligibility API `GET/POST /summary/disability_rating`; P&T endpoint | Combined rating and eligibility dates, omitting diagnostic codes in summary endpoint | High if approved | Some disability endpoints restricted; federal-consumer limits may apply to restricted endpoints | Later phase | Very sensitive; should not collect diagnoses; may affect privacy/trust | Applicant-uploaded VA benefit summary/award letter with redaction guidance |
| Official VA proof letters | VA Letter Generator API | Service verification, proof of service, benefit verification, VA benefit summary and award letters | High if approved | API uses Veteran/dependent ICN; likely requires VA OAuth integration and production approval | Later phase | Generates documents, but still requires careful storage/redaction | Applicant downloads letter from VA.gov and uploads redacted copy |
| Veteran status via commercial verifier | ID.me Attribute Exchange / Community Verification, military scope | Verified military/veteran community association, unique ID.me identifier, user-consented attributes | High | Commercial integration; account manager/vendor contract | Yes | Built for eligibility/discount flows; may not return enough service-detail granularity | Ask only for veteran eligibility at MVP; use VA/document path for details |
| Veteran status via commercial verifier | SheerID REST API military program with subsegment "Military Veteran or Retiree" | Eligibility success/docUpload/pending; veteran/retiree subsegment depending on program | High for status; mixed for edge cases | Commercial integration; program configuration required | Yes | User complaints around opaque failures; can require document upload; may not expose raw proof details | Offer alternate ID.me or manual review path |
| Active duty / reserve / retiree / family exclusions | ID.me military roles or SheerID military subsegments | Role/category such as active duty, veteran, retiree, reserves, family | Medium-high | Commercial vendor config | Yes, if eligibility includes/excludes categories | Role mapping can differ by vendor and document type | Define internal allowed categories and map vendor outcomes conservatively |
| DD-214 / NGB-22 / discharge document authenticity | Document upload to app + OCR/extraction using AWS Textract, Google Document AI, Veryfi, Ocrolus, or similar | Extract name, dates, branch, character of service, service number redaction status, form fields | Medium | Commercial/cloud APIs available | Yes as fallback, not primary | OCR is not authoritative; forged docs possible; DD-214 contains sensitive PII | Manual review by trained reviewer; store only extracted/redacted fields and verification outcome |
| Current income | Plaid Income: Payroll Income, Bank Income, Document Income | Payroll-linked income, bank-income report, paystub/W-2/1099 document income, risk signals for uploaded docs | High | Commercial integration; user consent via Plaid Link | Yes for higher/repeat grants | Intrusive; bank linking can reduce trust; not all users have compatible accounts/payroll | Self-attestation for small grants; document upload for paystub/benefit letter |
| Employment/income via payroll source | Pinwheel, Argyle, Truework, Equifax Verification of Employment and Income | Employment status, employer, start date, income, paystubs/W-2s depending vendor | High | Commercial/vendor access; FCRA/permissible-purpose considerations may apply | Maybe later; not first MVP | Heavyweight for $100 grants; may require signed authorization; possible FCRA obligations | Plaid Income or self-attestation plus spot audits |
| Bank account ownership for payout | Plaid Auth + Identity / Identity Match, or Stripe Financial Connections ownership | Account/routing tokenization, account owner names, address/contact match, account ownership match | High | Commercial integration | Yes | Some users distrust bank login; coverage gaps | Microdeposit verification; prepaid/debit payout option; check/manual exception |
| Payout identity and compliance | Stripe Connect Express/Custom, Dwolla Verified Customer, or similar payout provider | Recipient onboarding, required KYC fields, payout eligibility, bank/debit destination | High | Commercial integration; compliance review likely | Yes | Nonprofit direct-cash aid may trigger provider risk review; payout providers may require SSN/TIN | Start with one provider plus manual mailed check fallback for exceptions |
| Housing instability | Uploaded eviction notice, rent ledger, shelter letter, utility shutoff notice; OCR + manual review | Document existence, name/address match, dates, amount due, urgent status | Medium | Build with document processing API + internal review | Yes for emergency grants | No universal authoritative API; documents vary by state/locality | Self-attestation for small grants; partner referral from VSO/social worker |
| Food/utility/transportation hardship | Uploaded bills/notices/receipts; bank transaction categorization via Plaid Transactions/Assets | Recurring utility bills, negative balance, overdrafts, shutoff notice, essential expenses | Low-medium | Plaid available; document processing available | Selective, not default | Easy to over-collect; bank data is intrusive and noisy | Applicant attestation plus targeted document request only when needed |
| Existing VA/public benefits income | Applicant-uploaded VA benefit summary/award letter; possible VA API if approved | Monthly VA compensation/pension amount, service-connected rating summary if included | Medium | API path access-gated; upload path easy | Yes via upload only | Sensitive; should not collect diagnoses; benefits do not equal lack of need | Let applicant redact diagnosis/claim details; record only amount/rating band/outcome |
| Duplicate/fraud network risk | Persona cases/workflows, Stripe Identity, Socure/Alloy/SentiLink-style orchestration, device/email/phone risk | Duplicate identities, synthetic identity risk, phone/email/device risk, sanctions/PEP if needed | Medium-high | Commercial integration | Yes, but keep minimal | Overzealous fraud tools can exclude vulnerable applicants | Human appeal process; never make opaque auto-denial final |
| Identity/risk orchestration | Socure Verify / RiskOS or Alloy Identity Decisioning | KYC-style identity verification, fraud signals, document verification, sanctions/PEP/watchlist checks depending configuration | High | Commercial integration; workflow configuration and API keys required | Maybe, if payout provider requires stronger compliance | Can be heavier and more opaque than needed for small charitable grants | Use Persona/Stripe Identity for MVP; reserve orchestration for fraud scaling or compliance needs |

## MVP Verification Flow

### Applicant onboarding

1. Create account with email + MFA.
2. Run identity verification through Persona or Stripe Identity.
3. Run veteran verification through ID.me or SheerID.
4. If commercial verifier fails, let applicant upload DD-214, NGB-22, VA eligibility letter, VHIC/VIC, state veteran ID, or VA proof-of-service letter.
5. Store only normalized outcomes: identity verified, veteran verified, source, confidence, expiration/recheck date, reviewer ID if manual.

### Monthly need renewal

For $100-$250 recurring microgrants:

1. Monthly self-attestation.
2. Internal checks: prior grant history, duplicate account, unresolved fraud flags.
3. Optional light evidence only when risk or priority score requires it.

For $300-$1,000 emergency grants:

1. Self-attestation.
2. One need proof document or a trusted partner referral.
3. Optional Plaid Income / Bank Income / account balance check if applicant chooses that faster path.

For repeat/high-volume grants:

1. Reconfirm income using Plaid Income or payroll provider.
2. Reconfirm payout account ownership.
3. Spot-audit previous attestations.

## Priority Scoring Inputs

Use confirmed facts, not raw documents, in scoring.

| Signal | Suggested source | Use in score |
|---|---|---|
| Veteran verified | VA API, ID.me, SheerID, manual document review | Required eligibility |
| Identity verified | Persona, Stripe Identity, ID.me identity | Required eligibility |
| Current monthly income band | Plaid Income, payroll API, uploaded docs, self-attestation | Primary need signal |
| Housing instability | Eviction/shutoff/shelter document, partner referral, self-attestation | High priority |
| Disability impact | VA summary rating if available, uploaded benefit letter, self-attestation | Moderate-to-high priority, collect minimum details |
| Dependents/caregiver burden | Self-attestation, optional document for larger grants | Moderate priority |
| Recent separation | VA service history, DD-214, self-attestation | Moderate priority |
| Years served/deployments | VA service history, DD-214/manual review | Small modifier only |
| Prior grant history | Internal ledger | Rotation / cooldown |

## Data Minimization Policy

Store:

- Verification source and result.
- Extracted non-sensitive scoring fields.
- Last four characters of document ID where needed.
- Reviewer decision and timestamp.
- Redacted proof thumbnail only if legally/operationally necessary.

Avoid storing:

- Full DD-214 indefinitely.
- SSN unless absolutely required by a vendor or tax/compliance workflow.
- Medical diagnosis details.
- Full bank transaction history after scoring.
- Public hardship narratives tied to identity.

## Source Links

- VA Veteran Confirmation API: https://developer.va.gov/explore/api/veteran-confirmation/docs
- VA Veteran Service History and Eligibility API: https://developer.va.gov/explore/api/veteran-service-history-and-eligibility/docs
- VA Letter Generator API: https://developer.va.gov/explore/api/va-letter-generator/docs
- ID.me Attribute Exchange overview: https://docs.id.me/guides/learn-more/attributes-exchange/overview
- ID.me military documents: https://help.id.me/hc/en-us/articles/202211570-What-documents-prove-your-military-status
- ID.me Community Verification payloads: https://docs.id.me/guides/o-auth-2-0/community-group-payloads
- SheerID REST API quickstart: https://developer.sheerid.com/api-quickstart
- SheerID verification engine: https://sheerid.zendesk.com/hc/en-us/articles/9334198691355-SheerID-s-verification-engine
- Plaid Income: https://plaid.com/docs/api/products/income/
- Plaid Identity: https://plaid.com/docs/identity/
- Plaid Auth: https://plaid.com/docs/auth/
- Plaid Assets: https://plaid.com/docs/assets/
- Persona verification types: https://docs.withpersona.com/verification-types
- Persona Government ID API: https://docs.withpersona.com/api-reference/verifications/government-id-verifications/retrieve-a-government-id-verification
- Stripe Identity Verification Sessions: https://docs.stripe.com/identity/verification-sessions
- Stripe Financial Connections: https://docs.stripe.com/financial-connections
- Stripe Connect payouts: https://docs.stripe.com/connect/add-and-pay-out-guide
- Socure Verify integration guide: https://help.socure.com/riskos/docs/verify-integration-guide
- Alloy API docs: https://developer.alloyapp.io/dev/alloy-api/
- Pinwheel Income and Employment: https://docs.pinwheelapi.com/public/v2022-03-02/docs/income-and-employment-1
- Equifax Verification of Employment and Income: https://developer.equifax.com/products/apiproducts/verification-employment-and-income
