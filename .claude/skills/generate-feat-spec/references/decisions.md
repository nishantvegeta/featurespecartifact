# Reference: Decision nodes

A Decision is a lightweight architecture/design decision record (ADR) capturing an architectural or domain approach chosen for this feature, its rationale, and rejected alternatives. Decisions are preserved so future work can understand *why* a choice was made, not just what.

> **Enforcement:** Every Decision must list at least one rejected alternative with the reason for rejection. A Decision without alternatives is indistinguishable from a statement and should be removed.

---

## When to create a Decision

Create a Decision when:

- The FRS calls out a design choice with trade-offs (e.g., "soft-delete vs hard-delete for canceled requests").
- A non-obvious approach was chosen and should be justified for reviewers and future implementers.
- A cross-cutting concern is resolved (tenancy model, concurrency strategy, event distribution).
- The clause-mapper surfaced a Decision category match.
- Two clauses contradicted each other and the resolution is documented here (the original Conflict may remain if resolution is deferred).

Do **not** create a Decision for:

- Trivial choices dictated by ABP convention (using `PagedResultDto<T>` is the default, no decision needed).
- Implementation details that belong in code comments.
- Business rules — those belong as Entity invariants or Command preconditions.

---

## Required fields

Every Decision entry must include these bold-labeled fields:

- `**Node type:** Decision`
- `**Title:** <short, sentence-case>`
- `**Context:** <1–3 sentences describing the situation and constraints>`
- `**Decision:** <the chosen approach, one paragraph>`
- `**Rationale:** <bullet list of reasons supporting the decision>`
- `**Rejected alternatives:** <bullet list; each with the alternative and why it was rejected>`
- `**Consequences:** <bullet list; positive and negative outcomes of the decision>`
- `**Source:** <bullet list of GitLab section-anchor deep links; see SKILL.md Clause Source Deep-Linking>`

Optional:

- `**Status:** Accepted | Proposed | Deprecated | Superseded by <link>` *(default: Accepted)*
- `**Related Conflicts:** <wiki links>` *(when the Decision resolves or partially resolves a Conflict)*
- `**Revisit if:** <conditions that would trigger reconsidering>`

---

## Title

Short and scannable. Sentence case:

- `Use string-stored enums for all workflow state fields`
- `Soft-delete canceled registration requests; hard-delete never`
- `Publish distributed events synchronously within the same transaction`
- `Index RegistrationRequest by (TenantId, SubmissionTime DESC)`

Avoid:

- One-word titles (`Events`).
- Titles that don't disclose the decision (`Event strategy` — decide → `Publish distributed events synchronously within the same transaction`).

---

## Context

State the situation that forced the decision:

- What needed to be resolved.
- What constraints applied (tech stack, existing patterns, compliance).
- What clues from FRS drove the need.

Keep it to 1–3 sentences. Long context paragraphs are a sign the decision isn't clearly scoped.

---

## Decision

State the chosen approach clearly and concisely. One paragraph.

Avoid code. Name components by role: "the aggregate", "the repository", "the application service". Specific class names are fine when they unambiguously identify the thing being decided.

---

## Rationale

Bullet list of reasons. Each bullet is a standalone argument for the decision. Ground rationale in:

- FRS clauses.
- Performance, scalability, or reliability concerns.
- Operational or maintenance considerations.
- Alignment with existing project patterns (reference `CLAUDE.md` conventions).

---

## Rejected alternatives

At least one alternative must be listed. For each:

- Name the alternative.
- Describe why it was rejected (one sentence is enough).

If the FRS did not explicitly raise an alternative, the synthesizer may introduce a plausible one — but the rejection reason must still be grounded in the FRS constraints.

---

## Consequences

Positive and negative outcomes of the decision. Include both, honestly. Format:

- **Positive:** `<outcome>`
- **Negative:** `<outcome>`

Consequences that change the architecture (e.g., requiring a new interface, adding a migration step) should be noted so the reader understands the cost.

---

## Example entry (reference only — follow format)

> **Node type:** Decision
> **Title:** Store workflow state enums as strings, not integers
> **Status:** Accepted
>
> **Context:**
> The `RegistrationRequest` aggregate has a multi-value `Status` field with six possible states. The project has no pre-existing convention on enum storage, but [FRS #123 — Audit and reporting requirements](http://localhost:8080/root/trade-finance/-/issues/123#14-audit-and-reporting-requirements) explicitly calls out the need to query audit logs and reports by human-readable state name.
>
> **Decision:**
> Store `RegistrationStatus` in EF Core as a string via `HasConversion<string>()`. The enum values' `ToString()` representations are used as the column values. No custom conversion or lookup table is introduced.
>
> **Rationale:**
> - Audit log queries remain readable without a code lookup table.
> - Schema evolution is safer: adding a new state doesn't shift integer values.
> - Reporting and BI tools consume state directly without joining to a codes table.
> - String storage overhead is negligible given the expected row volume.
>
> **Rejected alternatives:**
> - **Store as int (default EF Core behavior):** rejected because reports and audit logs would require a lookup to interpret values, and renaming/reordering states would silently break stored data.
> - **Store in a separate lookup table keyed by code:** rejected because the complexity is unjustified for a single state enum; no planned i18n of state names.
>
> **Consequences:**
> - **Positive:** Audit logs and analytics queries remain human-readable indefinitely.
> - **Positive:** Migrations adding new states require no data backfill.
> - **Negative:** String comparison on `Status` is microscopically slower than int comparison (measured: <1% impact on expected query volumes).
> - **Negative:** The convention must be applied consistently across future workflow enums; documented in CLAUDE.md.
>
> **Revisit if:** A workflow enum exceeds ~20 states or state name localization becomes a requirement.
>
> **Source:**
> - [FRS #123 — Non-functional requirements](http://localhost:8080/root/trade-finance/-/issues/123#7-non-functional-requirements)

---

## Common defects

| Defect | Fix |
|---|---|
| Decision with no rejected alternatives | Add at least one plausible alternative with rejection reason, or delete the Decision |
| Decision that's really a business rule | Move to Entity invariants or Command preconditions |
| Decision that restates an ABP default | Remove — only document deviations or non-obvious choices |
| Title doesn't disclose the decision | Rewrite so someone skimming the table of contents knows the outcome |
| Consequences section omits negatives | Add; honest trade-off documentation is the point |
| Context is longer than Decision and Rationale combined | Trim context to essentials |
