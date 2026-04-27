---
name: frs-generator
description: "Use this skill whenever the user wants to generate Functional Requirements Specifications (FRS), break down a product or system into business modules, create GitLab milestones and issues from requirements, or document business operations in structured form. Trigger this skill when the user mentions FRS, functional requirements, business requirements, module breakdown, GitLab milestone sync, or asks to turn meeting notes / feature descriptions into formal requirement documents. Also trigger when a user says things like 'create FRS for X', 'generate requirements for X', 'write up the business requirements', or 'sync requirements to GitLab'. Use this skill even if the user only has rough notes — the skill infers rules and structure when nothing is provided."
---

# FRS Generator

**Announce at start:** "I'm using the frs-generator skill to parse your input into modules, generate business-language FRS documents, and sync approved specs to GitLab."

<HARD-GATE>
- Do not generate any FRS until `confirmed_module_list` is resolved.
- Do not create GitLab milestones inside the generation loop — all milestones are created ONCE before the loop begins.
- Do not sync a skipped FRS to GitLab — skipped means no file, no issue.
- Every scenario step MUST have exactly one selector — no alternatives, no "or", no unresolved placeholders.
- Navigation steps MUST use `selector: n/a` with the URL in the step text.
- Scenarios feed directly into script-generator — no TC-generator bridge needed.
</HARD-GATE>

---

## Overview

This skill generates FRS documents where **Section 13 Scenarios feed directly into the script-generator skill** to produce Playwright TypeScript tests. No bridge skill or TC-generator is required.

The pipeline is:

```
FRS Scenario (Section 13)
        │
        ▼
script-generator skill
        │
        ▼
Playwright .spec.ts (runs immediately, zero TODOs)
```

**Core principle:** FRS describes WHAT the business needs. Scenarios additionally encode HOW to test it — using a strict step + selector format parseable by script-generator.

---

## When to Use

**Use when:**
- User asks to write, generate, or document functional requirements
- User wants to break a product or system into modules / milestones
- User has meeting notes, user stories, or a feature brief to formalise
- User wants GitLab milestones and issues created from requirements

**Do not use when:**
- User wants a technical design document — use a tech-spec skill
- User wants a test plan or QA checklist only

---

## Hard Rules / Constraints

<HARD-GATE>
- NEVER include technical implementation details in FRS body (no DB, API, framework, infrastructure)
- NEVER put two selectors in one step
- NEVER use "or" in a selector field
- NEVER leave unresolved placeholders like `[uuid]`, `[dynamic]`, `[id]` in selectors
- NEVER create more than one milestone per module
- NEVER sync a skipped FRS to GitLab
- ALWAYS use `selector: n/a` for navigation steps — URL goes in step text
- ALWAYS use `getByLabel("Exact Label")` when element ID is dynamic
- ALWAYS use `#element-id` for stable element IDs
- ALWAYS enforce Skill Constraint: ≥2 business rules, ≥2 edge cases, ≥1 exception flow, ≥3 scenarios
- ALWAYS run Domain-Expert enforcement before presenting any FRS
- module = milestone (one-to-one)
- one FRS per business operation
</HARD-GATE>

---

## Selector Format Reference

### Pattern options

| Situation | Selector format | When to use |
|-----------|----------------|-------------|
| Navigate to page | `selector: n/a` | Always for navigation |
| Stable element ID | `selector: #element-id` | Buttons, inputs, tables with fixed IDs |
| Dynamic label | `selector: getByLabel("Label Text")` | Radio groups, checkboxes, inputs identified by visible label |

### Playwright mapping

| Selector | Playwright code |
|----------|----------------|
| `n/a` + navigate step | `await page.goto('/route')` |
| `#element-id` + click step | `await page.click('#element-id')` |
| `#element-id` + fill step | `await page.fill('#element-id', value)` |
| `getByLabel("Text")` + click | `await page.getByLabel('Text').click()` |
| `getByLabel("Text")` + fill | `await page.getByLabel('Text').fill(value)` |
| `#element-id` + verify step | `await expect(page.locator('#element-id')).toBeVisible()` |

### Hard rules on selectors

- ✅ One selector per step — always
- ✅ Navigation steps → `selector: n/a`, URL in step text
- ✅ `getByLabel("Exact Label Text")` for dynamic/label-identified elements
- ✅ `#element-id` for stable IDs
- ❌ No `[uuid]`, `[dynamic]`, or any unresolved placeholder
- ❌ No two selectors: `selector: #id or getByLabel("X")` is invalid
- ❌ No `data-testid` attribute selectors — use `#id` or `getByLabel()`

### Examples of correct vs incorrect

```
// ❌ Wrong — two options
selector: #form-service-checkbox-CLIENT_ACCOUNT (or use getByLabel for specific service)

// ✅ Correct — one selector
selector: #form-service-checkbox-CLIENT_ACCOUNT

// ❌ Wrong — unresolved uuid
selector: #form-verification-radio-[uuid]

// ✅ Correct — use label instead
selector: getByLabel("Emergency Bypass")

// ❌ Wrong — URL in selector
selector: navigate to /account-unblocker/create

// ✅ Correct — URL in step text, n/a as selector
Navigate to /account-unblocker/create -> selector: n/a
```

---

## Scenario Format

### Canonical format

```markdown
#### Scenario N: <Scenario Name>

**Feature:** <feature-name> | **Type:** Functional | **Priority:** High/Medium/Low | **Tags:** @smoke/@regression @<feature-name>

**Preconditions:**
- <state before scenario begins>

**Steps:**

1. <step text> -> selector: <selector or n/a>
2. <step text> -> selector: <selector or n/a>
3. <step text> -> selector: <selector or n/a>

**Expected Result:**
- <observable outcome>

**Test Data:**
- <Field>: `<concrete value — use {timestamp} for unique fields>`
```

### Step text guide

| Actor action | Step text example |
|---|---|
| Navigate | `Navigate to /account-unblocker/create` |
| Click button | `Click "Submit" button` |
| Fill text field | `Fill in the Account Number field` |
| Select checkbox | `Select Services to Unblock` |
| Select radio via label | `Select Verification Method` |
| Verify visible | `Verify request appears in the list` |
| Verify error | `Verify validation error on Account Number field` |
| Leave field empty | `Leave Account Number field empty` |

### Test Data rules

- Use concrete values — never generic placeholders like `<enter name>`
- For fields requiring uniqueness: append `{timestamp}` — e.g. `TC001 Customer {timestamp}`
- For fixed lookup values: use the exact value — e.g. `8888888888`

---

## The Process

### Checklist — complete phases in order

1. **Parse & Module Resolution** — detect modules and operations; confirm with user if ambiguous
2. **FRS Manifest & Milestone Creation** — build manifest; create all milestones before loop
3. **Enrichment** — extract rules from input or infer via Skill Constraint
4. **FRS Generation Loop** — generate → self-review → enforce → present → user gate → sync
5. **Final Output** — summary table

---

### Process Flow

```
Input
  │
  ▼
[Parse Input — detect modules + operations]
  │
Single module? ──yes──► [Auto-select] ──────────────┐
  │ no                                               │
  ▼                                                  │
[USER GATE — Module Confirmation] (BLOCKING)         │
  │                                                  │
  ▼                                                  │
[confirmed_module_list] ◄───────────────────────────┘
  │
  ▼
[Build FRS Manifest]
  │
  ▼
[Create Milestones — ONCE per module]
  │
  ▼
[Enrichment]
  │
  ▼
┌─────────────── FRS LOOP ──────────────────────────┐
│  for each module → for each FRS_i:               │
│    A. Generate FRS_i                              │
│    B. Self-Review Checklist → fail? refine        │
│    C. Domain-Expert Enforcement → violation? fix  │
│    D. Present to user → approved/change/skip      │
│    E. On approval: save file + create GitLab issue│
└───────────────────────────────────────────────────┘
  │
  ▼
[Final Output Summary]
```

---

### Phase 1: Parse & Module Resolution

- Scan for distinct business domains → modules (= milestones)
- Extract business operations per module → individual FRS documents
- Single module → auto-select. Multiple → USER GATE.

**USER GATE format (BLOCKING):**
```
Modules detected:

1. <Module A>
2. <Module B>

Confirm, or add / remove / merge.
```

---

### Phase 2: FRS Manifest & Milestone Creation

- Assign FRS IDs: `FRS-[MODULE-INITIALS]-01`, `FRS-[MODULE-INITIALS]-02`, …
- Derive file path: `<module-slug>/frs-[MODULE-INITIALS]-[ID]-<operation-slug>.md`
- Set all statuses to `pending-approval`
- Present full manifest to user (non-blocking)
- Create one GitLab milestone per module — ONCE before loop

---

### Phase 3: Enrichment

- Provided input → extract and tag rules per module
- No input → infer constraints from context using Skill Constraint as floor
- Feeds Phase 4. Does not gate progress.

---

### Phase 4: FRS Generation Loop

**Step A — Generate**
Draft full FRS using `references/FRS-TEMPLATE.md`. Business language in Sections 1–12 and 14–18. Strict selector format in Section 13.

**Step B — Self-Review Checklist** *(internal)*

General:
- [ ] Covers exactly one business operation?
- [ ] Zero technical implementation details in Sections 1–12 and 14–18?
- [ ] Exception flows: invalid input, unauthorised access, failure?
- [ ] Skill Constraint: ≥2 business rules, ≥2 edge cases, ≥1 exception flow?
- [ ] Section 5 has both inter-FRS and system dependencies?

Scenarios (Section 13):
- [ ] Minimum 3 scenarios: Success, Edge/Variation, Failure/Exception?
- [ ] Each has: Feature, Type, Priority, Tags, Preconditions, Steps, Expected Result, Test Data?
- [ ] Every step has exactly one `-> selector:` entry?
- [ ] Navigation steps: URL in step text, `selector: n/a`?
- [ ] No `[uuid]`, `[dynamic]`, or unresolved placeholders in any selector?
- [ ] No "or" / no alternative selectors in any step?
- [ ] Dynamic labels use `getByLabel("Exact Label Text")`?
- [ ] Stable elements use `#element-id`?
- [ ] Test Data has concrete values with `{timestamp}` for unique fields?
- [ ] No QA metadata (Status, Result, Error, Recovery Action, Screenshot)?

**Step C — Domain-Expert Enforcement** *(internal)*
- All actors, rules, outcomes within locked module scope?
- Every step selector follows the format rules?
- No unresolved placeholders in selectors?
- No two selectors in one step?

**Step D — Present to User**

| Response | Action |
|---|---|
| **Approved** | Save file → create GitLab issue → store mapping |
| **Change request** | Apply → re-present → await confirmation |
| **Skip** | Mark skipped → no file → no issue |

**GitLab Issue:**
- Title: `FRS-[MODULE-INITIALS]-{ID}: {Business Operation Title}`
- Labels: `frs`, `<module-name>`, `pending-review`
- Milestone: `<module-name>`

---

### Phase 5: Final Output

```
Milestones:
  <Module A>  →  #M1
  <Module B>  →  #M2

FRS Issues:
  <Module A>:
    FRS-AU-01  <operation>  →  #<issue_id>
    FRS-AU-02  <operation>  →  #<issue_id>
    FRS-AU-03  <operation>  →  skipped

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

## GitLab Sync

### Connectivity Check (once at Phase 2 start)

MCP connected → Mode A. Not connected → Mode B (inform user once).

### Mode A — MCP
Create milestone → store `milestone_id`. Create issue → store `iid`. Fail → fall back to Mode B for that operation.

### Mode B — curl fallback

```bash
# Milestone
curl --request POST \
  --header "PRIVATE-TOKEN: <token>" \
  --header "Content-Type: application/json" \
  --data '{"title": "<Module>", "description": "FRS milestone"}' \
  "https://<host>/api/v4/projects/<id>/milestones"

# Issue
curl --request POST \
  --header "PRIVATE-TOKEN: <token>" \
  --header "Content-Type: application/json" \
  --data '{
    "title": "FRS-XX-01: <Title>",
    "description": "<full FRS content>",
    "milestone_id": <id>,
    "labels": "frs,<module>,pending-review"
  }' \
  "https://<host>/api/v4/projects/<id>/issues"
```

---

## Skill Constraint

| Element | Minimum |
|---|---|
| Business rules | ≥ 2 |
| Edge cases | ≥ 2 |
| Exception flows | ≥ 1 |
| Scenarios | ≥ 3 (Success, Edge/Variation, Failure/Exception) |
| Selectors per step | Exactly 1 |
| Navigation selector | Always `n/a` |

---

## Domain-Expert Enforcement Reference

| Violation | Action |
|---|---|
| Actor/rule/outcome from different module | Strip → rewrite in-module |
| Technical detail in Sections 1–12, 14–18 | Strip → rewrite as business outcome |
| Missing Section 5 | Add both dependency types |
| Step with two selectors or "or" | Pick one → remove the other |
| `[uuid]` or unresolved placeholder in selector | Replace with `getByLabel("Label")` or correct `#id` |
| Navigation step with selector other than `n/a` | Correct to `selector: n/a`, move URL to step text |
| Missing selector on interactive step | Add correct selector |
| Placeholder test data | Replace with concrete value + `{timestamp}` |
| QA metadata in scenarios | Strip entirely |

---

## Common Mistakes

```
// ❌ URL in selector
Navigate to /create -> selector: navigate to /account-unblocker/create

// ✅ URL in step text
Navigate to /account-unblocker/create -> selector: n/a

// ❌ Two selectors
Select method -> selector: #form-verification-radio-[uuid] or getByLabel("Emergency Bypass")

// ✅ One selector
Select method -> selector: getByLabel("Emergency Bypass")

// ❌ Unresolved placeholder
Click option -> selector: #form-service-checkbox-[service_id]

// ✅ Resolved selector
Click option -> selector: #form-service-checkbox-CLIENT_ACCOUNT

// ❌ QA metadata in scenario
Result: (populated after execution)
Error: (populated on failure)

// ✅ Not in FRS — belongs in TC file only
```

---

## Integration

**Feeds from:** stakeholder input, meeting notes, user stories, feature briefs
**Delegates to:** `references/FRS-TEMPLATE.md`
**Feeds directly into:** `script-generator` skill — Section 13 scenarios parse to Playwright tests with zero TODOs
**No bridge skill needed:** TC-generator is skipped; FRS scenarios are the test input