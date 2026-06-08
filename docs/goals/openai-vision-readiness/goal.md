# Goal: OpenAI Vision Extraction Readiness

## Original Request

The user can provide an OpenAI API key, but wants the TypeScript veteran document extraction benchmark to be safe and ready before any live model calls.

## Interpreted Outcome

Prepare and execute a bounded readiness tranche so the repo can safely run OpenAI vision extraction against fixture-only veteran/service sample documents, without leaking secrets, over-collecting data, or processing real applicant records by accident.

## Input Shape

Specific implementation readiness plan with known safety concerns.

## Audience

Project owner and future contributors who may run the benchmark with real API credentials.

## Hard Constraints

- Use TypeScript for the extraction benchmark work.
- Do not process real applicant/veteran documents in this tranche.
- Do not log, store, or commit API keys.
- Restrict live OpenAI extraction to fixture/rendered sample images unless an explicit override is implemented and documented.
- Preserve the repository's existing public research artifacts and fixtures.
- Use local, non-destructive verification before requesting or using the user's key.

## Non-Goals

- No production veteran verification service.
- No app UI.
- No VA production API integration.
- No live model call until readiness checks and dry-run behavior are implemented.
- No real DD-214 or personal veteran record ingestion.

## Likely Misfire

The goal could appear complete because an OpenAI provider exists, while still allowing unsafe live calls that send arbitrary local files, log sensitive request data, or produce unvalidated hallucinated claims.

## Goal Oracle

The tranche is complete when a final audit can point to:

- Passing `npm test`.
- Passing `npm run typecheck`.
- Passing deterministic `npm run evaluate`.
- A dry-run command for `--provider openai` that proves request shape without sending images or secrets.
- Guardrails that prevent non-fixture inputs by default.
- OpenAI request configuration that disables storage where supported and keeps output under expected report paths.
- Updated docs explaining how to provide a key and run the first live fixture-only extraction.

## Completion Proof

A Judge or PM final audit receipt must map the implemented files and command outputs to the original outcome: safe readiness before using an API key.

## Current Tranche

Make the existing TypeScript benchmark ready for the first live OpenAI vision extraction on fixture documents only.

