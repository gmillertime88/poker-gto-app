# Azure Hosting + AI Recommendations Plan for GTO App

This document explains how to host the current GTO app on Azure and add AI-based recommended actions, without changing code in this step.

## 1) Recommended Azure Architecture

Use this baseline setup:

- Frontend: Azure Static Web Apps (hosts `index.html`, `styles.css`, `app.js`, and range data files)
- AI API layer: Azure Functions (HTTP-triggered endpoints)
- Model: Azure OpenAI (for strategic explanations and recommendation reasoning)
- Secrets: Azure Key Vault (API keys, if used)
- Identity: Managed Identity for Function App (preferred over raw keys)
- Monitoring: Application Insights + Log Analytics

Why this layout:

- Keeps the existing app mostly static and cheap to host
- Moves sensitive credentials to the backend
- Allows you to evolve AI logic without exposing keys in browser code

## 2) High-Level Request Flow

1. User opens static GTO site.
2. Browser sends hand context to your Function endpoint.
3. Function combines:
   - deterministic GTO baseline from your existing rules/range data
   - model-generated recommendation rationale and adjustments
4. Function returns normalized JSON:
   - `action` (Raise/Call/Fold/Check)
   - `size_bb`
   - `confidence`
   - `reasoning`
   - `source` (`rule`, `ai`, or `hybrid`)

## 3) Security and API Key Strategy (Important)

You are correct that key handling must be reintroduced, but do it server-side only.

Preferred pattern:

- Do not put model keys in frontend JavaScript.
- Give Function App a Managed Identity.
- Grant Managed Identity access to Key Vault secrets.
- Function resolves secrets at runtime from Key Vault.

If using Azure OpenAI with Entra auth:

- You can avoid a static API key and call Azure OpenAI using identity-based auth.
- Keep this as the long-term target.

If using API key auth temporarily:

- Store key in Key Vault (never in repo).
- Reference secret in Function App app settings.
- Rotate key regularly.

## 4) Azure Services to Create

Create one resource group, then these resources:

- `Static Web App`
- `Function App` (Node.js runtime to match current JavaScript stack)
- `Storage Account` (required by Function App)
- `Application Insights`
- `Log Analytics Workspace`
- `Azure OpenAI` resource with model deployment (for example `gpt-4o-mini`)
- `Key Vault`

Optional (recommended for production):

- `API Management` in front of Functions for rate limits and abuse protection
- `Front Door` if you need WAF/global routing

## 5) Deployment Model

## Option A (best for this repo): GitHub Actions + Static Web Apps + Functions

- Keep frontend deployed from `main` branch through Static Web Apps CI/CD.
- Deploy Function App through GitHub Actions (or `azd` if you prefer full IaC).

## Option B: Azure Developer CLI (`azd`) end-to-end

- Define infra as Bicep/Terraform.
- Use `azd up` for repeatable environments (dev/test/prod).

## 6) Suggested Endpoint Contract (for implementation)

Create a backend endpoint such as:

- `POST /api/recommend`

Request body example:

```json
{
  "players": 6,
  "position": "CO",
  "temperature": "normal",
  "hand": "AJo",
  "stack_bb": 100,
  "villain_profile": "unknown"
}
```

Response body example:

```json
{
  "action": "Raise",
  "size_bb": 2.5,
  "confidence": 0.82,
  "source": "hybrid",
  "reasoning": "CO open at 6-max favors raising AJo; table profile is neutral."
}
```

Implementation guidance:

- Keep deterministic baseline from your existing range logic as first pass.
- Use AI as an overlay for explanation and controlled adjustments.
- Clamp AI output to allowed actions and safe sizing bands before returning.

## 7) Guardrails for AI Recommendation Quality

In Function code, enforce:

- Output schema validation (reject malformed model output)
- Action whitelist: `Raise`, `Call`, `Fold`, `Check`
- Bet-size bounds by position (for example min 2.0bb, max 4.0bb preflop opens)
- Fallback behavior:
  - if model fails/times out, return deterministic baseline recommendation
- Prompt discipline:
  - include strict role, constraints, and no-strategy-drift rules

## 8) CORS, Auth, and Abuse Protection

Minimum:

- Allow CORS only from your Static Web App domain.
- Add per-IP and per-session rate limiting (APIM or custom middleware).
- Require a lightweight app auth token or signed nonce for API calls.

Production hardening:

- Put API behind API Management.
- Add bot protection and anomaly alerting.
- Add moderation/content filters if free text is introduced later.

## 9) Observability Checklist

Track these metrics in Application Insights:

- endpoint latency (p50/p95)
- model call latency and failure rate
- fallback rate to deterministic engine
- token usage and request volume
- recommendation distribution by action and position

Create alerts for:

- elevated 5xx error rate
- latency spikes
- sudden cost spikes from model usage

## 10) Cost Controls

- Start with low-cost model deployment (`gpt-4o-mini` class).
- Cache identical recommendation requests for short windows.
- Enforce token limits in prompts and API settings.
- Add request quotas per user/session.

## 11) Implementation Sequence (No Code Changes Yet)

1. Provision Azure resources listed above in a dev subscription.
2. Configure managed identity + Key Vault access.
3. Stand up `POST /api/recommend` in Azure Functions.
4. Add deterministic + AI hybrid logic in backend.
5. Add response schema validation and safe fallbacks.
6. Connect frontend to new endpoint.
7. Validate with test hands and compare baseline vs AI outputs.
8. Enable monitoring, alerts, and basic rate limiting.
9. Promote same setup to production with IaC.

## 12) Environment Variables to Plan For

Function App settings (names are examples):

- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_DEPLOYMENT`
- `AZURE_OPENAI_API_VERSION`
- `KEYVAULT_URI`
- `APPINSIGHTS_CONNECTION_STRING`
- `ALLOWED_ORIGIN`

If temporary key auth is needed:

- `AZURE_OPENAI_API_KEY` (store in Key Vault, reference via app setting)

## 13) Definition of Done

You are production-ready when:

- frontend is live on Static Web Apps
- backend API is live on Function App
- no model/API key exists in client-side code
- AI output is validated and bounded
- deterministic fallback works for all tested inputs
- monitoring, alerting, and rate limits are active

---

If you want, next step can be a second document with exact Azure CLI (`az`) commands and a minimal Bicep template for this architecture.
