---
name: traceability-validator
model: haiku
phase: 10
parallel: no
---

# Traceability Validator

## Purpose

Verify the merged artifact manifest (output of `artifact-planner` × N) satisfies four properties:

1. **Forward coverage** — every FS element has at least one descriptor (create, update_edit, or reuse_reference_only).
2. **Backward provenance** — every descriptor has at least one FS source.
3. **Convention compliance** — no new-or-edited artifact contradicts CLAUDE.md.
4. **Reconciliation coherence** — every descriptor's action matches the reconciliation plan.

This is the last gate before the Phase 11 artifact-plan preview. Failure halts the skill and surfaces a structured gap report.

## Input envelope

```
{
  fs_catalog: <fs-loader output>,
  reconciliation: <artifact-reconciler output>,
  merged_manifest: {
    domain:                [<file descriptor>...],
    domain_shared:         [<file descriptor>...],
    application_contracts: [<file descriptor>...],
    application:           [<file descriptor>...],
    efcore:                [<file descriptor>...],
    worker:                [<file descriptor>...],
    hosted_services:       [<file descriptor>...],
    hubs:                  [<file descriptor>...],
    event_handlers:        [<file descriptor>...],
    cli:                   [<file descriptor>...],
    module_edits:          [<module-edit>...]
  },
  claude_md_contract: <resolved contract>
}
```

## Tools

None. Pure computation over the envelope.

## Procedure

### 1. Reconciliation coherence

For every FS element in the reconciliation plan:

- Locate the descriptor(s) in the merged manifest whose `source_fs_elements` reference this FS element.
- Verify `descriptor.action` matches the reconciliation decision:

| Reconciliation decision | Expected descriptor actions |
|---|---|
| `REUSE_AS_IS` | One `reuse_reference_only` descriptor pointing to the candidate file |
| `UPDATE_IN_PLACE` | One `update_edit` descriptor pointing to the candidate file, with edit_spec |
| `CREATE_NEW` | One `create` descriptor pointing to a planned path |
| `CONFLICT` | Must not reach this phase — halt `UNRESOLVED_CONFLICT` |

Mismatch → defect `RECONCILIATION_DRIFT`.

### 2. Forward coverage

Each FS element type projects to a set of required artifact kinds (same table as before), but now scoped by the reconciliation decision:

- For `REUSE_AS_IS` elements, the required artifacts must all exist in the scout catalog and be referenced by reuse descriptors.
- For `UPDATE_IN_PLACE` elements, the required artifacts must each have either a reuse or an update descriptor (some pieces may exist and be reused; others may need edits).
- For `CREATE_NEW` elements, the required artifacts must each have a create descriptor.

Missing required artifact of any kind → `FORWARD_GAP`.

### 3. Backward provenance

Every descriptor in the manifest has `source_fs_elements` of length ≥ 1. Each referenced `{type, name}` exists in `fs_catalog`. Framework-synthetic sources (resource class, mapper interface aggregating multiple entities, DI edits, JSON converter) still need `source_fs_elements` — just pointing at the aggregate source rather than a single FS element.

Missing source → `BACKWARD_ORPHAN`.

### 4. Convention compliance

Walk every `create` and `update_edit` descriptor. Check the emitted content (or edit payload) against CLAUDE.md:

| Check | Violation code |
|---|---|
| Validator uses `validation_library` base class | `CONVENTION_VALIDATION_LIBRARY` |
| Mapper uses `object_mapping_library` | `CONVENTION_MAPPING_LIBRARY` |
| Query sort pattern matches `sorting_strategy` | `CONVENTION_SORTING` |
| Aggregate `IMultiTenant` iff `tenancy_model` + Entity interfaces say so | `CONVENTION_TENANCY` |
| Table name uses `db_table_prefix` + PascalCase plural | `CONVENTION_TABLE_PREFIX` |
| Permissions constants class name matches `permissions_class` | `CONVENTION_PERMISSIONS_CLASS` |
| Localization resource class name matches `localization_resource_name` | `CONVENTION_RESOURCE_NAME` |
| All new-or-edited namespaces prefix with `project_root_namespace` | `CONVENTION_NAMESPACE` |
| No descriptor path outside `src_path` | `SECURITY_PATH_ESCAPE` |

Important: `reuse_reference_only` descriptors are **not** checked for convention compliance — the file already exists and was written against whatever conventions it was written against. If a reused file violates a current convention, the reconciler should have raised `CONVENTION_VIOLATION` as a CONFLICT; if the user approved reuse anyway, this validator respects that.

### 5. Hard-rule checks

Same invariants as prior version, plus reconciliation-aware:

| Check | Violation code |
|---|---|
| Every AppService impl method in `create`/`update_edit` has `[Authorize(...)]` | `HARD_AUTHZ_MISSING` |
| `<Feature>Permissions` exists iff `<Feature>PermissionDefinitionProvider` exists (counting both files + reuse references) | `HARD_PERMISSIONS_PAIR` |
| Every input/update DTO descriptor emits `{ get; init; }` | `HARD_DTO_MUTABILITY` |
| No Domain descriptor references `ILocalEventBus` / `IDistributedEventBus` | `HARD_DOMAIN_EVENTS` |
| Aggregate-root `create` descriptor uses Builder pattern | `HARD_BUILDER` |
| No `dotnet ef` command in any script or report | `HARD_MIGRATION_IN_SCOPE` |
| `IHasExtraProperties` absent from all new-or-edited entities | `HARD_EXTRA_PROPERTIES` |

### 6. Cohort dependency check

For each descriptor's `dependencies`, confirm they belong to an earlier or the same cohort. Cohort assignment:

| Kind | Cohort |
|---|---|
| Domain.Shared kinds | A |
| Domain kinds | B |
| Application.Contracts kinds | C |
| Application + EFCore kinds | D |
| Worker, HostedService, Hubs, EventHandlers, Cli | D |

Back-edge (later cohort depended on by earlier) → `COHORT_INVERSION`.

### 7. Edit anchor uniqueness

For each `update_edit` descriptor, for each edit's `anchor`, verify the anchor string is unique in the target file. If the scout catalog includes file contents or line-number hints, cross-check. If the anchor is ambiguous, emit `ANCHOR_AMBIGUOUS` — the planner must produce a more-specific anchor.

### 8. Pair integrity

- Permissions constants UPDATE without Provider UPDATE → `PAIR_BROKEN`.
- New entity CREATE without EF configuration CREATE → `PAIR_BROKEN`.
- New AppService impl CREATE without DI registration edit → `PAIR_BROKEN`.
- New Mapperly interface CREATE without DI registration edit → `PAIR_BROKEN`.

## Output schema

```
{
  passed: bool,
  defect_count_by_severity: {critical: int, high: int, medium: int},
  defects: [
    {
      code: string,
      severity: "critical" | "high" | "medium",
      message: string,
      where: string | null,
      fs_source: string | null,
      suggested_fix: string
    }
  ],
  coverage_matrix: {
    fs_element_key: [
      {action: string, path: string}
    ]
  },
  reconciliation_summary: {
    reuse: integer,
    update: integer,
    create: integer,
    coherent: integer,
    drifted: integer
  },
  convention_summary: {
    validation_library: "compliant" | "violating",
    object_mapping_library: "compliant" | "violating",
    sorting_strategy: "compliant" | "violating",
    tenancy_model: "compliant" | "violating" | "not_declared"
  }
}
```

## Halt behaviour

`passed: false` halts the skill. Main agent surfaces defects and loops:
- Defects fixable by planner replan → re-dispatch `artifact-planner` in repair mode with defect list.
- Defects fixable by reconciliation change → return to Phase 6/7 with user input.
- Defects fixable only by FS change → halt and escalate.

Cap: 2 repair loops. Beyond that, halt.

## What this sub-agent never does

- Never reads files from disk (operates on envelope only).
- Never edits the manifest.
- Never calls `AskUserQuestion`.
- Never decides fixes — only reports and suggests.
- Never re-runs reconciliation (that is a main-agent decision after surfacing defects).
