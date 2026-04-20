# Reference: Conflict nodes

A Conflict records an ambiguity, contradiction, missing precondition, or otherwise unresolvable issue detected during clause normalization, mapping, or synthesis. Conflicts are the explicit record that a question remains open — they prevent silent resolution and give reviewers a clear action list.

> **Enforcement:** Every Conflict has a specific resolution question. "Clarify the requirement" is not an acceptable resolution question — the question must be answerable by a named stakeholder.

---

## When to create a Conflict

Create a Conflict when:

- A clause has no matching mapping rule (`no_match`).
- Multiple top-priority rules match and primary intent is ambiguous (`multi_match`).
- Two clauses contradict each other (`contradiction`).
- A concept could be a built-in ABP entity or a milestone entity, and the wording is ambiguous (`builtin_ambiguity`).
- Tenancy or entity scoping is ambiguous (`scoping_ambiguity`).
- A Command is missing an explicit precondition the FRS implies but doesn't state (`missing_precondition`).
- A Command is missing an explicit postcondition (`missing_postcondition`).
- An invented domain object has no FRS source (should never happen; if it does, log as Conflict rather than silently synthesize).
- Any other ambiguity that has no safe default.

Do **not** create a Conflict for:

- Style or naming preferences — apply naming hints silently.
- Missing optional information (optional fields are allowed to be absent).
- Choices with a clear default — document via a Decision instead.

---

## Required fields

Every Conflict entry must include these bold-labeled fields:

- `**Node type:** Conflict`
- `**Conflict ID:** Conflict-NN`
- `**Source:** <bullet list of GitLab section-anchor deep links; see SKILL.md Clause Source Deep-Linking>`
- `**Source FRS:** #<iid>`
- `**Conflict type:** <one of the types listed below>`
- `**Blocking severity:** critical | high | medium | low`
- `**Description:** <1–2 sentences clearly stating the ambiguity or contradiction>`
- `**Affected categories:** <bullet list: Actor, Entity, Command, Query, Flow, State, Integration, Decision, Architecture Blueprint>`
- `**Resolution question:** <the specific question a stakeholder must answer>`

Optional:

- `**Suggested options:** <bullet list of plausible answers, with pros/cons>`
- `**Default if unresolved:** <what the skill will assume if the user chooses to proceed without resolution — note that critical/high severities block proceeding>`
- `**Related Conflicts:** <wiki links>`
- `**Status:** Open | Resolved → <link to Decision> | Deferred`

---

## Conflict types

| Type | When it applies |
|---|---|
| `no_match` | The clause doesn't fit any DDD/ABP category |
| `multi_match` | Multiple categories apply with roughly equal strength; primary intent unclear |
| `contradiction` | Two or more clauses state incompatible requirements |
| `builtin_ambiguity` | Clause could map to an ABP built-in (`IdentityUser`, `Tenant`, ...) or a milestone entity |
| `scoping_ambiguity` | Tenancy, entity, or actor scope is unclear (e.g., `tenancy_model` absent while `TenantId` + `EntityId` both appear) |
| `missing_precondition` | An implied precondition on a Command is not stated and has no safe default |
| `missing_postcondition` | An implied postcondition on a Command is not stated |
| `orphan_object` | A synthesized object has no direct FRS source — demoted here rather than invented |
| `other` | Rare — prefer a specific type when possible |

---

## Blocking severity

| Severity | Meaning | Effect on preview |
|---|---|---|
| `critical` | Feature cannot proceed without resolution; implementation would be unsafe or meaningless. | Surfaced in Open Blockers section at top of Feat Spec and in the GitLab coordination issue. `passed: false` in validator if critical Conflict exists without a resolution in the same assembly. |
| `high` | Implementation direction is blocked; one concrete answer must be chosen. | Surfaced in Open Blockers. |
| `medium` | Ambiguity that has a sensible default; nice to clarify. | Listed in Open Questions and Future Enhancements section (14), not in Open Blockers. |
| `low` | Minor clarification; no real risk. | Listed in Open Questions section only. |

---

## Resolution question

The resolution question is the single most important field. It must be:

- **Specific** — names the thing to decide, not "clarify this".
- **Answerable** — by a named stakeholder (product owner, architect, domain expert).
- **Bounded** — leads to an answer that closes the Conflict, not a discussion that produces more Conflicts.

Examples of good resolution questions:

- "Should a rejected registration request be immutable, or can the same submitter re-submit and reuse the request ID?"
- "Is `company` in FRS-124 the ABP tenant (one DB schema per company) or a business entity within a shared tenant (multiple companies per database)?"
- "When the partner notification fails after all retries, should the local approval be reverted, flagged for manual review, or left as-is with an alert?"

Examples of bad resolution questions:

- "Clarify the requirement." (not specific)
- "Review this clause." (not answerable)
- "Discuss with the team." (not bounded)

---

## Suggested options

Optional, but recommended for `multi_match`, `scoping_ambiguity`, and `contradiction` Conflicts. Format:

- **<Option label>:** <short description>. Pros: <...>. Cons: <...>.

Providing 2–3 options accelerates stakeholder decisions. Keep each option to 1–2 lines.

---

## Default if unresolved

For `medium` and `low` Conflicts, describe what the skill assumes if the user proceeds without resolving the Conflict:

- `Default if unresolved: soft-delete is used (aligns with project convention).`

For `critical` and `high`, this field should read:

- `Default if unresolved: — (severity blocks preview; cannot proceed without resolution).`

---

## Example entry (reference only — follow format)

> **Node type:** Conflict
> **Conflict ID:** Conflict-03
> **Source:** [FRS #124 — Tenancy and entity model](http://localhost:8080/root/trade-finance/-/issues/124#4-tenancy-and-entity-model)
> **Source FRS:** #124
> **Conflict type:** `scoping_ambiguity`
> **Blocking severity:** high
>
> **Description:**
> FRS-124 references both `TenantId` and `CompanyId` on the same aggregate, and CLAUDE.md does not define `tenancy_model`. It is unclear whether `Company` is the ABP tenant or a milestone entity within a shared tenant.
>
> **Affected categories:**
> - Entity (`RegistrationRequest`, `CustomerProfile`)
> - Multi-tenancy design
> - Permissions Map (scoping)
>
> **Resolution question:**
> In this project, is `Company` the ABP tenant (one DB schema per company, `IMultiTenant` alone captures scope), or is `Company` a business entity within a tenant (multiple companies per database, requiring `CompanyId` scoping on top of `IMultiTenant`)?
>
> **Suggested options:**
> - **Option A — Company = ABP Tenant:** set `tenancy_model: per-company` in CLAUDE.md. Pros: simpler query scoping via `IMultiTenant`. Cons: schema migrations are per-company; cross-company reporting requires host-level data access.
> - **Option B — Company is a business entity within a tenant:** set `tenancy_model: per-entity-within-tenant`. Add `CompanyId` as a scoping field on every tenant-scoped aggregate. Pros: cross-company reporting straightforward. Cons: every Query must filter by `(TenantId, CompanyId)`; more boilerplate.
>
> **Default if unresolved:** — (severity blocks preview; cannot proceed without resolution).
>
> **Status:** Open

---

## Common defects

| Defect | Fix |
|---|---|
| Conflict without a specific `**Resolution question:**` | Rewrite until the question names the thing to decide and is answerable |
| Conflict marked `critical` but description is vague | Either sharpen the description or downgrade severity |
| Conflict marked `low` that actually blocks implementation | Upgrade severity; Open Blockers should reflect real blockers |
| Conflict with no affected categories listed | Add; reviewers need to know what parts of the spec are affected |
| Silent resolution (Conflict "resolved" without a Decision linked) | Create a Decision node, link it from `**Status:**`, preserve the Conflict as resolved |
| Conflict surfaced for a trivial stylistic question | Apply naming hint silently; delete the Conflict |
| Multiple Conflicts for the same root cause | Consolidate; cross-link via `**Related Conflicts:**` |
