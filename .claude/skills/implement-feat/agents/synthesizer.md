---
name: synthesizer
model: haiku
phase: 6 (plus repair invocations during phase 7)
parallel: yes (per file within a cohort)
---

# Synthesizer

## Purpose

Execute one file descriptor from the approved artifact plan, then scan the result against the 10 quality gates. This sub-agent is the **only** one permitted to write files, and only after the Phase 5 approval gate.

Three operation modes plus one repair mode. After every write, an inline post-write quality scan runs — the responsibilities formerly belonging to `quality-validator` and `quality-reporter`.

## Reference files

Per descriptor `kind`, consult:

| Kind | References |
|---|---|
| `aggregate-root`, `child-entity`, `value-object` | `references/domain-layer.md`, `references/abp-base-classes.md` |
| `domain-service` | `references/domain-services.md` |
| `enum`, `constants`, `roles`, `resource-marker` | `references/domain-shared-layer.md` |
| `localization-json` | `references/localization.md` |
| `permissions-constants`, `permission-provider` | `references/permissions.md` |
| `input-dto`, `update-dto`, `output-dto`, `list-request-dto`, `validator` | `references/dtos-validators.md` |
| `appservice-interface`, `appservice-impl` | `references/appservices.md` |
| `mapper-interface` | `references/mapperly.md` |
| `ef-configuration`, `ef-modelbuilder-extension` | `references/ef-core.md` |
| `background-job`, `hosted-service`, `hub-class`, `hub-method-edit`, `event-handler`, `cli-command` | `references/command-realizations.md` |
| any `update_edit` mode | `references/update-in-place.md` |
| **post-write quality scan (always)** | `references/code-quality.md` |

## Modes

| Mode | Trigger | Behaviour |
|---|---|---|
| `create` | descriptor `action: "create"` | render template into a new file at descriptor path; refuse if path exists |
| `update_edit` | descriptor `action: "update_edit"` | apply edit list via sequential `str_replace`; refuse on anchor mismatch |
| `reuse_reference_only` | descriptor `action: "reuse_reference_only"` | no I/O; return `{written: false, reused: true}` |
| `repair` | Phase 7 build failure | apply minimal `str_replace` edits resolving compile errors |

## Input envelope

```
{
  mode: "create" | "update_edit" | "reuse_reference_only" | "repair",
  file_descriptor: <from planner>,
  fs_catalog: <fs-loader output>,
  reconciliation: <reconciler output>,
  claude_md_contract: <resolved contract>,
  cohort: "A" | "B" | "C" | "D",
  current_content: string | null,                  // provided in update_edit and repair
  compile_errors: [{file, line, column, code, message}]    // repair only
}
```

## Tools

- Filesystem write (restricted to `src_path` for new files).
- `str_replace` (restricted to files identified by the approved descriptor).
- Filesystem read (to load current content for drift detection and update edits).

## Cohort guardrails

Cohort A → B → C → D execute serially. Files within a cohort run in parallel. Descriptors outside a worker's cohort → halt `COHORT_MISMATCH`.

| Cohort | Kinds |
|---|---|
| **A** (Domain.Shared) | enums, constants, roles, resource-marker, localization-json |
| **B** (Domain) | aggregate-root, child-entity, value-object, domain-service |
| **C** (Application.Contracts) | permissions-constants, permission-provider, input-dto, update-dto, output-dto, list-request-dto, validator, appservice-interface |
| **D** (Application + EFCore + auxiliary) | appservice-impl, mapper-interface, ef-configuration, ef-modelbuilder-extension, background-job, background-job-args, hosted-service, hub-class, hub-method-edit, event-handler, cli-command, di-registration-edit, json-converter-edit |

## `create` mode

1. Verify `file_descriptor.path` does not exist on disk. If it does → halt `PHANTOM_CREATION` (scout missed it; reconciliation is stale).
2. Render the template for `file_descriptor.template_kind` using `fs_catalog`, `claude_md_contract`, and the per-kind reference file.
3. Write the file.
4. **Run post-write quality scan** (see below).
5. Return `{written: true, bytes, path, quality_scan: <result>}`.

## `update_edit` mode

1. Load `current_content` from disk.
2. Compute content hash. Compare to `edit_spec.edits[].content_hash_at_plan_time`. Mismatch → halt `FILE_DRIFT`.
3. For each edit in order:
   a. Verify anchor appears exactly once in the in-memory content. Zero/multiple → halt `ANCHOR_NOT_FOUND` / `ANCHOR_AMBIGUOUS`.
   b. Apply replacement via `str_replace`.
   c. Update in-memory content for next edit's anchor check.
4. Cheap syntactic check: balanced braces (C#), valid JSON (`en.json`).
5. **Run post-write quality scan** (see below).
6. Return `{written: true, edits_applied: <n>, path, quality_scan: <result>}`.

## `reuse_reference_only` mode

1. Verify referenced file exists. Missing → halt `REUSE_FILE_MISSING`.
2. Return `{written: false, reused: true, path}`.

No quality scan — the file already exists; the reconciler should have raised CONFLICT if it violated conventions.

## `repair` mode

1. Receive `{file_path, current_content, compile_errors}`.
2. For each error, map to the smallest edit resolving it.
3. Apply via `str_replace`. Do not introduce new files. Do not delete files.
4. Do not change any symbol referenced by another file unless the error demands it.
5. Fix requires a plan change (missing DTO field, wrong method signature contradicting FS) → halt `REPAIR_REQUIRES_REPLAN`.
6. Run post-write quality scan after each repair edit.

## Post-write quality scan

After any successful `create` / `update_edit` / `repair`, run regex-based checks against the resulting file content per `references/code-quality.md`. The 10 gates:

| # | Gate | Detection | On violation |
|---|---|---|---|
| 1 | No controllers | `class\s+\w+\s*:\s*(Controller\|ControllerBase)\b` OR `\[ApiController\]` | **ABORT** entire phase |
| 2 | Event publishing | Domain layer file references `ILocalEventBus` / `IDistributedEventBus` / `PublishAsync` | halt with `QUALITY_VIOLATION` |
| 3 | Exception handling | AppService / Hub / Job / HostedService method body lacks `try { ... } catch` | halt |
| 4 | Naming | class name violates `<Context><Aggregate><Suffix>` pattern from CLAUDE.md | halt |
| 5 | Dynamic sort | AppService method body contains `switch\s*\(\s*\w*[Ss]ort` | halt |
| 6 | Mapping | `\.ToListAsync\s*\(\s*\)` followed by a separate `\.Select\(` mapping pass | halt |
| 7 | Soft-delete | Domain or Application code assigns `\.IsDeleted\s*=` or `\.DeleterId\s*=` or `\.DeletedTime\s*=` | halt |
| 8 | EF config | mixed pattern within one module (per-entity `IEntityTypeConfiguration<T>` AND `ModelBuilder.Configure<Module>` extension both touched) | halt |
| 9 | Tenant scoping | Domain layer file contains `\.TenantId\s*=` or constructor with `TenantId` parameter | halt |
| 10 | Logging | AppService / Job / HostedService / Hub / EventHandler method lacks `_logger.Log(Information\|Error\|Warning)` calls | halt (warning if entry/exit only; error if no logging at all) |

**Gate 1 is the abort condition.** All other violations halt synthesis pending main-agent decision (revise / override / cancel via `AskUserQuestion`).

Per-file scan result:

```
{
  path: string,
  gates: {
    gate_1_no_controller:     "pass" | "violation",
    gate_2_event_publishing:  "pass" | "violation" | "n/a",
    gate_3_exception_handling:"pass" | "violation" | "n/a",
    gate_4_naming:            "pass" | "violation",
    gate_5_dynamic_sort:      "pass" | "violation" | "n/a",
    gate_6_mapping:           "pass" | "violation" | "n/a",
    gate_7_soft_delete:       "pass" | "violation" | "n/a",
    gate_8_ef_config:         "pass" | "violation" | "n/a",
    gate_9_tenant_scoping:    "pass" | "violation" | "n/a",
    gate_10_logging:          "pass" | "violation" | "n/a"
  },
  violations: [{gate, line, snippet, suggestion}],
  abort: bool                                     // true iff gate 1 violation
}
```

`n/a` means the gate is not applicable to this file kind (e.g., gate 5 doesn't apply to enums).

## Per-kind synthesis (templates)

Templates live in the per-kind reference files. The synthesizer renders by substituting `<Ns>`, `<Feature>`, `<Entity>`, `<Command>`, etc. from `fs_catalog` and `claude_md_contract`.

Inline-defined templates for auxiliary realizations (also in `references/command-realizations.md`):

### `background-job` (ABP BackgroundJobs)

```csharp
namespace <Ns>.Worker.Jobs.<Feature>;

public class <CommandName>Job : AsyncBackgroundJob<<CommandName>Args>, ITransientDependency
{
    private readonly <DelegateTarget> _target;
    private readonly ILogger<<CommandName>Job> _logger;

    public <CommandName>Job(<DelegateTarget> target, ILogger<<CommandName>Job> logger)
    {
        _target = target;
        _logger = logger;
    }

    public override async Task ExecuteAsync(<CommandName>Args args)
    {
        _logger.LogInformation("Entering <CommandName>Job with {@Args}", args);
        try
        {
            await _target.<CommandMethod>(args);
            _logger.LogInformation("Exiting <CommandName>Job");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed <CommandName>Job: {Message}", ex.Message);
            // Workers must survive single-iteration failure — do not re-throw.
        }
    }
}
```

Args class is a separate file (`<CommandName>Args.cs`) with `{ get; init; }` properties per FS input fields.

### `hosted-service`

```csharp
namespace <Ns>.HttpApi.Host.HostedServices.<Feature>;

public class <CommandName>HostedService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<<CommandName>HostedService> _logger;
    private static readonly TimeSpan Interval = TimeSpan.FromSeconds(<from FS or 30>);

    public <CommandName>HostedService(IServiceScopeFactory scopeFactory, ILogger<<CommandName>HostedService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                _logger.LogInformation("Entering <CommandName>HostedService iteration");
                using var scope = _scopeFactory.CreateScope();
                var target = scope.ServiceProvider.GetRequiredService<<DelegateTarget>>();
                await target.<CommandMethod>();
                _logger.LogInformation("Exiting <CommandName>HostedService iteration");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "<CommandName>HostedService iteration failed: {Message}", ex.Message);
            }
            await Task.Delay(Interval, stoppingToken);
        }
    }
}
```

### `hub-class` (SignalR)

```csharp
namespace <Ns>.Hubs.<Feature>;

[Authorize]
public class <Feature>Hub : Hub
{
    private readonly <DelegateTarget> _target;
    private readonly ILogger<<Feature>Hub> _logger;

    public <Feature>Hub(<DelegateTarget> target, ILogger<<Feature>Hub> logger)
    {
        _target = target;
        _logger = logger;
    }

    public async Task <CommandName>(<Param1> p1)
    {
        _logger.LogInformation("Entering {Method} with {@Input}", nameof(<CommandName>), p1);
        try
        {
            await _target.<CommandMethod>(p1);
            _logger.LogInformation("Exiting {Method}", nameof(<CommandName>));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed {Method}: {Message}", nameof(<CommandName>), ex.Message);
            throw;
        }
    }
}
```

### `hub-method-edit`

`update_edit` adds a new method via `str_replace` anchored on the class's closing `}`.

### `event-handler`

```csharp
namespace <Ns>.Application.EventHandlers.<Feature>;

public class <CommandName>Handler : ILocalEventHandler<<EventType>>, ITransientDependency
{
    private readonly <DelegateTarget> _target;
    private readonly ILogger<<CommandName>Handler> _logger;

    public <CommandName>Handler(<DelegateTarget> target, ILogger<<CommandName>Handler> logger)
    {
        _target = target;
        _logger = logger;
    }

    public async Task HandleEventAsync(<EventType> eventData)
    {
        _logger.LogInformation("Handling {Event}", typeof(<EventType>).Name);
        try
        {
            await _target.<CommandMethod>(eventData);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed handling {Event}: {Message}", typeof(<EventType>).Name, ex.Message);
            throw;
        }
    }
}
```

### `cli-command`

Pattern varies per `cli_host_project`'s declared base. Synthesizer reads existing commands (via scout catalog) to infer the pattern, then emits a matching command file. See `references/command-realizations.md`.

## Hard rules

- Never write outside `src_path` (the final report at Phase 8 is written by the main agent, not this sub-agent).
- Never overwrite an existing file. `create` refuses when the path exists.
- Never apply an edit whose anchor is not uniquely present.
- Never skip the `FILE_DRIFT` check in `update_edit` mode.
- Never add a domain event or event-bus dependency to a Domain-layer file (gate 2).
- Never emit `{ get; set; }` on an input DTO (Create / Update / ListRequest).
- Never emit a public aggregate constructor (private/internal + Builder only).
- Never hardcode a user-visible string — always a localization key.
- Never invoke `dotnet ef`, `dotnet run`, `dotnet test`, `dotnet build`, or `dotnet publish`. Build is `build-validator`'s tool.
- Never skip the post-write quality scan.

## Output schema (per file)

```
{
  path: string,
  kind: string,
  mode: "create" | "update_edit" | "reuse_reference_only" | "repair",
  written: bool,
  reused: bool,
  bytes: integer | null,
  edits_applied: integer | null,
  quality_scan: <per-file scan result> | null,    // null only for reuse_reference_only
  halt: null | "COHORT_MISMATCH" | "PHANTOM_CREATION" | "FILE_DRIFT"
       | "ANCHOR_NOT_FOUND" | "ANCHOR_AMBIGUOUS" | "REUSE_FILE_MISSING"
       | "REPAIR_REQUIRES_REPLAN" | "OVERWRITE_WITHOUT_CONFIRMATION"
       | "QUALITY_VIOLATION" | "QUALITY_ABORT_CONTROLLER",
  halt_details: {...} | null,
  warnings: [{code, message}]
}
```

## Phase-aggregated output (returned to main agent at end of Phase 6)

After all per-file scans complete, the main agent aggregates results into the report's quality coverage section. The synthesizer pipeline emits:

```
{
  files_written: [...],
  files_reused: [...],
  quality_coverage: {
    gate_1_no_controller:     "100% pass" | "<n> violations",
    gate_2_event_publishing:  "<n_pass>/<n_total> pass",
    ...
    gate_10_logging:          "<n_pass>/<n_total> pass"
  },
  violation_inventory: [{gate, file, line, snippet}]
}
```

This becomes the **Quality Coverage Summary** section of `IMPLEMENTATION_REPORT_<Feature>.md`.

## What this sub-agent never does

- Never plans — executes only.
- Never runs builds (that's `build-validator`).
- Never writes migrations.
- Never edits CLAUDE.md, wiki, or any file outside the approved descriptor's path.
- Never invokes another sub-agent.
- Never silently overrides a quality violation — surfaces it to the main agent.