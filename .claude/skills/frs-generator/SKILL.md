---
name: frs-generator
description: "Use this skill whenever the user wants to generate Functional Requirements Specifications (FRS), break down a product or system into business modules, create GitLab milestones and issues from requirements, or document business operations in structured form. Trigger this skill when the user mentions FRS, functional requirements, business requirements, module breakdown, GitLab milestone sync, or asks to turn meeting notes / feature descriptions into formal requirement documents. Also trigger when a user says things like 'create FRS for X', 'generate requirements for X', 'write up the business requirements', or 'sync requirements to GitLab'. Use this skill even if the user only has rough notes — the skill infers rules and structure when nothing is provided."
---

# FRS Generator

**Announce at start:** "I'm using the frs-generator skill to parse your input into modules, generate business-language FRS documents, and sync approved specs to GitLab."

<HARD-GATE>
- Do not generate any FRS until `confirmed_module_list` is resolved. This applies even when the input appears unambiguous.
- Do not create GitLab milestones inside the generation loop — all milestones are created ONCE before the loop begins.
- Do not sync a skipped FRS to GitLab under any circumstances — skipped means no file, no issue.
</HARD-GATE>

---

## Overview

This skill drives the full lifecycle of Functional Requirements Specification (FRS) generation: it parses input to detect business modules, gates on ambiguity, builds a per-module FRS manifest, enriches each spec with business rules, presents each FRS for approval, and syncs approved specs to GitLab as milestones and issues.

Use this skill whenever business operations need to be captured as traceable, testable, business-language requirements — from raw notes, feature ideas, or a full product brief.

**Expected outcome:** A complete set of approved FRS documents, one per business operation, organised under module milestones, with every approved FRS mapped to a GitLab issue ID.

**Core principle:** FRS describes WHAT the business needs — never HOW it is built. All language must be actor-facing, outcome-oriented, and free of any technical implementation detail. If a sentence could appear in a database schema, an API contract, or a deployment guide, it does not belong in an FRS.

---

## When to Use

**Use when:**
- User asks to write, generate, or document functional requirements
- User wants to break a product, feature, or system into modules / milestones
- User has meeting notes, user stories, or a feature brief to formalise
- User wants GitLab milestones and issues created from requirements
- User says anything like "FRS", "BRS", "business requirements", "spec doc", "requirements document"
- Input is rough or incomplete — the skill infers structure when nothing formal is provided

**Do not use when:**
- User wants a technical design document, architecture diagram, or system design — use a tech-spec skill instead
- User wants a test plan or QA checklist — FRS is input to testing, not the test plan itself
- User wants Agile user stories only — though you may offer to convert approved FRS → user stories after generation completes

---

## Hard Rules / Constraints

<HARD-GATE>
- NEVER include technical implementation details (no DB, API, framework, infrastructure, or language references)
- NEVER create more than one milestone per module — milestones are created ONCE before the generation loop
- NEVER sync a skipped FRS to GitLab — skipped means no issue, no file
- ALWAYS resolve `confirmed_module_list` before generating any FRS
- ALWAYS enforce the Skill Constraint on every FRS: ≥2 business rules, ≥2 edge cases, ≥1 exception flow
- ALWAYS run Domain-Expert enforcement before presenting any FRS to the user
- module = milestone (one-to-one, non-negotiable)
- one FRS per business operation (no bundling multiple operations into a single FRS)
</HARD-GATE>

---

## Anti-Patterns

### ❌ Writing HOW instead of WHAT

"The system shall store the user record in a PostgreSQL table" describes implementation.

✅ "The system shall retain the registered user's details so they are available for future interactions."

---

### ❌ Leaking cross-module logic into an FRS

An FRS locked to `Inventory` must not reference actors, rules, or outcomes belonging to `User Management` or `Reporting`.

✅ Strip cross-module references during Domain-Expert enforcement; rewrite to stay within the locked module's scope.

---

### ❌ Creating a milestone mid-loop

Milestones created partway through the loop risk duplication and broken issue linkage.

✅ Create all milestones for `confirmed_module_list` in a single pass before Phase 4 begins.

---

### ❌ Presenting an FRS before self-review and enforcement pass

Showing a draft that fails the checklist wastes a user gate and introduces noise.

✅ Always run Self-Review Checklist → Domain-Expert Enforcement → fix → re-check before presenting.

---

### ❌ Skipping Skill Constraint when no enrichment input is provided

The constraint is a baseline guarantee on every FRS, not optional enrichment.

✅ Infer business rules and edge cases from context when no meeting notes or business rules are supplied.

---

### ❌ Omitting inter-FRS dependencies in Section 5

Dependencies section lists only system/technical dependencies, not other FRS that must complete first.

✅ Section 5 must include BOTH: (1) Inter-FRS dependencies (e.g., "FRS-01 must be completed before this operation can proceed"), AND (2) System dependencies (authentication, entity context, etc).

---

## Dependencies Section (FRS Section 5) — Inter-FRS vs Technical

Every FRS has a **Dependencies** section (Section 5) that MUST document two types:

**1. Inter-FRS Dependencies (Business Dependencies)**

Reference other FRS documents that must be completed before this operation can proceed or make sense.

**Format:**
```
**Inter-FRS Dependencies:**
- **FRS-XX: [Operation Name]** — [brief explanation of why this FRS depends on FRS-XX]
  (Type: Upstream if FRS-XX must complete first; Downstream if this FRS triggers FRS-XX)
```

**Examples:**
- FRS-02 (View Requests) depends on FRS-01 (Submit Request) because you cannot view requests that don't exist
- FRS-03 (Track Status Summary) depends on FRS-01 (Submit Request) because counts aggregate submitted requests
- FRS-05 (Delete Request) depends on FRS-02 (View Request) because you must view a request before deleting it

**Dependency types:**
- **Upstream** = this FRS requires FRS-XX to complete first before it can proceed
- **Downstream** = this FRS triggers the start of FRS-XX upon successful completion
- **Parallel** = this FRS runs alongside FRS-XX (rare in user-facing operations)

**2. System & Technical Dependencies**

List system capabilities, external approvals, or technical prerequisites this operation requires.

**Format:**
```
**System & Technical Dependencies:**
- **Authentication & Authorization** — [what must be verified]
- **Entity Context** — [what data or access is required]
- [Other system dependencies]
```

**Key rule:** Section 5 MUST include both types. If an FRS has no inter-FRS dependencies, state "None" explicitly. Never omit the Dependencies section.

---

## The Process

### Checklist — complete phases in order

1. **Parse & Module Resolution** — detect modules and business operations; confirm with user if ambiguous
2. **FRS Manifest & Milestone Creation** — build the full manifest; create all milestones before the loop
3. **Enrichment** — extract rules from provided input, or infer them via Skill Constraint
4. **FRS Generation Loop** — generate → self-review → enforce → present → user gate → sync
5. **Final Output** — emit the summary table: milestones, FRS→issue map, counters

---

### Process Flow

```
Input
  │
  ▼
[Parse Input]
  │  detect modules + business operations per module
  ▼
Single module? ──yes──► [Auto-select] ──────────────────────┐
  │ no                                                       │
  ▼                                                          │
[USER GATE — Module Confirmation]                            │
  "Modules detected: 1. X  2. Y  3. Z                       │
   Confirm, or add / remove / merge"  (BLOCKING)             │
  │                                                          │
  ▼                                                          │
[confirmed_module_list] ◄───────────────────────────────────┘
  │
  ▼
[Build FRS Manifest]
  assign FRS IDs (reset per module), status = pending-approval
  │
  ▼
[Present Manifest to User]  (non-blocking)
  │
  ▼
[Create Milestones — ONCE per module]
  store: (module → milestone_id)
  │
  ▼
[Enrichment: extract rules OR infer via Skill Constraint]
  │
  ▼
┌─────────────────── FRS LOOP ──────────────────────────────┐
│  for each module → for each FRS_i:                        │
│    A. Generate FRS_i  (business language, all sections)   │
│    B. Self-Review Checklist  → fail? refine → re-check    │
│    C. Domain-Expert Enforcement → violation? strip/rewrite │
│    D. Present to user                                     │
│       ┌──────────┬──────────────┬──────────┐              │
│       │ approved │ change req.  │ skipped  │              │
│       └────┬─────┴──────┬───────┴────┬─────┘              │
│            ▼            ▼            ▼                     │
│       [save file]  [apply change] [mark skipped]           │
│       [GitLab:       re-show        no issue]              │
│        create        confirm                               │
│        issue]            │                                 │
│            └────────────┘                                  │
│                    ▼                                       │
│              [next FRS_i]                                  │
└───────────────────────────────────────────────────────────┘
  │
  ▼
[Final Output Summary]
```

---

### Phase 1: Parse & Module Resolution

* Scan the input for distinct business domains — these become modules (= milestones).
* Extract each business operation per module — these become individual FRS documents.
* Rank candidate modules by relevance / frequency in the input.
* **Single module detected** → auto-select, proceed without a user gate.
* **Multiple modules detected** → trigger the USER GATE below. This is the only gate in this phase.

**USER GATE format (BLOCKING):**
```
Modules detected:

1. <Module A>
2. <Module B>
3. <Module C>

Confirm, or add / remove / merge.
```

---

### Phase 2: FRS Manifest & Milestone Creation

* Expand each confirmed module into its business operations.
* Assign FRS IDs — reset per module: `FRS-[MODULE-INITIALS]-01`, `FRS-[MODULE-INITIALS]-02`, …
  * Module initials = uppercased first letter of each word in the module name (e.g., `User Management` → `UM`, `Trade Finance` → `TF`, `Inventory Control` → `IC`)
* Derive kebab-case file path per FRS: `<module-slug>/frs-[MODULE-INITIALS]-[ID]-<operation-slug>.md`
  * Example: User Management module, FRS-01 → `user-management/frs-UM-01-register-user.md`
* Set all statuses to `pending-approval`.
* Present the full manifest to the user for visibility (non-blocking).
* Create one GitLab milestone per module — store `(module → milestone_id)`. Do this ONCE, before the loop.

---

### Phase 3: Enrichment

* **If meeting notes / business rules provided:** extract and tag each rule to its module → build `enrichment_map: module → [rules]`.
* **If nothing provided:** infer business constraints, policy rules, and user-facing outcomes from context using the Skill Constraint as a floor.
* Enrichment feeds Phase 4 — it does not gate or block progress.

---

### Phase 4: FRS Generation Loop

For every module, for every FRS in that module:

**Step A — Generate**
Draft the full FRS internally using `references/FRS-TEMPLATE.md`. Use business language throughout.

**Step B — Self-Review Checklist** *(internal, before showing user)*
- [ ] Covers exactly one business operation?
- [ ] All requirements testable by a business stakeholder?
- [ ] Zero technical / implementation details?
- [ ] Exception flows cover: invalid input, unauthorised access, failure / non-completion?
- [ ] Postconditions stated as business outcomes (not system states)?
- [ ] Skill Constraint met: ≥2 business rules, ≥2 edge cases, ≥1 exception flow?
- [ ] Dependencies section (Section 5) documents BOTH inter-FRS and system dependencies?
- [ ] Inter-FRS dependencies (if any) correctly identify which other FRS must complete first?
- [ ] All referenced FRS IDs (FRS-XX) exist in the confirmed module list or other approved modules?

If any item fails → refine inline → re-run checklist before proceeding.

**Step C — Domain-Expert Enforcement** *(internal, before showing user)*
- All actors belong to the locked module?
- All business rules scoped to the locked module?
- No cross-module logic present?
- Outcomes affect only this module's scope?

If any violation found → strip offending content → rewrite in scope → re-enforce.

**Step D — Present to User**

| Response | Action |
|---|---|
| **Approved** | Save file → create GitLab issue under module's milestone → store `(FRS_title → issue_id)` |
| **Change request** | Apply changes → re-present → await confirmation |
| **Skip** | Mark as skipped → no file saved → no issue created |

Proceed to next FRS after disposition is recorded.

**Step D.1 — GitLab Issue Creation**

Post entire FRS as a single issue body. Issue metadata:
   - Title: `FRS-[MODULE-INITIALS]-{ID}: {Business Operation Title}`
   - Description: `<full FRS content>`
   - Labels: `frs`, `<module-name>`, `pending-review`
   - Milestone: `<module-name>`

Store `(FRS_title → gitlab_issue_id)`.

---

### Phase 5: Final Output

```
Milestones:
  <Module A>  →  #M1
  <Module B>  →  #M2

FRS Issues:
  <Module A>:
    FRS-UM-01  <operation>  →  #<issue_id>
    FRS-UM-02  <operation>  →  #<issue_id>
    FRS-UM-03  <operation>  →  skipped

  <Module B>:
    FRS-IC-01  <operation>  →  #<issue_id>

Bundle ID      : FRS-BUNDLE-{YYYYMMDD}-001
Total FRS docs : {N} across {M} modules
Milestones     : {M}
Saved          : {N}
Skipped        : {N}
Issues created : {N}
Business Rules : {N}
Edge Cases     : {N}
Open Questions : {N}
```

---

## GitLab Sync — Execution

This section defines HOW milestones and issues are created. Run the connectivity check once at the start of Phase 2, before any sync operation.

### Step 0 — Connectivity Check (run ONCE at Phase 2 start)

Check whether a GitLab MCP tool is available in the current session.

**If GitLab MCP is connected** → use MCP tool calls for all sync operations (see Mode A).
**If GitLab MCP is NOT connected** → fall back to curl commands (see Mode B). Inform the user once:
> "No GitLab MCP connection detected. I'll generate curl commands you can run to create milestones and issues."

---

### Mode A — MCP Connected

**Create milestone (Phase 2):**

Use whichever milestone-creation tool your connected MCP server exposes. Common tool names: `create_milestone`, `gitlab_create_milestone`. Pass:
- `title`: `"<Module Name>"`
- `description`: `"FRS milestone for <Module Name> module. Initials: [MODULE-INITIALS]"`

→ Store the returned `id` as `milestone_id` for this module.

**Create issue (Phase 4, on approval):**

Use whichever issue-creation tool your connected MCP server exposes. Common tool names: `create_issue`, `gitlab_create_issue`. Pass:
- `title`: `"FRS-[MODULE-INITIALS]-{ID}: {Business Operation Title}"`
- `description`: `<full FRS content read from saved file>`
- `milestone_id`: `<stored milestone_id for this module>`
- `labels`: `["frs", "<module-name>", "pending-review"]`

→ Store the returned `iid` as `issue_id` for this FRS.

If the MCP call fails → fall back to Mode B for that operation only. Note in Final Output.

---

### Mode B — No MCP (curl fallback)

**Create milestone — run once per module:**
```bash
curl --request POST \
  --header "PRIVATE-TOKEN: <your_gitlab_token>" \
  --header "Content-Type: application/json" \
  --data '{
    "title": "<Module Name>",
    "description": "FRS milestone for <Module Name> module"
  }' \
  "https://<your-gitlab-host>/api/v4/projects/<project_id>/milestones"
```
> Copy the `id` from the response — this is your `milestone_id` for this module.

**Create issue — run once per approved FRS:**
```bash
curl --request POST \
  --header "PRIVATE-TOKEN: <your_gitlab_token>" \
  --header "Content-Type: application/json" \
  --data '{
    "title": "FRS-[MODULE-INITIALS]-{ID}: {Business Operation Title}",
    "description": "<full FRS content — escape quotes>",
    "milestone_id": <milestone_id>,
    "labels": "frs,<module-name>,pending-review"
  }' \
  "https://<your-gitlab-host>/api/v4/projects/<project_id>/issues"
```
> Copy the `iid` from the response — this is your `issue_id` for this FRS.

**In Mode B**, present each curl command to the user immediately after the relevant phase completes. Do not wait until Final Output. Collect confirmed issue IDs from the user before proceeding to the next FRS.

---

## FRS Document Structure

Every generated FRS follows `references/FRS-TEMPLATE.md` (17 sections):

Purpose → Scope → Actors → Preconditions → Dependencies → Trigger → Main Flow → Alternative Flows → Exception Flows → Postconditions → Form Fields → Functional Requirements → Non-Functional Requirements → Business Rules → Edge Cases → Open Questions → Revision History

See `references/FRS-TEMPLATE.md` for the complete template with field descriptions and inline guidance.

---

## Skill Constraint (Enforced on Every FRS)

| Element | Minimum |
|---|---|
| Business rules | ≥ 2 |
| Edge cases | ≥ 2 |
| Exception flows | ≥ 1 |

Rules and edge cases must be business constraints or policy violations — not technical limits — stated in user-facing language, scoped to the locked module.

---

## Domain-Expert Enforcement Reference

| Violation | Action |
|---|---|
| Actor from a different module | Strip → replace with in-module actor |
| Business rule governing another module | Strip → rewrite to in-module scope |
| Cross-module outcome or dependency | Strip → restate as in-module postcondition |
| Any technical detail (DB, API, framework) | Strip → rewrite as business outcome |
| **Inter-FRS dependency referencing non-existent FRS** | **Correct the FRS-ID to an approved FRS, or strip if dependency is not valid** |
| **Missing Dependencies section entirely** | **Add Section 5 with at least system dependencies; add inter-FRS if applicable** |

If stripping leaves a section below Skill Constraint minimums → infer replacements within scope before re-presenting.

---

## User Gates — Where They Fire (and Where They Don't)

**Gates exist ONLY at:**
1. Module ambiguity resolution (Phase 1, multiple modules detected)
2. Per-FRS approve / change-request / skip (Phase 4, once per FRS)

**No gates for:** automatic generation steps, enrichment inference, milestone creation, Domain-Expert enforcement passes, self-review checklist runs.

---

## Handling Outcomes

**APPROVED** — Save file. Create GitLab issue under module milestone. Store mapping. Proceed to next FRS.

**CHANGE REQUEST** — Apply changes inline. Re-present the updated FRS. Await confirmation before proceeding.

**SKIPPED** — Mark as skipped. No file saved. No GitLab issue created. Proceed to next FRS.

**CHECKLIST FAIL (internal)** — Refine FRS inline. Re-run full checklist. Do not present to user until all items pass.

**ENFORCEMENT VIOLATION (internal)** — Strip offending content. Rewrite within locked module scope. Re-enforce before presenting.

**GITLAB SYNC FAIL** — Inform user of the failure. If in Mode A (MCP), fall back to Mode B curl commands for that operation. If Mode B curl also fails, record FRS as approved-but-unsynced, note in Final Output, and continue.

---

## Common Mistakes

❌ `"The API will return a 404 if the user is not found"`
✅ `"If the requested record does not exist, the operation ends and the actor is informed that no matching record was found."`

❌ Creating a milestone inside the FRS loop
✅ Create all milestones in one pass at the end of Phase 2, before Phase 4 begins.

❌ Asking the user to confirm enrichment rules mid-loop
✅ Enrichment runs automatically — surface rules in the FRS text, not in a gate.

❌ Generating FRS-02 before FRS-01 is fully resolved
✅ Process FRS sequentially; obtain disposition before advancing.

❌ Dependencies section lists only system dependencies, omitting inter-FRS relationships
✅ Section 5 MUST include BOTH: (1) Inter-FRS Dependencies (references to other FRS that must complete first), and (2) System & Technical Dependencies. Example: "FRS-02 depends on FRS-01 because requests must exist before they can be viewed."

❌ Referring to FRS-XX in Dependencies without confirming FRS-XX exists in approved modules
✅ Verify all referenced FRS IDs exist before presenting. If an FRS depends on a future operation not yet written, flag as Open Question.

---

## Expected Output

* One FRS file per approved business operation, named `<module-slug>/frs-[MODULE-INITIALS]-[ID]-<operation-slug>.md`
* Structured per `references/FRS-TEMPLATE.md` (17 sections)
* One GitLab milestone per module
* One GitLab issue per approved FRS, linked to its milestone
* Final Output summary with all counters and ID mappings

---

## Verification

1. Every approved FRS has exactly one corresponding GitLab issue — no duplicates, no orphans
2. Every FRS contains ≥2 business rules, ≥2 edge cases, ≥1 exception flow
3. No FRS contains any technical implementation detail
4. Every FRS is locked to exactly one module
5. The module list in Final Output matches `confirmed_module_list` exactly
6. Skipped FRS have no saved file and no GitLab issue

---

## Integration

**Delegates to:** `references/FRS-TEMPLATE.md` — document structure for every generated FRS
**Required after:** stakeholder sign-off on approved FRS documents
**Feeds into:** test-case generation skill, sprint planning (FRS issue IDs used as acceptance criteria references)
**Alternative:** tech-spec skill — when the user needs implementation design rather than business requirements