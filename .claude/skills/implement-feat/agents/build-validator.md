---
name: build-validator
model: haiku
phase: 7
parallel: no
---

# Build Validator

## Purpose

Run `dotnet build` against the solution and return a structured result that the main agent uses to either proceed to Phase 6 or dispatch `synthesizer` in repair mode.

## Input envelope

```
{
  src_path: string,                  // solution root or the directory containing the .sln
  project_root_namespace: string,
  expected_written_files: [string],  // from Phase 10 output; used to scope repair
  iteration: integer                 // 0-based repair attempt counter (cap at 3)
}
```

## Tools

- `dotnet build` (read-only against source; produces `bin/` artifacts which are not part of the skill's output surface).
- Filesystem read (to pair error locations with file contents for repair handoff).

## Procedure

1. From `src_path`, locate the `.sln` file. If multiple, prefer one whose name contains `project_root_namespace`. If none, halt `{halt: "NO_SOLUTION_FILE"}`.

2. Execute:
   ```
   dotnet build <solution.sln> --nologo --no-restore -v quiet
   ```
   Capture stdout, stderr, exit code.

   If `--no-restore` fails because restore is needed, retry once with `--restore`. Beyond that, halt.

3. Parse compiler diagnostics. MSBuild emits them in the form:
   ```
   <path>(<line>,<col>): error <code>: <message> [<project.csproj>]
   <path>(<line>,<col>): warning <code>: <message> [<project.csproj>]
   ```
   Collect into `errors[]` and `warnings[]`.

4. Classify each error:
   - **Cohort-local** — error's file is in `expected_written_files`. Repairable by `synthesizer` in repair mode.
   - **Cross-cutting** — error is in a file the skill did not write (existing module class, DbContext, etc.). Halt — repair requires user intervention or replan.
   - **Linker/NuGet** — `CS0246`, `NU1101` etc. indicating a missing reference. Halt — probably means a project reference or package is not installed; not a repair the synthesizer can make.

5. Decision:
   - `exit_code == 0` → `{passed: true}`.
   - All errors cohort-local AND `iteration < 3` → `{passed: false, repairable: true, repair_targets: [...]}`.
   - Any cross-cutting or linker error → `{passed: false, repairable: false, halt_reason}`.
   - `iteration >= 3` → `{passed: false, repairable: false, halt_reason: "REPAIR_CAP_REACHED"}`.

6. For each repair target, package `{file_path, current_content, compile_errors: [<errors in that file>]}`. Main agent forwards these to `synthesizer` in repair mode.

## Output schema

```
{
  passed: bool,
  exit_code: integer,
  error_count: integer,
  warning_count: integer,
  errors: [
    {file, line, col, code, message, project, classification: "cohort-local"|"cross-cutting"|"linker"}
  ],
  warnings: [
    {file, line, col, code, message, project}
  ],
  repairable: bool,
  repair_targets: [
    {file_path, current_content, compile_errors: [...]}
  ],
  halt_reason: null | "NO_SOLUTION_FILE" | "RESTORE_FAILED" | "CROSS_CUTTING_ERROR" | "LINKER_ERROR" | "REPAIR_CAP_REACHED",
  raw_output_tail: string     // last 2000 chars of stdout for the report
}
```

## Halt conditions

- No `.sln` file under `src_path`.
- Restore fails persistently.
- Any error outside `expected_written_files`.
- Linker / NuGet reference error.
- Repair iteration count exceeds 3.

## What this sub-agent never does

- Never writes files.
- Never runs `dotnet run`, `dotnet test`, `dotnet ef *`, `dotnet publish`.
- Never decides what the repair content should be — that's `synthesizer:repair`.
- Never calls `AskUserQuestion` — halt and surface to main agent.