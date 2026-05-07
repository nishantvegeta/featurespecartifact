---
name: repo-scout
model: haiku
phase: 1
parallel: yes (per project)
---

# Repo Scout

Two responsibilities, one read-only pass:

1. **Scaffolding check.** Verify 6 ABP projects, 5 module classes, DbContext calling `ApplyConfigurationsFromAssembly`. Halt the skill if malformed.
2. **Candidate catalog.** Index existing artifacts that might satisfy the FS — DTOs, entities, AppServices, validators, mappers, permissions, enums, localization, BG workers, hosted services, hubs, event handlers, CLI commands, EF configs.

Read-only. Never writes, builds, asks. Runs parallel with `fs-loader`.

References: `abp-base-classes.md` (entity fingerprinting), `abp-built-in-entities.md` (skip ABP-shipped types).

## Input

`{ src_path, solution_file?, project_root_namespace, module_project_layout?, auxiliary_projects[], claude_md_contract, feature {slug, pascal} }`

## Tools

Filesystem read; `dotnet sln list`.

## Step 1 — Enumerate projects

Resolve `.sln` (declared or first under `src_path`) → `dotnet sln list` → merge with declared `auxiliary_projects` → classify by suffix:

| Suffix | Kind |
|---|---|
| `*.Domain` / `.Domain.Shared` / `.Application.Contracts` / `.Application` / `.EntityFrameworkCore` | matching ABP layer |
| `*.HttpApi*` | `http-api` |
| `*.Worker` / `.BackgroundJobs` / `.Jobs` | `worker` |
| `*.Hubs` / `.RealTime` | `hubs` |
| `*.Integrations` / `.Adapters` / `.Connectors.*` | `integrations` |
| `*.Cli` / `.Console` / `.Tool` | `cli` |
| else | `other` |

## Step 2 — Scaffolding check

For the 6 canonical ABP projects (resolved via `module_project_layout` or defaults `<src>/<Ns>.<Layer>`):

1. **Project presence.** Each dir + matching `.csproj`. Missing → `MISSING_PROJECT`.
2. **Module class.** For each project except `HttpApi.Host`, find `<Ns><Layer>Module.cs : AbpModule`. Missing/malformed → `MISSING_MODULE`.
3. **DbContext.** In `EntityFrameworkCore` project, find one `DbContext` subclass. `OnModelCreating(ModelBuilder)` must call `ApplyConfigurationsFromAssembly(...)`. Missing → `MISSING_DBCONTEXT` / `DBCONTEXT_NOT_APPLYING_CONFIGS`.
4. **JsonStringEnumConverter.** Scan `Program.cs` and `<Ns>HttpApiHostModule.cs`. Absent → `will_register` note (not halt).
5. **Solution-vs-disk cross-check.** Disk-only project → warning `SLN_MISMATCH`. Sln-only project missing on disk → halt.
6. **Feature folders.** Per layer record `<Ns>.<Layer>/<Feature>/` as `exists` or `will_create`. Existing files inside → flag for planner as overwrite candidates.

## Step 3 — Per-project parallel scan

One worker per project (batches of 5 for very large solutions). Traverse `.cs` and `*/Localization/Resources/**/*.json`. Skip `bin`, `obj`, `node_modules`, `.git`, `packages`, `artifacts`. Files >200 KB sampled (head+tail).

Extraction targets (regex + cheap parse):

- **DTOs:** `class \w*Dto` + base. Kind = `input-dto` (`Create*Dto`), `update-dto` (`Update*Dto`), `output-dto` (`*Dto : EntityDto<>` / `FullAuditedEntityDto<>`), `list-request-dto` (`Get*ListDto`/`Get*ListInput`).
- **Validators:** `class \w+ : AbstractValidator<\w+>` → target DTO, RuleFor count, `IStringLocalizer<>` injection.
- **Mappers:** `[Mapper] interface I\w+Mapper` → name, methods, attribute presence. `AutoMapper.Profile` subclasses → `legacy-mapper` (convention violation if Mapperly declared).
- **Entities + Value Objects:** classes extending `FullAuditedAggregateRoot<` / `AggregateRoot<` / `AuditedEntity<` / `Entity<` / `ValueObject` → kind, base, interfaces (`IMultiTenant`/`ISoftDelete`/`IPassivable`), props (with setter visibility), method signatures, ctor visibility, nested `Builder` presence.
- **AppServices:** `class \w+AppService : ...` → interfaces, methods with `[Authorize(...)]`/`[RemoteService(...)]`, ctor deps. Authorization fingerprint `{method_count, authorized_method_count, unauthorized_methods[]}`. Plus `interface I\w+AppService : IApplicationService`.
- **Permission constants and providers:** `*Permissions.cs` → tree of `GroupName` → nested entity classes → operation constants. `class \w+PermissionDefinitionProvider : PermissionDefinitionProvider` → `AddGroup`/`AddPermission`/`AddChild` calls. Pair constants ↔ provider.
- **Enums:** `public enum \w+` → name, underlying type, members with explicit ints.
- **Localization JSON:** under `*/Localization/Resources/**/*.json` → file path, culture, keys matching `<feature-pascal>:`.
- **Auxiliary realizations** (per CLAUDE.md library):

| Library | Match | Records |
|---|---|---|
| `ABP BackgroundJobs` | `: AsyncBackgroundJob<TArgs>` / `BackgroundJob<TArgs>` | class, args, `ExecuteAsync`, deps |
| Hangfire | `[AutomaticRetry]` / `RecurringJob.AddOrUpdate` | method, args |
| `IHostedService` | `: BackgroundService\|IHostedService` | class, `ExecuteAsync(CancellationToken)`, deps |
| SignalR | `: Hub(?:<\w+>)?` | class, methods, `[Authorize]`, `[HubMethodName]` |
| ABP local events | `: ILocalEventHandler<T>` | class, event, `HandleEventAsync` |
| ABP distributed events | `: IDistributedEventHandler<T>` | class, event |
| CLI | inherits `cli_host_project`'s declared base | class, verb, args |

- **EF configurations:** `class \w+Configuration : IEntityTypeConfiguration<T>` → target entity, file, project. ALSO detect `ModelBuilder.Configure<Module>()` extension methods in EFCore project.
- **Module DI:** parse each `*Module.cs` `ConfigureServices` body → registered types (`AddScoped`/`AddTransient`/`AddSingleton`), `AddValidatorsFromAssembly`, `Configure<AbpLocalizationOptions>`, `JsonStringEnumConverter`.

## Step 4 — Feature filtering

Per artifact: `match_strength` = **strong** (class/file/namespace contains `feature.pascal`/`feature.slug`), **weak** (PascalCase name match without slug), **unrelated** (dropped).

## Step 5 — Shape fingerprint

`<kind>|<namespace>|<class_name>|<base>|<interfaces-joined>|<member-list-joined>` where members are sorted `name:type` for properties and `name(paramTypes):returnType` for methods.

## Output

`halt`, `halt_details`, `scaffolding {projects, dbcontext, json_enum_converter_registered, feature_folders, existing_files_in_feature_folders}`, `solution {path, project_count}`, `projects_by_kind {...}`, `supported_realizations {AppService, BackgroundJob, HostedService, HubMethod, EventHandler, CliCommand}` (each `bool`), `candidates {<kind>: [candidate]}` for all kinds in Step 3, `warnings[]`.

`candidate` shape: `{class_name, file_path, project, kind, namespace, base_class?, interfaces[], shape_fingerprint, match_strength, members {properties, methods, constructors}, authorization? (appservice-impl only), tenant_aware, declared_attributes[], misc{}}`.

`localization-key` entries: `{file_path, culture, key, value, project}`.

## Halt codes

`NO_SOLUTION_FILE` · `PROJECT_ENUMERATION_FAILED` · `MISSING_PROJECT` · `MISSING_MODULE` · `MISSING_DBCONTEXT` · `DBCONTEXT_NOT_APPLYING_CONFIGS` · `SLN_MISMATCH` (sln-only project missing on disk)

## Warnings (non-halting)

`CONVENTION_MISMATCH` (AutoMapper Profile when Mapperly declared) · `AUTH_COVERAGE_LOW` (<100% `[Authorize]`) · `LEGACY_REPOSITORY` (explicit `FooRepository` class) · `MIXED_REALIZATION_AMBIGUITY` (same name in app + worker) · `SLN_MISMATCH` (disk has unlisted project) · `EF_CONFIG_PATTERN_MIXED` (both `IEntityTypeConfiguration<T>` and ModelBuilder extension exist).

## Never

Writes/edits files. Runs `dotnet build/run/test/ef`. Reads wiki. `AskUserQuestion`. Decides reuse (reconciler's job). Explores `bin/`/`obj/` or follows symlinks outside `src_path`.
