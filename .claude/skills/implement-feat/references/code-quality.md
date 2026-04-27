# Code Quality Gates

Authoritative rules the `synthesizer` enforces while writing files and the `planner` checks during pre-flight. Every gate is regex-detectable on synthesized C#.

## 1. No controllers (abort condition)

ABP auto-generates HTTP endpoints from AppService methods via `[RemoteService]` + `[Authorize]`. Any class inheriting `Controller`, `ControllerBase`, or carrying `[ApiController]` is an immediate halt. All HTTP entry points must be public methods on AppService classes.

**Detect:** `class\s+\w+\s*:\s*(Controller|ControllerBase)\b` or `\[ApiController\]`.

## 2. Event publishing

`ILocalEventBus` is for intra-module loose-coupling only. Cross-aggregate orchestration goes through a `DomainService`. Cross-module flows go through a Domain Service or a deliberate `EventHandler` (still in Application, not Domain).

**Forbidden in Domain layer:** any reference to `ILocalEventBus`, `IDistributedEventBus`, `PublishAsync`.
**In Application layer:** flag for review when `ILocalEventBus.PublishAsync` appears alongside a cross-aggregate write.

## 3. Exception handling

Every async method in AppService / BackgroundJob / HostedService / Hub realizations is wrapped in try-catch-translate. Specific catches first (`EntityNotFoundException`, `BusinessException`, `AbpAuthorizationException`), then domain exceptions, then a final catch that logs context and re-throws. No bare async method bodies.

**BackgroundJob / HostedService:** catch must NOT re-throw — log and continue (workers must survive single-iteration failure).

## 4. Naming conventions

| Artifact | Pattern |
|---|---|
| AppService | `<Context><AggregateRoot>AppService` |
| AppService interface | `I<Context><AggregateRoot>AppService` |
| Output DTO | `<Entity>Dto`, `<Entity>ListDto`, `<Entity>DetailDto` |
| Input DTO | `Create<Entity>Dto`, `Update<Entity>Dto` |
| Filter DTO | `Get<Entity>ListInput` |
| Validator | `<Dto>Validator` |
| Permission constants | `<Feature>Permissions.<Aggregate>.<Action>` |
| Domain Service | `<Context><AggregateRoot>Service` or `<Context><BoundedContext>DomainService` |
| BackgroundJob | `<CommandName>Job` |
| HostedService | `<CommandName>HostedService` |
| Hub | `<Feature>Hub` |
| EventHandler | `<CommandName>Handler` |

Bounded-context prefix (e.g. `Lc` for Checklist module) is mandatory when CLAUDE.md declares one.

**Never:** bare `Service`, `Manager`, `Helper`; never `Controller*` of any form.

## 5. Dynamic sorting

No `switch(input.SortBy)` in any AppService. Sort fields go through an `IQueryable<T>` ordering expression — typically `Dynamic LINQ` (`.OrderBy(input.Sorting)`) or a dedicated `SortExpressionBuilder` that maps a whitelist of allowed field names to expressions.

**Detect:** `switch\s*\(\s*\w*[Ss]ort` inside an AppService method.

## 6. Data mapping efficiency (select-before-fetch)

Projection happens inside the `IQueryable` chain, before materialization. `.Select(x => MapToDto(x))` (or Mapperly projection) precedes `.ToListAsync()` / `.FirstOrDefaultAsync()`.

**Anti-pattern:** `var entities = await query.ToListAsync(); var dtos = entities.Select(...)`.
**Correct:** `var dtos = await query.Select(x => new <Entity>Dto { ... }).ToListAsync();`.

For detail queries, prefer `await repository.GetQueryableAsync()` + filter + project + `FirstOrDefaultAsync()` over `await repository.GetAsync(id)`.

## 7. Soft-delete handling

ABP applies soft-delete via `ISoftDelete` and `IDataFilter`. Use `repository.DeleteAsync(entity)` — never `entity.IsDeleted = true`, `entity.DeleterId = ...`, `entity.DeletedTime = ...`. Queries on `ISoftDelete` entities automatically exclude deleted rows.

**Forbidden:** explicit assignment of `IsDeleted`, `DeleterId`, `DeletedTime` in domain code.
**Forbidden:** `HasQueryFilter(x => !x.IsDeleted)` — ABP handles it.

## 8. EF Core configuration

One `ModelBuilder` extension method per module (`ConfigureXyzModule`) instead of scattered `IEntityTypeConfiguration<T>` classes. The extension is called from `DbContext.OnModelCreating`. All entity configurations for the feature live inside that one method.

**Index naming:** never `.HasName(...)`. Let EF auto-generate.

**Existing ABP solutions** that already use `IEntityTypeConfiguration<T>` per entity: respect the convention; do not mix patterns within one module. The convention used is detected by `repo-scout`; reconciler emits in the matching style.

## 9. Tenant scoping

`IMultiTenant` entities have `TenantId` set by ABP via `ICurrentTenant` automatically on insert. Domain entity constructors / methods do not accept or assign `TenantId`. The only legitimate explicit set is a deliberate cross-tenant override using `ICurrentTenant.Change(tenantId)` scope — rare, must be in Application or Infrastructure, never Domain.

System-wide / backoffice entities do NOT inherit `IMultiTenant` — that adds unneeded filter overhead.

**Forbidden in Domain layer:** any `entity.TenantId = ...` or `TenantId` constructor parameter.

## 10. Logging

Every Command realization (AppService method, BackgroundJob.ExecuteAsync, HostedService iteration, Hub method, EventHandler.HandleEventAsync) injects `ILogger<T>` via constructor and emits, at minimum:

- **Entry:** `_logger.LogInformation("Entering {Method} for user {UserId} with input {@Input}", ...)`. PII fields masked.
- **Exit:** `_logger.LogInformation("Exiting {Method} with result {ResultSummary}", ...)`. Lists log row count, not the full result.
- **Exception:** `_logger.LogError(ex, "Failed {Method}: {Message}", ...)` inside catch.

Structured (`{Placeholder}`), not interpolated (`$"..."`). Levels: Information for normal flow, Warning for recoverable issues, Error for thrown exceptions.

---

## Synthesizer responsibilities

After writing each file, the synthesizer scans it against gates 1–10. Gate 1 (controller) is an **abort** — halt synthesis, surface the violation, refuse to continue. Gates 2–10 are **halt-pending-decision** — main agent re-asks the user via `AskUserQuestion` (revise / override / cancel).

After all files are written and `dotnet build` passes, the synthesizer emits a per-gate coverage report consumed by the final report writer.

## Planner pre-flight responsibilities

Before any synthesis dispatch, the planner walks every `create` and `update_edit` descriptor and checks whether the planned content (template kind + edit payload) would trigger any gate violation. Pre-flight failures surface in the Phase 6 approval preview — the user sees them before approving.

This duplication (plan-time and synth-time) is intentional: plan-time catches cheap violations early, synth-time catches anything the templates generate that the planner couldn't have predicted (e.g., template parameter substitution producing a switch statement).