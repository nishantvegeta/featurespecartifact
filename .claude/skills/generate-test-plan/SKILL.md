---
name: generate-test-plan
description: "Use when generating a test plan from an FRS document or raw application code — NOT from user stories. Parses the source, extracts testable use cases grouped by category, and creates TC files in the sibling wiki/docs repo at ../docs/test-plans/{feature}/{use-case}/{feature}-TC-NNN.md. FRS input produces placeholder selectors; raw-code input extracts selectors from the code."
---

# Generate Test Plan from Source (FRS / Raw Code)

Parses a Functional Requirements Specification (FRS) document **or** raw application source code, extracts testable use cases, and emits individual TC files into the **sibling docs/wiki repo** under `../docs/test-plans/{feature}/{use-case}/`. Each use case category (display, add, edit, delete, etc.) gets its own sub-folder. Each TC within a sub-folder covers one flow variant — happy path, validation, edge case, etc.

| Input type | Selector behaviour |
|---|---|
| **FRS** | All step selectors → `(discovered by explorer)` — FRS describes *what* the system does, not *how* the UI is wired. |
| **Raw code** | Selectors extracted from code (`data-testid`, `id`, `name`, `aria-label`, route paths). |

<HARD-GATE>
Do NOT invent selectors when the input is an FRS. Every step selector MUST be `(discovered by explorer)` or `n/a` (for pure-navigation steps). This applies to EVERY TC regardless of how obvious the UI element seems.
</HARD-GATE>

---

## Workspace Layout Assumption

This skill assumes a multi-repo workspace where the docs/wiki repo is a **sibling** of the UI and API repos:

```
workspace/
  ui/        ← frontend repo (skill may be run from here)
  api/       ← backend repo (skill may be run from here)
  docs/      ← wiki / knowledge repo (TC files land here)
```

All TC paths in this skill are written **relative to the repo the skill is invoked from**, using `../docs/test-plans/...`. If the workspace layout differs, ask the user for the correct path to the docs/wiki repo before emitting any files.

---

## Directory Structure

```
../docs/test-plans/
  {feature}/
    {use-case-a}/
      {feature}-TC-001.md     ← happy path
      {feature}-TC-002.md     ← validation / edge case
    {use-case-b}/
      {feature}-TC-003.md     ← happy path
      {feature}-TC-004.md     ← error handling
    ...
```

**Concrete example:**
```
../docs/test-plans/
  checklist/
    display/
      checklist-TC-001.md     ← Display items (Happy Path)
      checklist-TC-002.md     ← Display empty state
    add/
      checklist-TC-003.md     ← Add item (Happy Path)
      checklist-TC-004.md     ← Add item — empty description (Validation)
    edit/
      checklist-TC-005.md     ← Edit item (Happy Path)
    delete/
      checklist-TC-006.md     ← Delete item (Happy Path)
    toggle/
      checklist-TC-007.md     ← Toggle active/inactive
    reorder/
      checklist-TC-008.md     ← Reorder items up/down
```

**Naming rules:**
- Feature folder: kebab-case (`checklist`, `service-type`, `invoice`)
- Use case sub-folder: kebab-case verb or action (`display`, `add`, `edit`, `delete`, `toggle`, `reorder`, `search`, `export`)
- TC file: `{feature}-TC-{NNN}.md` — sequential across the entire feature, not per sub-folder

---

## TC File Format

```markdown
# {feature}-TC-{NNN}: {Title} ({Category})

**Feature:** {Feature Name}
**Scenario:** {Letter} — {Scenario description}
**Priority:** {High | Medium | Low}
**Type:** Functional
**Tags:** @smoke @{feature} @{feature}-TC-{NNN}

---

## Steps

| # | Step | Selector | Expected Result |
|---|------|----------|-----------------|
| 1 | Navigate to {path} | `n/a` | Page loads, {visible landmark} |
| 2 | Click "{button}" button | `[data-testid="{testid}"]` | {what happens} |
| 3 | Enter "{value}" in {field} | `[data-testid="{testid}"]` | {what appears} |
| 4 | Verify {element} | `(discovered by explorer)` | {expected state} |

---

## Preconditions
- {precondition 1}
- {precondition 2}

## Postconditions
- {postcondition 1}
- {postcondition 2}
```

### Format rules

- Title includes the category in parentheses: `(Happy Path)`, `(Validation)`, `(Edge Case)`, `(Error Handling)`
- Scenario line uses a letter prefix: `A — Create item (Happy Path)`, `B — Create item with empty name (Validation)`
- `@smoke` tag only on happy-path TCs
- Steps table columns: `#`, `Step`, `Selector`, `Expected Result` — in that order
- Selectors are backtick-wrapped: `` `[data-testid="..."]` ``, `` `n/a` ``, or `(discovered by explorer)` (no backticks for placeholder)
- Dynamic selectors use the template notation with curly braces: `` `[data-testid="checklist-row-{item.id}"]` ``
- Preconditions describe the required state **before** the test runs
- Postconditions describe the expected system state **after** all steps pass
- Horizontal rules (`---`) separate the header, steps, and conditions sections

---

## Overview

Use this skill when the user provides an FRS document (`.md`, `.docx`, `.pdf`, or pasted text) or source code files / a directory and asks for a test plan. The skill produces individual TC files in the **sibling docs/wiki repo**, organized by feature and use case category.

**Core principle:** One flow variant = one TC file. One use case category = one sub-folder. Never mix unrelated actions in a single TC.

---

## Anti-Pattern: "I Can Guess the Selector"

When reading an FRS that says *"User clicks the Save button"*, it is tempting to emit `` `[data-testid="btn-save"]` `` because it seems obvious. Don't. The FRS describes behaviour, not markup. Guessed selectors cause silent test failures. Leave them as `(discovered by explorer)` and let the explorer skill resolve them against the real DOM.

---

## When to Use

**Use when:**
- User provides an FRS document and asks for a test plan
- User points to raw source code (components, pages, API routes) and asks for a test plan
- User provides a mix of FRS + code and asks for a test plan

**Do NOT use when:**
- Input is user stories or acceptance criteria → use `skill:generate-test-plan-from-stories` instead
- User wants to update selectors in existing TCs → use `updateSelector` operation
- User wants to run or execute tests → different workflow entirely

---

## Checklist

You MUST complete these in order:

1. **Verify workspace layout** — confirm `../docs/` exists as the sibling docs/wiki repo
2. **Classify input** — determine FRS, raw code, or mixed
3. **Identify feature name** — derive the kebab-case feature name
4. **Extract testable requirements** — parse the source into a requirements list
5. **Identify use case categories** — determine the sub-folders (display, add, edit, delete, etc.)
6. **Group into TCs per category** — one TC per flow variant within each category
7. **Derive steps per TC** — write Step / Selector / Expected Result rows
8. **Resolve selectors (code input only)** — scan source for `data-testid`, `id`, `name`, `aria-label`
9. **Emit TC files** — create each file under the correct sub-folder in `../docs/test-plans/`
10. **Print summary** — show a table grouped by use case

---

## Process Flow

```dot
digraph process {
    rankdir=TB;

    verify_ws [label="Verify ../docs/\nsibling repo exists" shape=diamond];
    classify [label="Classify input\n(FRS / code / mixed)" shape=diamond];
    extract_frs [label="Extract requirements\nfrom FRS" shape=box];
    extract_code [label="Extract requirements\n+ selectors from code" shape=box];
    extract_mixed [label="Extract requirements from FRS\n+ selectors from code" shape=box];
    categories [label="Identify use case\ncategories (sub-folders)" shape=box];
    group [label="Group TCs per\ncategory (happy, validation…)" shape=box];
    steps [label="Derive steps\nper TC" shape=box];
    selectors [label="Resolve selectors\nfrom code" shape=box];
    skip_sel [label="All selectors =\n(discovered by explorer)" shape=box];
    emit [label="Emit TC files under\n../docs/test-plans/{feature}/{use-case}/" shape=box];
    summary [label="Print summary table" shape=doublecircle];

    verify_ws -> classify;
    classify -> extract_frs [label="FRS"];
    classify -> extract_code [label="code"];
    classify -> extract_mixed [label="mixed"];
    extract_frs -> categories;
    extract_code -> categories;
    extract_mixed -> categories;
    categories -> group;
    group -> steps;
    steps -> selectors [label="code / mixed"];
    steps -> skip_sel [label="FRS"];
    selectors -> emit;
    skip_sel -> emit;
    emit -> summary;
}
```

---

## The Process

### Step 1: Verify Workspace Layout

- Confirm that `../docs/` exists relative to the current working directory and is the docs/wiki repo.
- If the layout differs (e.g. docs repo is at a different path, or the user runs from the workspace root), **ask the user for the correct path** before continuing.
- Record the resolved base path (default: `../docs/test-plans/`) and use it for all subsequent file operations.
- **Verify:** The base path is writable and the directory exists or can be created.
- **On failure:** Stop and ask the user where the docs/wiki repo lives.

### Step 2: Classify Input

- Document (FRS, SRS, requirements doc): mode = `frs`
- Source code files or directory: mode = `code`
- Both provided: mode = `mixed` (requirements from FRS, selectors from code)
- **Verify:** You can name the mode and list every input file/section.
- **On failure:** Ask the user to clarify what they provided.

### Step 3: Identify Feature Name

- Derive a kebab-case feature name from the FRS title, module name, or dominant component name.
  - FRS "Service Type Management" → `service-type`
  - Component `BankSettingsChecklist.tsx` → `checklist`
- **Verify:** Feature name is kebab-case, module title is human-readable.
- **On failure:** Ask the user to confirm.

### Step 4: Extract Testable Requirements

**From FRS:**
- Scan for requirement identifiers (REQ-001, FR-01, SHALL/MUST statements).
- Capture each functional requirement as a single atomic statement.
- Capture preconditions, input constraints, expected outputs, error messages.
- Ignore non-functional requirements unless the user asks.

**From raw code:**
- Scan route definitions, page components, form handlers, API endpoints, dialogs.
- For each interactive element: what it does, what it validates, what it renders on success/failure.
- Capture conditional branches (if/else, switch, try/catch) — each branch is a candidate TC.
- Capture form validation rules (required fields, regex, min/max).

**From mixed:**
- FRS for the requirement list (what to test).
- Code to supplement with selectors and discover implicit behaviour the FRS missed.

- **Verify:** You have a numbered list of atomic requirements.
- **On failure:** List what you found and ask the user to confirm scope.

### Step 5: Identify Use Case Categories

Map requirements to use case categories. Each category becomes a sub-folder:

| Category | Sub-folder name | When to create |
|---|---|---|
| Display / Read | `display` | Component renders data in a list, table, or detail view |
| Create / Add | `add` | Form submission or dialog creates a new record |
| Update / Edit | `edit` | Form submission or dialog modifies an existing record |
| Delete / Remove | `delete` | Action removes a record (with or without confirmation) |
| Toggle state | `toggle` | Switch, checkbox, or button changes a boolean property |
| Reorder / Sort | `reorder` | Drag-and-drop or arrow buttons change item order |
| Search / Filter | `search` | Input filters or searches a list |
| Export / Download | `export` | Action exports data to a file |
| Authentication | `auth` | Login, logout, session management |
| Navigation | `navigation` | Route transitions, breadcrumbs, tabs |

Only create sub-folders for categories that have at least one TC. Don't create empty folders.

- **Verify:** Every requirement maps to a category. No category has zero TCs.
- **On failure:** Merge sparse categories or ask the user.

### Step 6: Group TCs per Category

Within each category sub-folder, create separate TCs for each flow variant:

1. **Happy path** — the primary success flow (Priority: High, Tag: `@smoke`)
2. **Validation / negative** — invalid inputs, boundary values (Priority: High)
3. **Edge cases** — empty states, max-length, concurrent actions (Priority: Medium)
4. **Error handling** — server errors, network failures, permission denied (Priority: Medium)

Assign scenario letters sequentially across the entire feature (A, B, C…), not per sub-folder. TC numbers are also sequential across the entire feature.

- **Verify:** Each category has at least a happy path TC. No TC exceeds 10 steps.
- **On failure:** Split large TCs; ensure every category has coverage.

### Step 7: Derive Steps per TC

Write steps in the table format:

```markdown
| # | Step | Selector | Expected Result |
|---|------|----------|-----------------|
| 1 | Navigate to {path} | `n/a` | Page loads, {landmark visible} |
| 2 | Click "{button}" | `[data-testid="{id}"]` | {what happens} |
```

Rules:
- Navigation steps: selector = `` `n/a` ``
- One atomic user action per step — don't combine "click Save and verify toast"
- Assertions can be their own step: `Verify {element} displays {state}`
- 2–10 steps per TC. If more, split.

### Step 8: Resolve Selectors (code and mixed modes only)

Scan source files in this priority order:

1. `data-testid="..."` — highest priority, purpose-built for testing
2. `id="..."` — reliable if unique
3. `name="..."` — form fields
4. `aria-label="..."` — accessible elements
5. Route path strings — for navigation steps
6. Stable CSS class used as a semantic hook

**Rules:**
- Dynamic selectors use template notation: `` `[data-testid="checklist-row-{item.id}"]` `` — preserve the `{variable}` to show the pattern.
- Never use positional selectors (`:nth-child`, `div > div > span`).
- Prefer `data-testid` over `id` over `name` over `aria-label`.

- **Verify:** Each resolved selector appears literally in the source code.
- **On failure:** Fall back to `(discovered by explorer)`.

### Step 9: Emit TC Files

For each TC:

- Create directory: `../docs/test-plans/{feature}/{use-case}/` if it doesn't exist.
- Create file: `../docs/test-plans/{feature}/{use-case}/{feature}-TC-{NNN}.md`
- TC numbers are sequential across the entire feature (not per sub-folder).
- Before creating, check if the file already exists. If it does, skip and warn.

- **Verify:** Each file exists, format matches the TC template, all sections present (header, Steps, Preconditions, Postconditions).
- **On failure:** Fix the malformed TC before moving to the next.

### Step 10: Print Summary

Print a grouped summary table:

```markdown
## Test Plan Summary: {Feature Name}

**Total TCs:** {N} | **Selectors resolved:** {M}/{total}
**Output:** `../docs/test-plans/{feature}/`

### display/
| TC | Title | Priority | Selectors |
|----|-------|----------|-----------|
| TC-001 | Display Items (Happy Path) | High | 6/8 from code |
| TC-002 | Display Empty State | Medium | 2/3 from code |

### add/
| TC | Title | Priority | Selectors |
|----|-------|----------|-----------|
| TC-003 | Add Item (Happy Path) | High | 3/3 from code |
| TC-004 | Add Item — Empty Desc (Validation) | High | 2/3 from code |

### delete/
| TC | Title | Priority | Selectors |
|----|-------|----------|-----------|
| TC-005 | Delete Item (Happy Path) | High | 2/4 from code |

📂 ../docs/test-plans/{feature}/
```

---

## Operations

### `createTC(feature, use_case, tc_number, tc_content)`

Create `../docs/test-plans/{feature}/{use_case}/{feature}-TC-{NNN}.md`. Create directories if needed. Check if file exists first.

### `updateSelector(feature, use_case, tc_number, step_number, selector)`

Update the Selector cell of a specific step row in `../docs/test-plans/{feature}/{use_case}/{feature}-TC-{NNN}.md`. Leave all other cells untouched.

### `readTC(feature, use_case, tc_number)`

Read and parse a single TC file from `../docs/test-plans/{feature}/{use_case}/{feature}-TC-{NNN}.md`. Return:
```json
{
  "feature": "checklist",
  "use_case": "display",
  "tc_number": "TC-001",
  "title": "Display Checklist Items (Happy Path)",
  "priority": "High",
  "steps": [
    { "number": 1, "step": "Navigate to checklist page", "selector": "n/a", "expected": "Page loads" }
  ],
  "preconditions": ["..."],
  "postconditions": ["..."]
}
```

### `listAll(feature)`

Scan `../docs/test-plans/{feature}/` recursively. Return all TCs grouped by use case sub-folder.

---

## Common Mistakes

**❌ Guessing selectors from FRS language** — "Save button" doesn't mean `[data-testid="btn-save"]` exists.
**✅ Leave as `(discovered by explorer)` — let the explorer resolve against real DOM.**

**❌ One giant TC with 20+ steps covering the whole module**
**✅ One flow variant per TC, 2–10 steps. Split by use case sub-folder.**

**❌ Combining "click Save" and "verify toast" into one step**
**✅ One atomic action per step row.**

**❌ Using dynamic selectors verbatim** — `data-testid={\`row-${id}\`}` breaks at runtime.
**✅ Use template notation: `[data-testid="checklist-row-{item.id}"]` to show the pattern.**

**❌ Numbering TCs per sub-folder** — TC-001 in display/ and TC-001 in add/ causes confusion.
**✅ TC numbers are sequential across the entire feature.**

**❌ Creating empty sub-folders for categories with no TCs**
**✅ Only create sub-folders that contain at least one TC file.**

**❌ Writing TC files inside the UI or API repo** — e.g. `ui/docs/test-plans/...` or `api/test-plans/...`.
**✅ All TC files live in the sibling docs/wiki repo at `../docs/test-plans/{feature}/{use-case}/`.**

**❌ Missing Preconditions or Postconditions sections**
**✅ Every TC must have both — even if the precondition is just "User is logged in".**

---

## Example

**Scenario:** User provides `BankSettingsChecklist.tsx` (with `data-testid` attributes) from the `ui/` repo and asks for a test plan. The skill is invoked from inside `ui/`.

**Action taken:**
1. Verified `../docs/` exists as the sibling wiki repo.
2. Classified as `code`.
3. Feature: `checklist`.
4. Extracted: table rendering, add dialog, edit dialog, delete action, toggle switch, reorder buttons, empty state, validation (empty description).
5. Identified 6 use case categories: `display`, `add`, `edit`, `delete`, `toggle`, `reorder`.
6. Grouped into 8 TCs across the 6 categories.
7. Resolved 22/28 selectors from `data-testid`; 6 left as `(discovered by explorer)` or template notation.
8. Created TC files:

```
../docs/test-plans/checklist/
  display/
    checklist-TC-001.md   ← Display Items (Happy Path)
    checklist-TC-002.md   ← Display Empty State (Edge Case)
  add/
    checklist-TC-003.md   ← Add Item (Happy Path)
    checklist-TC-004.md   ← Add Item — Empty Description (Validation)
  edit/
    checklist-TC-005.md   ← Edit Item (Happy Path)
  delete/
    checklist-TC-006.md   ← Delete Item (Happy Path)
  toggle/
    checklist-TC-007.md   ← Toggle Active/Inactive (Happy Path)
  reorder/
    checklist-TC-008.md   ← Reorder Items Up/Down (Happy Path)
```

9. Summary: 8 TCs across 6 sub-folders, 22/28 selectors from code.

---

## Key Principles

- **TC files live in the sibling docs/wiki repo** — `../docs/test-plans/...`, never inside the UI or API repo.
- **One flow variant = one TC file** — happy path, validation, and edge case each get their own file.
- **One use case category = one sub-folder** — all TCs for "delete" live under `delete/`.
- **Sequential numbering across the feature** — TC-001 through TC-NNN, never resetting per sub-folder.
- **Selector honesty** — placeholder or template notation is always better than a guess.
- **Never overwrite** — check if TC file exists before creating; skip and warn if it does.
- **Complete sections** — every TC must include header, Steps table, Preconditions, and Postconditions.

---

## Red Flags

**Never:**
- Invent a `data-testid` that doesn't exist in the source code
- Overwrite an existing TC file without reading it first
- Combine unrelated user actions into a single TC
- Emit more than 10 steps in a single TC — split into a new TC
- Skip Preconditions or Postconditions — both are mandatory
- Use positional CSS selectors
- Write TC files outside `../docs/test-plans/{feature}/{use-case}/` (i.e. inside the UI or API repo)
- Reset TC numbering per sub-folder
- Proceed without confirming the docs/wiki repo path if the workspace layout is unclear

**If the FRS is ambiguous:**
- List the ambiguous requirements explicitly
- Ask the user to clarify before generating TCs
- Do not guess intent

**If the code has no testable UI elements:**
- Ask if the user wants API-level test plans instead
- Do not force UI-style TCs onto non-UI code

**If `../docs/` does not exist:**
- Stop and ask the user where the docs/wiki repo lives in their workspace
- Do not silently fall back to writing inside the current repo

---

## Integration

**Required before:** Input files must be accessible (uploaded or path provided). The sibling `../docs/` repo must exist and be writable.
**Required after:** Explorer skill for resolving `(discovered by explorer)` selectors against live DOM.
**Alternative workflow:** `skill:generate-test-plan-from-stories` — when input is user stories instead of FRS/code.