---
name: feat-spec-generator
description: "Use this skill to generate a high-level Technical Feature Specification (feat spec / tech plan) from one or more related Functional Requirement Specifications (FRS). Produces ONE feat spec per functional cluster — covering architecture, DB schema, entities, repository, service, controller, viewmodels, views, validation, error handling, file structure, and implementation order. Triggers: any mention of 'technical plan', 'tech spec', 'feat spec', 'feature specification', 'technical feature spec', 'generate tech plan', 'turn FRS into tech spec', 'implementation plan from FRS', or when the user provides FRS documents and asks for the next step toward implementation."
---

# FRS → Technical Feature Specification (Feat Spec)

Translate one or more related FRS documents into a single, platform-specific, implementation-ready technical feature specification. The output is a developer handoff document — not a design doc, not pseudocode, not a tutorial.

<HARD-GATE>
Do NOT write any feat spec until you have:
1. Read ALL provided FRS documents fully
2. Identified the target platform/stack (ask if not stated)
3. Confirmed which FRS documents are in scope for this feat spec
4. Confirmed the functional cluster name (used as the spec title and file name)

One feat spec covers one functional cluster (a set of tightly related FUs sharing models, DB tables, or a controller). Do not merge unrelated clusters into one spec.
</HARD-GATE>

---

## What Is a Functional Cluster?

A **functional cluster** is a group of FRS units that share enough implementation surface (DB tables, entity models, a controller, or a service) that speccing them together is more useful than speccing them separately.

**Good cluster signals:**
- FUs share the same DB tables or entity models
- FUs are handled by the same controller
- FUs share a service layer with interdependent methods
- One FU's postcondition is another FU's precondition

**Wrong merges:**
- Clustering FUs from different bounded contexts just because they are in the same module
- Merging FUs with entirely separate DB schemas and controllers

When in doubt: prefer smaller clusters. A feat spec for one FRS is valid.

---

## Process

### Step 1 — Ingest FRS Documents

Read every provided FRS fully. Extract:
- All actors, preconditions, flows, and postconditions
- All functional requirements (FR-* rows) — these drive the spec
- All business rules (BR-* rows) — these constrain service logic
- All open questions that are still unresolved — carry them into Section 16
- All wireframe/screen mappings — these inform the views and JS sections

Do not start writing the spec yet.

### Step 2 — Confirm Stack & Scope

If the target platform/stack is not explicitly stated, ask:
> "What platform and stack is this for? (e.g., .NET 5 MVC + EF Core + SQL Server, Node/Express + Prisma + PostgreSQL, Django + PostgreSQL, etc.)"

Also confirm:
> "Which FRS documents are in scope for this feat spec? I have: [list]. Are all of these in scope, or should any be excluded or deferred?"

Do not proceed until both are confirmed.

### Step 3 — Write the Feat Spec

Write the complete feat spec in one pass following the template below exactly. Save it as a `.md` file:

```
featurespec/TECH-[zero-padded-ID]-[kebab-case-cluster-name].md
```

Examples:
```
featurespec/TECH-01-permission-matrix-management.md
featurespec/TECH-02-station-state-progression.md
```

After saving, present it to the user:
> "Feat spec saved to `featurespec/TECH-[ID]-[name].md`. Review it — especially Sections 5, 12, and 16 — and let me know what needs adjusting."

---

## Feat Spec Document Template

Follow this structure exactly. Every section must be present. Scale depth to complexity — a simple CRUD cluster needs less prose than a multi-layer workflow. Do not add sections not in this template.

> **Key formatting rules:**
> - Document title: `# TECH-[ID]: Technical Feature Specification`
> - Subtitle: `## FU-[XX] [— FU-YY] — [Cluster Name]`
> - Stack line immediately after subtitle
> - All section headings: `## N. [Title]` (numbered, second-level)
> - Table of Contents must link to all 16 sections using anchor format `#n-kebab-title`
> - Stack-specific naming throughout (e.g., "Controller" for MVC, "Router" for Express, "View" for Django/Rails)
> - Implementation order (Section 15) must be a sequenced table, not a bullet list
> - Open technical decisions (Section 16) must include Impact and Recommended Default columns

---

```markdown
# TECH-[ID]: Technical Feature Specification
## FU-[XX][–FU-YY] — [Cluster Name]
### Platform: [Stack Name]

**Version:** 1.0
**Status:** Draft
**Date:** YYYY-MM-DD
**References:** [FRS-XX-name.md, FRS-YY-name.md]
**Stack:** [Full stack list — framework, ORM, DB, view layer, frontend libs]

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Database Schema](#2-database-schema)
3. [Entity Models](#3-entity-models)
4. [Repository Layer](#4-repository-layer)
5. [Service Layer](#5-service-layer)
6. [Controller](#6-controller)
7. [ViewModels & DTOs](#7-viewmodels--dtos)
8. [Views & Frontend](#8-views--frontend)
9. [Permission Enforcement](#9-permission-enforcement)
10. [Seed Data](#10-seed-data)
11. [API Endpoints Summary](#11-api-endpoints-summary)
12. [Validation Rules](#12-validation-rules)
13. [Error Handling Strategy](#13-error-handling-strategy)
14. [File & Folder Structure](#14-file--folder-structure)
15. [Implementation Order](#15-implementation-order)
16. [Open Technical Decisions](#16-open-technical-decisions)

---

## 1. Architecture Overview

Two parts:
1. A prose paragraph describing the layered architecture pattern used, how the browser/client interacts with the server, and the key design decisions (e.g., AJAX vs full-page, ORM pattern, concurrency strategy, access control approach).
2. An ASCII architecture diagram showing the layer stack from client to DB, with table names at the DB layer.

```
[Client Layer] (e.g., Razor View + jQuery AJAX)
        |
        v
[Controller] (e.g., MyFeatureController)
        |
        v
[Service Interface] (Business logic, validation)
        |
        v
[Repository Interface] (ORM data access)
        |
        v
[Database]
  ├── Table1
  ├── Table2
  └── Table3
```

Follow the architecture with a **Key design decisions** bullet list covering: rendering strategy, ORM pattern, concurrency handling, access control approach, and any other cluster-specific decisions.

---

## 2. Database Schema

One subsection per table. For each table:
- Heading: `### Table: \`TableName\`` with a note if seeded/read-only
- A column definition table with columns: Column | Type | Notes
- State any unique constraints below the table
- State recommended indexes below the table

Cover all tables introduced or modified by this cluster. Do not include tables from other clusters unless they are referenced as FKs.

---

## 3. Entity Models

Do not write code. Write prose describing:
- One paragraph per entity class
- What table it maps to
- Its key properties and their purpose
- Navigation properties and the relationships they represent
- Any ORM-specific annotations or fluent config needed (e.g., `[Timestamp]` for RowVersion, concurrency tokens, unique index config)

---

## 4. Repository Layer

Do not write code. Write prose describing:
- The repository interface name
- Each method the interface defines, in a numbered or named list
- For each method: what it fetches or persists, any transaction scope, and any ORM-specific pattern used (e.g., upsert, batch, paged query)
- Note if any method requires a DB transaction for atomicity (tie back to FR-* that requires it)

---

## 5. Service Layer

Do not write code. Write prose describing:
- The service interface name
- Each method, with: inputs, outputs, business rules enforced (cite BR-* and FR-*), and failure modes returned
- For validation-heavy methods, describe the validation sequence (what is checked first, what short-circuits)
- Describe the result/return pattern used (typed result objects, exceptions, etc.)

This is the most important section — it must fully specify business logic so a developer can implement it without reading the FRS.

---

## 6. Controller

Do not write code. Write a prose introduction followed by an actions table:

| Action | Method | Pattern | Purpose |
|--------|--------|---------|---------|
| [ActionName] | GET/POST | Full page / AJAX JSON / AJAX partial | [What it does] |

After the table, describe:
- Class-level auth/permission decorators
- Anti-forgery token requirements
- How the controller translates service result objects into HTTP responses
- Any special routing notes

---

## 7. ViewModels & DTOs

Two subsections:

**ViewModels (server → view):** A table listing each ViewModel class, its purpose, and key properties.

| ViewModel | Purpose |
|-----------|---------|
| [Name] | [What it models, what view/partial it feeds] |

**DTOs (client → server):** A table listing each DTO, its purpose, and key fields.

| DTO | Purpose |
|-----|---------|
| [Name] | [What AJAX action it feeds, key fields] |

---

## 8. Views & Frontend

Two subsections:

**Views:** A table mapping each view/template file to the screen it renders and key notes.

| View | Maps to | Notes |
|------|---------|-------|
| [Filename] | [Screen name from FRS Section 15] | [Notable rendering behaviors] |

**JavaScript / Frontend:** A table listing each JS function or module and its responsibility.

| Function / Module | Responsibility |
|-------------------|---------------|
| [Name] | [What it does, what endpoint it calls, what UI it updates] |

If no significant JS is needed, write: *Server-rendered only — no significant client-side JS required.*

---

## 9. Permission Enforcement

Describe the access control mechanism used for this cluster:
- The attribute, middleware, or decorator name
- How it is applied (class-level, method-level, or both)
- The runtime execution sequence (step by step: what it checks, what it redirects to on failure)
- Whether it is reusable across other clusters or specific to this one

If no custom enforcement mechanism is needed (e.g., standard framework auth is sufficient), state that explicitly.

---

## 10. Seed Data

If the cluster requires seed/reference data:
- State the seeding mechanism (e.g., EF Core `HasData`, a migration script, a fixture file)
- Provide a table of all seed records with their key field values
- State whether seed data is read-only at runtime

If no seed data is required, write: *No seed data required for this cluster.*

---

## 11. API Endpoints Summary

| Method | Route | Auth Required | Description |
|--------|-------|---------------|-------------|
| GET | `/[Route]` | [Permission code or role] | [What it renders or returns] |
| POST | `/[Route]` | [Permission code or role] | [What it accepts and does] |

Include every action from Section 6. Use the exact permission code strings from the FRS where applicable.

---

## 12. Validation Rules

| Rule | Layer | Detail |
|------|-------|--------|
| [Rule name] | Service / DB / Controller | [What is validated, what fails, cite FR-* or BR-* if applicable] |

Cover: all business rule validations, all referential integrity constraints, all concurrency controls, and any anti-forgery or input sanitization requirements.

---

## 13. Error Handling Strategy

| Scenario | HTTP Response | Client Behavior |
|----------|---------------|-----------------|
| [Error scenario] | [HTTP status] | [What the UI shows / does] |

Cover at minimum: each business rule violation, concurrency conflict, DB/server error, and unauthorized access. Align with the exception flows in the FRS.

---

## 14. File & Folder Structure

ASCII tree of all files introduced or modified by this cluster. Group by layer. Include file extensions.

```
[Root or module folder]/
├── Controllers/
│   └── [Controller].cs
├── Services/
│   ├── I[Service].cs
│   └── [Service].cs
├── Repositories/
│   ├── I[Repository].cs
│   └── [Repository].cs
├── Models/
│   └── [Entity].cs
├── ViewModels/
│   └── [ViewModel].cs
├── Views/
│   └── [Controller]/
│       ├── Index.[ext]
│       └── _Partial.[ext]
└── [static/js/css paths as applicable]
```

---

## 15. Implementation Order

A sequenced table. Steps must be in dependency order — a developer following this table top-to-bottom must never need a file that hasn't been created yet.

| Step | Task |
|------|------|
| 1 | [First task — always DB + migration or schema] |
| 2 | [Seed data] |
| 3 | [Repository] |
| 4 | [Service — with unit tests for business rule failure cases before wiring to controller] |
| 5 | [Permission enforcement mechanism] |
| 6 | [Controller] |
| 7 | [ViewModels] |
| 8 | [Views/templates] |
| 9 | [JS/frontend] |
| 10 | [Integration/end-to-end test] |

Adjust steps to match the stack. Always put service unit tests before controller wiring. Always put integration tests last.

---

## 16. Open Technical Decisions

Carry over all unresolved open questions from the source FRS documents, plus any new technical ambiguities surfaced during spec writing.

| # | Question | Impact | Recommended Default |
|---|----------|--------|---------------------|
| 1 | [Question] | [What it affects — which layer, which behavior] | [Recommended approach and why] |

Every row must have a Recommended Default — do not leave it blank. If genuinely uncertain, write "Needs stakeholder input — no default recommended."
```

---

## Linking Back to FRS

The feat spec references FRS documents in two ways:

1. **Header `References:` field** — list all FRS filenames the spec was derived from.
2. **Inline citations** — in Sections 5 and 12, cite specific `FR-*` and `BR-*` IDs when describing the logic they drive. Example: "Enforces lockout prevention (FR-01-06, BR-01) before any DB write."

Do not reproduce FRS content verbatim — reference it by ID and add the technical detail the FRS intentionally omits.

---

## Self-Review Checklist (run before presenting the spec)

- [ ] **Stack is explicit throughout** — no generic terms where stack-specific names apply?
- [ ] **No code written** — prose descriptions only in Sections 3–9?
- [ ] **Every FR-* and BR-* from the source FRS is addressed** somewhere in Sections 5, 9, 12, or 13?
- [ ] **All FRS open questions carried into Section 16** with a recommended default?
- [ ] **Implementation order is dependency-safe** — no step requires a file from a later step?
- [ ] **All 16 sections present** — none skipped, none merged?
- [ ] **File structure matches** every class named in Sections 3–8?
- [ ] **API endpoints table matches** every controller action in Section 6?
- [ ] **Error handling table covers** every exception flow from the FRS?
- [ ] **References field lists** all source FRS filenames?

Fix all failures before presenting.

---

## Key Principles

- **Describe, don't implement.** The spec tells a developer what to build and why — not how to write the code.
- **Cite FRS requirements.** Every service method and validation rule should trace back to at least one FR-* or BR-*.
- **Resolve ambiguity with a default.** Don't carry uncertainty forward — make a recommendation and flag it as an open decision.
- **Stack-specific naming.** Use the actual class/file naming convention of the target stack throughout.
- **Implementation order is a contract.** A developer should be able to follow Section 15 top-to-bottom without getting blocked.