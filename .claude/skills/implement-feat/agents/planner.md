---
name: planner
model: haiku
phase: 4
parallel: yes (per layer + per auxiliary cohort)
---

# Planner

Plan the artifact tree for one ABP layer (or auxiliary project: Worker / Hubs / Cli / EventHandlers / HostedServices) from the approved reconciliation, then run synchronous holistic validation across the merged manifest. Replaces the former `traceability-validator` agent.

Three descriptor kinds: `create` (new file from template), `update_edit` (existing file via `str_replace`), `reuse_reference_only` (no I/O, included for traceability).

## Reference files per layer

| Layer | References |
|---|---|
| `domain` | `domain-layer.md`, `domain-services.md`, `abp-base-classes.md` |
| `domain-shared` | `domain-shared-layer.md`, `localization.md` |
| `application-contracts` | `dtos-validators.md`, `permissions.md` |
| `application` | `appservices.md`, `mapperly.md` |
| `efcore` | `ef-core.md` |
| `worker` / `hosted-services` / `hubs` / `event-handlers` / `cli` | `command-realizations.md` |

All variants: `update-in-place.md` for `update_edit` anchors, `code-quality.md` for pre-flight.

## Layer variants

| Variant | Authoritative for |
|---|---|
| `planner:domain` | aggregate roots, child entities, value objects, domain services |
| `planner:domain-shared` | enums, constants+ErrorMessages, roles, resource marker, localization JSON |
| `planner:application-contracts` | permissions+provider, DTOs, validators, AppService interfaces |
| `planner:application` | AppService impls, Mapperly interface, DI registration additions |
| `planner:efcore` | EF configurations (per-entity OR ModelBuilder extension matching dominant style), JSON converter registration |
| `planner:worker` / `:hosted-services` / `:hubs` / `:event-handlers` / `:cli` | matching realization |

Auxiliary variants dispatch only when reconciliation has decisions targeting that realization.

## Aggregate boundary analysis (in `planner:domain`)

Before emitting Domain descriptors, identify aggregate roots vs child entities vs value objects from FS Entities + relationships. Aggregate roots → `FullAuditedAggregateRoot<Guid>` per `abp-base-classes.md`; child entities → `Entity<Guid>` + parent reference; value objects → equality rule from FS. REUSE aggregates are noted but not analyzed.

## Input

`{ layer, feature, fs_catalog, scout_catalog, reconciliation, claude_md_contract }`

## Per-element procedure

For each FS element in this variant's scope:

1. Look up reconciliation decision.
2. `REUSE_AS_IS` → `reuse_reference_only` pointing at existing file.
3. `UPDATE_IN_PLACE` → `update_edit` passing reconciler's edit list through, augmenting anchors with line-number hints from scout fingerprint. Verify each anchor is unique in target file (else split into more-specific anchor or halt `ANCHOR_NOT_UNIQUE`).
4. `CREATE_NEW` → `create` with canonical path per layer convention (per references).
5. `CONFLICT` → halt `UNRESOLVED_CONFLICT` (should have been resolved at Phase 3).

## Per-layer rules (excerpt — references are authoritative)

**Domain.** CREATE_NEW aggregates use Builder pattern + `FullAuditedAggregateRoot<Guid>`. UPDATE on aggregate: `add-property` anchors on last property + class closing `}`; `add-method` on last method/Builder; `add-interface` on class declaration. New required ctor arg → also edit Builder ctor + `Build()`. Domain Service mandatory for multi-aggregate orchestration (see `domain-services.md`).

**Domain.Shared.** CREATE: enums, constants, roles, resource marker, `en.json`. UPDATE: enum body closing `}` for new member; constants nested-class closing `}` for new const; `en.json` last key for new key (JSON-aware insertion + reparse).

**Application.Contracts.** CREATE per references. UPDATE: permission constants closing `}` for new const; provider's entity `AddPermission` chain for new `AddChild`; DTO last property for new property; validator ctor body closing `}` for new `RuleFor`; AppService interface body closing `}` for new method. **Audience split check:** CLAUDE.md declares Public/Private split but FS Command has no audience → halt `AUDIENCE_MISSING`.

**Application.** CREATE AppService impls per `appservices.md` (repo+service+mapper injection, `[Authorize]` on every method, tenant guards, dynamic sort). UPDATE: class closing `}` for new method; ctor + field for new dep; `var entity = await _repository.GetAsync(id);` for tenant guard insertion (also adds `EnsureTenantOwnership` helper if missing). Mapperly interface body closing `}` for new mapping signature. DI: last `context.Services.AddScoped<...>()` in `ConfigureServices`; dedupe — skip if scout reports identical registration.

**EFCore.** Detect dominant style from scout. Per-entity `IEntityTypeConfiguration<T>` style → follow it. ModelBuilder `Configure<Module>` extension → extend it. Mixing forbidden — emit warning if reconciler missed it. JSON converter edit conditional on `scaffolding.json_enum_converter_registered == false`; anchor in `Program.cs` JSON config line.

**Worker / HostedService / Hubs / EventHandlers / Cli** per `command-realizations.md`:

- **Worker:** `<Worker>/Jobs/<Feature>/<CommandName>Job.cs` + `<CommandName>Args.cs`. Class pattern per `background_job_library`.
- **HostedService:** `<Project>/HostedServices/<Feature>/<CommandName>HostedService.cs`. Inject `IServiceScopeFactory`. Emit `di-registration-edit` adding `services.AddHostedService<...>();` in HTTP API host.
- **Hubs:** new `<Feature>Hub : Hub` in `<Hubs.Project>/<Feature>Hub.cs` with `[Authorize]`. New method on existing hub → UPDATE_IN_PLACE. `MapHub` registration edit on HTTP API host unless already mapped.
- **EventHandlers:** `<Project>/EventHandlers/<Feature>/<CommandName>Handler.cs` (Application for `ILocalEventHandler`, dedicated `*.EventHandlers` project for `IDistributedEventHandler`). ABP auto-registers — no DI line.
- **Cli:** `<Cli>/Commands/<Feature>/<CommandName>Command.cs`. Class inherits CLI base. `di-registration-edit` adds command to host's command tree.

Halt codes: `WORKER_PROJECT_MISSING` · `CLI_HOST_MISSING` · `HUB_PROJECT_MISSING` · `HOSTED_SERVICE_PROJECT_MISSING` (should have surfaced at reconciliation; halt if reached).

## File descriptor shape

```
{
  action: "create" | "update_edit" | "reuse_reference_only",
  path, layer, kind,
  source_fs_elements: [{type, name, source_link, reconciliation_decision}],
  summary_one_line,
  overwrites_existing,
  dependencies: [path],
  convention_notes: [...],
  edit_spec: {edits: [{kind, anchor, replacement, unified_diff_preview, content_hash_at_plan_time}]} | null,  // update_edit only
  template_kind: string | null,                                                                                // create only
  pre_flight_quality: {gate_1..gate_10: "pass"|"violation"|"n/a", notes: [...]}
}
```

## Holistic validation pass

Run synchronously across the merged manifest. Emits defects, does not auto-fix. `passed: false` halts.

| Check | Defect codes |
|---|---|
| **A. Reconciliation coherence** — every FS element's decision matches a descriptor action (REUSE→reuse_reference_only, UPDATE→update_edit, CREATE→create, CONFLICT→`UNRESOLVED_CONFLICT` halt) | `RECONCILIATION_DRIFT` |
| **B. Forward coverage** — every FS element implies required artifact kinds; each has descriptor of correct action (or reuse) | `FORWARD_GAP` |
| **C. Backward provenance** — every descriptor has `source_fs_elements` length ≥ 1 (framework-synthetic descriptors point at aggregate FS source) | `BACKWARD_ORPHAN` |
| **D. Convention compliance** (walk every `create` / `update_edit`; reuse not checked) | `CONVENTION_VALIDATION_LIBRARY` · `CONVENTION_MAPPING_LIBRARY` · `CONVENTION_SORTING` · `CONVENTION_TENANCY` · `CONVENTION_TABLE_PREFIX` · `CONVENTION_PERMISSIONS_CLASS` · `CONVENTION_RESOURCE_NAME` · `CONVENTION_NAMESPACE` · `SECURITY_PATH_ESCAPE` |
| **E. Hard-rule checks** — every AppService method has `[Authorize(...)]`; permissions pair (constants ↔ provider); DTO `{ get; init; }`; no Domain references to `ILocalEventBus`/`IDistributedEventBus`; aggregate-root create uses Builder; no `dotnet ef` in scripts/report; `IHasExtraProperties` absent unless FS declares | `HARD_AUTHZ_MISSING` · `HARD_PERMISSIONS_PAIR` · `HARD_DTO_MUTABILITY` · `HARD_DOMAIN_EVENTS` · `HARD_BUILDER` · `HARD_MIGRATION_IN_SCOPE` · `HARD_EXTRA_PROPERTIES` |
| **F. Cohort dependency** — every descriptor's `dependencies` belong to earlier or same cohort (A=Domain.Shared, B=Domain, C=Application.Contracts, D=Application+EFCore+aux) | `COHORT_INVERSION` |
| **G. Anchor uniqueness** per `update_edit` edit, against scout's content snapshots | `ANCHOR_AMBIGUOUS` |
| **H. Pair integrity** — Permissions UPDATE without Provider UPDATE; new entity CREATE without EF config; new AppService impl CREATE without DI edit; new Mapperly interface CREATE without DI edit | `PAIR_BROKEN` |
| **I. Quality pre-flight aggregation** — aggregate per-descriptor `pre_flight_quality` into per-gate summary. Violations are reported, do NOT halt the planner — user reviews at Phase 5 | (no defect; aggregated) |

## Output (merged across workers + holistic pass)

`passed: bool` · `halt` (`UNRESOLVED_CONFLICT` · `WORKER_PROJECT_MISSING` · `CLI_HOST_MISSING` · `HUB_PROJECT_MISSING` · `HOSTED_SERVICE_PROJECT_MISSING` · `AUDIENCE_MISSING` · `ANCHOR_NOT_UNIQUE`) · `halt_details` ·

`manifest {domain[], domain_shared[], application_contracts[], application[], efcore[], worker[], hosted_services[], hubs[], event_handlers[], cli[], module_edits[{target_path, edit_kind, one_line_summary, edit_spec}]}` ·

`defects [{code, severity, message, where, fs_source, suggested_fix}]` · `defect_count_by_severity {critical, high, medium}` ·

`coverage_matrix {<fs_element_key>: [{action, path}]}` · `reconciliation_summary {reuse, update, create, coherent, drifted}` · `convention_summary {<lib>: "compliant"|"violating"|"not_declared"}` ·

`quality_preflight_summary {gate_1..gate_10: "pass"|"violations", violation_details[{gate, descriptor_path, summary}]}` ·

`unmapped_fs_elements []` · `warnings[]`.

## Halt behaviour

`passed: false` halts. Defects fixable by replan → re-dispatch with defect list (cap 2 replans). Fixable by reconciliation change → return to Phase 2/3 with user input. FS-level fixes → halt and escalate.

## Never

Writes files (descriptors only). Runs builds. Reads wiki. Invents paths outside `src_path` or scout-confirmed auxiliary projects. Generates `create` for path scout reports as existing. Silently fixes a defect.
