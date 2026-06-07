#!/usr/bin/env python3
"""Probe API surfaces for veteran direct-cash verification research.

The script intentionally separates public probes from credentialed probes.
Public probes answer:

- Are docs or OpenAPI specs reachable?
- What endpoints and auth schemes are exposed?
- Do live API endpoints enforce authentication as expected?

Credentialed probes can be layered in later through environment variables.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import pathlib
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from typing import Any


ROOT = pathlib.Path(__file__).resolve().parents[1]
REPORTS_DIR = ROOT / "reports"
TIMEOUT_SECONDS = 20


@dataclass
class ProbeTarget:
    provider: str
    claim: str
    docs_url: str | None = None
    openapi_url: str | None = None
    boundary_url: str | None = None
    boundary_method: str = "GET"
    boundary_json: dict[str, Any] | None = None
    expected_boundary_statuses: tuple[int, ...] = (400, 401, 403, 404, 405)
    credential_envs: tuple[str, ...] = ()
    notes: str = ""
    extra_headers: dict[str, str] = field(default_factory=dict)


TARGETS: list[ProbeTarget] = [
    ProbeTarget(
        provider="VA Veteran Confirmation",
        claim="Confirm Title 38 veteran status",
        docs_url="https://developer.va.gov/explore/api/veteran-confirmation/docs",
        openapi_url="https://api.va.gov/internal/docs/veteran-confirmation/v1/openapi.json",
        boundary_url="https://sandbox-api.va.gov/services/veteran-confirmation/v1/status",
        boundary_method="POST",
        boundary_json={},
        credential_envs=("VA_API_KEY",),
        notes="Authoritative basic veteran status. Production requires VA approval/API key.",
    ),
    ProbeTarget(
        provider="VA Service History and Eligibility",
        claim="Service history, disability summaries, enrolled benefits, Title 38 status",
        docs_url="https://developer.va.gov/explore/api/veteran-service-history-and-eligibility/docs",
        openapi_url="https://api.va.gov/internal/docs/veteran-verification/v2/openapi.json",
        boundary_url="https://sandbox-api.va.gov/services/veteran_verification/v2/status",
        boundary_method="POST",
        boundary_json={},
        credential_envs=("VA_OAUTH_ACCESS_TOKEN",),
        notes="Most valuable official API, but production access is the largest gating risk.",
    ),
    ProbeTarget(
        provider="VA Letter Generator",
        claim="Official VA proof/service/benefit letters",
        docs_url="https://developer.va.gov/explore/api/va-letter-generator/docs",
        openapi_url="https://api.va.gov/internal/docs/va-letter-generator/v1/openapi.json",
        boundary_url="https://sandbox-api.va.gov/services/va-letter-generator/v1/eligible-letters",
        credential_envs=("VA_OAUTH_ACCESS_TOKEN",),
        notes="Potentially useful for user-consented official proof letters.",
    ),
    ProbeTarget(
        provider="ID.me Attribute Exchange",
        claim="Verified military/veteran community affiliation",
        docs_url="https://docs.id.me/guides/learn-more/attributes-exchange/overview",
        boundary_url="https://api.id.me/api/public/v3/attributes.json",
        credential_envs=("IDME_CLIENT_ID", "IDME_CLIENT_SECRET"),
        notes="Practical MVP candidate for veteran status; military scope and payload need partner access.",
    ),
    ProbeTarget(
        provider="ID.me Services API",
        claim="Government ID document verification",
        docs_url="https://docs.id.me/services-api/documents",
        boundary_url="https://services.idmelabs.com/api/v2/document/license/verify",
        boundary_method="POST",
        boundary_json={},
        credential_envs=("IDME_BEARER_TOKEN",),
        notes="Identity-document verification API; does not itself prove veteran status.",
    ),
    ProbeTarget(
        provider="SheerID Military Verification",
        claim="Military veteran/retiree eligibility verification",
        docs_url="https://developer.sheerid.com/api-quickstart",
        boundary_url="https://services.sheerid.com/rest/v2/verification/not-a-real-verification-id",
        credential_envs=("SHEERID_API_TOKEN", "SHEERID_PROGRAM_ID"),
        notes="Practical MVP candidate; supports document upload review when instant verification fails.",
    ),
    ProbeTarget(
        provider="Persona",
        claim="Government ID, selfie/liveness, duplicate/case workflow",
        docs_url="https://docs.withpersona.com/verification-types",
        boundary_url="https://api.withpersona.com/api/v1/verification/government-ids/ver_test",
        credential_envs=("PERSONA_API_KEY",),
        notes="Strong MVP candidate for identity and duplicate prevention.",
    ),
    ProbeTarget(
        provider="Stripe Identity",
        claim="Government ID and ID number verification",
        docs_url="https://docs.stripe.com/identity/verification-sessions",
        boundary_url="https://api.stripe.com/v1/identity/verification_sessions/vs_test",
        credential_envs=("STRIPE_SECRET_KEY",),
        notes="Strong MVP candidate if Stripe is also used for payments/payouts.",
    ),
    ProbeTarget(
        provider="Stripe Financial Connections",
        claim="Bank account ownership, balances, transactions with user consent",
        docs_url="https://docs.stripe.com/financial-connections",
        boundary_url="https://api.stripe.com/v1/financial_connections/accounts",
        credential_envs=("STRIPE_SECRET_KEY",),
        notes="Useful if Stripe Connect is the payout rail.",
    ),
    ProbeTarget(
        provider="Socure Verify / RiskOS",
        claim="Identity verification, KYC risk, document verification, fraud signals",
        docs_url="https://help.socure.com/riskos/docs/verify-integration-guide",
        boundary_url="https://riskos.sandbox.socure.com/api/evaluation",
        boundary_method="POST",
        boundary_json={},
        credential_envs=("SOCURE_API_KEY",),
        notes="Strong identity/risk orchestration candidate; requires provisioned workflow and API key.",
    ),
    ProbeTarget(
        provider="Alloy Identity Decisioning",
        claim="Identity, KYC/KYB, AML, fraud workflow orchestration",
        docs_url="https://developer.alloyapp.io/dev/alloy-api/",
        boundary_url="https://api.alloy.co/v1/evaluations",
        boundary_method="POST",
        boundary_json={},
        credential_envs=("ALLOY_API_KEY",),
        notes="Strong orchestration candidate for fintech-style onboarding; likely heavier than MVP unless payout compliance demands it.",
    ),
    ProbeTarget(
        provider="Plaid Identity",
        claim="Bank account owner match",
        docs_url="https://plaid.com/docs/identity/",
        boundary_url="https://sandbox.plaid.com/identity/get",
        boundary_method="POST",
        boundary_json={},
        credential_envs=("PLAID_CLIENT_ID", "PLAID_SECRET"),
        notes="Useful for payout-account ownership and fraud reduction.",
    ),
    ProbeTarget(
        provider="Plaid Auth",
        claim="ACH account/routing verification",
        docs_url="https://plaid.com/docs/auth/",
        boundary_url="https://sandbox.plaid.com/auth/get",
        boundary_method="POST",
        boundary_json={},
        credential_envs=("PLAID_CLIENT_ID", "PLAID_SECRET"),
        notes="Useful for ACH payout setup if not relying on Stripe/Dwolla collection.",
    ),
    ProbeTarget(
        provider="Plaid Income",
        claim="Payroll, bank-income, and uploaded income document verification",
        docs_url="https://plaid.com/docs/api/products/income/",
        boundary_url="https://sandbox.plaid.com/credit/payroll_income/get",
        boundary_method="POST",
        boundary_json={},
        credential_envs=("PLAID_CLIENT_ID", "PLAID_SECRET"),
        notes="Useful for larger/repeat grants; too intrusive for every $100 microgrant.",
    ),
    ProbeTarget(
        provider="Pinwheel Income and Employment",
        claim="Payroll-connected employment and income",
        docs_url="https://docs.pinwheelapi.com/public/v2022-03-02/docs/income-and-employment-1",
        boundary_url="https://api.getpinwheel.com/v1/accounts",
        credential_envs=("PINWHEEL_API_KEY",),
        notes="Later-phase payroll source; likely heavier than MVP need verification.",
    ),
    ProbeTarget(
        provider="Equifax Verification of Employment and Income",
        claim="The Work Number employment/income verification",
        docs_url="https://developer.equifax.com/products/apiproducts/verification-employment-and-income",
        credential_envs=("EQUIFAX_CLIENT_ID", "EQUIFAX_CLIENT_SECRET"),
        notes="Later-phase/FCRA-sensitive income verification; not ideal for tiny grants.",
    ),
]


def http_request(
    url: str,
    method: str = "GET",
    json_body: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
) -> dict[str, Any]:
    body = None
    request_headers = {"User-Agent": "veterans-verification-probe/0.1"}
    if headers:
        request_headers.update(headers)
    if json_body is not None:
        body = json.dumps(json_body).encode("utf-8")
        request_headers["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=body, headers=request_headers, method=method)
    started = time.monotonic()
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT_SECONDS) as resp:
            raw = resp.read(1_000_000)
            elapsed_ms = int((time.monotonic() - started) * 1000)
            return {
                "ok": 200 <= resp.status < 300,
                "status": resp.status,
                "elapsed_ms": elapsed_ms,
                "content_type": resp.headers.get("content-type"),
                "body_sample": raw[:500].decode("utf-8", errors="replace"),
            }
    except urllib.error.HTTPError as exc:
        raw = exc.read(100_000)
        elapsed_ms = int((time.monotonic() - started) * 1000)
        return {
            "ok": False,
            "status": exc.code,
            "elapsed_ms": elapsed_ms,
            "content_type": exc.headers.get("content-type") if exc.headers else None,
            "body_sample": raw[:500].decode("utf-8", errors="replace"),
        }
    except Exception as exc:  # noqa: BLE001 - report probes should preserve failure context
        elapsed_ms = int((time.monotonic() - started) * 1000)
        return {
            "ok": False,
            "status": None,
            "elapsed_ms": elapsed_ms,
            "error": type(exc).__name__,
            "body_sample": str(exc),
        }


def probe_openapi(url: str) -> dict[str, Any]:
    response = http_request(url)
    result: dict[str, Any] = {"fetch": response}
    if not response["ok"]:
        return result
    try:
        spec = json.loads(response["body_sample"] + "")
    except json.JSONDecodeError:
        # The body sample is truncated; fetch full body for JSON specs.
        with urllib.request.urlopen(url, timeout=TIMEOUT_SECONDS) as resp:
            spec = json.loads(resp.read().decode("utf-8"))
    paths = spec.get("paths", {})
    security_schemes = (
        spec.get("components", {})
        .get("securitySchemes", {})
    )
    result.update(
        {
            "title": spec.get("info", {}).get("title"),
            "version": spec.get("info", {}).get("version"),
            "server_urls": [server.get("url") for server in spec.get("servers", [])],
            "path_count": len(paths),
            "paths": sorted(paths.keys())[:30],
            "security_schemes": sorted(security_schemes.keys()),
        }
    )
    return result


def run_probe(target: ProbeTarget) -> dict[str, Any]:
    result: dict[str, Any] = {
        "provider": target.provider,
        "claim": target.claim,
        "notes": target.notes,
        "credential_envs": list(target.credential_envs),
        "credentials_present": {
            name: bool(os.environ.get(name)) for name in target.credential_envs
        },
    }
    if target.docs_url:
        result["docs"] = http_request(target.docs_url)
    if target.openapi_url:
        result["openapi"] = probe_openapi(target.openapi_url)
    if target.boundary_url:
        boundary = http_request(
            target.boundary_url,
            method=target.boundary_method,
            json_body=target.boundary_json,
            headers=target.extra_headers,
        )
        status = boundary.get("status")
        boundary["expected_auth_or_validation_boundary"] = status in target.expected_boundary_statuses
        result["unauthenticated_boundary"] = boundary
    result["automation_assessment"] = assess(target, result)
    return result


def assess(target: ProbeTarget, result: dict[str, Any]) -> str:
    has_docs = result.get("docs", {}).get("ok") or result.get("openapi", {}).get("fetch", {}).get("ok")
    creds_present = all(result.get("credentials_present", {}).values()) if target.credential_envs else True
    boundary = result.get("unauthenticated_boundary")
    if "VA " in target.provider and result.get("openapi", {}).get("fetch", {}).get("ok"):
        return "Authoritative and API-defined; production access approval is the key unknown."
    if has_docs and creds_present:
        return "Ready for credentialed integration testing."
    if has_docs and boundary and boundary.get("expected_auth_or_validation_boundary"):
        return "API surface is reachable and protected; vendor credentials/approval required for real tests."
    if has_docs:
        return "Documentation reachable; deeper tests require vendor credentials or partner access."
    return "Could not confirm a usable public API surface in this run."


def write_reports(results: list[dict[str, Any]]) -> tuple[pathlib.Path, pathlib.Path]:
    REPORTS_DIR.mkdir(exist_ok=True)
    stamp = dt.datetime.now(dt.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    json_path = REPORTS_DIR / f"api-probe-{stamp}.json"
    md_path = REPORTS_DIR / f"api-probe-{stamp}.md"
    json_path.write_text(json.dumps(results, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    md_path.write_text(render_markdown(results), encoding="utf-8")
    return json_path, md_path


def render_markdown(results: list[dict[str, Any]]) -> str:
    lines = [
        "# API Probe Report",
        "",
        f"Generated: {dt.datetime.now(dt.timezone.utc).isoformat()}",
        "",
        "| Provider | Claim | Public docs/spec | Boundary check | Assessment |",
        "|---|---|---|---|---|",
    ]
    for item in results:
        docs_ok = item.get("docs", {}).get("ok")
        openapi_ok = item.get("openapi", {}).get("fetch", {}).get("ok")
        docs_status = "ok" if docs_ok or openapi_ok else "failed"
        boundary = item.get("unauthenticated_boundary", {})
        boundary_status = boundary.get("status")
        boundary_text = "n/a" if not boundary else f"HTTP {boundary_status}"
        lines.append(
            "| {provider} | {claim} | {docs_status} | {boundary_text} | {assessment} |".format(
                provider=escape_pipe(item["provider"]),
                claim=escape_pipe(item["claim"]),
                docs_status=docs_status,
                boundary_text=boundary_text,
                assessment=escape_pipe(item["automation_assessment"]),
            )
        )
    lines.extend(["", "## Notes", ""])
    for item in results:
        lines.extend(
            [
                f"### {item['provider']}",
                "",
                f"- Claim: {item['claim']}",
                f"- Assessment: {item['automation_assessment']}",
                f"- Credentials checked: {', '.join(item['credential_envs']) or 'none'}",
                f"- Notes: {item['notes']}",
                "",
            ]
        )
        if item.get("openapi"):
            openapi = item["openapi"]
            lines.append(f"- OpenAPI title: {openapi.get('title')}")
            lines.append(f"- OpenAPI paths sampled: {', '.join(openapi.get('paths', [])[:12])}")
            lines.append("")
    return "\n".join(lines)


def escape_pipe(value: str) -> str:
    return value.replace("|", "\\|").replace("\n", " ")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write-report", action="store_true", help="Write JSON and Markdown reports under reports/")
    parser.add_argument("--json", action="store_true", help="Print JSON to stdout")
    args = parser.parse_args()

    results = [run_probe(target) for target in TARGETS]
    if args.write_report:
        json_path, md_path = write_reports(results)
        print(f"Wrote {json_path}")
        print(f"Wrote {md_path}")
    if args.json or not args.write_report:
        print(json.dumps(results, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    sys.exit(main())
