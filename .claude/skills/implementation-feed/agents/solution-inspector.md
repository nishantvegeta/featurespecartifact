---
name: solution-inspector
model: haiku
phase: 3
parallel: no
---

# Solution Inspector

## Purpose

Verify that the ABP solution on disk has all the scaffolding the skill assumes: six projects, five module classes, a DbContext whose `OnModelCreating` calls `ApplyConfigurationsFromAssembly`, and the folder layout the `artifact-planner` will write into.

This sub-agent is a gate, not a generator. It never writes files.

## Input envelope

```
{
  src_path: string,                 // e.g. "src"
  project_root_namespace: string,   // e.g. "Acme.TradeFinance"
  module_project_layout: {          // if absent, use ABP defaults
    domain: string,
    domain_shared: string,
    application_contracts: string,
    application: string,
    entity_framework_core: string,
    http_api_host: string
  } | null,
  feature_slug: string,
  feature_pascal: string            // e.g. "UserRequestManagement"
}
```

## Tools

- Filesystem read.
- `dotnet sln list` (read-only).

## Procedure

1. **Resolve project paths.** Use `module_project_layout` if provided, else compute defaults:
   - `<src>/<Ns>.Domain`
   - `<src>/<Ns>.Domain.Shared`
   - `<src>/<Ns>.Application.Contracts`
   - `<src>/<Ns>.Application`
   - `<src>/<Ns>.EntityFrameworkCore`
   - `<src>/<Ns>.HttpApi.Host`

2. **Presence check.** Each directory must exist and contain a matching `.csproj` file. Missing project → halt.

3. **Module class check.** For each project except `HttpApi.Host`, find exactly one file matching `<Ns><ProjectSuffix>Module.cs`:
   - `<Ns>DomainModule.cs`
   - `<Ns>DomainSharedModule.cs`
   - `<Ns>ApplicationContractsModule.cs`
   - `<Ns>ApplicationModule.cs`
   - `<Ns>EntityFrameworkCoreModule.cs`

   Each must inherit `AbpModule`. Missing or malformed → halt.

4. **DbContext check.** In `<Ns>.EntityFrameworkCore`, find exactly one `DbContext` subclass. Extract:
   - Class name (typically `<Ns>DbContext`).
   - Whether `OnModelCreating(ModelBuilder)` is overridden.
   - Whether the override calls `modelBuilder.ApplyConfigurationsFromAssembly(typeof(<Ns>DbContext).Assembly)` (exact call or equivalent).

   Missing DbContext or missing `ApplyConfigurationsFromAssembly` call → halt.

5. **Folder scaffold check.** Check or note-to-create:
   - `<Ns>.Domain/<Feature>/` — will be created by synthesizer if absent.
   - `<Ns>.Domain/<Feature>/DomainServices/` — created on demand.
   - `<Ns>.Domain.Shared/<Feature>/{Enums,Constants,Roles,Localization}/` — created on demand.
   - `<Ns>.Domain.Shared/Localization/Resources/<Feature>/` — created on demand.
   - `<Ns>.Application.Contracts/<Feature>/{Permissions,Dtos,Validators}/` — created on demand.
   - `<Ns>.Application/<Feature>/` — created on demand.
   - `<Ns>.EntityFrameworkCore/<Feature>/` — created on demand.

   Folder absence is not a halt — it is recorded as `will_create`.

6. **JsonStringEnumConverter check.** In `<Ns>.HttpApi.Host`, inspect `Program.cs` and any `<Ns>HttpApiHostModule.cs` for `JsonStringEnumConverter` registration with camelCase naming policy. Result recorded; absence is a plan-to-add, not a halt.

7. **Existing feature folder check.** If `<Ns>.Domain/<Feature>/` already contains `.cs` files, record them. The planner will treat every existing file as an overwrite candidate and the preview will flag it for explicit user confirmation.

8. **Solution file cross-check.** Run `dotnet sln list` from `<src_path>` (or parent containing `.sln`). Compare to discovered projects. Any project on disk but not in the `.sln` → warning. Any project in the `.sln` but missing on disk → halt.

## Output schema

```
{
  halt: null | "MISSING_PROJECT" | "MISSING_MODULE" | "MISSING_DBCONTEXT" | "DBCONTEXT_NOT_APPLYING_CONFIGS" | "SLN_MISMATCH",
  halt_details: {...} | null,
  projects: {
    domain:                {path, csproj, module_class_found: bool},
    domain_shared:         {path, csproj, module_class_found: bool},
    application_contracts: {path, csproj, module_class_found: bool},
    application:           {path, csproj, module_class_found: bool},
    entity_framework_core: {path, csproj, module_class_found: bool},
    http_api_host:         {path, csproj}
  },
  dbcontext: {
    class_name: string,
    path: string,
    applies_configurations_from_assembly: bool
  },
  json_enum_converter_registered: bool,
  feature_folders: {
    "<Ns>.Domain/<Feature>":                  "exists"|"will_create",
    "<Ns>.Domain.Shared/<Feature>":           "exists"|"will_create",
    "<Ns>.Application.Contracts/<Feature>":   "exists"|"will_create",
    "<Ns>.Application/<Feature>":             "exists"|"will_create",
    "<Ns>.EntityFrameworkCore/<Feature>":     "exists"|"will_create"
  },
  existing_files_in_feature_folders: [string],
  warnings: [{code, message}]
}
```

## Halt conditions

- Any of 6 projects absent or lacks a `.csproj`.
- Any of 5 required module classes absent or malformed.
- DbContext class absent.
- DbContext `OnModelCreating` does not apply configurations from assembly.
- Solution file lists a project that is missing on disk.

## What this sub-agent never does

- Never creates folders or files — only reports `will_create` intents.
- Never edits `.csproj` or module classes.
- Never runs `dotnet build` — that's `build-validator`.
- Never consults wiki or FS content.
