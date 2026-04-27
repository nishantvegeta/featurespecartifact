---
name: generate-feat-spec
description: "Generate a high-level technical Feature Specification (Feat Spec) from Functional Requirement Specification (FRS) issues in a GitLab milestone. Produces an ABP-layered spec in the wiki and a lightweight coordination issue in GitLab."
when_to_use: "When analyzing requirements, designing domain models, or creating technical specifications from FRS documents"
argument-hint: "[milestone-name] or [project-path]"
disable-model-invocation: true
model: "haiku"
---

# Generate Feat Spec

**Announce at start:** "I'm using the generate-feat-spec skill to produce a high-level ABP/DDD Feature Specification from the GitLab milestone FRS issues. I'll write the spec and supporting DDD node pages to the wiki repo first, then create a short coordination issue in GitLab that links to them."

---

## Hard Rules

<HARD-GATE>
- **No code blocks anywhere.** No pseudocode, snippets, EF mappings, or method bodies. ABP base class and interface names appear only as bold-labeled field values (e.g. `**Base class:** FullAuditedAggregateRoot<Guid>`). Mermaid permitted only in Architecture Blueprints.
- **No wiki content read as input.** Output wiki links are allowed.
- **No artifact creation, file writing, or issue linking before user approval** at the Phase 10 gate.
- **No silent conflict resolution.** Every ambiguity becomes a Conflict with `blocking_severity`.
- **Unmapped clause count must reach zero** before preview. UI-integration clauses count as mapped.
- **DDD inline entries** in the Feat Spec body are Markdown-only — no YAML frontmatter. **DDD node files** written to the wiki in Phase 11 MUST carry YAML frontmatter (`id`, `name`, `type`, `version`, `created`, `last_modified`) and a `## Change History` section.
- **FRS issues are read-only.** Never `update_issue` on any FRS, ever, by any agent.
- **No ABP built-in duplication.** Do not synthesize an Entity that duplicates an ABP built-in (see `references/abp-built-in-entities.md`).
- **No invented domain objects.** Every entry must trace to an FRS clause or be recorded as a Conflict.
- **Empty optional sections are omitted** — no "none identified" stubs.
- **Wiki files are written before** the GitLab coordination issue in Phase 11.
- **All rendered wiki links use `wiki_url`** with no `.md` extension and no `wiki_local_path` prefix.
- **Opaque clause IDs (`#cN`) never appear in published output.** Use GitLab section anchor URLs.
- **Conflict node filenames are derived from the Conflict's title slug**, never from internal identifiers.
- **Synthesis honors every CLAUDE.md convention.** Deviations require a Decision node.
- **Tool ownership is exclusive** (see MCP Tool Ownership table). The main agent MUST NOT call `get_issue` or `list_issue_links`. `clause-normalizer`, `clause-mapper`, `ddd-synthesizer`, `feat-spec-validator`, and `docs-writer` MUST NOT call any GitLab MCP tool.
- **Never ask questions as prose.** Always use `AskUserQuestion`. If unavailable, fall back to prose prefixed with "⚠ AskUserQuestion unavailable — asking as prose:". Never silently stop.
- **Phase status announcements are required** before and after every phase. Sub-agent failures must surface a user-facing message and invoke `AskUserQuestion`.
</HARD-GATE>

---

## Overview

Generates a layered, ABP-shaped Feature Specification from one or more FRS issues belonging to a single GitLab milestone. The Feat Spec is produced as a set of Markdown pages in the wiki repo, **not** as the body of a GitLab issue. The GitLab Feat Spec issue is a short coordination artifact pointing to the wiki and listing linked FRS IIDs.

The skill reads project context from CLAUDE.md (ABP layout, library choices, API routing conventions), uses GitLab MCP tools to resolve milestones and hydrate issues, classifies each issue by source type, runs a monolith detection check before normalization, and maps every requirement clause into a formal DDD/ABP category. Queries are first-class, separate from Commands. UI-related clauses are captured in a dedicated UI-API Integration Points section. Critical blockers surface at the top of the assembled spec. The draft is validated before preview and only formalized — wiki files written, Feat Spec issue created, FRS issues linked — after explicit user approval.

Heavy phases are delegated to purpose sub-agents at the I/O boundary. Retrieval, synthesis, and file writing support parallel dispatch.

---

## Core Principle

**Every FRS clause must map to exactly one primary Feat Spec section or be escalated to Conflicts — no clause may remain as loose narrative.**

- GitLab FRS clause content is the canonical source of truth for requirement meaning.
- CLAUDE.md is the authoritative source of project conventions. Synthesis must honor every convention CLAUDE.md declares; deviations require a Decision node.
- Ambiguity is preserved in Conflicts, never silently resolved.
- UI clauses route to UI-API Integration Points (not discarded), capturing the prototype-to-backend contract.
- The wiki is the canonical home of the spec. The GitLab issue is a pointer, not a duplicate.
- Clause sources are deep-linked into GitLab issues via auto-generated section anchors.

---

## CLAUDE.md Convention Contract

The skill reads the following fields. **Required** fields block Phase 0 (via `AskUserQuestion`) if missing; optional fields have sensible defaults.

| Field | Required | Default | Used by |
|---|---|---|---|
| `gitlab_project_id` | yes | — | All GitLab MCP calls |
| `gitlab_base_url` | yes | — | Deep-link generation for clause sources |
| `wiki_url` | yes | — | Canonical spec URL and all wiki-style links |
| `wiki_local_path` | no | `docs` | On-disk location for wiki file writes |
| `tenancy_model` | recommended | — | Multi-tenancy resolution in Phase 4 |
| `project_root_namespace` | no | derived from project name | ABP Artifact Map namespaces |
| `module_project_layout` | no | ABP defaults | Paths for Domain, Application, EF Core projects |
| `api_routing_conventions` | no | `/api/app/...` | HTTP API section; Public/Private split if declared |
| `validation_library` | no | `FluentValidation` | Command validator synthesis |
| `object_mapping_library` | no | `Mapperly` | Object Mapping section |
| `permissions_class` | no | `<Module>Permissions` | Permissions Map pattern |
| `db_table_prefix` | no | `App` | Infrastructure table names |
| `sorting_strategy` | no | `explicit-switch` | Query entries; bans `System.Linq.Dynamic.Core` |
| `enum_serialization` | no | `camelCase strings, global` | State storage notes; DTO enum notes |
| `notable_gotchas` | no | — | Passed verbatim to `ddd-synthesizer` as context |

**Public/Private AppService split** — when `api_routing_conventions` declares `public_prefix` and `private_prefix`, every Command and Query is tagged `**Audience:** Public | Private` based on the invoking Actor, and route generation uses the appropriate prefix.

If CLAUDE.md does not declare an optional convention, Phase 1 emits a one-time soft warning listing the defaults being used.

---

## Wiki Link Format

Links use **full GitLab wiki URLs**. The wiki's path on disk (`wiki_local_path`) is separate from its published URL (`wiki_url`).

| Context | Link format |
|---|---|
| Feat Spec → DDD node page | `[<node name>](<wiki_url>/<node-type>/<NodeName>)` |
| Feat Spec → another feat spec | `[<title>](<wiki_url>/feat-specs/<slug>/feat-spec)` |
| Coord issue → Feat Spec | `[feat-spec](<wiki_url>/feat-specs/<slug>/feat-spec)` |
| DDD node → related node | `[<related node>](<wiki_url>/<node-type>/<RelatedName>)` |

**Rules:** No `.md` extension. No `wiki_local_path` prefix (`docs/`) in any rendered link. Label is the human-readable name. File writes use `wiki_local_path` for the on-disk target; only rendered Markdown strips it.

Example (CLAUDE.md `wiki_url: http://localhost:8080/root/trade-finance/-/wikis`):

- On-disk: `docs/entities/UserRequest.md`
- Rendered: `[UserRequest](http://localhost:8080/root/trade-finance/-/wikis/entities/UserRequest)`

---

## Clause Source Deep-Linking

Every synthesized entry carries a `**Source:**` field with GitLab-rendered deep links into source FRS issue(s) — **not** opaque clause IDs.

GitLab auto-generates anchor IDs for headings via:

1. Lowercase the heading text.
2. Replace spaces with hyphens.
3. Strip punctuation (`.`, `,`, `:`, `;`, `(`, `)`, `[`, `]`, `!`, `?`, `'`, `"`, etc.).
4. Collapse consecutive hyphens.
5. Append `-N` (1-indexed) for duplicate headings.

Examples:

| Heading | Anchor | Full URL |
|---|---|---|
| `## 3. Actors` | `#3-actors` | `<base>/issues/11#3-actors` |
| `## 4. Success Outcomes` | `#4-success-outcomes` | `<base>/issues/11#4-success-outcomes` |
| `### 4.1 Primary flow` | `#41-primary-flow` | `<base>/issues/11#41-primary-flow` |

`**Source:**` lists one link per contributing section:

```
**Source:**
- [FRS #11 — Actors](http://localhost:8080/root/trade-finance/-/issues/11#3-actors)
- [FRS #11 — Success Outcomes](http://localhost:8080/root/trade-finance/-/issues/11#4-success-outcomes)
```

**Edge cases:** Issues without headings → fall back to `<base>/issues/<iid>`, label `FRS #<iid> — description`; `clause-normalizer` warns. List-item granularity: GitLab anchors headings only, so the link points to the enclosing heading. Duplicate headings: `clause-normalizer` appends `-N` per GitLab's rule and warns.

Internally, the normalizer assigns stable clause keys for sub-agent handoff, but they never appear in published output.

---

## When NOT to Use

- FRS source is not in GitLab.
- No active GitLab MCP connection (`mcp__gitlab` unavailable).
- CLAUDE.md is absent or lacks `gitlab_project_id` / `gitlab_base_url` / `wiki_url`.
- User has not specified a milestone name or issue ID.

---

## MCP Tool Ownership (Exclusive)

| Tool | Exclusive owner | Phase | Type |
|---|---|---|---|
| `list_milestones` | main agent **only** | 0, 1 | read |
| `get_milestone` | main agent **only** | 0, 1 | read |
| `get_milestone_issue` | main agent **only** | 0, 2 | read |
| `get_issue` | `frs-retriever` **only** | 2 | read |
| `list_issue_links` | `frs-retriever` **only** | 2, 11 pre-check | read |
| `list_issues` | main agent **only** | 11 | read |
| `create_issue` | main agent **only** | 11 | write |
| `create_issue_link` | main agent **only** | 11 | write |

`update_issue` is **never permitted, by any agent.** `clause-normalizer`, `clause-mapper`, `ddd-synthesizer`, `feat-spec-validator`, and `docs-writer` may not call any GitLab MCP tool under any circumstance.

---

## frs-retriever Output Contract

`frs-retriever` returns a structured envelope with raw FRS bodies inline. `scratch_dir` is internal to `frs-retriever` only.

Each issue entry includes: `iid`, `title`, `source_type` (FRS / linked / unknown), `monolith_signals`, `halt_flag`, `open_questions` (list of `{heading, anchor, text}`), `body_text` (full description, inline), `section_catalog` (list of `{heading, anchor}`).

The main agent forwards `body_text` and `section_catalog` directly into the `clause-normalizer` envelope. Downstream sub-agents must not and cannot re-fetch issue content from GitLab.

---

## Conflict Node Naming

Conflict nodes use a **title-derived slug** for filenames and rendered wiki links. Internal identifiers (e.g. `CONFLICT-01`) appear only in the YAML frontmatter `id` field.

Slug rule: lowercase → replace spaces with hyphens → strip punctuation (`.`, `,`, `:`, `;`, `(`, `)`, `[`, `]`, `!`, `?`, `'`, `"`, `#`, `&`, `/`) → collapse consecutive hyphens → truncate to 48 chars.

| Conflict title | Correct filename | Wrong |
|---|---|---|
| Tenant vs Entity Scoping Ambiguity | `tenant-vs-entity-scoping-ambiguity.md` | `conflict-01.md` |
| Missing Query for Dashboard Summary | `missing-query-for-dashboard-summary.md` | `CONFLICT-02.md` |

Rendered: `[Tenant vs Entity Scoping Ambiguity](<wiki_url>/conflicts/tenant-vs-entity-scoping-ambiguity)`.

---

## Phase Reporting & Failure Handling

Before dispatching each phase, emit one line:

```
→ Phase <N>: <action> — dispatching <sub-agent or 'main agent'>...
```

After completion:

```
✓ Phase <N> complete. <brief result>
```

Silent transitions are not permitted. This applies to repair loops too.

**On sub-agent failure** (interrupt, timeout, empty output):

1. Emit `⚠ Phase <N> — sub-agent <n> failed or was interrupted.`
2. Do NOT silently stop or proceed with partial data.
3. Invoke `AskUserQuestion` with options: `retry` / `skip-and-continue (surface as high-severity blocker)` / `cancel`.
4. On `skip-and-continue`: record as high-severity Open Blocker, continue remaining phases where possible.
5. On `retry`: re-dispatch with the same input envelope.
6. On `cancel`: emit a final status summary of completed phases and stop.

---

## Quick Reference

| Phase | Action | Delegated to | Parallel? | Gate |
|---|---|---|---|---|
| 0 | Scope preview | main | — | User confirms before retrieval |
| 1 | Read CLAUDE.md convention contract, resolve milestone | main | — | Halt if required fields missing |
| 2 | Retrieve + hydrate issues, classify, detect monolith | `frs-retriever` | Yes — per issue | Halt per-issue if rule triggers |
| 2.5 | Open-Questions gate | main | — | `resolve-first` / `continue-anyway` / `pause` |
| 3 | Normalize clauses, capture anchors, exclusion ledger | `clause-normalizer` | No | Exclusion ledger complete |
| 4 | Context resolution (naming, tenancy) | main | — | Tenancy conflict if ambiguous |
| 5 | Module classification | main | — | Every mapped clause has a module |
| 6 | Clause-to-category mapping | `clause-mapper` | No | Unmapped count = 0 |
| 7 | DDD/ABP synthesis | `ddd-synthesizer` | Yes — per module if ≥2 | Fully expanded; no code fences |
| 8 | Assemble Feat Spec | main | — | No compression, no stubs |
| 9 | Validation checklist | `feat-spec-validator` | No | All critical/high checks pass |
| 10 | Preview gate (`AskUserQuestion`) | main | — | **No side effects without approval** |
| 11 | Write wiki files, create coord issue, link FRS | main (+ `docs-writer`) | Yes — file writes | Post-approval only; wiki first |

---

## Parallel Dispatch

Each worker receives a focused input envelope; do not forward full session context. Per-worker schemas are in `agents/<sub-agent>.md`.

**Phase 2 — `frs-retriever` parallel fetches.** If milestone has ≥3 issues, dispatch parallel `get_issue` calls (plus their linked issues); sequential otherwise. One issue IID + linked issues per worker. Parallel-safe: `get_issue` is read-only and issues are independent.

**Phase 7 — `ddd-synthesizer` parallel by module.** If Phase 5 produced ≥2 modules, dispatch one synthesizer per module; single pass otherwise. Each worker gets one module's clause mappings + Conflicts, all reference files, ABP catalogs, CLAUDE.md contract. Parallel-safe: aggregate boundaries don't cross modules; cross-module references resolve at assembly.

**Phase 11 — `docs-writer` parallel file writes.** Parallel batches when >5 files. Each worker gets a batch of `{filepath, content}`; returns a write manifest. Parallel-safe: paths are pre-computed and non-overlapping.

**Not parallelized** — `clause-normalizer` (shares exclusion ledger and naming state), `clause-mapper` (needs consistent view of all clauses for contradiction detection), `feat-spec-validator` (runs once against the assembled whole), repair loop (surgical, serial).

---

## The Process

### Phase 0: Scope Preview

1. Read `gitlab_project_id` from CLAUDE.md. Missing → `AskUserQuestion`.
2. `list_milestones(project_id)`.
3. Match user-provided milestone. Ambiguous → `AskUserQuestion`.
4. `get_milestone` + `get_milestone_issue` for count and titles.
5. **Do not call `get_issue` here.** Preview content uses only the `get_milestone_issue` response. If titles aren't available, show IIDs only.
6. `AskUserQuestion`:
   > I'm about to process milestone **<n>** containing **N** FRS issue(s). This will produce an estimated M–P DDD node files under your wiki and one short coordination issue in GitLab. Proceed?

   Options: `proceed` / `change scope` / `cancel`. Do not continue without `proceed`.

### Phase 1: Configuration

1. Read CLAUDE.md convention contract. Required missing → `AskUserQuestion`. Emit one-line soft warning listing optional defaults used.
2. Compute milestone slug: kebab-case of title, strip punctuation, max 48 chars.
3. Record user scope constraints. If AGENTS.md present, read naming conventions.

### Phase 2: Retrieval (`frs-retriever`)

See `agents/frs-retriever.md`.

- **Input:** `project_id`, `milestone_id`, `gitlab_base_url`, list of IIDs from `get_milestone_issue`.
- **Tools (frs-retriever only):** `get_issue`, `list_issue_links`.
- **Parallel:** ≥3 issues → parallel fetch.
- **Returns:** envelope per issue — `iid`, `title`, `source_type`, `monolith_signals`, `halt_flag`, `open_questions`, `body_text` (inline), `section_catalog`.

### Phase 2.5: Open-Questions Gate

If any non-halted issue has `open_questions` non-empty, halt before normalization and `AskUserQuestion`:

> FRS issues have N unresolved open question(s). Resolving these first typically avoids conflicts downstream. How do you want to proceed?

Options: `resolve-first` (pause, return to FRS editing), `continue-anyway` (proceed; unresolved questions surface in Open Blockers as `high`), `pause`.

On `resolve-first` or `pause`: stop. On `continue-anyway`: record questions with source URLs for Phase 8 and Phase 10.

### Phase 3: Normalization (`clause-normalizer`)

See `agents/clause-normalizer.md`. **No GitLab MCP access.**

- **Input:** non-halted issues (`body_text` and `section_catalog` from envelope), naming hints, `tenancy_model`.
- **Returns:** structured clauses with `source_section_heading`, `source_anchor`, classification.

**Classification:** `ddd-mapped` (maps to a DDD/ABP category), `ui-integration` (UI-API contract concern — screen→endpoint, field mapping, loading/error backend requirement), `excluded` (pure visual detail, wiki meta, sprint ritual).

Atomicity: one clause per distinct requirement intent — never merge multiple clauses into one narrative.

### Phase 4: Context Resolution (main)

1. Apply naming hints; do not alter clause intent.
2. **Tenancy:** `tenancy_model` defined → use it, annotate Entities. Absent AND both `TenantId` + `EntityId` in clauses → Conflict `scoping_ambiguity`, severity `high`. Absent AND only `TenantId` → assign `IMultiTenant` normally.
3. CLAUDE.md contradicting FRS → Conflict; FRS meaning wins.

### Phase 5: Module Classification (main)

1. Group clauses by business capability, aggregate boundary, integration area.
2. Business-capability grouping, **not** UI-page.
3. Tag cross-cutting concerns. Detect duplicate/overlapping intent.
4. Every `ddd-mapped` and `ui-integration` clause belongs to a named module.
5. **Record module count** for Phase 7 parallel dispatch decision.

### Phase 6: Clause-to-Category Mapping (`clause-mapper`)

See `agents/clause-mapper.md`. **No GitLab MCP access.** `intended_nodes` is a **prior, not a filter**.

| If the clause… | Primary category |
|---|---|
| Identifies a participant | Actor |
| Describes persistent identity/lifecycle | Entity |
| Describes an immutable value structure | Value Object |
| Expresses a write action | Command |
| Retrieves data with no side effects | Query |
| Defines an ordered multi-step process | Flow |
| Constrains lifecycle transitions | State |
| Records an approach with trade-offs | Decision |
| Binds to an external system / ABP infra | Integration |
| Expresses topology or patterns | Architecture Blueprint |
| Is ambiguous or contradictory | Conflict |
| Concerns UI-API contract | UI-API Integration Points |
| Pure visual detail | exclusion ledger |

Queries are a distinct node type — never group under Commands. `System` actor permitted only when named as background job / scheduled task / event handler. Unmapped count must reach zero.

### Phase 7: DDD/ABP Synthesis (`ddd-synthesizer`)

See `agents/ddd-synthesizer.md`. **No GitLab MCP access.**

> Parallel by module when ≥2 modules. Single pass when 1 module (preserves Entity↔Command↔Query↔State consistency).

- **Input per worker:** module's clauses + Conflicts, all reference files, ABP catalogs, CLAUDE.md contract. (`body_text` not needed — clause text is sufficient.)
- **Returns per worker:** envelope with node entries + partial Permissions Map + partial ABP Artifact Map + naming index.

Sub-agent enforces: ABP built-in check before Entity creation; base class per `references/abp-base-classes.md`; interfaces per tenancy + `ISoftDelete` / `IHasConcurrencyStamp`; domain events as `Required` or `Optional / future integration hook`; Commands with DTO inputs (PascalCase), `**Validation:**` referencing `<CommandName>InputValidator` per `validation_library`, domain events, `**Audience:**` if Public/Private declared; Queries with filter inputs, default sort per `sorting_strategy`, `PagedAndSortedResultRequestDto`, `PagedResultDto<TDto>` output, authorization, scoping, `**Audience:**`; Permissions Map rows per Actor + Command/Query, pattern per `permissions_class`; ABP Artifact Map across all six layers, namespaces from `project_root_namespace`, table prefix from `db_table_prefix`; `**Source:**` field on every entry with GitLab section-anchor links; Conflict filenames as title slugs.

**Rejoin (main):** concat per-node-type lists, merge Permissions Map and ABP Artifact Map, build combined naming index, detect cross-module collisions → Conflict + targeted repair if any.

### Phase 8: Assembly (main)

See `templates/feat-spec-template.md`.

**Section order:**

1. Feature Title
2. Feature Overview
3. Open Blockers (only if critical/high Conflicts)
4. Related FRS
5. Bounded Context and Affected Layers (references CLAUDE.md for full ABP layout — do not duplicate it)
6. Domain Layer Design
7. Application Layer Design (Commands, Queries, DTOs, Validators, Mappers)
8. Infrastructure and Persistence Design
9. HTTP API Design (Public/Private routing per CLAUDE.md)
10. Permissions, Security, and Multi-Tenancy
11. Integration, Background Jobs, and Distributed Events
12. UI-API Integration Points (only if `ui-integration` clauses exist)
13. Error Handling, Auditing, and Logging
14. Performance and Scalability
15. Deployment Considerations
16. Open Questions and Future Enhancements

All rendered links use `wiki_url` (no `.md`, no `wiki_local_path` prefix).

**UI-API Integration Points (Section 12)** — included only when `ui-integration` clauses exist. The UI prototype is the source of truth for visual design; this section documents what the backend must deliver. Sub-sections: screen-to-endpoint map; DTO field deviations (e.g., UI shows composed "display name", backend exposes `FirstName` + `LastName`); loading/error state backend requirements (pagination, polling intervals, partial responses — not visual rendering); gap analysis (data UI needs that no Command/Query produces — each becomes a Conflict `missing_query` or `missing_command`); prototype reference link. Excludes pure visual specs (colors, icons, toasts) and UI-internal routing.

### Phase 9: Validation (`feat-spec-validator`)

See `agents/feat-spec-validator.md`.

- **Input:** assembled Feat Spec + DDD entries + merged Permissions Map + merged ABP Artifact Map + UI-API Integration Points + CLAUDE.md contract + expected file paths.
- **Returns:** `{passed, defects, defect_count_by_severity, readiness}`.

Check categories: structural / content purity / ABP compliance / project convention compliance / section completeness / byte-length floors / required-field presence / UI-API Integration Points / wiki link format / Source field format / Conflict filename slug compliance / coord issue body / FRS integrity.

On `passed: false`: dispatch `ddd-synthesizer` in repair mode (targeted). Loop until passed.

### Phase 10: Preview Gate (main)

1. Present assembled Feat Spec preview.
2. Highlight blocking Conflicts.
3. List halted issues + split suggestions.
4. Show validation summary.
5. List CLAUDE.md convention defaults used.
6. If user chose `continue-anyway` in Phase 2.5, list all unresolved open questions in Open Blockers — each with severity `high` and FRS deep link.
7. `AskUserQuestion`:

```
Approve this preview for formal publication?

  approve  — write wiki files, create coord issue, link FRS
  revise   — revision loop; provide feedback
  defer    — keep preview only; no side effects
```

### Phase 11: Publish (post-approval only)

**Order is mandatory: wiki files first, then GitLab.**

1. **Write DDD node files** to `<wiki_local_path>/<node-type>/<NodeName>.md`:

   | Node type | Folder | Filename rule |
   |---|---|---|
   | Actor | `actors/` | PascalCase node name |
   | Entity | `entities/` | PascalCase node name |
   | Value Object | `value-objects/` | PascalCase node name |
   | Command | `commands/` | PascalCase node name |
   | Query | `queries/` | PascalCase node name |
   | Flow | `flows/` | PascalCase node name |
   | State | `states/` | PascalCase node name |
   | Decision | `decisions/` | PascalCase node name |
   | Integration | `integrations/` | PascalCase node name |
   | Architecture Blueprint | `architecture-blueprints/` | PascalCase node name |
   | **Conflict** | `conflicts/` | **title-derived slug (never internal ID)** |

2. **Write Feat Spec** to `<wiki_local_path>/feat-specs/<slug>/feat-spec.md`.
3. **Dispatch `docs-writer` in parallel batches** if >5 files.
4. **Verify all expected files exist on disk.** Missing → abort before any GitLab side effect.
5. **Duplicate check:** `list_issues(project_id, milestone_id)`; match by title. If match, `AskUserQuestion`.
6. **Create coordination issue** per `templates/coord-issue-template.md`. Title: `[FEAT] <Milestone> — <Title>`. Body: summary + canonical wiki URL + FRS IIDs + Open Blockers (critical/high only).
7. **Link FRS issues:** for each FRS, `list_issue_links`; existing link → skip; otherwise `create_issue_link(project_id, frs_iid, feat_spec_iid, link_type="relates_to")`.
8. **Never `update_issue` on FRS.**
9. Conflicts recorded using title-slug filenames.
10. Verify end-state; report failures; stop on any failure.

---

## Handling Outcomes

| Outcome | Action |
|---|---|
| **PREVIEWABLE** | Proceed to Phase 10. |
| **NEEDS_REPAIR** | Targeted re-synthesis; re-validate. |
| **MILESTONE_NOT_FOUND** | Stop. `list_milestones` + `AskUserQuestion`. |
| **EMPTY_MILESTONE** | Stop. Empty-scope report. |
| **ALL_ISSUES_HALTED** | Stop. List halted + splits. |
| **MONOLITH_DETECTED (partial)** | Continue non-halted; surface halted. |
| **CONFLICT_ESCALATION** | Promote to Conflicts; surface in Open Blockers. |
| **NAMING_COLLISION_ACROSS_MODULES** | Targeted repair on affected modules. |
| **USER_REVISION_REQUESTED** | Collect feedback; return to Phase 7 or 8. |
| **APPROVAL_DEFERRED** | No side effects. |
| **WIKI_WRITE_FAILED** | Abort before GitLab side effects. |
| **SUB_AGENT_INTERRUPTED** | Emit failure; `AskUserQuestion` retry / skip / cancel. Never silently stop. |
| **BLOCKED** | Do not retry without changing something. |

---

## Sub-agent Contracts Summary

| Sub-agent | Phase | Model | Parallel? | GitLab MCP? | Contract |
|---|---|---|---|---|---|
| `frs-retriever` | 2 | Haiku | Yes — per issue | Yes (`get_issue`, `list_issue_links` only) | `agents/frs-retriever.md` |
| `clause-normalizer` | 3 | Sonnet | No | **No** | `agents/clause-normalizer.md` |
| `clause-mapper` | 6 | Sonnet | No | **No** | `agents/clause-mapper.md` |
| `ddd-synthesizer` | 7 + repair | Opus or Sonnet | Yes — per module | **No** | `agents/ddd-synthesizer.md` |
| `feat-spec-validator` | 9 | Haiku | No | **No** | `agents/feat-spec-validator.md` |
| `docs-writer` | 11 | Haiku | Yes — per batch | **No** | `agents/docs-writer.md` |

---

## Wiki Folder Structure

Default `wiki_local_path` is `docs`; override via CLAUDE.md.

```
<wiki_local_path>/
  actors/
  entities/
  value-objects/
  commands/
  queries/
  flows/
  states/
  decisions/
  integrations/
  architecture-blueprints/
  conflicts/
    <title-slug>.md          # e.g. tenant-vs-entity-scoping-ambiguity.md — NOT conflict-01.md
  feat-specs/
    <slug>/
      feat-spec.md
```

Rendered links use `wiki_url` with no `.md` and no prefix.

---

## Integration

**Required before:** GitLab MCP active; CLAUDE.md with required fields; milestone name/ID.

**Delegates to:** `frs-retriever`, `clause-normalizer`, `clause-mapper`, `ddd-synthesizer`, `feat-spec-validator`, `docs-writer`.

**Required after:** User approval before Phase 11 writes.

**Alternative:** If FRS isn't in GitLab, resolve source before invoking.

---

## Reference Files

| Category | File |
|---|---|
| Actors | `references/actors.md` |
| Entities | `references/entities.md` |
| Value Objects | `references/value-objects.md` |
| Commands | `references/commands.md` |
| Queries | `references/queries.md` |
| Flows | `references/flows.md` |
| States | `references/states.md` |
| Decisions | `references/decisions.md` |
| Integrations | `references/integrations.md` |
| Architecture Blueprints | `references/architecture-blueprints.md` |
| Conflicts | `references/conflicts.md` |
| ABP base classes | `references/abp-base-classes.md` |
| ABP built-in entities | `references/abp-built-in-entities.md` |
| Feat Spec template | `templates/feat-spec-template.md` |
| Coord issue template | `templates/coord-issue-template.md` |

## Sub-agent Files

| Sub-agent | File |
|---|---|
| FRS retriever | `agents/frs-retriever.md` |
| Clause normalizer | `agents/clause-normalizer.md` |
| Clause mapper | `agents/clause-mapper.md` |
| DDD synthesizer | `agents/ddd-synthesizer.md` |
| Feat Spec validator | `agents/feat-spec-validator.md` |
| Docs writer | `agents/docs-writer.md` |

---

## Next Step

After completing this skill:

→ Fully expanded DDD node pages exist under `<wiki_local_path>/<node-type>/`.
→ ABP-layered Feat Spec exists at `<wiki_local_path>/feat-specs/<slug>/feat-spec.md`, linking into every node page via `wiki_url`.
→ A short coordination issue exists in GitLab pointing at the wiki Feat Spec and listing linked FRS IIDs via `relates_to`.
→ All FRS source issues unmodified.
→ All open Conflicts recorded using title-slug filenames; critical/high surfaced in Open Blockers.
→ Monolith-detected issues listed with splits.
→ UI-integration clauses captured in the UI-API Integration Points section.
→ Every `**Source:**` field uses GitLab section-anchor deep links.
→ Every phase emitted a status announcement.
