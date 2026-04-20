---
name: artifact-reconciler
model: haiku
phase: 6
parallel: no
---

# Artifact Reconciler

## Purpose

Given the FS element catalog and the repo scout's candidate catalog, decide per FS element whether to REUSE an existing artifact as-is, UPDATE an existing artifact in place, CREATE a new one, or surface a CONFLICT. This is the single most important decision in the skill — it prevents duplicate generation, preserves prior work, and surfaces architectural disagreements between the FS and the current code.

Runs once, serially. Requires whole-catalog view.

## Input envelope

```
{
  fs_catalog: <full fs-loader output with realization types attached>,
  scout_catalog: <full repo-scout output>,
  claude_md_contract: <resolved contract>,
  feature: {slug, pascal, module_count}
}
```

## Tools

- None. Pure computation over the envelope.

## Procedure

### Step 1 — Per FS element, compute target shape

From the FS element's attributes and the conventions in `claude_md_contract`, derive the target shape the skill would emit if creating from scratch. This is the "ideal" fingerprint the reconciler will compare against candidates.

Examples:

- FS Entity `LoanApplication` with attributes `Name:string(200)`, `Amount:decimal(18,4)`, `Status:LoanStatus`, `IMultiTenant` → target shape: `aggregate-root|<Ns>.LoanApplicationManagement|LoanApplication|FullAuditedAggregateRoot<Guid>|IMultiTenant|Name:string,Amount:decimal,Status:LoanStatus,TenantId:Guid?`.

- FS Command `SubmitApplication` (Execution model: AppService, Audience: Public) → target shape: `appservice-impl-method|<Ns>.LoanApplicationManagement|LoanApplicationPublicAppService.SubmitAsync|params:{input:SubmitApplicationDto}|returns:Task<LoanApplicationDto>|authorize:LoanApplicationManagement.Application.Submit`.

- FS Command `NightlyAccrualCalculation` (Execution model: BackgroundJob) → target shape: `background-job|<Ns>.Worker.Jobs|NightlyAccrualCalculationJob|inherits:AsyncBackgroundJob<NightlyAccrualCalculationArgs>|method:ExecuteAsync`.

### Step 2 — Candidate lookup

For each FS element, search the scout catalog for candidates of the matching kind. Lookup dimensions, in order of specificity:

1. **Exact kind + name match.** `FS Entity "LoanApplication"` → scout's `aggregate-root` candidates whose `class_name == "LoanApplication"`.
2. **Kind + name in feature namespace.** Same as above but filter namespace to include feature pascal.
3. **Kind + weak name match.** Name contains FS element name or vice versa (e.g., `LoanApp` matches `LoanApplication`).
4. **Kind match only in worker / hubs / cli projects** for realization-specific candidates.

Realization-aware filtering is critical:
- A Command realized as `BackgroundJob` only matches `background-job` candidates — never `appservice-impl` even if name collides.
- A Command realized as `AppService` only matches `appservice-impl` + matching `appservice-interface`.
- A Command realized as `EventHandler` matches only `event-handler` candidates.
- A Command realized as `HubMethod` matches only methods on `hub` candidates.

### Step 3 — Shape comparison

For each (FS element, candidate) pair, compute a three-tier delta:

| Delta tier | Meaning | Decision |
|---|---|---|
| **Exact match** | Target shape equals candidate fingerprint | `REUSE_AS_IS` |
| **Additive delta** | Candidate is a strict subset of target (target adds properties, methods, permission children, validator rules, enum values, localization keys, or DI registrations) | `UPDATE_IN_PLACE` with explicit edit list |
| **Conflicting delta** | Candidate and target disagree on property type, base class, interface, method signature, permission semantics, authorization, audience (Public vs Private), realization type, or tenancy | `CONFLICT` |

Additive signals (non-exhaustive):
- Candidate missing a property the target declares → `add-property` edit.
- Candidate missing a method the target declares → `add-method` edit.
- Permission constants class missing a nested entity or operation → `add-nested-class` or `add-constant` edit.
- Permission provider missing an `AddChild` call → `add-child-call` edit.
- Validator missing a `RuleFor` → `add-rule` edit.
- Enum missing a member → `add-enum-member` edit.
- Localization JSON missing a key → `add-key` edit.
- DI registration missing an `AddScoped` for a planned new type → `add-di-line` edit.
- EF configuration missing a property mapping → `add-has-property-call` edit.

Conflict signals:
- Same property name, different type.
- Aggregate root base class mismatch (`AggregateRoot<Guid>` vs `FullAuditedAggregateRoot<Guid>`).
- `IMultiTenant` present on candidate but FS says non-tenant (or vice versa).
- AppService method exists but without `[Authorize]` while FS requires it (could be "unauthorized-reads" — classify as `CONFLICT` with severity `high`).
- Command realization in FS is `BackgroundJob`, candidate found as `AppService` with same name. Realization mismatch.
- Permission hierarchy disagrees (FS wants `<F>:Foo:Approve` as child of `<F>:Foo`, candidate has it ungrouped).

### Step 4 — Multi-candidate resolution

If multiple candidates match, pick by priority:

1. Candidate in the expected-by-convention project for its kind (per `module_project_layout` or `auxiliary_projects`).
2. Candidate with the exact expected class name.
3. Candidate with the strongest fingerprint overlap.
4. Candidate with highest authorization coverage (for AppService impls).

If tiebreak fails → `CONFLICT` with reason `AMBIGUOUS_CANDIDATES`, listing all contenders.

### Step 5 — Construct the edit list for `UPDATE_IN_PLACE`

Each `update_edit` specifies:

```
{
  target_file: string,
  edits: [
    {
      kind: "add-property" | "add-method" | "add-constant" | "add-child-call" | "add-rule" | "add-enum-member" | "add-key" | "add-di-line" | "add-has-property-call",
      anchor: string,              // exact string in the target file to anchor str_replace
      replacement: string,         // what to substitute for anchor (usually anchor + new content)
      unified_diff_preview: string // human-readable diff for Phase 11 preview
    }
  ]
}
```

Edits are ordered such that earlier edits don't invalidate later anchors.

### Step 6 — Cross-cutting checks

After per-element classification, verify holistic invariants:

1. **Permissions pair integrity.** If `<Feature>Permissions` has `UPDATE_IN_PLACE` to add a constant, the matching `PermissionDefinitionProvider` must also have `UPDATE_IN_PLACE` to register it. If only one of the pair exists in the scout catalog → `CONFLICT` or extend to `UPDATE + CREATE`.
2. **Mapper interface completeness.** If a new entity is `CREATE_NEW`, the `mapper-interface` must be `UPDATE_IN_PLACE` or `CREATE_NEW` to add a mapping method.
3. **DI registration completeness.** A new AppService impl requires an `add-di-line` edit against the feature's `ApplicationModule`.
4. **Enum global converter.** If any new State enum is `CREATE_NEW` and scout reports `JsonStringEnumConverter` not registered anywhere, emit an `update_edit` against `Program.cs` or the HTTP API host module.
5. **Convention compliance.** Candidates that violate CLAUDE.md conventions (AutoMapper Profile when Mapperly is the convention; `System.Linq.Dynamic.Core` when `explicit-switch` is the convention) → `CONFLICT` with severity `medium`, suggested resolution "migrate to <convention> as part of this UPDATE" or "exempt via CLAUDE.md override".

### Step 7 — Realization feasibility check

For each Command, verify `scout_catalog.supported_realizations[<Command.realization>] == true`. If not:
- `BackgroundJob` required but no worker project and `background_job_library` not enabled → `CONFLICT` code `REALIZATION_INFRA_MISSING`.
- `HubMethod` required but no SignalR hub present → `CONFLICT` code `REALIZATION_INFRA_MISSING`.
- Similar for others.

The user resolves at Phase 7: either downgrade the Command's realization (with FS revision noted), add the missing infrastructure outside this skill, or skip the Command for now.

## Output schema

```
{
  halt: null | "INTERNAL_CATALOG_MISMATCH",
  halt_details: {...} | null,

  decisions: [
    {
      fs_element: {type: string, name: string, source_link: string, realization: string | null},
      decision: "REUSE_AS_IS" | "UPDATE_IN_PLACE" | "CREATE_NEW" | "CONFLICT",
      candidate: {                                // null for CREATE_NEW
        class_name: string,
        file_path: string,
        project: string,
        kind: string
      } | null,
      rationale: string,                          // one paragraph
      edits: [                                    // UPDATE_IN_PLACE only
        {kind, anchor, replacement, unified_diff_preview}
      ],
      target_path: string | null,                 // CREATE_NEW: planned path; UPDATE: same as candidate.file_path
      conflict_detail: {                          // CONFLICT only
        code: "SHAPE_MISMATCH" | "REALIZATION_MISMATCH" | "REALIZATION_INFRA_MISSING" | "AMBIGUOUS_CANDIDATES" | "CONVENTION_VIOLATION" | "PAIR_BROKEN",
        severity: "high" | "medium",
        detail: string,
        suggested_resolutions: [string]
      } | null
    }
  ],

  holistic_edits: [                              // cross-cutting edits beyond per-element
    {target_file, edits: [...], reason}
  ],

  summary: {
    reuse_count:    integer,
    update_count:   integer,
    create_count:   integer,
    conflict_count: integer,
    blocking_conflict_count: integer              // CONFLICTs with severity=high
  },

  warnings: [{code, message, fs_element_name}]
}
```

## Halt conditions

- `INTERNAL_CATALOG_MISMATCH` — scout catalog references a project the FS catalog can't contextualize, or vice versa. Should be rare; indicates upstream bug.

Otherwise the reconciler never halts the skill — it reports CONFLICTs and lets the user resolve them at Phase 7.

## What this sub-agent never does

- Never reads files from disk. All data comes from the envelope.
- Never writes files.
- Never runs `dotnet build`.
- Never calls `AskUserQuestion` — the main agent gathers user feedback at Phase 7 and may re-invoke the reconciler with overrides.
- Never silently resolves a CONFLICT — every conflict surfaces to the user with a suggested resolution.
- Never picks a realization type. Realizations are set in Phase 5; the reconciler only consumes them.
- Never edits the FS catalog or scout catalog — both are read-only inputs.

## Re-invocation with overrides

After the Phase 7 gate, the main agent may invoke the reconciler again with `overrides`:

```
overrides: [
  {fs_element: {...}, force_decision: "CREATE_NEW" | "UPDATE_IN_PLACE" | "REUSE_AS_IS", reason: "user override"}
]
```

Overrides bypass shape comparison but still run cross-cutting checks and realization feasibility. An override that violates feasibility returns a new `CONFLICT` and requires another pass.
