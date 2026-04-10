---
name: frs-generator
description: "Use this skill to translate raw requirements, UI prototypes, code, briefs, or feature requests into structured Functional Requirement Specifications (FRS). Produces ONE FRS document per functional unit (use case). Never produces monolithic all-in-one specs. Triggers: any mention of 'requirements', 'FRS', 'functional spec', 'use case spec', 'generate FRS', 'turn this into requirements', 'write spec', or when a user pastes a brief/PRD/feature list/UI code and wants it turned into formal specs. Also trigger when the user shares a UI prototype, component code, or wireframe and asks what to do with it from a requirements perspective."
---

# Raw Requirements → Functional Requirement Specifications

Translate messy input (briefs, bullet lists, feature requests, user stories, PRDs, UI code, wireframes) into precise, individually-scoped FRS documents — one document per functional unit.

<HARD-GATE>
Do NOT write any FRS document until you have:
1. Identified and listed ALL functional units from the raw input
2. Had the user confirm the unit breakdown (add, remove, merge, split)
3. Confirmed scope, actor, and success criteria for each unit

One FRS per unit. No exceptions. Never merge two use cases into one document.
</HARD-GATE>

---

## What Is a Functional Unit?

A **functional unit** is a single, actor-initiated interaction with a clear goal and a definable end state. It maps 1:1 to a use case.

**Good split signals:**
- Different actors (admin vs. end user vs. system)
- Different triggering events (user clicks "submit" vs. system timer fires)
- Different success states (item created vs. item approved vs. item deleted)
- Different error paths that are meaningfully distinct

**Wrong splits (too fine-grained):**
- Splitting "submit form" into "fill fields" + "click button" + "see confirmation"
- Separating input validation from the action it guards

**Wrong merges (too coarse):**
- "User management" covering create, update, deactivate, and role assignment in one spec
- "Approval flow" covering submission, review, approval, and rejection together

When in doubt: **one goal, one actor, one document.**

---

## Process

### Step 1 — Ingest & Parse

Read the raw input carefully. If input is UI code or a wireframe, extract every implied or explicit user-facing action, system behavior, role distinction, or workflow branch. Do not start writing specs yet.

Build a preliminary **Functional Unit List**:

```
Candidate Units (from raw input):
  [FU-01] <short name> — <one-line description>
  [FU-02] <short name> — <one-line description>
  ...
```

Flag anything ambiguous:
- Requirements that could be one unit or two
- Missing actors or implied role distinctions
- Implied units not stated in the input (e.g., an approval status implies a review/approve unit)
- UI state differences that suggest separate use cases

### Step 2 — Clarify One at a Time

Ask clarifying questions **one at a time** to resolve ambiguity. Focus on:

1. **Actors** — who initiates this action? Any role distinctions that change the flow?
2. **Scope** — is this one workflow or two? Should it be split?
3. **Edge cases** — what happens when it fails? Is there a cancellation path?
4. **Dependencies** — does this unit depend on another existing system or unit?

Do not ask about implementation. Do not ask about design. Only ask what you need to define scope and behavior.

### Step 3 — Confirm the Unit Map

Present the final confirmed list of units before writing anything:

```
Confirmed Functional Unit Map:
  [FU-01] <name> — <actor> wants to <goal> so that <outcome>
  [FU-02] ...

Total: N units → N separate FRS documents will be produced.
Ready to begin writing? (yes / start with FU-XX / reorder)
```

Wait for explicit user confirmation before proceeding.

### Step 4 — Write FRS Documents, One at a Time

Write one FRS at a time following the template below **exactly**. After each one, pause and ask:
> "FRS for [FU-XX] complete. Review it and let me know if it needs changes, or say 'next' to continue to [FU-YY]."

Do not auto-proceed through all units in one pass unless the user explicitly asks for batch output.

---

## FRS Document Template

Each document follows this exact structure. Use the reference format below for all section content, table layout, and heading style. Scale section depth to complexity — a simple CRUD unit needs less prose than a multi-step workflow.

> **Key formatting rules:**
> - All headings are `## N. Title` (numbered, second-level)
> - All tables use the exact column sets shown below — do not add or remove columns
> - Requirement IDs follow pattern `FR-[zero-padded doc number]-[zero-padded req number]` e.g. `FR-01-01`
> - Business rules follow pattern `BR-[zero-padded number]` e.g. `BR-01`
> - Status is always `Draft` on first generation
> - Author is always `frs skill`
> - Always include Section 15 (Wireframe Mapping) when input includes UI code or visual prototypes

---

```markdown
# FRS-[ID]: [Functional Unit Name]

**Version:** 1.0
**Status:** Draft
**Author:** frs skill
**Date:** YYYY-MM-DD
**Related Units:** [FU-XX, FU-YY — or "none"]

---

## 1. Purpose

One paragraph. What does this unit do and why does it exist? Who benefits? 
Write from a business/user value perspective, not technical.

---

## 2. Scope

**In scope:** What this spec covers (bullet list).
**Out of scope:** What it explicitly does not cover — be specific to prevent scope creep during implementation.

---

## 3. Actors

| Actor | Role | Notes |
|-------|------|-------|
| [Primary Actor] | The one who initiates the use case | Must hold [role] |
| [Secondary Actor] | System or person involved in the response | Optional row |

---

## 4. Preconditions

Conditions that MUST be true before this use case can begin:
- Precondition 1
- Precondition 2

If there are none, write: *None.*

---

## 5. Trigger

What event initiates this use case? (User action, system event, scheduled timer, external webhook, etc.)
One or two sentences. Be specific — name the UI element or event if known.

---

## 6. Main Flow

The happy path — numbered steps, present tense, actor/system clearly labeled in bold.

1. **[Actor]** does X.
2. **[System]** responds with Y.
3. **[Actor]** confirms / submits / selects Z.
4. **[System]** validates and performs action.
5. **[System]** returns result / confirmation.
6. Use case ends successfully.

---

## 7. Alternative Flows

Named sub-paths that branch from the main flow and still result in success.

### 7a. [Name of Alternative]
*Branches from step N of the main flow.*
1. ...
2. Returns to main flow at step M. / Use case ends.

*(Omit section entirely if no meaningful alternatives exist.)*

---

## 8. Exception Flows

Conditions that cause the use case to fail or require correction.

### 8a. [Name of Exception]
- **Trigger:** What causes this exception.
- **System behavior:** What the system does (message shown, action blocked, etc.).
- **Resolution:** How the actor recovers, or that the use case terminates.

### 8b. [Name of Exception]
- **Trigger:** ...
- **System behavior:** ...
- **Resolution:** ...

*(At minimum, cover: invalid input, unauthorized access, system/network failure.)*

---

## 9. Postconditions

**On success:** Concrete system state after the main flow completes.
**On failure:** System state if an exception flow terminates the use case.

Do not write vague postconditions like "system updates correctly." Write specific ones like "request record created with status = 'pending'."

---

## 10. Functional Requirements

Atomic, testable requirements derived from this use case. Each must be independently verifiable.

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-[ID]-01 | The system SHALL ... | Must |
| FR-[ID]-02 | The system SHALL ... | Should |
| FR-[ID]-03 | The system SHALL ... | May |

**Priority key:** Must = required for the unit to function. Should = important but not blocking. May = nice to have.

---

## 11. Non-Functional Requirements (Unit-Specific)

Only include NFRs specific to THIS unit. Global NFRs belong in a platform/architecture spec.

| Category | Requirement |
|----------|-------------|
| Performance | e.g., page/data loads within 2s under normal load |
| Data retention | e.g., submitted records retained for 30 days |

*(Omit section entirely if no unit-specific NFRs exist.)*

---

## 12. Business Rules

Constraints imposed by policy, regulation, or domain logic — not technical decisions.

- **BR-01:** [Rule]
- **BR-02:** [Rule]

*(Omit section entirely if none.)*

---

## 13. Open Questions

Questions that remain unresolved and must be answered before implementation begins.

| # | Question | Owner | Due |
|---|----------|-------|-----|
| 1 | ... | | |

*(Omit section entirely if none remain after clarification phase.)*

---

## 14. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | YYYY-MM-DD | frs skill | Initial draft |

---

## 15. Wireframe UI/UX Prototype Mapping

*Include this section whenever the input includes UI code, a wireframe, or a visual prototype. Omit only if the input was pure text requirements with no UI reference.*

All wireframes use ASCII/pipe notation. Each screen maps to flows defined in Sections 6, 7, and 8.

---

### SCREEN 1 — [Screen Name]
*Triggered by: [Main Flow step X / Alternative Flow Xa] | Related FR: FR-[ID]-XX to FR-[ID]-XX*

```
+--[breadcrumb / page header]-----------------------------------------------+
|                                                                            |
|  [PAGE TITLE]                                          [Primary Action]   |
|  [Subtitle / description]                                                  |
|                                                                            |
|  [Main content area — table, form, cards, etc.]                            |
|                                                                            |
+----------------------------------------------------------------------------+
```

**UI Notes:**
- List any non-obvious interactive behaviors (e.g., button enabled state, inline vs. modal feedback)
- Note success/error feedback patterns (toast, inline banner, redirect)
- Call out any conditional display logic visible in the UI code

---

### SCREEN [N] — [Error/Edge State Name]
*Triggered by: Exception Flow 8X | Related FR: FR-[ID]-XX*

```
[ASCII wireframe of error state]
```

**UI Notes:**
- Describe what changes from the default screen state
- Note where error messages appear (inline, banner, modal, toast)

---

### Screen Flow Diagram

```
  [Entry point / trigger]
           |
           v
  +------------------+       [Condition A]      +-------------------+
  | SCREEN 1         |  ----------------------> | SCREEN N          |
  | [Name]           |                          | [Error/Alt State] |
  +------------------+                          +-------------------+
       |
  [Condition B]
       |
       v
  +------------------+
  | SCREEN 2         |
  | [Name]           |
  +------------------+
       |
  [Action] --> [Outcome]
```
```

---

## Self-Review Checklist (run after writing each FRS, fix before presenting)

- [ ] **One use case only** — exactly one actor-goal pair?
- [ ] **Testable requirements** — every FR-* row can be turned into a pass/fail test?
- [ ] **No implementation details** — spec says WHAT, not HOW?
- [ ] **No "TBD" in main flow or requirements** — moved to Open Questions if unresolved?
- [ ] **Consistent actor naming** — same label used throughout?
- [ ] **Exception flows cover** at minimum: invalid input, auth failure, system error?
- [ ] **Postconditions are concrete** — specific state changes, not vague outcomes?
- [ ] **Out-of-scope list is explicit** — prevents spec from being stretched during implementation?
- [ ] **Section 15 present** if input included UI code or wireframes?
- [ ] **All table column sets match the template exactly** — no added or removed columns?
- [ ] **Requirement IDs are sequential and correctly formatted** (FR-01-01, FR-01-02...)?
- [ ] **Business rule IDs are sequential** (BR-01, BR-02...)?

Fix all failures inline before presenting to the user.

---

## Key Principles

- **One unit, one document.** Splitting is always safer than merging.
- **Describe behavior, not technology.** "The system stores the submission" not "the API writes to PostgreSQL."
- **Requirements must be testable.** If you can't write a test for it, rewrite it.
- **Resolve ambiguity before writing.** An open question in a spec becomes a bug in production.
- **Ask one question at a time.** Don't overwhelm. Move forward as soon as you have enough clarity.
- **Incomplete input is normal.** Surface gaps through questions — never invent answers.
- **Section 15 is not optional for UI input.** When given code or wireframes, always produce ASCII screen maps and a flow diagram.