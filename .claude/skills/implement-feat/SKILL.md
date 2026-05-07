---
name: implement-feat
description: "Deterministic ABP code generation from a wiki-published Feature Specification, grounded in a prior scan of the repository. Reconnoitres the solution for existing DTOs, entities, AppServices, background workers, hosted services, hubs and event handlers; reconciles them against the Feat Spec into REUSE / UPDATE / CREATE / CONFLICT; writes code only after two user approval gates. Enforces ABP quality gates (no controllers, DomainService over ILocalEventBus cross-aggregate, exception handling, naming, dynamic sorting, select-before-fetch mapping, DeleteAsync soft-delete, ModelBuilder EF Core config, structured logging, implicit tenant scoping). Commands realize as AppService / BackgroundJob / IHostedService / SignalR Hub / EventHandler / CLI per FS Execution-model declaration plus repo evidence — not AppService-only. Migrations remain manual."
when_to_use: "After generate-feat-spec has published a Feat Spec and its DDD node pages to the wiki, the Feat Spec has no unresolved critical/high Conflicts, the solution is present on disk, and CLAUDE.md declares the required ABP conventions. Invoke per feature slug."
argument-hint: "[feature-slug]"
disable-model-invocation: true
model: "haiku"
---

# Implement Feature — Repo-Aware ABP Code Generation

**Announce at start:** "I'm using the implement-feat skill. I'll scan your repo first, reconcile the Feat Spec against what already exists (REUSE / UPDATE / CREATE), gate on your approval, plan the artifacts with quality pre-flight, gate again, cut a `feat/<slug>` branch from `develop`, then synthesize. Migrations and commits stay manual."

<HARD-GATE>

**Approval gates** (both absolute, both via `AskUserQuestion`, never as prose):
- Phase 3 — Reconciliation Plan
- Phase 5 — Artifact Plan

**FS lock check.** Refuse a Feat Spec with `[TODO]`/`[PENDING]`/`[TBD]`/`[PLACEHOLDER]` tokens, or with an Open Blockers Conflict at severity `critical`/`high`.

**Reconciliation discipline.** Every FS element carries exactly one of `REUSE_AS_IS` / `UPDATE_IN_PLACE` / `CREATE_NEW` / `CONFLICT`. Every Command carries exactly one realization from {AppService, BackgroundJob, IHostedService, HubMethod, EventHandler, CliCommand}; ambiguous → `AskUserQuestion`. Existing DTO/Entity/Validator/Mapper/Permission/AppService method already satisfying the FS is reused, not re-synthesized.

**Synthesis discipline.** `REUSE_AS_IS` files are never opened. `UPDATE_IN_PLACE` uses `str_replace` with a unique anchor — never full-file rewrite. `CREATE_NEW` paths must not exist on disk; drift halts with `FILE_DRIFT`. No file is overwritten without explicit `UPDATE_IN_PLACE`.

**Branch discipline.** Synthesis runs on `feat/<feature-slug>` from `develop` (both overridable via `AskUserQuestion` and CLAUDE.md `branch_naming_pattern` / `default_base_branch`). Working tree must be clean (`WORKING_TREE_DIRTY`); base branch must exist locally (`BASE_BRANCH_MISSING`). The skill never runs `git commit/push/pull/fetch/merge/rebase` or any history rewrite — commits are the user's manual step.

**Architecture (gate 1 = abort).** No `Controller` / `ControllerBase` / `[ApiController]`; AppService methods + `[RemoteService]` + `[Authorize]` are the HTTP entry point. No domain events from Domain layer; cross-aggregate orchestration goes through DomainService; cross-module reactions through an Application-layer EventHandler. No `ILocalEventBus.PublishAsync` for cross-aggregate writes. No inlined user-visible strings — `IStringLocalizer<<Feature>Resource>` keys only. No `dotnet ef *`.

**Quality gates 1–10:** see `references/code-quality.md`. Gate 1 aborts; gates 2–10 halt synthesis pending user revision or override.

</HARD-GATE>

---

## Overview

Three differences from a naive code generator:

1. **Repo first.** `repo-scout` enumerates every project and indexes candidates by name, shape, and signature.
2. **Reconcile against existing.** `reconciler` does a three-way comparison (FS element ↔ candidate ↔ target pattern) and classifies every FS element. User approves before any planning.
3. **Pluggable Command realization.** Each Command's execution model is read from FS `**Execution model:**` plus repo evidence. Not every Command is an AppService method.

Outcomes: bidirectional traceability, manual migrations, two strict approval gates, ten quality gates, no controllers ever.

---

## The 8 phases

| # | Phase | Owner | Parallel? | Halt / gate |
|---|---|---|---|---|
| 0 | Scope + CLAUDE.md contract | main | — | Required CLAUDE.md fields missing |
| 1 | FS load ‖ repo scan | `fs-loader` ‖ `repo-scout` | yes | Placeholders, blocking conflicts, missing 6 ABP projects, DbContext absent |
| 2 | Reconciliation + realization assignment | `reconciler` | no | Every FS element classified; every Command has a realization |
| 3 | **Reconciliation approval gate** | main `AskUserQuestion` | — | `approve` / `revise` / `cancel` |
| 4 | Artifact planning + traceability + quality pre-flight | `planner` | per layer | Forward+backward coverage, pair integrity, quality pre-flight |
| 5 | **Artifact plan approval gate** | main `AskUserQuestion` | — | Diffs + quality checklist visible |
| 6 | Branch setup → Synthesis → post-write quality scan | main → `synthesizer` | per cohort file | `WORKING_TREE_DIRTY`, `BASE_BRANCH_MISSING`, `QUALITY_VIOLATION`, `CONTROLLER_DETECTED` (abort) |
| 7 | Build + repair loop | `build-validator` (+ `synthesizer:repair`) | no | `dotnet build` green; cap 3 repair iterations |
| 8 | Final report | main | — | `IMPLEMENTATION_REPORT_<Feature>.md` written |

Cohorts inside Phase 6, serial: A (Domain.Shared) → B (Domain) → C (Application.Contracts) → D (Application + EFCore + auxiliary).

## Phase notes

- **Phase 0.** Read slug from arguments (absent → `AskUserQuestion` listing slugs under `<wiki_local_path>/feat-specs/`). Verify CLAUDE.md per fields table below. Confirm scope.
- **Phase 1.** Dispatch `fs-loader` and `repo-scout` simultaneously (independent inputs). See `agents/fs-loader.md`, `agents/repo-scout.md`.
- **Phase 2.** `reconciler` runs once, serially. See `agents/reconciler.md`. References: `command-realizations.md`, `update-in-place.md`.
- **Phase 3.** Plan grouped by decision (REUSE / UPDATE / CREATE / CONFLICT) with per-row rationale. CONFLICT-containing plan never proceeds without user-chosen resolution.
- **Phase 4.** `planner` per layer in parallel (Domain, Domain.Shared, Application.Contracts, Application, EFCore, plus auxiliary cohorts when realization decisions exist). Each emits `create` / `update_edit` / `reuse_reference_only`. Holistic checks afterward: forward coverage, backward provenance, reconciliation coherence, pair integrity, cohort dependency, anchor uniqueness, quality pre-flight (gates 1–10). Failure halts; main re-dispatches with defect list (cap 2 replans).
- **Phase 5.** Preview = new files (path + summary + FS source), unified diffs per `update_edit`, reuse references, traceability matrix, quality pre-flight, CLAUDE.md defaults used, manual migration commands.
- **Phase 6a (branch).** `git status --porcelain` → must be empty. Compute branch from `branch_naming_pattern` (default `feat/<feature-slug>`), base from `default_base_branch` (default `develop`). `git rev-parse --verify <base>` must succeed. If branch exists locally → ask `checkout existing` / `pick a different name` / `cancel`. Confirm via `AskUserQuestion`: `use feat/<slug> from develop` / `customize` / `stay on current branch (advanced — not develop/main/master)` / `cancel`. Record branch, base, base SHA.
- **Phase 6b (synth).** `synthesizer` cohort A → B → C → D serially; files within a cohort run in parallel. `create` refuses on existing path (`PHANTOM_CREATION`). `update_edit` verifies content hash matches plan-time hash (`FILE_DRIFT`) before applying each `str_replace`. After each write, scan against gates 1–10: gate 1 aborts; gates 2–10 halt pending user decision (revise / override / cancel).
- **Phase 7.** `build-validator` runs `dotnet build`. Errors all in synth-written files AND iteration < 3 → `synthesizer:repair`. Cross-cutting / linker / NuGet error → halt. Iteration ≥ 3 → halt `REPAIR_CAP_REACHED`.
- **Phase 8.** Main writes `<wiki_local_path>/feat-specs/<feature-slug>/IMPLEMENTATION_REPORT_<Feature>.md` from `templates/implementation-report-template.md`.

## Per-kind reference map (synthesizer + planner)

| Kind / layer | References |
|---|---|
| `aggregate-root`, `child-entity`, `value-object` | `domain-layer.md`, `abp-base-classes.md`, `abp-built-in-entities.md` |
| `domain-service` | `domain-services.md` |
| `enum`, `constants`, `roles`, `resource-marker`, `localization-json` | `domain-shared-layer.md`, `localization.md` |
| `permissions-constants`, `permission-provider` | `permissions.md` |
| `input-dto`, `update-dto`, `output-dto`, `list-request-dto`, `validator` | `dtos-validators.md` |
| `appservice-interface`, `appservice-impl` | `appservices.md` |
| `mapper-interface` | `mapperly.md` |
| `ef-configuration`, `ef-modelbuilder-extension` | `ef-core.md` |
| `background-job`, `hosted-service`, `hub-class`, `hub-method-edit`, `event-handler`, `cli-command` | `command-realizations.md` |
| any `update_edit` | `update-in-place.md` |
| post-write quality scan (always) | `code-quality.md` |

---

## Sub-agents

| Agent | Phase | Parallel | Spec |
|---|---|---|---|
| `fs-loader` | 1 | per page | `agents/fs-loader.md` |
| `repo-scout` | 1 | per project | `agents/repo-scout.md` |
| `reconciler` | 2 | no | `agents/reconciler.md` |
| `planner` | 4 | per layer | `agents/planner.md` |
| `synthesizer` | 6 (+ 7 repair) | per cohort file | `agents/synthesizer.md` |
| `build-validator` | 7 | no | `agents/build-validator.md` |

All sub-agents run on Haiku.

## Tool permissions

| Tool | Phase | Allowed for |
|---|---|---|
| Filesystem read | 0–8 | main + every sub-agent |
| Filesystem write | 6, 8 | `synthesizer` (post-Phase 5 approval); main (final report only) |
| `str_replace` | 6 | `synthesizer` |
| `dotnet sln list` | 1 | `repo-scout` |
| `dotnet build` | 7 | `build-validator` |
| `git status` / `rev-parse` / `branch` (read) | 6a | main |
| `git checkout`, `git checkout -b` | 6a | main (post-Phase 5 approval) |
| `AskUserQuestion` | 0, 2, 3, 5, 6, 6a | main |

**Forbidden everywhere:** `dotnet ef *`, `dotnet run`, `dotnet test`, `dotnet add`, `dotnet publish`, network, wiki write, GitLab write, full-file overwrite of non-empty files, all mutating git commands (`commit`/`push`/`pull`/`fetch`/`merge`/`rebase`/`reset --hard`/`stash`).

---

## CLAUDE.md fields

| Field | Required | Default | Used by |
|---|---|---|---|
| `gitlab_project_id` | yes | — | report cross-references |
| `wiki_url` | yes | — | FS canonical link |
| `wiki_local_path` | yes | `docs` | on-disk wiki location |
| `project_root_namespace` | yes | — | all generated namespaces |
| `src_path` | yes | `src` | solution root to scan |
| `solution_file` | no | first `*.sln` under `src_path` | enumeration anchor |
| `module_project_layout` | no | ABP defaults | expected ABP project paths |
| `auxiliary_projects` | no | `[]` | Worker / BackgroundJobs / Hubs / Integrations / Cli paths |
| `tenancy_model` | recommended | — | `IMultiTenant` decision; AppService tenant guards |
| `validation_library` | no | `FluentValidation` | validator base class |
| `object_mapping_library` | no | `Mapperly` | mapper pattern |
| `permissions_class` | no | `<Feature>Permissions` | permissions class name |
| `db_table_prefix` | no | `App` | EF `ToTable` prefix |
| `sorting_strategy` | no | `dynamic-expression` | enforced by gate 5 |
| `enum_serialization` | no | `camelCase strings, global` | JSON converter registration |
| `localization_resource_name` | no | `<Feature>Resource` | localizer type arg |
| `background_job_library` | no | `ABP BackgroundJobs` | BackgroundJob realization |
| `hosted_service_pattern` | no | `IHostedService` | HostedService realization |
| `realtime_library` | no | none | HubMethod realization |
| `event_bus_library` | no | `ABP LocalEventBus, intra-module only` | EventHandler realization |
| `cli_host_project` | no | — | CLI command host |
| `notable_gotchas` | no | — | passed to synthesizer as context |
| `exception_handling_strategy` | no | `try-catch-translate` | gate 3 |
| `logging_level` | no | `Information` | gate 10 |
| `default_base_branch` | no | `develop` | source branch in 6a |
| `branch_naming_pattern` | no | `feat/<feature-slug>` | target branch in 6a |

Missing required → halt at Phase 0. Missing optional → soft warning listing the default used.

---

## Outcome codes

`FS_NOT_FOUND`, `FS_NOT_LOCKED`, `FS_HAS_BLOCKING_CONFLICT`, `CLAUDE_MD_INCOMPLETE`, `SOLUTION_SCAFFOLDING_MISSING`, `REALIZATION_AMBIGUOUS`, `RECONCILIATION_CONFLICT`, `AUXILIARY_PROJECT_MISSING`, `USER_REVISION_REQUESTED`, `USER_CANCELLED`, `WORKING_TREE_DIRTY`, `BASE_BRANCH_MISSING`, `CONTROLLER_DETECTED`, `QUALITY_VIOLATION`, `FILE_DRIFT`, `BUILD_UNRECOVERABLE`.

## Expected output

Two approved gates → fresh `feat/<slug>` branch off `develop` → new C# files + in-place edits → all 10 quality gates pass → `dotnet build` green → `IMPLEMENTATION_REPORT_<Feature>.md` (REUSE / UPDATE / CREATE inventory + quality coverage + branch metadata) → 100% bidirectional traceability. No migrations run, no commits made.

After completion: review quality coverage, run migration commands listed in the report, seed permission grants, write tests, then `git add` / `commit` / `push` and open the MR.
