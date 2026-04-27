# Reference: Actor nodes

An Actor is a human role or a named system trigger that initiates or receives behavior in this feature. Actors are consumed by the Permissions Map and cross-referenced by every Command, Query, and Flow.

> **Field contract:** Required fields, validation rules, and enforcement live in `agents/ddd-synthesizer.md`. This file covers when to create an Actor, the kinds, ABP identity binding semantics, the worked example, and common defects.

---

## When to create an Actor

Create an Actor when a clause identifies a distinct participant with:

- A business role with distinct authorization needs (human actor), or
- A named system trigger that executes work outside a user request (system actor).

Do **not** create:

- Generic `User` actors when the clause names a specific role (create `Customer`, `Reviewer`, `ComplianceOfficer`, etc.).
- A bare `System` actor for ordinary system-initiated domain logic — that belongs inside the triggering Command or Flow.
- Duplicate actors for the same business role under different wordings (e.g., "admin" and "administrator" are one actor).

A bare `System` actor is not permitted; `System:` actors must name a specific background job, scheduled task, or distributed event handler.

---

## Actor kinds

| Kind | Example name | When to use |
|---|---|---|
| Human | `Customer`, `Reviewer`, `ComplianceOfficer` | A user interacting through the UI or API |
| External system | `PartnerCreditBureau`, `StripeWebhook` | A named external service that calls the API |
| System: BackgroundJob | `System: BackgroundJob: EmailReminderJob` | An ABP background job that executes deferred work |
| System: ScheduledTask | `System: ScheduledTask: DailyReportGenerator` | An ABP-hosted scheduler |
| System: EventHandler | `System: EventHandler: PaymentReceivedHandler` | A distributed event subscriber |

**Conceptual Actors** (Human / External system) do **not** carry `Base class:` or `Inherits from:` fields — those fields are reserved for System Actors. **System Actors** (BackgroundJob / ScheduledTask / EventHandler) carry the implementation class name in `ABP identity binding`.

---

## ABP identity binding

For **human actors**: bind to ABP Identity using `IdentityUser + role <RoleName>`. The role corresponds to an `IdentityRole` seeded via `IDataSeedContributor` or configured in `{Module}PermissionDefinitionProvider` role mapping.

For **system actors**: bind to a concrete C# class name — the background job class (`EmailReminderJob`), the scheduled task class, or the event handler class. The exact class is declared in the Integration entry or in the ABP Artifact Map's Application section.

For **external systems**: bind to a descriptive identifier matching the system's authentication mechanism — e.g., `ApiKey: partner-credit-bureau-v1`, `OAuth2Client: stripe-webhook`.

---

## Goals

Goals capture *why* the actor is in this feature, not *how*. One short line per goal. Draw directly from clause content — if no clause says why the actor is involved, the goal list is suspect and the actor should be reconsidered.

Examples:

- Customer
  - Submit a registration request.
  - Verify their email address.
  - View the status of their own requests.
- Reviewer
  - Review pending registrations assigned to their team.
  - Approve or reject within the defined SLA.
- System: BackgroundJob: EmailReminderJob
  - Send a reminder email 48 hours after a request is submitted if still unverified.

---

## Commands and Queries initiated

Link to Command and Query wiki pages using `[<n>](<wiki_url>/commands/<n>)` and `[<n>](<wiki_url>/queries/<n>)` — full URL form, no `.md`, no `wiki_local_path` prefix, human-readable label. The Permissions Map is generated from these relationships — every link here creates a row in the Permissions Map.

If an actor has no initiated Commands or Queries (pure observer / notification target), write `**Commands initiated:** none` and `**Queries initiated:** none`, then record the observation relationship in `**Notifications received:**`.

---

## Example entry (reference only — follow format, do not copy content verbatim)

> **Node type:** Actor
> **Name:** Reviewer
> **Kind:** Human
> **ABP identity binding:** `IdentityUser` + role `Reviewer`
> **Goals:**
> - Review pending registration requests assigned to the reviewer's team.
> - Approve or reject each request within the 48-hour SLA.
> - See audit trail for each decision.
>
> **Commands initiated:**
> - [ApproveRegistrationRequest](<wiki_url>/commands/ApproveRegistrationRequest)
> - [RejectRegistrationRequest](<wiki_url>/commands/RejectRegistrationRequest)
>
> **Queries initiated:**
> - [ListPendingRegistrationRequests](<wiki_url>/queries/ListPendingRegistrationRequests)
> - [GetRegistrationRequest](<wiki_url>/queries/GetRegistrationRequest)
>
> **Constraints:**
> - Reviewer can only act on requests assigned to their team (`TeamId` scoping).
> - Reviewer cannot act on their own submitted requests (SubmitterUserId ≠ current user).
>
> **Source:**
> - [FRS #123 — Actors](http://localhost:8080/root/trade-finance/-/issues/123#3-actors)
> - [FRS #123 — Preconditions](http://localhost:8080/root/trade-finance/-/issues/123#2-preconditions)
> - [FRS #124 — Onboarding flow](http://localhost:8080/root/trade-finance/-/issues/124#4-onboarding-flow)

---

## Common defects

| Defect | Fix |
|---|---|
| Bare `System` actor with no job name | Rename to `System: BackgroundJob: <JobName>` or remove and fold behavior into the triggering Command |
| Actor with zero initiated Commands and Queries | Move observer behavior to `**Notifications received:**`, or remove the actor entirely |
| Duplicate actors under different names | Merge; keep the most FRS-faithful name |
| Actor goals are implementation details (e.g., "calls the API") | Rewrite as business goal; keep implementation out of Actor entries |
| Human actor without `IdentityUser + role` binding | Add the binding; roles are required for the Permissions Map |
| Conceptual Actor (Human or External system) with `Base class:` / `Inherits from:` field | Remove the field — these are reserved for System Actors only |
