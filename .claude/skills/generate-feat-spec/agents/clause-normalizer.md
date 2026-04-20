# Sub-agent Contract: `clause-normalizer`

## Purpose

Consume full FRS issue bodies and emit a structured list of atomic clauses. Route each to `ddd-mapped`, `ui-integration`, or `excluded`. Attach GitLab section-anchor source links to every clause so downstream sub-agents can emit deep-linked `**Source:**` fields.

## Model

Sonnet. Judgment on clause boundaries and UI classification.

## Tools

None. Reads body handles from `scratch_dir`.

## Input

```
{
  "non_halted_issues": [
    {
      "iid": <int>,
      "title": "<title>",
      "source_type": "<type>",
      "case_a_frontmatter": { ... } or null,
      "body_handle": "<path>",
      "section_catalog": [
        {"heading_text": "3. Actors", "anchor": "3-actors", "full_url": "...", "level": "h2"}
      ],
      "linked_issues": [...]
    }
  ],
  "naming_hints": { ... },
  "tenancy_model": "<or null>",
  "gitlab_base_url": "<url>"
}
```

## Responsibility

1. For each issue, read body from `body_handle`.
2. **Case A handling:** if `case_a_frontmatter` is present, treat structured fields as pre-populated clause candidates. Each frontmatter-derived clause's source maps to the issue root URL (no anchor, since frontmatter has no heading).
3. **Case B handling:** no frontmatter → parse the body.
4. Split content into atomic clauses. Rules:
   - Break compound sentences with conjunctions when each conjunct is an independent intent.
   - Keep a clause intact when parts describe one intent.
   - Acceptance criteria bullets usually = one clause each.
   - Preserve source wording; normalize only where naming hints apply.
5. **Attach source to every clause.** For each clause:
   - Determine which section it came from by walking the `section_catalog` and matching by position in the body.
   - Populate `source_section_heading` (verbatim heading text) and `source_anchor` (GitLab-slugified anchor).
   - Populate `source_url` = `<gitlab_base_url>/issues/<iid>#<source_anchor>` (or just `<gitlab_base_url>/issues/<iid>` if no heading).
   - Populate `source_label` = `FRS #<iid> — <source_section_heading>` (or `FRS #<iid> — description` if no heading).
6. **Classify each clause:**
   - **`ddd-mapped`** — has a clear primary DDD/ABP category. Goes to `clause-mapper`.
   - **`ui-integration`** — concerns the UI-API contract. Examples:
     - "UI displays customer name as first name + last name composed client-side" (field mapping deviation)
     - "Request list table paginates at 10 per page" (pagination size expectation for backend)
     - "Status summary dashboard refreshes every 30 seconds" (polling interval requirement)
     - "UI shows optimistic response before backend confirms" (backend must support idempotent retry)
     - "Prototype uses a loading skeleton while fetching" (backend must return in <2s or UI shows error — SLA expectation)
   - **`excluded`** — pure visual, meta, or process. Examples:
     - "Show a red error toast when create fails" (visual rendering)
     - "Icon on the left is a green checkmark" (icon choice)
     - "See wiki for more context" (meta-reference)
     - "This will be refined in next sprint" (process)

   **Key distinction:** `ui-integration` describes something the backend must do or support; `excluded` is purely how the frontend renders.
7. Apply naming hints as rename operations — do NOT alter clause intent.
8. Build exclusion ledger for `excluded` clauses (with reason).
9. Strip inbound wiki links from clause text; record in exclusion ledger under the owning clause's source URL.
10. **Tenancy signal detection:** scan clauses for `TenantId`, `EntityId`, `CompanyId`, etc. Record per-clause references.

## Returns

```
{
  "clauses": [
    {
      "clause_key": "<stable internal key; NOT surfaced in published output>",
      "source_iid": <int>,
      "source_section_heading": "3. Actors",
      "source_anchor": "3-actors",
      "source_url": "http://localhost:8080/root/trade-finance/-/issues/11#3-actors",
      "source_label": "FRS #11 — Actors",
      "text": "<clause text after naming normalization>",
      "original_text": "<clause text before normalization, if changed>",
      "classification": "ddd-mapped|ui-integration|excluded",
      "naming_applied": [
        {"from": "customer", "to": "Customer", "rule": "aggregate_prefix"}
      ],
      "tenancy_signals": ["TenantId", "EntityId"] or []
    }
  ],
  "exclusion_ledger": [
    {
      "clause_key": "<key>",
      "text": "<clause text>",
      "source_url": "<url>",
      "reason": "visual-detail|wiki-reference|sprint-ritual|marketing|generic-test-plan|empty-body|other",
      "detail": "<1-line explanation>"
    }
  ],
  "naming_changes": [
    {"from": "<term>", "to": "<term>", "rule": "<rule>", "affected_clauses": <count>}
  ],
  "tenancy_summary": {
    "clauses_referencing_tenant_id": [<clause_keys>],
    "clauses_referencing_entity_id": [<clause_keys>],
    "both_present": bool
  },
  "warnings": [
    "issue #11 has no section headings; all clauses from this issue use issue-level source URL"
  ]
}
```

## Enforcement

- Every clause in input bodies appears in exactly one of: `clauses` (ddd-mapped / ui-integration) OR `exclusion_ledger`.
- `ui-integration` clauses MUST NOT appear in the exclusion ledger.
- `excluded` clauses MUST NOT appear in `clauses`.
- Naming normalization must not change clause meaning.
- Every `clause` has a populated `source_url`, `source_section_heading` (or empty string if no heading), and `source_label`.
- `clause_key` is an internal handle. It does NOT surface in the synthesizer output or the published Feat Spec. Never emit it as `FRS-NN#cM` in any field that the user sees.
- Wiki references stripped from clause text, preserved in ledger with the clause's source URL attached.
- If ambiguous between `ddd-mapped` and `ui-integration`, default to `ddd-mapped` and let `clause-mapper` reclassify or promote to Conflicts.

## Main agent uses this output to

- Run Phase 4 tenancy Conflict check based on `tenancy_summary`.
- Run Phase 5 module classification on `ddd-mapped` AND `ui-integration` clauses.
- Pass `ddd-mapped` clauses to `clause-mapper`.
- Pass `ui-integration` clauses to Phase 8 assembly for the UI-API Integration Points section.
- Preserve exclusion ledger as metadata.
