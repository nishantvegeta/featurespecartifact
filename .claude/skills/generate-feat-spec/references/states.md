# Reference: State nodes

A State node describes the lifecycle state machine of an Entity: what states exist, which transitions are legal, what triggers each transition, and what guards each transition has.

> **Field contract:** Required fields and enforcement live in `agents/ddd-synthesizer.md`. This file covers when to create a State entry, states/transitions table conventions, illegal transitions, terminal handling, the worked example, and common defects.
>
> Every Entity whose clauses mention lifecycle states must have a State entry. Every transition's `Triggered by` must reference an existing Command via wiki link.

---

## When to create a State entry

Create a State entry when a clause describes:

- Multiple named states an Entity can be in (e.g., `Pending`, `Approved`, `Rejected`, `Expired`).
- Rules about which state transitions are legal (e.g., "cannot reopen an approved request").
- Guard conditions on transitions (e.g., "cannot approve without email verified").

Do **not** create a State entry for:

- An Entity with only a created/deleted lifecycle (no intermediate states). Use the base class's soft-delete instead.
- A boolean flag that doesn't represent a workflow state (e.g., `IsActive`, `IsFavorite`) — keep as a plain attribute.
- Transient UI states (route to exclusion ledger; "UI prototype is source of truth").

---

## States table conventions

Columns: `State name | Description | Is initial | Is terminal`.

- Exactly one state has `Is initial: yes`.
- Zero or more states have `Is terminal: yes` (a terminal state has no outgoing transitions).
- State names are **PascalCase**.
- The state enum in the domain layer is named `<EntityName>Status` (e.g., `UserRequestStatus`).

Storage strategy follows CLAUDE.md `enum_serialization`:

- `camelCase strings, global` → EF Core + ABP JSON both use `JsonStringEnumConverter` with a camelCase naming policy globally; no per-entity `HasConversion<string>()` required.
- `PascalCase strings, per-entity` → each entity declares `.HasConversion<string>()` in its EF mapping.
- `int` → default EF Core enum-as-int storage; `JsonStringEnumConverter` still used for API surface unless CLAUDE.md says otherwise.

---

## Transitions table conventions

Columns: `From state | To state | Triggered by | Guard condition | Domain event raised`.

- Every transition has exactly one `Triggered by` (the Command performing the transition). Automatic transitions (time-based, system-initiated) are triggered by a system Command — e.g., `ExpireRegistrationRequest` invoked by `System: BackgroundJob: EmailReminderJob`.
- Guard conditions are domain invariants that must hold for the transition to be legal. Example: `EmailVerified == true` for `Pending → Approved`.
- `Domain event raised` must match the Command's `**Domain events raised:**` entries.

---

## Illegal transitions

Use this field when the FRS explicitly calls out forbidden transitions — not every non-listed transition, just the business-critical ones to block:

- `Approved → Pending` — never allowed.
- `Rejected → Approved` — reviewer cannot reverse a rejection; submitter must re-submit.

---

## Terminal handling

Describe what happens to an Entity once it reaches a terminal state:

- **Read-only** — further modifications are rejected (the aggregate is still stored and queryable).
- **Soft-delete** — set `IsDeleted = true` via `FullAuditedAggregateRoot`'s `ISoftDelete`.
- **Archival** — moved to an archive table or marked with a dedicated `IsArchived` flag (note if this is custom, not ABP's `ISoftDelete`).

---

## Example entry (reference only — follow format)

> **Node type:** State
> **Entity:** [UserRequest](http://localhost:8080/root/trade-finance/-/wikis/entities/UserRequest)
> **Storage:** enum `UserRequestStatus` stored as camelCase string via global `JsonStringEnumConverter` (per CLAUDE.md `enum_serialization`)
>
> **States table:**
>
> | State name | Description | Is initial | Is terminal |
> |---|---|---|---|
> | `Pending` | Submitted, awaiting email verification and/or reviewer action | yes | no |
> | `EmailVerified` | Submitter verified email; awaiting reviewer action | no | no |
> | `Approved` | Reviewer approved; submitter is now a platform user | no | yes |
> | `Rejected` | Reviewer rejected; submitter may re-submit a new request | no | yes |
> | `Expired` | Email not verified within 168 hours; request auto-closed | no | yes |
> | `Canceled` | Submitter canceled before decision; soft-deleted | no | yes |
>
> **Transitions table:**
>
> | From | To | Triggered by | Guard | Domain event |
> |---|---|---|---|---|
> | `Pending` | `EmailVerified` | [VerifyEmailForUserRequest](http://localhost:8080/root/trade-finance/-/wikis/commands/VerifyEmailForUserRequest) | token is valid and not expired | `UserRequestEmailVerifiedEto` |
> | `EmailVerified` | `Approved` | [ApproveUserRequest](http://localhost:8080/root/trade-finance/-/wikis/commands/ApproveUserRequest) | caller has `.Approve` permission; caller ≠ submitter | `UserRequestApprovedEto` |
> | `EmailVerified` | `Rejected` | [RejectUserRequest](http://localhost:8080/root/trade-finance/-/wikis/commands/RejectUserRequest) | caller has `.Approve` permission; caller ≠ submitter | `UserRequestRejectedEto` |
> | `Pending` | `Expired` | [ExpireUserRequest](http://localhost:8080/root/trade-finance/-/wikis/commands/ExpireUserRequest) | time since submission ≥ 168h and `EmailVerified == false` | `UserRequestExpiredEto` |
> | `Pending` | `Canceled` | [CancelUserRequest](http://localhost:8080/root/trade-finance/-/wikis/commands/CancelUserRequest) | caller == submitter | `UserRequestCanceledEto` |
> | `EmailVerified` | `Canceled` | [CancelUserRequest](http://localhost:8080/root/trade-finance/-/wikis/commands/CancelUserRequest) | caller == submitter | `UserRequestCanceledEto` |
>
> **Illegal transitions:**
> - `Approved → Pending` — never allowed.
> - `Rejected → Approved` — never allowed; submitter must re-submit.
> - `Expired → Pending` — never allowed; submitter must re-submit.
>
> **Terminal handling:**
> - `Approved`: read-only.
> - `Rejected`: read-only.
> - `Expired`: read-only.
> - `Canceled`: soft-deleted via `ISoftDelete`.
>
> **Source:**
> - [FRS #123 — State transitions](http://localhost:8080/root/trade-finance/-/issues/123#5-state-transitions)
> - [FRS #123 — Invariants](http://localhost:8080/root/trade-finance/-/issues/123#6-invariants)
> - [FRS #123 — Terminal handling](http://localhost:8080/root/trade-finance/-/issues/123#7-terminal-handling)
> - [FRS #124 — Approval rules](http://localhost:8080/root/trade-finance/-/issues/124#3-approval-rules)

---

## Common defects

| Defect | Fix |
|---|---|
| State entry exists but no initial state flagged | Add exactly one `Is initial: yes` |
| Transition references a Command that doesn't exist in the synthesis | Fix the name or add the missing Command |
| Transition's `Domain event raised` doesn't appear in the Command's events | Reconcile: either the Command should raise it or the transition description is wrong |
| No guard conditions on transitions with obvious domain rules | Extract guards from FRS (permissions, invariants, prerequisites) |
| State stored via strategy that doesn't match CLAUDE.md `enum_serialization` | Align with the declared convention; if deviation is intentional, justify in a Decision |
| Illegal transitions aren't listed when FRS is explicit | Add them to surface the business rule |
| Terminal handling missing | Describe per terminal state |
