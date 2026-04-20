# Reference: Flow nodes

A Flow is an ordered, multi-step process that coordinates Commands, Queries, external integrations, and decision branches to fulfill a business goal. Flows describe *how* Actors get work done through the system; they are not implementation details.

> **Enforcement:** Every step in a Flow that calls a Command or Query must reference the exact Command/Query name via wiki link. Flow step text must never contain code or pseudocode.

---

## When to create a Flow

Create a Flow when a clause describes:

- A sequence of steps involving more than one Command/Query/Integration with ordering rules, OR
- A multi-actor process where control passes between roles (submitter → reviewer → system), OR
- A process with explicit decision branches (happy path, error path, alternate path), OR
- A lifecycle traversal that spans beyond a single aggregate.

Do **not** create a Flow for:

- A single-Command action — that's captured in the Command's entry.
- A simple retrieval — that's captured in the Query.
- UI-internal navigation within the prototype (route to exclusion ledger; route backend expectations about backend contracts to UI-API Integration Points).
- Implementation sequences inside a single method.

---

## Required fields

Every Flow entry must include these bold-labeled fields:

- `**Node type:** Flow`
- `**Name:** <PascalCase>`
- `**Actor(s):** <bullet list of wiki links to Actors>`
- `**Purpose:** <1–2 sentences, business-level>`
- `**Preconditions:** <bullet list>`
- `**Numbered steps:** <ordered list; each step names the Command, Query, or Integration via wiki link>`
- `**Decision branches:** <labeled branches: happy path, error branches, alternate branches>`
- `**Postconditions:** <bullet list>`
- `**Source:** <bullet list of GitLab section-anchor deep links; see SKILL.md Clause Source Deep-Linking>`

Optional:

- `**Timing:** <SLAs, timeouts, scheduled triggers>`
- `**Retries and compensations:** <how failures are handled; references to background jobs or sagas>`
- `**Observability:** <what gets logged/emitted for monitoring>`

---

## Preconditions

What must be true before the Flow can begin. Examples:

- Actor authorization.
- Prior Flow completed (e.g., "customer has completed registration").
- External system availability assumptions.
- Data existence.

One bullet per precondition. Source to a clause when possible.

---

## Numbered steps

Each step:

- Is a numbered bullet (`1.`, `2.`, `3.`).
- Names the actor or system performing the step.
- References the Command / Query / Integration via wiki link.
- Describes the outcome in one short phrase.

Step format: `<actor> <action via wiki link> → <outcome>`.

Examples:

1. Customer submits [CreateRegistrationRequest](<wiki_url>/commands/CreateRegistrationRequest) → request is created with `Status = Pending`, `SubmissionTime` recorded.
2. System enqueues [EmailVerificationDispatch](<wiki_url>/integrations/EmailVerificationDispatch) → verification email sent to submitter.
3. Customer clicks link in email → [VerifyEmailForRegistrationRequest](<wiki_url>/commands/VerifyEmailForRegistrationRequest) sets `EmailVerified = true`.
4. Reviewer opens [ListPendingRegistrationRequests](<wiki_url>/queries/ListPendingRegistrationRequests) → sees the request in their queue.
5. Reviewer invokes [ApproveRegistrationRequest](<wiki_url>/commands/ApproveRegistrationRequest) or [RejectRegistrationRequest](<wiki_url>/commands/RejectRegistrationRequest) → request transitions.

Keep each step to one line. If a step needs more explanation, put the detail on the referenced Command/Query/Integration page.

---

## Decision branches

Label branches explicitly:

- **Happy path** — the default successful flow.
- **Alternate paths** — e.g., "customer does not verify within 48 hours".
- **Error paths** — e.g., "reviewer rejects the request", "external service unavailable".

For each non-happy branch, describe the trigger, the divergence point, and the terminal state.

Format:

- **<Branch name>** — trigger: `<condition>`. Divergence: step N. Terminal state: `<state or outcome>`.

Examples:

- **Alternate: email not verified within 48h** — trigger: `EmailVerified == false` at T+48h. Divergence: after step 2. Outcome: [EmailReminderJob](<wiki_url>/integrations/EmailReminderJob) dispatches reminder; if still unverified at T+168h, [ExpireRegistrationRequest](<wiki_url>/commands/ExpireRegistrationRequest) transitions to `Expired`.
- **Error: reviewer rejects** — trigger: reviewer invokes [RejectRegistrationRequest](<wiki_url>/commands/RejectRegistrationRequest). Divergence: at step 5. Outcome: `Status = Rejected`, notification sent.

---

## Postconditions

What is guaranteed to be true when the Flow completes successfully (happy path):

- Final state of primary aggregate.
- Side effects completed (events raised, notifications sent).
- Downstream Flows that are now enabled.

One bullet per postcondition.

---

## Example entry (reference only — follow format)

> **Node type:** Flow
> **Name:** CustomerRegistrationFlow
> **Actor(s):**
> - [Customer](<wiki_url>/actors/Customer)
> - [Reviewer](<wiki_url>/actors/Reviewer)
> - [SystemEmailReminderJob](<wiki_url>/actors/SystemEmailReminderJob)
>
> **Purpose:** Coordinate the multi-step process from a customer submitting a registration request through email verification and reviewer approval/rejection.
>
> **Preconditions:**
> - Customer has a verifiable email address.
> - At least one reviewer is assigned to the customer's team. — [FRS #123 — Reviewer assignment rules](<gitlab_base_url>/issues/<iid>#<slug>)
>
> **Numbered steps:**
>
> 1. Customer invokes [CreateRegistrationRequest](<wiki_url>/commands/CreateRegistrationRequest) → request persisted with `Status = Pending`, `SubmissionTime` set.
> 2. System dispatches [EmailVerificationDispatch](<wiki_url>/integrations/EmailVerificationDispatch) on `RegistrationRequestSubmittedEto` → verification email sent.
> 3. Customer clicks link in email → [VerifyEmailForRegistrationRequest](<wiki_url>/commands/VerifyEmailForRegistrationRequest) sets `EmailVerified = true`.
> 4. Reviewer opens [ListPendingRegistrationRequests](<wiki_url>/queries/ListPendingRegistrationRequests) → sees the request.
> 5. Reviewer invokes [ApproveRegistrationRequest](<wiki_url>/commands/ApproveRegistrationRequest) → `Status = Approved`, `ReviewerId` set.
> 6. System dispatches [PartnerNotification](<wiki_url>/integrations/PartnerNotification) on `RegistrationRequestApprovedEto`.
> 7. System queues welcome-email job via `IBackgroundJobManager`.
>
> **Decision branches:**
>
> - **Alternate: email not verified within 48h** — trigger: `EmailVerified == false` at T+48h after submission. Divergence: after step 2. Outcome: [EmailReminderJob](<wiki_url>/integrations/EmailReminderJob) dispatches reminder; if still unverified at T+168h, [ExpireRegistrationRequest](<wiki_url>/commands/ExpireRegistrationRequest) transitions to `Expired` and the Flow terminates.
> - **Error: reviewer rejects** — trigger: reviewer invokes [RejectRegistrationRequest](<wiki_url>/commands/RejectRegistrationRequest) at step 5. Outcome: `Status = Rejected`, `RegistrationRequestRejectedEto` raised, rejection notification sent. Flow terminates.
> - **Error: customer cancels** — trigger: customer invokes [CancelRegistrationRequest](<wiki_url>/commands/CancelRegistrationRequest) at any point before step 5. Outcome: `Status = Canceled` (soft-delete), Flow terminates.
>
> **Timing:**
> - Email verification window: 48 hours before first reminder, 168 hours (7 days) before expiration.
> - Reviewer SLA: 48 hours from `EmailVerified = true` to decision. SLA breach does not auto-escalate in this milestone.
>
> **Postconditions (happy path):**
> - Request is `Approved`.
> - Submitter has been notified.
> - Partner system has been notified.
> - Customer can now authenticate (via ABP Identity login).
>
> **Source:**
> - [FRS #123 — Overview](http://localhost:8080/root/trade-finance/-/issues/123#1-overview)
> - [FRS #123 — Primary flow](http://localhost:8080/root/trade-finance/-/issues/123#4-primary-flow)
> - [FRS #123 — Alternate flows](http://localhost:8080/root/trade-finance/-/issues/123#5-alternate-flows)
> - [FRS #123 — Error handling](http://localhost:8080/root/trade-finance/-/issues/123#6-error-handling)
> - [FRS #123 — Postconditions](http://localhost:8080/root/trade-finance/-/issues/123#7-postconditions)

---

## Common defects

| Defect | Fix |
|---|---|
| Flow steps contain code or pseudocode | Rewrite as prose referencing Commands/Queries/Integrations |
| Flow steps don't link to Commands/Queries | Add wiki links; consistency with naming index is enforced by validator |
| Named Commands in Flow don't match actual Command entries | Fix naming to match the synthesized Command entries |
| No decision branches when FRS clearly describes error/alternate paths | Extract branches from FRS and label them |
| No `**Postconditions:**` | Add; describe the terminal state of the happy path |
| Flow is just one step long | Collapse into the Command entry; delete the Flow |
| Mixed actors without clear hand-off | Restructure numbered steps to make hand-off explicit |
