# Sub-agent Contract: `feat-spec-validator`

## Purpose

Run the full validation checklist against the assembled Feat Spec, DDD node entries, merged Permissions Map, merged ABP Artifact Map, and UI-API Integration Points. Return structured defects for either preview approval or targeted repair.

## Model

Haiku. Checklist application is mechanical.

## Tools

None.

## Input

```
{
  "feat_spec_markdown": "<assembled Feat Spec from Phase 8>",
  "node_entries": { ... full envelope from ddd-synthesizer ... },
  "permissions_map": [ ... merged ... ],
  "abp_artifact_map": { ... merged ... },
  "ui_api_integration_points": {
    "screen_to_endpoint_map": [ ... ],
    "dto_field_deviations": [ ... ],
    "loading_error_backend_requirements": [ ... ],
    "gap_analysis": [ ... ],
    "prototype_reference": "<url or null>"
  } | null,
  "clauses_routed_to_ui_integration": [ ... ],
  "conflicts": [ ... ],
  "halted_issues": [ ... ],
  "tenancy_model": "<resolved>",
  "claude_md_conventions": { ... convention contract ... },
  "wiki_url": "<base URL>",
  "wiki_local_path": "<disk path>",
  "expected_file_paths": [
    "<wiki_local_path>/entities/Foo.md",
    "<wiki_local_path>/commands/CreateFoo.md",
    ...
  ],
  "coordination_issue_body": "<planned body>"
}
```

## Responsibility

Run every check below. For each failure, emit a defect with `severity` and a specific `repair_hint`.

### Structural checks

| Check | Severity |
|---|---|
| Every expected file path appears in `node_entries` | critical |
| Unmapped `ddd-mapped` clause count = 0 | critical |
| Every `clauses_routed_to_ui_integration` clause appears in `ui_api_integration_points` | high |
| Every Conflict in `conflicts` has a corresponding page entry | high |
| Halted issues listed in Related FRS section 3 | medium |

### Content purity checks

| Check | Severity |
|---|---|
| No code fences (``` or ~~~) anywhere, except Mermaid in Architecture Blueprints | critical |
| No `public class`, `public record`, or colon-inheritance syntax | critical |
| No `{ ... }` block bodies | critical |
| No YAML frontmatter (`---`) inside DDD node entries | high |
| No YAML-style key-value blocks (vs bold-label fields) | medium |
| No wiki inbound references in clause text | medium |

### ABP compliance checks

| Check | Severity |
|---|---|
| No Entity name matches an ABP built-in concept (User, Tenant, Role, OrganizationUnit, Permission, Feature, Setting, AuditLog, BackgroundJob, Blob) | critical |
| Every Entity cites `**Base class:**` from `abp-base-classes.md` | critical |
| Every Entity with `ISoftDelete` has a delete/archive use case OR CLAUDE.md declares the convention | high |
| Every Entity's `**Multi-tenancy:**` field populated per tenancy_model or marked `blocked by Conflict-NN` | critical |
| Every Command has Input DTO fields table with PascalCase | critical |
| Every Command has `**Preconditions:**` and `**Postconditions:**` | critical |
| Every Command has `**Domain events raised:**` field (even if "none") | high |
| Every Query has `**Input DTO base:**` (default or explicit deviation) | critical |
| Every Query has `**Output wrapper:**` | critical |
| Every Query has `**Default sort:**`, `**Filters supported:**`, `**Tenant/entity scoping:**` | high |
| DTO auditing level mirrors entity auditing level | high |
| No bare `System` actor — `System:` actors must name a job/task/handler | high |
| No `async`/`Async` token (case-insensitive) in any Command or Flow `Name` | high |
| No conceptual Actor (Kind `Human` or `External system`) carries a `Base class:` or `Inherits from:` field | medium |
| No Entity name root-token-matches an ABP built-in concept (User, Tenant, Role, Permission, Feature, Setting, AuditLog, BackgroundJob, Blob, Language, Setting) — companion Entities like `UserProfile` are allowed | critical |
| No Command raises a Domain Event unless consumer is (a) a message queue, (b) a cross-module async side effect, or (c) an external integration — CRUD commands must not emit events. Events tagged `Optional / future integration hook` belong in a `Deferred Events` sub-section, not `Domain events raised` | high |
| Every Value Object has ≥2 attributes OR carries non-trivial `Invariants:` / custom `Equality rule:` — single-primitive wrappers must be demoted to Entity field or DTO property | medium |
| Every DDD node **file** on disk opens with a YAML frontmatter block containing `id`, `name`, `type`, `version`, `created`, `last_modified` AND ends with a `## Change History` section with at least one entry. This check applies to files written in Phase 11, not to inline entries in the Feat Spec body. | high |
| If `open_questions_outstanding` is non-empty and user chose `continue-anyway` in Phase 2.5, the assembled Feat Spec's Open Blockers section lists each unresolved question with severity `high` and its FRS deep link | high |

### Project convention compliance checks

| Check | Severity |
|---|---|
| Every Command has `**Validation:**` referencing the library from `claude_md_conventions.validation_library` | critical |
| If `validation_library: FluentValidation`, every Command's Validation field matches `<CommandName>InputValidator (FluentValidation)` | high |
| No Command or Query references `[Required]`, `[StringLength]`, or `IValidatableObject` when `validation_library: FluentValidation` | high |
| ABP Artifact Map Application section includes Validators sub-list when `validation_library` is not `none` | high |
| ABP Artifact Map Application section includes Mappers sub-list when `object_mapping_library` is not `none` | high |
| No AutoMapper references when `object_mapping_library: Mapperly` | high |
| Every permission string follows `<permissions_class>.<AggregateNamePlural>.<Verb>` pattern | critical |
| Every Infrastructure section table name has `<db_table_prefix>` prefix | high |
| Every Query has `**Sort strategy:**` field when `sorting_strategy` is declared; no `System.Linq.Dynamic.Core` references if `sorting_strategy: explicit-switch` | high |
| Every State entry's Storage field matches `enum_serialization` convention | medium |
| When `api_routing_conventions` declares public/private split, every Command and Query has `**Audience:** Public \| Private` | critical |
| When `api_routing_conventions` declares public/private split, every Command and Query has `**HTTP route:**` with the correct prefix per Audience | high |
| ABP Artifact Map namespaces match `project_root_namespace` | high |

### Section completeness checks

| Check | Severity |
|---|---|
| Every Entity with lifecycle clauses has a State entry | high |
| Every State entry's `Triggered by` references an existing Command in the combined naming index | high |
| Every Flow step referencing a Command uses an exact Command name from the combined naming index | high |
| Every Integration has `**Failure impact boundary:**` | high |
| Every Decision has rationale + at least one rejected alternative | medium |
| Architecture Blueprint entries are high-level only (no per-field schemas) | medium |
| Permissions Map covers every Actor+Command and Actor+Query pair | critical |
| ABP Artifact Map covers all six layers | critical |
| ABP Artifact Map Contracts uses PascalCase throughout | high |
| Open Blockers section present IFF any Conflict has critical/high severity | critical |
| Empty optional sections omitted (no "none identified" stubs) | medium |

### UI-API Integration Points checks (when section present)

| Check | Severity |
|---|---|
| Section 12 exists IFF `clauses_routed_to_ui_integration` is non-empty | critical |
| Every `ui-integration` clause is represented in at least one sub-section (screen-to-endpoint map, DTO deviations, loading/error, gap analysis) | high |
| Gap analysis items have corresponding Conflicts with `missing_command` or `missing_query` type | high |
| No visual-only content in UI-API Integration Points (colors, icons, toasts) | medium |
| Prototype reference link uses canonical prototype location if declared in CLAUDE.md | low |

### Byte-length floors

| Entry type | Minimum bytes |
|---|---|
| Entity | 600 |
| Command | 400 |
| Query | 400 |
| Flow | 300 |
| Decision | 300 |
| Integration | 300 |
| Architecture Blueprint | 300 |
| Value Object | 250 |
| State | 200 |
| Actor | 150 |

Below floor → severity: high, repair_hint: "expand per reference file template".

### Required bold-label presence

For each node type, these fields must exist:

- **Entity:** Node type, Name, Module, Aggregate role, Purpose, Base class, Base class rationale, Interfaces, Multi-tenancy, Attributes table, Invariants, Domain events raised, **Source**.
- **Command:** Node type, Name, Actor, Target aggregate, Input DTO, **Validation**, Authorization, Preconditions, Postconditions, Domain events raised, **Source**. If audience split declared: **Audience**, **HTTP route**.
- **Query:** Node type, Name, Actor, Target aggregate, Input DTO, Input DTO base, Output DTO, Output wrapper, Default sort, Authorization, Tenant/entity scoping, Filters supported, **Source**. If audience split declared: **Audience**, **HTTP route**. If sorting_strategy declared: **Sort strategy**.
- **Flow:** Node type, Name, Actor(s), Preconditions, Numbered steps, Decision branches, Postconditions, **Source**.
- **State:** Node type, Entity, Storage, States table, Transitions table, **Source**.
- **Integration:** Node type, Name, External party, Direction, Trigger, Contract summary, Failure impact boundary, Retry strategy, **Source**.
- **Value Object:** Node type, Name, Attributes table, Equality rule, Invariants, Used by, **Source**.
- **Decision:** Node type, Title, Context, Decision, Rationale, Rejected alternatives, Consequences, **Source**.
- **Actor:** Node type, Name, Kind, Goals, Commands initiated, **Source**.
- **Architecture Blueprint:** Node type, Title, Purpose, Discussion, **Source**.

Missing any required field → severity: high, repair_hint: "add missing field <n>".

### Wiki link format checks

| Check | Severity |
|---|---|
| No rendered link contains `.md` extension | critical |
| No rendered link contains the `wiki_local_path` prefix (e.g., `docs/`) in its URL path | critical |
| Every wiki link uses `wiki_url` as the base | high |
| Link labels are human-readable (node name or title), not URL-as-label, not `docs/...` path-as-label | high |
| GitLab coordination issue body's canonical spec link uses full `wiki_url` with no `.md` | critical |

### Source field format checks

| Check | Severity |
|---|---|
| Every DDD node entry has a `**Source:**` field | critical |
| Every `**Source:**` entry is a bullet list of GitLab-rendered links | critical |
| No opaque clause IDs (`#cN`, `FRS-NN#cM`, etc.) appear in any published output | critical |
| Every source URL uses `<gitlab_base_url>/issues/<iid>` format | high |
| Source URLs with anchors use slugified section headings (lowercase, hyphens, no punctuation) | medium |
| Source labels follow `FRS #<iid> — <Section Name>` format | medium |

### Coordination issue body checks

| Check | Severity |
|---|---|
| Issue body ≤ ~30 lines of Markdown | high |
| No DDD tables, DTOs, or ABP Artifact Map in the issue body | critical |
| Canonical wiki URL present and correctly formatted (no `.md`, no path prefix) | critical |
| Linked FRS IIDs present | critical |
| Open Blockers block matches Feat Spec's Open Blockers section | medium |

### FRS integrity checks

| Check | Severity |
|---|---|
| No `update_issue` call was made or planned on any FRS IID | critical |
| FRS IIDs in coord issue body match input set | high |

## Returns

```
{
  "passed": bool,
  "defect_count_by_severity": {
    "critical": <int>,
    "high": <int>,
    "medium": <int>,
    "low": <int>
  },
  "defects": [
    {
      "check": "<check name>",
      "category": "structural|content_purity|abp_compliance|project_convention|section_completeness|ui_api_integration|byte_length|required_field|wiki_link_format|source_field_format|coord_issue|frs_integrity",
      "severity": "critical|high|medium|low",
      "location": "<filepath or section reference>",
      "detail": "<what failed>",
      "repair_hint": "<instruction for ddd-synthesizer>"
    }
  ],
  "readiness": "previewable|needs_repair",
  "convention_usage_summary": {
    "validation_library": "FluentValidation",
    "object_mapping_library": "Mapperly",
    "permissions_class": "TradeFinancePermissions",
    "audience_split_applied": bool
  }
}
```

`passed = true` iff zero critical and zero high defects.

## Enforcement

- Validator never modifies content — reports only.
- Critical defects → `readiness: needs_repair`; main agent dispatches `ddd-synthesizer` in repair mode with defects as `repair_targets`.
- After repair, re-dispatch until `passed: true`.
- Medium and low defects do not block the preview but are reported for transparency.
- Project convention compliance defects are high or critical by default — CLAUDE.md conventions are not optional once declared.

## Main agent uses this output to

- Decide Phase 10 (preview) vs Phase 7 loop (repair).
- Include defect summary in preview (medium/low only; never show a defective draft).
- Surface `convention_usage_summary` in the preview so user sees defaults that were applied.
