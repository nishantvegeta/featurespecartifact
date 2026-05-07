---
name: generate-feat-spec
description: "Generate a high-level technical Feature Specification (Feat Spec) from Functional Requirement Specification (FRS) issues in a GitLab milestone. Produces an ABP-layered spec in the wiki and a lightweight coordination issue in GitLab."
when_to_use: "When analyzing requirements, designing domain models, or creating technical specifications from FRS documents"
argument-hint: "[milestone-name] or [project-path]"
disable-model-invocation: true
model: "sonnet"
---

# Generate Feat Spec

**Announce at start:** "I'm using the generate-feat-spec skill to produce a high-level ABP/DDD Feature Specification from the GitLab milestone FRS issues. I'll write the spec and supporting DDD node pages to the wiki repo first, then create a short coordination issue in GitLab that links to them."

**Orchestrator model:** Sonnet. Phase 10.5 manifest validation, envelope identity checks (`consumes_phase_id` / `consumes_secondary_phase_ids`), and the post-write tree walk in Phase 11 all exceeded haiku's reliable execution range in captured runs. Sonnet is required for the orchestrator; sub-agent model assignments (some still Haiku) are documented in the Sub-agent Contracts Summary.

---

## Hard Rules

<HARD-GATE>
- **PATH CONTRACT compliance is non-negotiable.** Every computed file path and rendered wiki link is governed by `references/path-contract.md`. Paths matching the Forbidden regex (F1–F5) or rendered links matching L1–L3 are rejected at four checkpoints: `feat-spec-validator` (Phase 9), main agent's Path Manifest (Phase 10.5), `docs-writer` step 0 (Phase 11 pre-write), and main agent's post-write tree walk (Phase 11) using the validator's `path_regex_set`. No exceptions.
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
- **Opaque clause IDs (`#cN`) never appear in published output.** Use GitLab section anchor URLs.
- **Conflict references in the assembled Feat Spec body and in any DDD node's prose use the title-slug wiki link `[<title>](<wiki_url>/conflicts/<title-slug>)`. Internal IDs like `CONFLICT-NN` MUST NOT appear in any published file — neither in body Markdown nor in YAML frontmatter (the frontmatter `id` is the title slug per `docs-writer.md` step 1).** Filenames are derived from the title slug, never from the internal identifier (see `references/path-contract.md` rule F4).
- **Synthesis honors every CLAUDE.md convention.** Deviations require a Decision node.
- **Tool ownership is exclusive** (see MCP Tool Ownership table). The main agent MUST NOT call `get_issue` or `list_issue_links`. `clause-normalizer`, `clause-mapper`, `ddd-synthesizer`, `feat-spec-validator`, and `docs-writer` MUST NOT call any GitLab MCP tool.
- **Never ask questions as prose.** Always use `AskUserQuestion`. If unavailable, fall back to prose prefixed with "⚠ AskUserQuestion unavailable — asking as prose:". Never silently stop.

### Phase identity & dispatch

- **Phase status announcements are required** before and after every phase. Sub-agent failures must surface a user-facing message and invoke `AskUserQuestion`.
- **Phase identity is exact.** Before dispatching any phase, emit the phase number, name, and sub-agent name verbatim from the Quick Reference table — no merging, renaming, renumbering, or skipping. This applies to every phase including the main-agent phases (0, 1, 2.5, 4, 5, 8, 10, 10.5, 11); in particular Phases 4 and 5 MUST emit their `→ Phase 4: ...` / `→ Phase 5: ...` headers even when their work is light.
- **Sub-agent allowlist is closed.** Only the six sub-agents in the Sub-agent Contracts table may be dispatched: `frs-retriever`, `clause-normalizer`, `clause-mapper`, `ddd-synthesizer`, `feat-spec-validator`, `docs-writer`. Any other name (e.g. `clause-processor`) is forbidden.
- **One sub-agent per phase, no exceptions.** In Phases 2, 3, 6, 7, 9, and 11, the main agent MUST dispatch exactly the named sub-agent for that phase.
- **No multi-phase mega-dispatches.** Generic `Agent(...)` invocations whose `description` or `subagent_type` covers more than one phase (e.g., `"Full pipeline: FRS → normalize → map → synthesize → assemble"`, `"Phase 2-9"`) are forbidden.
- **`subagent_type` must match the phase being announced.** The dispatched `subagent_type` must be one of `{frs-retriever, clause-normalizer, clause-mapper, ddd-synthesizer, feat-spec-validator, docs-writer}` and must match the phase named in the preamble.
- **Phase envelopes carry phase identity.** Every sub-agent envelope (input AND output) carries `phase_id` (e.g., `"phase-2"`) and `produced_by` (the sub-agent name). The next phase's input MUST cite the prior phase's `phase_id`. A sub-agent that does not see the expected `phase_id` in its input HALTS and `AskUserQuestion`s. This makes phase-skipping mechanically detectable.

### Other

- **No VCS fallback.** If GitLab MCP fails or returns an error, halt and `AskUserQuestion` with options `retry` / `cancel`. Never substitute GitHub, Bitbucket, or any other VCS. Never write the coordination issue to a different system than the FRS source.
</HARD-GATE>

> **Implementation note (forensic affordance, not a hard-gate rule):** if the runtime cannot enforce `subagent_type` directly, the agent's prompt SHOULD open with `Acting as <sub-agent-name> for Phase <N>` so the contract is auditable in logs. The actual halt for phase-skipping is the `consumes_phase_id` mismatch check in the Phase Envelope Contract; the audit prefix is purely diagnostic and is not enforced by any of the four checkpoints.

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

**`wiki_local_path` normalization** — strip leading and trailing slashes from the value before use. Reject absolute paths (values starting with `/`, `\`, or a drive letter such as `C:\docs`); the path is always relative to the project root. A literal `/docs` becomes `docs`; a literal `C:\docs` halts Phase 1 with `AskUserQuestion`.

**Public/Private AppService split** — when `api_routing_conventions` declares `public_prefix` and `private_prefix`, every Command and Query is tagged `**Audience:** Public | Private` based on the invoking Actor, and route generation uses the appropriate prefix.

If CLAUDE.md does not declare an optional convention, Phase 1 emits a one-time soft warning listing the defaults being used.

---

## Wiki Link Format

The wiki's path on disk (`wiki_local_path`) is separate from its published URL (`wiki_url`). All path and link rules — including the disallowed forms — live in **`references/path-contract.md`** (sections 1–3). Read it once at Phase 1; consult it whenever you compute a path or render a link.

Quick recap of the four link contexts:

| Context | Link format |
|---|---|
| Feat Spec → DDD node page | `[<node name>](<wiki_url>/<node-type>/<NodeName>)` |
| Feat Spec → another feat spec | `[<title>](<wiki_url>/feat-specs/<slug>/feat-spec)` |
| Coord issue → Feat Spec | `[feat-spec](<wiki_url>/feat-specs/<slug>/feat-spec)` |
| DDD node → related node | `[<related node>](<wiki_url>/<node-type>/<RelatedName>)` |

For the precise grammar, the Forbidden regex (F1–F5, L1–L3), and worked examples, see `references/path-contract.md`.

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

Conflict nodes use a **title-derived slug** for filenames and rendered wiki links. Internal identifiers (e.g. `CONFLICT-01`) MUST NOT appear in any published file — neither in body Markdown nor in YAML frontmatter (the frontmatter `id` is the title slug per `agents/docs-writer.md` step 1).

Slug rule: see `<title-slug>` definition in `references/path-contract.md` § 1 (canonical).

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
| 10.5 | Path Manifest gate (validate every computed path against `path-contract.md`) | main | — | **Halt on any F1–F5 / L1–L3 violation** |
| 11 | Write wiki files, create coord issue, link FRS | `docs-writer` (sole writer) + main (GitLab only) | Yes — file writes | Post-approval only; wiki first |

---

## Parallel Dispatch

Each worker receives a focused input envelope; do not forward full session context. Per-worker schemas are in `agents/<sub-agent>.md`.

**Phase 2 — `frs-retriever` parallel fetches.** If milestone has ≥3 issues, dispatch parallel `get_issue` calls (plus their linked issues); sequential otherwise. One issue IID + linked issues per worker. Parallel-safe: `get_issue` is read-only and issues are independent.

**Phase 7 — `ddd-synthesizer` parallel by module.** If Phase 5 produced ≥2 modules, dispatch one synthesizer per module; single pass otherwise. Each worker gets one module's clause mappings + Conflicts, all reference files, ABP catalogs, CLAUDE.md contract. Parallel-safe: aggregate boundaries don't cross modules; cross-module references resolve at assembly.

**Phase 11 — `docs-writer` parallel file writes.** Parallel batches when >5 files. Each worker gets a batch of `{filepath, content}`; returns a write manifest. Parallel-safe: paths are pre-computed and non-overlapping.

**Not parallelized** — `clause-normalizer` (shares exclusion ledger and naming state), `clause-mapper` (needs consistent view of all clauses for contradiction detection), `feat-spec-validator` (runs once against the assembled whole), repair loop (surgical, serial).

---

## Per-Phase Preamble (mandatory)

Before any work in Phase N, emit exactly one announcement line of the form:

```
→ Phase N: <name from Quick Reference> — dispatching <sub-agent name from Sub-agent Contracts, or 'main agent' for Phases 0, 1, 2.5, 4, 5, 8, 10, 11>...
```

The phase number, name, and sub-agent name MUST be copied verbatim from the Quick Reference and Sub-agent Contracts tables. If any of the three placeholders cannot be filled in verbatim from those tables, halt and `AskUserQuestion` rather than improvise. Do not collapse adjacent phases into a single announcement; do not rename phases; do not invent sub-agent names.

After completion, emit:

```
✓ Phase N complete. <brief result>
```

This applies to every phase including the main-agent phases (0, 1, 2.5, 4, 5, 8, 10, 10.5, 11) and the repair loop.

---

## Phase Envelope Contract

Every sub-agent input AND output envelope carries identity fields. They make phase-skipping mechanically detectable and let the validator verify lineage.

### Envelope identity fields

| Field | Type | Set by | Purpose |
|---|---|---|---|
| `phase_id` | string, e.g., `"phase-2"`, `"phase-7-repair-1"` | dispatcher (main agent) on input; sub-agent echoes on output | Identifies which phase produced the envelope |
| `produced_by` | string, e.g., `"frs-retriever"` | sub-agent on output | Identifies which sub-agent ran |
| `consumes_phase_id` | string (the prior phase's `phase_id`) or `null` | dispatcher on input | Cites the **primary** upstream envelope this phase depends on |
| `consumes_secondary_phase_ids` | array of strings, or `[]` | dispatcher on input | Cites any **additional** upstream envelopes (e.g., Phase 6 needs phase-3 clause text alongside phase-5 module assignments). Empty array when no secondary upstream exists. |

### Per-phase canonical `phase_id` values

| Phase | `phase_id` | Sub-agent (or `main`) | `consumes_phase_id` (primary) | `consumes_secondary_phase_ids` |
|---|---|---|---|---|
| 0 | `phase-0` | main | — | `[]` |
| 1 | `phase-1` | main | `phase-0` | `[]` |
| 2 | `phase-2` | `frs-retriever` | `phase-1` | `[]` |
| 2.5 | `phase-2.5` | main | `phase-2` | `[]` |
| 3 | `phase-3` | `clause-normalizer` | `phase-2` | `[]` |
| 4 | `phase-4` | main | `phase-3` | `[]` |
| 5 | `phase-5` | main | `phase-4` | `[]` |
| 6 | `phase-6` | `clause-mapper` | `phase-5` | `["phase-3"]` (clause text) |
| 7 | `phase-7` | `ddd-synthesizer` | `phase-6` | `[]` |
| 7-repair-N | `phase-7-repair-<N>` | `ddd-synthesizer` (repair mode) | `phase-9` | `["phase-7"]` (prior synthesis envelope) |
| 8 | `phase-8` | main | `phase-7` | `[]` |
| 9 | `phase-9` | `feat-spec-validator` | `phase-8` | `[]` |
| 10 | `phase-10` | main | `phase-9` | `[]` |
| 10.5 | `phase-10.5` | main | `phase-9` (validator's published `path_regex_set` + `link_regex_set`) | `["phase-7"]` (file paths derived from synthesizer's `node_entries`) |
| 11 | `phase-11` | `docs-writer` (writes) + main (GitLab) | `phase-10.5` | `[]` |

A sub-agent that expects a non-empty `consumes_secondary_phase_ids` MUST verify each listed phase is present (per envelope's `phase_id` field), and HALT per the rule below if any is missing or wrong.

> **Phase ID note (deferred):** the fractional `phase-10.5` ID is a deliberate choice to avoid disrupting external references that already cite phase numbers (e.g., the `phase-7-repair-<N>` envelope's `consumes_phase_id: "phase-9"`). Integer-only IDs would be friendlier to tooling that parses phase numbers as integers; a future major version may renumber (`phase-10` → `phase-11`, current `phase-10.5` → `phase-11`, current `phase-11` → `phase-12`). Until then, treat `phase-10.5` as an opaque string identifier.

### Main-agent envelope shape

Main-agent phases (0, 1, 2.5, 4, 5, 8, 10, 10.5) do not invoke a sub-agent, but they still produce envelopes for downstream verification. The shape is:

```
{
  "phase_id": "phase-<N>",
  "produced_by": "main",
  "consumes_phase_id": "<prior>",
  "consumes_secondary_phase_ids": [],
  ...payload specific to the phase
}
```

For example, Phase 10.5's envelope contains the cleaned Path Manifest and is the immediate upstream for `docs-writer` (`consumes_phase_id: "phase-10.5"`). Sub-agents check the upstream phase regardless of whether `produced_by` is `"main"` or a sub-agent name.

### Halt rule

If a sub-agent's input does NOT contain the expected `consumes_phase_id` (e.g., `clause-normalizer` is dispatched without a `phase_id: "phase-2"` envelope from `frs-retriever`), OR if any required entry from `consumes_secondary_phase_ids` is missing/wrong (e.g., `clause-mapper` invoked without `"phase-3"` in the secondary list), the sub-agent HALTS and returns:

```
{
  "phase_id": "<expected phase_id>",
  "produced_by": "<self>",
  "halted": true,
  "halt_reason": "missing upstream envelope: expected consumes_phase_id=<phase> [+ secondary=<phases>], got <actual>"
}
```

The main agent surfaces this to the user via `AskUserQuestion(retry / cancel)`. **Phase-skipping is not silently permitted.**

This rule defeats the "single mega-agent does Phases 2–9 in one shot" failure mode observed in production runs.

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

On `passed: false`: dispatch `ddd-synthesizer` in repair mode (targeted). After `phase-7-repair-<N>` completes, the main agent re-runs Phase 8 (assembly) to produce a fresh `phase-8` envelope, then re-dispatches `feat-spec-validator`. The validator's `consumes_phase_id` halt rule is unaffected — it always expects `phase-8`. Loop until passed.

### Phase 10: Preview Gate (main)

1. Present assembled Feat Spec preview.
2. Highlight blocking Conflicts.
3. List halted issues + split suggestions.
4. Show validation summary.
5. List CLAUDE.md convention defaults used.
6. **Render the Path Manifest inline** (the same manifest that will be re-validated mechanically in Phase 10.5). Show one row per file the pipeline plans to write, marking each as `✓ allowed` or `✗ rejected by <rule>`. The user can see at a glance whether any path is non-compliant.
7. If user chose `continue-anyway` in Phase 2.5, list all unresolved open questions in Open Blockers — each with severity `high` and FRS deep link.
8. `AskUserQuestion`. **The available options depend on the manifest:**

   - **Manifest is fully `✓ allowed`** (no F1–F5 hits and no L1–L3 hits):
     ```
     Approve this preview for formal publication?

       approve  — write wiki files, create coord issue, link FRS
       revise   — revision loop; provide feedback
       defer    — keep preview only; no side effects
     ```
   - **Manifest contains any `✗ rejected by <rule>` row**: the `approve` option is REMOVED. The question becomes:
     ```
     Path Manifest is non-compliant. Approval is blocked.

       revise   — return to Phase 7 to regenerate the rejected paths
       defer    — keep preview only; no side effects
     ```

   This prevents users from approving a publish that Phase 10.5 will then reject — single point of decision.

### Phase 10.5: Path Manifest Gate (main)

Runs **after** the user approves Phase 10 and **before** any sub-agent dispatch in Phase 11. This is a mechanical, non-interactive gate — it does not call `AskUserQuestion` on success.

**Shared regex set.** Phase 10.5 MUST consume the `link_regex_set` and `path_regex_set` exposed on the Phase 9 (`feat-spec-validator`) output envelope verbatim. It MUST NOT independently re-compile `path-contract.md`'s patterns; that would let the validator and gate drift. If those sets are missing on the upstream envelope, halt and `AskUserQuestion(retry / cancel)` — `retry` re-dispatches `feat-spec-validator`; this is a contract bug in the validator and SHOULD be fixed there rather than worked around here.

1. Build the full manifest of files the pipeline intends to write. For each `node_entries` entry from the synthesizer envelope, compute the target `filepath` per `references/path-contract.md` § 1. Add the Feat Spec's `feat-specs/<slug>/feat-spec.md` entry.
2. Validate every computed `filepath` against `path_regex_set` (F1–F5) from the validator envelope.
3. Validate every rendered wiki link in the assembled Feat Spec body against `link_regex_set` (L1–L3) from the validator envelope.
4. Emit the manifest:
   ```
   → Phase 10.5: Path Manifest — main agent
   Path Manifest (N files):
     ✓ docs/entities/ChecklistItem.md
     ✓ docs/commands/CreateChecklistItem.md
     ...
   Rendered links: M checked, all compliant.
   ✓ Phase 10.5 complete. Proceeding to Phase 11.
   ```
5. **On any F1–F5 violation**: emit `⚠ Phase 10.5 — N path violation(s):` followed by per-violation lines `<filepath>  ← rejected by F<n>`. Then halt and `AskUserQuestion`:
   ```
   Path Manifest contains N forbidden path(s). Phase 11 cannot proceed.

     revise   — return to Phase 7 to regenerate node filepaths
     cancel   — stop the pipeline; nothing is written
   ```
   On `revise`: re-dispatch `ddd-synthesizer` in repair mode with `repair_targets` = the rejected files. **Repair loop cap: 3 cycles.** If the manifest is still non-compliant after the third repair cycle, emit the full failing manifest verbatim to chat (one line per file, with the offending rule for each) and halt with no side effects — Phase 11 is NOT entered. The user has the manifest in chat for forensics; nothing is written to disk.
6. **On any L1–L3 violation**: re-dispatch `feat-spec-validator` repair loop targeting the assembled spec body — wiki link defects are content defects, not file-system defects. Same 3-cycle cap as the path repair loop above; on exhaustion, emit the failing links verbatim to chat and halt with no side effects.
7. The cleaned manifest is passed verbatim to `docs-writer` as the authoritative file list.

**Why this phase exists:** the same nested-path violation occurred in 3/3 captured runs, despite the rule being stated in `path-contract.md`. Phase 10.5 is the mechanical checkpoint — `docs-writer` re-validates each path on receipt as a defense-in-depth measure, but the user-visible halt happens here.

### Phase 11: Publish (post-approval only)

**Order is mandatory: wiki files first, then GitLab.**

1. **Dispatch `docs-writer` with the cleaned Path Manifest from Phase 10.5.** All DDD node files and the Feat Spec are written by `docs-writer` only. `docs-writer` MUST re-validate each `filepath` against `path-contract.md` § 2 (F1–F5) and refuse any non-compliant write. Direct calls to `Write`, `Edit`, `serena`, `Bash` (mkdir/cp/cat/python/echo/heredoc), or any other file-write surface are forbidden in Phase 11 — including indirect file writes via generic `Agent(...)` dispatches that do not name `docs-writer` as their `subagent_type`.
2. Conflict filenames use the title-derived slug per `path-contract.md` § 2 rule F4 (never internal IDs).
3. **Verify all expected files exist on disk:** DDD node files at `<wiki_local_path>/<node-type>/<NodeName>.md` (sibling layout) and the Feat Spec at `<wiki_local_path>/feat-specs/<slug>/feat-spec.md`. Missing or unexpected location → abort before any GitLab side effect.
4. **Post-write path audit (defense-in-depth, main agent):** walk the on-disk tree under `<wiki_local_path>` and assert no file exists at a forbidden location, using the `path_regex_set` exposed on the Phase 9 envelope (F1–F5). Any hit → halt; report; do not proceed to GitLab.
5. **Duplicate check:** `list_issues(project_id, milestone_id)`; match by title. If match, `AskUserQuestion`.
6. **Create coordination issue** per `templates/coord-issue-template.md`. Title: `[FEAT] <Milestone> — <Title>`. Body: summary + canonical wiki URL + FRS IIDs + Open Blockers (critical/high only).
7. **Link FRS issues:** for each FRS, `list_issue_links`; existing link → skip; otherwise `create_issue_link(project_id, frs_iid, feat_spec_iid, link_type="relates_to")`. The skill's final summary MUST list each `create_issue_link` call (or `skipped — already linked`) per FRS — generic phrasing like "FRS references documented" is non-compliant.
8. **Never `update_issue` on FRS.**
9. Verify end-state; report failures; stop on any failure.

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
| **PATH_MANIFEST_VIOLATION** | Phase 10.5 found F1–F5 hits. `AskUserQuestion(revise / cancel)`. On `revise`, re-dispatch `ddd-synthesizer` repair-mode against rejected files. |
| **PATH_RENDERED_LINK_VIOLATION** | Phase 10.5 found L1–L3 hits in the assembled spec. Re-dispatch `feat-spec-validator` repair loop. |
| **PHASE_ENVELOPE_MISSING** | Sub-agent received an input with wrong/missing `consumes_phase_id`. Halt; surface to user; the dispatcher likely tried to skip a phase. |
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
| `docs-writer` | 11 | Sonnet | Yes — per batch | **No** | `agents/docs-writer.md` |

---

## Wiki Folder Structure

Default `wiki_local_path` is `docs`; override via CLAUDE.md. The full structure, the disallowed layouts, and the rationale (nodes are reusable across features) all live in `references/path-contract.md` § 4–5. The skill does not duplicate them here.

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
| **PATH CONTRACT (canonical)** | **`references/path-contract.md`** |
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
