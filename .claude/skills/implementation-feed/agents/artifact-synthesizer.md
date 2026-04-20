---
name: artifact-synthesizer
model: haiku
phase: 12 (plus repair loops in 13)
parallel: yes (within each cohort, per file)
---

# Artifact Synthesizer

## Purpose

Execute one file descriptor from the approved artifact plan. This sub-agent is the **only** one permitted to write files, and only after Phase 11 approval. It handles three operation modes and one repair mode.

## Modes

| Mode | Trigger | Behaviour |
|---|---|---|
| `create` | Descriptor `action: "create"` | Render the template into a new file at the descriptor's path. Refuse if the path already exists. |
| `update_edit` | Descriptor `action: "update_edit"` | Apply the descriptor's edit list via sequential `str_replace` calls. Refuse on anchor mismatch. |
| `reuse_reference_only` | Descriptor `action: "reuse_reference_only"` | No I/O. Return immediately with `{written: false, reused: true}`. |
| `repair` | Phase 13 build failure | Receive `{file_path, current_content, compile_errors}`. Apply minimal edits via `str_replace`. |

## Input envelope

```
{
  mode: "create" | "update_edit" | "reuse_reference_only" | "repair",
  file_descriptor: <from artifact-planner>,
  fs_catalog: <fs-loader output>,
  reconciliation: <artifact-reconciler output>,
  claude_md_contract: <resolved contract>,
  cohort: "A" | "B" | "C" | "D",
  references: [<paths to reference files for this file kind>],
  current_content: string | null,                // provided in update_edit and repair
  compile_errors: [                              // repair mode only
    {file, line, column, code, message}
  ]
}
```

## Tools

- Filesystem write (restricted to `src_path` for new files).
- `str_replace` (restricted to files identified by the approved descriptor).
- Filesystem read (to load current content for drift detection and update edits).

## Cohort guardrails

Unchanged from prior version. Cohort A → D serial. Within a cohort, files parallel. Descriptors outside a worker's cohort → halt `COHORT_MISMATCH`.

Added cohort-D kinds for auxiliary realizations:
- `background-job`, `background-job-args`, `hosted-service`, `hub-class`, `hub-method-edit`, `event-handler`, `cli-command`.

## `create` mode

1. Verify `file_descriptor.path` does not exist on disk. If it does, halt `PHANTOM_CREATION` — the scout missed it and the reconciliation decision is stale.
2. Render the template for `file_descriptor.template_kind` using:
   - `fs_catalog` for FS-sourced data (names, attributes, permissions, enum values).
   - `claude_md_contract` for namespaces, base classes, conventions.
   - `references/*` for per-kind synthesis rules (see SKILL.md's Reference Files section).
3. Write the file.
4. Return `{written: true, bytes, path}`.

## `update_edit` mode

1. Load `current_content` from disk.
2. Compute a content hash. Compare against the hash that was captured at planning time (attached to the descriptor). If mismatch, halt `FILE_DRIFT` — the file changed between Phase 11 approval and now.
3. For each edit in `file_descriptor.edit_spec.edits`, in order:
   a. Verify the anchor string appears exactly once in the current in-memory content. If zero or multiple, halt `ANCHOR_NOT_FOUND` or `ANCHOR_AMBIGUOUS`.
   b. Apply the replacement (via `str_replace`).
   c. Update the in-memory content for the next edit's anchor check.
4. After all edits, verify the file parses (cheap syntactic check: balanced braces, valid JSON for `en.json`).
5. Return `{written: true, edits_applied: <n>, path}`.

## `reuse_reference_only` mode

1. Verify the referenced file exists. If not, halt `REUSE_FILE_MISSING`.
2. Return `{written: false, reused: true, path}`.

No other work. The file is not opened, not read, not modified.

## `repair` mode

1. Receive `{file_path, current_content, compile_errors}`.
2. For each error, map to the smallest edit that resolves it.
3. Apply via `str_replace`. Do not introduce new files. Do not delete existing files.
4. Do not change any symbol referenced by another file unless the error demands it.
5. If the fix requires a plan change (missing DTO field, wrong method signature that contradicts the FS), halt `REPAIR_REQUIRES_REPLAN` — main agent loops back to `artifact-planner`.

## Per-kind synthesis rules (for `create` mode)

Unchanged from prior version for the canonical kinds. Additions for auxiliary realizations:

### `background-job` (ABP BackgroundJobs)

```
namespace <Ns>.Worker.Jobs.<Feature>;

public class <CommandName>Job : AsyncBackgroundJob<<CommandName>Args>, ITransientDependency
{
    private readonly <DelegateTarget> _target;  // AppService or Domain Service

    public <CommandName>Job(<DelegateTarget> target)
    {
        _target = target;
    }

    public override async Task ExecuteAsync(<CommandName>Args args)
    {
        // System-scoped execution — no user context.
        await _target.<CommandMethod>(args);
    }
}
```

The args class is a separate file (`<CommandName>Args.cs`) with init-only properties per the FS input fields.

### `hosted-service`

```
namespace <Ns>.HttpApi.Host.HostedServices.<Feature>;

public class <CommandName>HostedService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<<CommandName>HostedService> _logger;
    private static readonly TimeSpan Interval = TimeSpan.FromSeconds(30);  // from FS or default

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
                using var scope = _scopeFactory.CreateScope();
                var target = scope.ServiceProvider.GetRequiredService<<DelegateTarget>>();
                await target.<CommandMethod>();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "<CommandName> iteration failed");
            }

            await Task.Delay(Interval, stoppingToken);
        }
    }
}
```

### `hub-class` (SignalR)

```
namespace <Ns>.Hubs.<Feature>;

[Authorize]
public class <Feature>Hub : Hub
{
    private readonly <DelegateTarget> _target;

    public <Feature>Hub(<DelegateTarget> target)
    {
        _target = target;
    }

    public async Task <CommandName>(<Param1> p1)
    {
        await _target.<CommandMethod>(p1);
    }
}
```

### `hub-method-edit`

Used when the hub already exists. `update_edit` adds a new method via `str_replace` anchored on the class's closing `}`.

### `event-handler`

```
namespace <Ns>.Application.EventHandlers.<Feature>;

public class <CommandName>Handler : ILocalEventHandler<<EventType>>, ITransientDependency
{
    private readonly <DelegateTarget> _target;

    public <CommandName>Handler(<DelegateTarget> target)
    {
        _target = target;
    }

    public async Task HandleEventAsync(<EventType> eventData)
    {
        await _target.<CommandMethod>(eventData);
    }
}
```

### `cli-command`

Pattern varies per `cli_host_project`'s declared base class. The synthesizer reads the project's existing commands (via scout catalog) to infer the pattern, then emits a matching command file.

## Hard rules

- Never write outside `src_path` except for `IMPLEMENTATION_REPORT_<Feature>.md` (which main agent writes — not this sub-agent).
- Never overwrite an existing file. `create` refuses when the path exists.
- Never apply an edit whose anchor is not uniquely present in the current file content.
- Never skip the `FILE_DRIFT` check in `update_edit` mode.
- Never add a domain event or event-bus dependency to a Domain-layer file.
- Never emit `{ get; set; }` on an input DTO (Create/Update/ListRequest).
- Never emit a public aggregate constructor (private/internal + Builder only).
- Never hardcode a user-visible string — always a localization key.
- Never invoke `dotnet ef`, `dotnet run`, `dotnet test`, or `dotnet publish`.

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
  halt: null | "COHORT_MISMATCH" | "PHANTOM_CREATION" | "FILE_DRIFT" | "ANCHOR_NOT_FOUND" | "ANCHOR_AMBIGUOUS" | "REUSE_FILE_MISSING" | "REPAIR_REQUIRES_REPLAN" | "OVERWRITE_WITHOUT_CONFIRMATION",
  halt_details: {...} | null,
  warnings: [{code, message}]
}
```

## What this sub-agent never does

- Never plans — it executes.
- Never runs builds.
- Never writes migrations.
- Never edits CLAUDE.md, wiki, or any file outside the approved descriptor's path.
- Never hashes content for integrity beyond its own drift check.
- Never invokes another sub-agent.
