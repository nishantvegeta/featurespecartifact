# Reference: Integration nodes

An Integration describes a binding between this feature and an external system, service, or ABP infrastructure component. Integrations cover outbound calls (we call them), inbound calls (they call us), and distributed event subscriptions.

> **Enforcement:** Every Integration must specify a failure impact boundary — which aggregates or Flows degrade if the integration fails. Integrations without a defined failure model are implementation hand-waving.

---

## When to create an Integration

Create an Integration when a clause describes:

- A call to an external service (REST, SOAP, gRPC, message queue).
- A subscription to a distributed event from another module/service.
- An ABP infrastructure binding that carries its own failure semantics: email sending, SMS, BLOB storage, background jobs with external side effects.
- A webhook or partner callback received by this feature.

Do **not** create an Integration for:

- A database call — that's infrastructure, not integration.
- An in-process domain event consumed by another aggregate in the same module — that's a domain event on the Entity.
- ABP's permission/setting/feature services — those are framework concerns.
- A local background job with no external side effect — that's a system Actor + a Command.

---

## Required fields

Every Integration entry must include these bold-labeled fields:

- `**Node type:** Integration`
- `**Name:** <PascalCase>`
- `**External party:** <system name — e.g., "Stripe", "Partner Credit Bureau", "ABP Emailing module">`
- `**Direction:** outbound | inbound | bidirectional`
- `**Trigger:** <Command name, domain event name, scheduled time, or inbound endpoint>`
- `**Contract summary:** <short prose description — NO endpoint specs, NO payload code>`
- `**Failure impact boundary:** <which aggregates, Flows, or capabilities degrade on failure>`
- `**Retry strategy:** <sync retry, background job, circuit breaker, dead-letter, etc.>`
- `**Source:** <bullet list of GitLab section-anchor deep links; see SKILL.md Clause Source Deep-Linking>`

Optional:

- `**Authentication:** <auth scheme: API key, OAuth2, mutual TLS, etc.>`
- `**Idempotency:** <idempotency key strategy — critical for outbound writes>`
- `**Data sensitivity:** <any PII, financial, or regulated data crossing the boundary>`
- `**Related events:** <domain events consumed or produced>`
- `**Observability:** <metrics, logs, traces expected>`

---

## Direction

- **Outbound** — this system initiates the call (we call them).
- **Inbound** — the external system initiates the call (they call us — webhook, callback).
- **Bidirectional** — sustained two-way interaction (rare; usually two separate Integrations is clearer).

---

## Trigger

Describe what causes the Integration to execute:

- **Command-triggered** — `[ApproveRegistrationRequest](<wiki_url>/commands/ApproveRegistrationRequest)` directly calls it.
- **Event-triggered** — `RegistrationRequestApprovedEto` is subscribed and fires the integration.
- **Scheduled** — ABP background worker on a cron schedule.
- **Inbound endpoint** — a webhook route on our API.

---

## Contract summary

One short paragraph describing the business-level contract:

- What we send (at the level of "submitter identity, verified email, request ID" — not the JSON schema).
- What we receive (at the level of "partner's customer ID" — not the response body).
- SLA or timing expectations from the external party.

**Do not paste API specs here.** Those belong in an engineering reference doc or the provider's documentation. Keep the Feat Spec at a business-contract level.

---

## Failure impact boundary

State which parts of the feature degrade if this Integration fails:

- **Hard failure** — the triggering Command fails; the Flow halts. State changes are rolled back.
- **Soft failure** — the triggering Command succeeds; the Integration is queued for retry; the Flow continues with a note that the downstream step is pending.
- **Eventual failure** — after N retries, a compensating action is taken (e.g., mark the aggregate for manual review, notify on-call).

One bullet per failure type, with the boundary:

- If outbound to partner fails: reviewer's approval succeeds locally; partner notification is queued as a background job with exponential backoff; after 24h of failures, raise an alert.

---

## Retry strategy

Describe the retry mechanism:

- **Sync retry:** in the request path with N attempts, exponential backoff. Risky for long external calls — avoid except for idempotent, fast operations.
- **Background job:** ABP `IBackgroundJobManager` with ABP's default retry (N attempts with exponential backoff; final failure logged).
- **Circuit breaker:** if using Polly or similar, document the threshold.
- **Dead-letter queue:** for distributed event subscriptions, what happens after max retries.

Pick one primary strategy per Integration.

---

## Example entry (reference only — follow format)

> **Node type:** Integration
> **Name:** PartnerNotification
> **External party:** Partner onboarding system (REST API, vendor: `PartnerIO v2`).
> **Direction:** outbound
> **Trigger:** domain event `RegistrationRequestApprovedEto` (distributed).
>
> **Contract summary:**
> On customer approval, notify the partner system so they can provision a mirror record for downstream credit checks. The outbound payload carries submitter identity (first name, last name, masked email), tenant ID, request ID, and timestamp. The partner's response contains a partner-side customer ID which we persist back onto the aggregate. Partner's published SLA is 99.5% uptime and response time under 2s at p95.
>
> **Authentication:** OAuth2 client credentials (client ID/secret in ABP settings under `Onboarding.PartnerNotification.*`).
>
> **Failure impact boundary:**
> - Hard failure: never — the `ApproveRegistrationRequest` Command must succeed regardless of partner availability.
> - Soft failure (retry via background job): if the partner is unreachable or returns 5xx, we queue `PartnerNotificationJob` via `IBackgroundJobManager` with exponential backoff (ABP default: 3 attempts).
> - Eventual failure: after the background job's final retry, raise an alert to ops (`Onboarding.PartnerIntegrationFailed` log event) and mark the aggregate with `PartnerNotificationStatus = Failed` so reviewers can see the pending state.
>
> **Retry strategy:** background job with ABP default backoff; on final failure, log + aggregate flag (no compensating rollback of the local approval).
>
> **Idempotency:** send our `RegistrationRequest.Id` as the idempotency key on every attempt; partner is responsible for deduping.
>
> **Data sensitivity:** PII (name, masked email). Data classification: Restricted. TLS required; no payload logging beyond request ID and HTTP status.
>
> **Related events:**
> - Consumed: `RegistrationRequestApprovedEto`.
> - Produced (domain event on success): `PartnerNotificationAcknowledgedEto` (Optional / future integration hook).
>
> **Observability:** metric `partner_notification_latency_seconds`, metric `partner_notification_attempts_total{status}`, log on final failure.
>
> **Source:**
> - [FRS #123 — External notifications](http://localhost:8080/root/trade-finance/-/issues/123#8-external-notifications)
> - [FRS #125 — Failure handling](http://localhost:8080/root/trade-finance/-/issues/125#2-failure-handling)
> - [FRS #125 — Retry policy](http://localhost:8080/root/trade-finance/-/issues/125#5-retry-policy)

---

## Common defects

| Defect | Fix |
|---|---|
| Integration without `**Failure impact boundary:**` | Add; describe hard/soft/eventual failure modes |
| Integration with API specs in the Contract summary | Rewrite at business-contract level; move specs to engineering reference |
| Integration with no `**Trigger:**` | Clarify what initiates the call (Command, event, schedule, inbound) |
| Database call labeled as Integration | Remove; database access is infrastructure |
| Local in-process event consumer labeled as Integration | Move to the Entity's domain events + note the consuming domain service |
| Integration with no `**Retry strategy:**` | Add; "none" is valid only with explicit justification |
| Idempotency omitted for outbound writes | Add; outbound writes without idempotency keys are a reliability risk |
