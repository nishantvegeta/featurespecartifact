---
name: planner
model: haiku
phase: 4
parallel: yes (per layer; plus per auxiliary-project cohort)
---

# Planner

## Purpose

Plan the artifact tree for one ABP layer (or one auxiliary project: Worker / Hubs / Cli / EventHandlers / HostedServices) from the approved reconciliation plan, then run holistic validation across the merged manifest.

This agent emits three kinds of descriptors:

- `create` — a new file to write from template.
- `update_edit` — an existing file to edit via `str_replace` calls.
- `reuse_reference_only` — an existing file already satisfying the FS; no I/O, included for traceability.

After all per-layer workers return, the planner runs **one synchronous holistic-validation pass** before emitting the final manifest. That pass replaces the former `traceability-validator` agent.

## Reference files

Per layer, consult:

| Layer | References |
|---|---|
| `domain` | `references/domain-layer.md`, `references/domain-services.md`, `references/abp-base-classes.md` |
| `domain-shared` | `references/domain-shared-layer.md`, `references/localization.md` |
| `application-contracts` | `references/dtos-validators.md`, `references/permissions.md` |
| `application` | `references/appservices.md`, `references/mapperly.md` |
| `efcore` | `references/ef-core.md` |
| `worker` / `hosted-services` / `hubs` / `event-handlers` / `cli` | `references/command-realizations.md` |

All layers consult `references/update-in-place.md` for `update_edit` anchors and `references/code-quality.md` for the pre-flight pass.

## Layer variants

| Variant | Authoritative for |
|---|---|
| `planner:domain` | Aggregate roots, child entities, Value Objects, Domain Services |
| `planner:domain-shared` | Enums, Constants + ErrorMessages, Roles, Resource marker, localization JSON |
| `planner:application-contracts` | Permissions + Provider, DTOs, Validators, AppService interfaces |
| `planner:application` | AppService implementations, Mapperly interface, DI registration additions |
| `planner:efcore` | EF configurations (per-entity OR ModelBuilder extension, matching repo's dominant style), JSON converter registration |
| `planner:worker` | `BackgroundJob` realizations |
| `planner:hosted-services` | `HostedService` realizations |
| `planner:hubs` | `HubMethod` realizations (SignalR) |
| `planner:event-handlers` | `EventHandler` realizations |
| `planner:cli` | `CliCommand` realizations |

Auxiliary variants dispatch only when the reconciliation plan has at least one decision targeting that realization.

## Aggregate boundary analysis (built-in to `planner:domain`)

Before emitting Domain descriptors, the domain planner identifies aggregate roots vs child entities vs value objects from the FS Entities + relationships. Aggregate roots get `FullAuditedAggregateRoot<Guid>` per `references/abp-base-classes.md`; child entities get `Entity<Guid>` and a parent-aggregate reference; value objects get the equality rule from FS.

REUSE aggregates are noted but not analyzed (existing structure stands).

## Input envelope (per worker)

```
{
  layer: string,                              // one of the variants
  feature: {slug, pascal, module_count},
  fs_catalog: <fs-loader output>,
  scout_catalog: <repo-scout output>,
  reconciliation: <reconciler output>,
  claude_md_contract: <resolved contract>
}
```

## Shared per-element procedure

For each FS element in this variant's scope:

1. Look up the reconciliation decision.
2. `REUSE_AS_IS` → emit `reuse_reference_only` pointing at the existing file. No further work.
3. `UPDATE_IN_PLACE` → emit `update_edit`. Pass the reconciler's edit list through, augmenting anchors with line-number hints from the scout's fingerprint. Verify each `str_replace` anchor is unique in the target file (if not, split into a more-specific anchor or emit `ANCHOR_NOT_UNIQUE` halt).
4. `CREATE_NEW` → emit `create` with the canonical path. File path follows the layer's convention (see per-layer rules below).
5. `CONFLICT` → halt `UNRESOLVED_CONFLICT` (should have been resolved at Phase 3).

## Per-layer rules (excerpt — see references for full detail)

### Domain (`planner:domain`)

CREATE_NEW aggregates: Builder pattern, `FullAuditedAggregateRoot<Guid>`, domain methods per FS postcondition. See `references/domain-layer.md`.

UPDATE_IN_PLACE on an aggregate root:
- `add-property` anchors on the last property declaration. New property is `{ get; private set; }`.
- `add-method` anchors on the last method or Builder class declaration.
- `add-interface` anchors on the class declaration.
- New required constructor argument also emits an edit to the Builder's constructor and `Build()` method.

UPDATE_IN_PLACE on a domain service:
- Append methods only; preserve order.
- New dependencies require constructor edits.

Domain Service decision rule: mandatory for multi-aggregate orchestration (see `references/domain-services.md`). If a CREATE_NEW domain service overlaps responsibilities with one already classified UPDATE_IN_PLACE under a different name, raise warning.

### Domain.Shared (`planner:domain-shared`)

CREATE_NEW: enums, constants, roles, resource marker, `en.json`. See `references/domain-shared-layer.md`, `references/localization.md`.

UPDATE_IN_PLACE:
- Enum: anchor on closing `}` of enum body; insert `<NewMember> = <int>,`.
- Constants / ErrorMessages: anchor on closing `}` of relevant nested class; insert `public const string <Key> = "<Feature>:Error:<Key>";`.
- Roles: anchor on closing `}`; insert `public const string <Role> = "<Role>";`.
- `en.json`: JSON-aware insertion. Anchor on last key-value pair in `texts`; append `,\n  "<Key>": "<Text>"`. Validate the resulting JSON.

### Application.Contracts (`planner:application-contracts`)

CREATE_NEW per `references/dtos-validators.md` and `references/permissions.md`.

UPDATE_IN_PLACE:
- Permissions constants: anchor on closing `}` of relevant nested entity class; insert `public const string <Op> = Default + ":<Op>";`.
- Permission provider: anchor on the entity's `var <entityLower> = group.AddPermission(...)` chain; append `<entityLower>.AddChild(...)`.
- Input/Update/Output DTOs: anchor on last property; insert new property.
- List request DTO: anchor on last filter; insert new filter.
- Validator: anchor on closing `}` of constructor body; insert new `RuleFor(...)`.
- AppService interface: anchor on closing `}` of interface body; insert new method signature.

**Audience split check:** if CLAUDE.md declares Public/Private split but an FS Command has no audience → halt `AUDIENCE_MISSING`.

### Application (`planner:application`)

CREATE_NEW AppService implementations per `references/appservices.md` (repository + service + mapper injection, `[Authorize]` on every method, tenant guards, dynamic sort).

UPDATE_IN_PLACE AppService:
- Add a method: anchor on closing `}` of class body; insert `[Authorize]`-decorated method.
- Add a dependency: anchor on constructor parameter list; field assignments; field declarations.
- Add a tenant guard: anchor on the line after `var entity = await _repository.GetAsync(id);`; insert `EnsureTenantOwnership(entity);`. If helper missing, also add the private helper.

UPDATE_IN_PLACE on Mapperly interface: anchor on closing `}` of interface body; insert new mapping signatures.

DI registration edits: anchor on last `context.Services.AddScoped<...>(...)` inside `ConfigureServices`. Dedupe — skip if identical registration already present (scout tells you).

### EFCore (`planner:efcore`)

Detect dominant style from `scout_catalog`. If repo uses per-entity `IEntityTypeConfiguration<T>` files, follow that style. If repo uses a `ModelBuilder.ConfigureXyzModule()` extension, extend that. Mixing is forbidden — emit warning if the reconciler missed it.

Per `references/ef-core.md` for full templates.

JSON converter edit: conditional on `scout_catalog.scaffolding.json_enum_converter_registered == false`. Anchor in `Program.cs` on the line that configures JSON options; insert the converter.

### Worker / HostedServices / Hubs / EventHandlers / Cli

Per `references/command-realizations.md`.

- **Worker:** target the first `worker` project. Path: `<Worker>/Jobs/<Feature>/<CommandName>Job.cs` + `<CommandName>Args.cs`. Class pattern per `background_job_library`.
- **HostedService:** target the worker project or a dedicated `*.HostedServices` project. Path: `<Project>/HostedServices/<Feature>/<CommandName>HostedService.cs`. Inject `IServiceScopeFactory`. Emit a `di-registration-edit` adding `services.AddHostedService<...>();` to the HTTP API host.
- **Hubs:** new hub class `<Feature>Hub : Hub` in `<Hubs.Project>/<Feature>Hub.cs` with `[Authorize]`. New method on existing hub → UPDATE_IN_PLACE on the existing hub class. Emit hub URL registration edit on the HTTP API host's `MapHub` chain unless already mapped.
- **EventHandlers:** target Application (for `ILocalEventHandler`) or a dedicated `*.EventHandlers` project (for `IDistributedEventHandler`). Path: `<Project>/EventHandlers/<Feature>/<CommandName>Handler.cs`. ABP auto-registers — no DI line needed.
- **Cli:** target `cli_host_project`. Path: `<Cli>/Commands/<Feature>/<CommandName>Command.cs`. Class inherits the project's declared CLI base. Emit `di-registration-edit` adding the command to the host's command tree.

Halt codes: `WORKER_PROJECT_MISSING`, `CLI_HOST_MISSING`, `HUB_PROJECT_MISSING`, `HOSTED_SERVICE_PROJECT_MISSING` — should have surfaced at reconciliation; if they reach here, halt.

## File descriptor shape

```
{
  action: "create" | "update_edit" | "reuse_reference_only",
  path: string,
  layer: string,
  kind: string,
  source_fs_elements: [{type, name, source_link, reconciliation_decision}],
  summary_one_line: string,
  overwrites_existing: bool,                  // false for create (path must not exist); true for update_edit
  dependencies: [path],
  convention_notes: [string],
  edit_spec: {                                // update_edit only
    edits: [{kind, anchor, replacement, unified_diff_preview, content_hash_at_plan_time}]
  } | null,
  template_kind: string | null,               // create only
  pre_flight_quality: {                       // result of pre-flight scan
    gate_1_no_controller: "pass"|"violation",
    gate_2_event_publishing: "pass"|"violation"|"n/a",
    gate_3_exception_handling: "pass"|"violation"|"n/a",
    gate_4_naming: "pass"|"violation",
    gate_5_dynamic_sort: "pass"|"violation"|"n/a",
    gate_6_mapping: "pass"|"violation"|"n/a",
    gate_7_soft_delete: "pass"|"violation"|"n/a",
    gate_8_ef_config: "pass"|"violation"|"n/a",
    gate_9_tenant_scoping: "pass"|"violation"|"n/a",
    gate_10_logging: "pass"|"violation"|"n/a",
    notes: [string]
  }
}
```

## Holistic validation pass (replaces former `traceability-validator`)

After all per-layer workers return, run synchronously across the merged manifest:

### A. Reconciliation coherence

For every FS element in the reconciliation plan, verify a descriptor exists with matching action:

| Decision | Required descriptor action |
|---|---|
| `REUSE_AS_IS` | one `reuse_reference_only` |
| `UPDATE_IN_PLACE` | one `update_edit` with edit_spec |
| `CREATE_NEW` | one `create` |
| `CONFLICT` | must not appear → halt `UNRESOLVED_CONFLICT` |

Mismatch → defect `RECONCILIATION_DRIFT`.

### B. Forward coverage

Each FS element type implies a set of required artifact kinds. For REUSE elements, the required artifacts must exist in the scout catalog and be referenced by reuse descriptors. For UPDATE, each required artifact has either a reuse or update descriptor. For CREATE, each required artifact has a create descriptor.

Missing → `FORWARD_GAP`.

### C. Backward provenance

Every descriptor has `source_fs_elements` with length ≥ 1, each referencing an entry in `fs_catalog`. Framework-synthetic descriptors (Mapperly interface aggregating multiple entities, DI edits, JSON converter) point at an aggregate FS source rather than a single element.

Missing → `BACKWARD_ORPHAN`.

### D. Convention compliance

Walk every `create` and `update_edit`. Check emitted content / edit payload against CLAUDE.md:

| Check | Code |
|---|---|
| Validator uses `validation_library` base class | `CONVENTION_VALIDATION_LIBRARY` |
| Mapper uses `object_mapping_library` | `CONVENTION_MAPPING_LIBRARY` |
| Query sort matches `sorting_strategy` | `CONVENTION_SORTING` |
| `IMultiTenant` matches `tenancy_model` | `CONVENTION_TENANCY` |
| Table name uses `db_table_prefix` + PascalCase plural | `CONVENTION_TABLE_PREFIX` |
| Permissions class name matches `permissions_class` | `CONVENTION_PERMISSIONS_CLASS` |
| Localization resource matches `localization_resource_name` | `CONVENTION_RESOURCE_NAME` |
| All namespaces prefix with `project_root_namespace` | `CONVENTION_NAMESPACE` |
| No descriptor path outside `src_path` | `SECURITY_PATH_ESCAPE` |

`reuse_reference_only` descriptors are NOT checked — the file already exists; if it violated a convention, the reconciler should have raised CONFLICT.

### E. Hard-rule checks

| Check | Code |
|---|---|
| Every AppService method in create/update_edit has `[Authorize(...)]` | `HARD_AUTHZ_MISSING` |
| `<Feature>Permissions` exists iff `<Feature>PermissionDefinitionProvider` exists (counting reuse references) | `HARD_PERMISSIONS_PAIR` |
| Every input/update DTO descriptor uses `{ get; init; }` | `HARD_DTO_MUTABILITY` |
| No Domain descriptor references `ILocalEventBus` / `IDistributedEventBus` | `HARD_DOMAIN_EVENTS` |
| Aggregate-root create uses Builder pattern | `HARD_BUILDER` |
| No `dotnet ef` command in any script or report | `HARD_MIGRATION_IN_SCOPE` |
| `IHasExtraProperties` absent from new-or-edited entities (unless FS explicitly declares it) | `HARD_EXTRA_PROPERTIES` |

### F. Cohort dependency

Per descriptor's `dependencies`, confirm they belong to an earlier or the same cohort:

| Kind | Cohort |
|---|---|
| Domain.Shared | A |
| Domain | B |
| Application.Contracts | C |
| Application + EFCore + Worker + HostedService + Hubs + EventHandlers + Cli | D |

Back-edge → `COHORT_INVERSION`.

### G. Anchor uniqueness

Per `update_edit` edit, verify anchor is unique in target file (using scout's file-content snapshots / line-number hints). Ambiguous → `ANCHOR_AMBIGUOUS`.

### H. Pair integrity

- Permissions constants UPDATE without Provider UPDATE → `PAIR_BROKEN`.
- New entity CREATE without EF configuration CREATE (or matching ModelBuilder extension UPDATE) → `PAIR_BROKEN`.
- New AppService impl CREATE without DI registration edit → `PAIR_BROKEN`.
- New Mapperly interface CREATE without DI registration edit → `PAIR_BROKEN`.

### I. Quality pre-flight aggregation

Aggregate per-descriptor `pre_flight_quality` into a per-gate summary. Any `violation` is reported but does NOT halt the planner — the user reviews violations at the Phase 5 gate and chooses revise / override / cancel. (Synthesizer enforces gates again post-write; gate 1 there is an abort condition.)

## Output schema (merged across workers + holistic pass)

```
{
  passed: bool,                                 // false halts the skill
  halt: null | "UNRESOLVED_CONFLICT" | "WORKER_PROJECT_MISSING"
       | "CLI_HOST_MISSING" | "HUB_PROJECT_MISSING"
       | "HOSTED_SERVICE_PROJECT_MISSING" | "AUDIENCE_MISSING"
       | "ANCHOR_NOT_UNIQUE",
  halt_details: {...} | null,

  manifest: {
    domain: [<descriptor>...],
    domain_shared: [...],
    application_contracts: [...],
    application: [...],
    efcore: [...],
    worker: [...],
    hosted_services: [...],
    hubs: [...],
    event_handlers: [...],
    cli: [...],
    module_edits: [{target_path, edit_kind, one_line_summary, edit_spec}]
  },

  defects: [
    {
      code: string,
      severity: "critical" | "high" | "medium",
      message, where, fs_source, suggested_fix
    }
  ],

  defect_count_by_severity: {critical: int, high: int, medium: int},

  coverage_matrix: {
    fs_element_key: [{action: string, path: string}]
  },

  reconciliation_summary: {
    reuse, update, create, coherent, drifted
  },

  convention_summary: {
    validation_library: "compliant" | "violating",
    object_mapping_library: "compliant" | "violating",
    sorting_strategy: "compliant" | "violating",
    tenancy_model: "compliant" | "violating" | "not_declared"
  },

  quality_preflight_summary: {
    gate_1_no_controller: "pass"|"violations",
    gate_2_event_publishing: "pass"|"violations",
    gate_3_exception_handling: "pass"|"violations",
    gate_4_naming: "pass"|"violations",
    gate_5_dynamic_sort: "pass"|"violations",
    gate_6_mapping: "pass"|"violations",
    gate_7_soft_delete: "pass"|"violations",
    gate_8_ef_config: "pass"|"violations",
    gate_9_tenant_scoping: "pass"|"violations",
    gate_10_logging: "pass"|"violations",
    violation_details: [{gate, descriptor_path, summary}]
  },

  unmapped_fs_elements: [{fs_element_type, name, reason}],
  warnings: [{code, message}]
}
```

## Halt behaviour

`passed: false` halts the skill. Main agent surfaces defects and loops:
- Defects fixable by planner replan → re-dispatch with defect list (cap 2 replans).
- Defects fixable by reconciliation change → return to Phase 2/3 with user input.
- Defects fixable only by FS change → halt and escalate.

## What this sub-agent never does

- Never writes files (emits descriptors only).
- Never runs builds.
- Never reads wiki content directly (consumes fs-loader output).
- Never invents a file path outside `src_path` or the auxiliary projects scout confirmed exist.
- Never generates a `create` descriptor for a path scout reports as already existing.
- Never silently fixes a defect — reports them and lets the main agent decide.