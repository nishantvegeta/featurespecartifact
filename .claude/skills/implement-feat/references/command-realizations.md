# Command Realizations

A Command's **execution model** decides which artifact kind it becomes:

| Realization | Project (default) | Trigger |
|---|---|---|
| `AppService` | `<Ns>.Application` | HTTP-invoked, user-driven |
| `BackgroundJob` | `<Ns>.BackgroundJobs` (or auxiliary worker) | Scheduled / queued |
| `HostedService` | `<Ns>.Worker` (or HTTP API host) | Long-running loop |
| `HubMethod` | `<Ns>.Hubs` | Real-time push |
| `EventHandler` | `<Ns>.Application` (local) / `<Ns>.EventHandlers` (distributed) | Reaction to event |
| `CliCommand` | `cli_host_project` from CLAUDE.md | Operator/admin invocation |

## Selection rules

1. **FS Command page declares `**Execution model:**`** → use it.
2. **No declaration** → reconciler infers per heuristic; if ambiguous, escalates as `realization_question`.
3. **Repo evidence overrides defaults** — if scout shows `<Ns>.Worker` exists, prefer Worker over `<Ns>.BackgroundJobs`.

## Heuristic table (when FS declaration absent)

| Command name pattern | Realization |
|---|---|
| `Scheduled*`, `Nightly*`, `Recurring*`, `Daily*`, `Weekly*`, `Cron*` | BackgroundJob |
| `*Handler`, `Handle*Async`, `On*Async` | EventHandler |
| `Broadcast*`, `Notify*`, `Push*` | HubMethod |
| FS prose mentions "loop", "watch", "poll" | HostedService |
| FS mentions CLI/console invocation | CliCommand |
| Verb+noun invoked by user | AppService |

## Infrastructure prerequisites

| Realization | Prereq | Source |
|---|---|---|
| AppService | none (always supported) | `scout.scaffolding.projects.application` |
| BackgroundJob | `background-job` library declared in CLAUDE.md | `scout.supported_realizations.BackgroundJob` |
| HostedService | host project capable of `services.AddHostedService` | `scout.supported_realizations.HostedService` |
| HubMethod | SignalR library + Hubs project | `scout.supported_realizations.HubMethod` |
| EventHandler | event bus library declared | `scout.supported_realizations.EventHandler` |
| CliCommand | `cli_host_project` set in CLAUDE.md | `scout.supported_realizations.CliCommand` |

Missing prereq + non-AppService realization assigned → `REALIZATION_INFRA_MISSING` Conflict.

## Default-delegation rule

When realization is `BackgroundJob` / `HostedService` / `HubMethod` / `EventHandler` / `CliCommand` AND scout reports the realization-specific project exists, prefer it. Else fall back to the appropriate ABP-default project (`<Ns>.BackgroundJobs`, `<Ns>.Application` for handlers, etc.). Falling back when `auxiliary_projects` was explicitly declared → warning `AUXILIARY_FALLBACK`.

## Idempotency

`BackgroundJob` and `EventHandler` MUST be idempotent — duplicate dispatch must not corrupt state. Implementations check current aggregate state before applying changes:

```csharp
if (entity.Status == LoanStatus.Approved) return;     // already processed
entity.Approve(...);
```

`HostedService` similarly checks idempotency on each loop iteration.

The skill emits this guard pattern when the FS Command's postcondition declares an idempotent end state. If FS doesn't declare idempotency for an event-driven Command, planner emits warning `IDEMPOTENCY_NOT_DECLARED`.

---

## Templates

### BackgroundJob

`<Worker>/Jobs/<Feature>/<CommandName>Job.cs`:

```csharp
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Volo.Abp.BackgroundJobs;
using Volo.Abp.DependencyInjection;

namespace <Ns>.<Feature>.Jobs;

public class <Command>Job : AsyncBackgroundJob<<Command>Args>, ITransientDependency
{
    private readonly I<Feature>Service _service;
    private readonly ILogger<<Command>Job> _logger;

    public <Command>Job(I<Feature>Service service, ILogger<<Command>Job> logger)
    {
        _service = service;
        _logger = logger;
    }

    public override async Task ExecuteAsync(<Command>Args args)
    {
        _logger.LogInformation("{Job} started for {EntityId}", nameof(<Command>Job), args.EntityId);

        try
        {
            await _service.<DomainMethod>Async(args.EntityId);
            _logger.LogInformation("{Job} completed for {EntityId}", nameof(<Command>Job), args.EntityId);
        }
        catch (System.Exception ex)
        {
            // CRC-A4: log only, never re-throw — re-throw would crash the worker
            _logger.LogError(ex, "{Job} failed for {EntityId}", nameof(<Command>Job), args.EntityId);
        }
    }
}
```

`<Command>Args.cs`:

```csharp
namespace <Ns>.<Feature>.Jobs;

public class <Command>Args
{
    public Guid EntityId { get; set; }
    // additional args from FS Command input
}
```

### HostedService

`<Project>/HostedServices/<Feature>/<CommandName>HostedService.cs`:

```csharp
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace <Ns>.<Feature>.HostedServices;

public class <Command>HostedService : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<<Command>HostedService> _logger;

    private static readonly System.TimeSpan Interval = System.TimeSpan.FromMinutes(5);

    public <Command>HostedService(IServiceScopeFactory scopeFactory, ILogger<<Command>HostedService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("{Service} starting", nameof(<Command>HostedService));

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var service = scope.ServiceProvider.GetRequiredService<I<Feature>Service>();
                await service.<DomainMethod>Async(stoppingToken);
            }
            catch (System.Exception ex)
            {
                // CRC-A4: log only, never re-throw — re-throw kills the host
                _logger.LogError(ex, "{Service} iteration failed", nameof(<Command>HostedService));
            }

            await Task.Delay(Interval, stoppingToken);
        }
    }
}
```

DI registration (host's `ConfigureServices`):

```csharp
context.Services.AddHostedService<<Command>HostedService>();
```

### Hub class (new)

`<Hubs>/<Feature>Hub.cs`:

```csharp
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Logging;

namespace <Ns>.<Feature>;

[Authorize]
public class <Feature>Hub : Hub
{
    private readonly I<Feature>Service _service;
    private readonly ILogger<<Feature>Hub> _logger;

    public <Feature>Hub(I<Feature>Service service, ILogger<<Feature>Hub> logger)
    {
        _service = service;
        _logger = logger;
    }

    public async Task <CommandName>(<Args> args)
    {
        _logger.LogInformation("{Method} invoked by {ConnectionId}",
            nameof(<CommandName>), Context.ConnectionId);

        try
        {
            await _service.<DomainMethod>Async(args);
        }
        catch (System.Exception ex)
        {
            _logger.LogError(ex, "{Method} failed", nameof(<CommandName>));
            throw;    // hubs throw — client receives the exception
        }
    }
}
```

`MapHub` registration in host (if not already present):

```csharp
app.MapHub<<Feature>Hub>("/hubs/<feature-kebab>");
```

### Hub method edit (existing hub)

`update_edit` action with anchor on the closing `}` of the existing class:

```csharp
public async Task <NewCommandName>(<Args> args)
{
    _logger.LogInformation("{Method} invoked by {ConnectionId}",
        nameof(<NewCommandName>), Context.ConnectionId);

    try
    {
        await _service.<DomainMethod>Async(args);
    }
    catch (System.Exception ex)
    {
        _logger.LogError(ex, "{Method} failed", nameof(<NewCommandName>));
        throw;
    }
}
}    // <-- existing closing brace anchor
```

### EventHandler

`<Project>/EventHandlers/<Feature>/<CommandName>Handler.cs`:

```csharp
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Volo.Abp.DependencyInjection;
using Volo.Abp.EventBus;

namespace <Ns>.<Feature>.EventHandlers;

public class <Command>Handler :
    ILocalEventHandler<<EventType>>,
    ITransientDependency
{
    private readonly I<Feature>Service _service;
    private readonly ILogger<<Command>Handler> _logger;

    public <Command>Handler(I<Feature>Service service, ILogger<<Command>Handler> logger)
    {
        _service = service;
        _logger = logger;
    }

    public async Task HandleEventAsync(<EventType> eventData)
    {
        _logger.LogInformation("{Handler} handling {Event} for {EntityId}",
            nameof(<Command>Handler), nameof(<EventType>), eventData.EntityId);

        try
        {
            await _service.<DomainMethod>Async(eventData.EntityId);
        }
        catch (System.Exception ex)
        {
            _logger.LogError(ex, "{Handler} failed for {EntityId}",
                nameof(<Command>Handler), eventData.EntityId);
            throw;    // event bus retry/DLQ on throw
        }
    }
}
```

ABP auto-discovers via `ITransientDependency` + `ILocalEventHandler<T>` — no DI line needed.

### CLI Command

`<Cli>/Commands/<Feature>/<CommandName>Command.cs` — class structure varies per `cli_host_project` base. Pattern:

```csharp
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace <Ns>.Cli.Commands.<Feature>;

public class <Command>Command : <CliBase>
{
    private readonly I<Feature>Service _service;
    private readonly ILogger<<Command>Command> _logger;

    public <Command>Command(I<Feature>Service service, ILogger<<Command>Command> logger)
    {
        _service = service;
        _logger = logger;
    }

    public override async Task<int> ExecuteAsync(<Args> args)
    {
        _logger.LogInformation("{Command} invoked with {@Args}", nameof(<Command>Command), args);

        try
        {
            await _service.<DomainMethod>Async(args);
            return 0;
        }
        catch (System.Exception ex)
        {
            _logger.LogError(ex, "{Command} failed", nameof(<Command>Command));
            return 1;
        }
    }
}
```

Adjust base class and method signature to match `cli_host_project`'s declared CLI framework. Skill reads `cli_host_project`'s pattern from existing commands in scout output.

---

## Anti-patterns

- BackgroundJob re-throwing exceptions → kills the worker
- HostedService without `IServiceScopeFactory` → captured-scope DI bugs
- Hub method without `[Authorize]` on the class → unauthenticated push
- EventHandler swallowing exceptions silently → events never reach DLQ
- CliCommand using `Console.WriteLine` instead of `_logger` → ungovernable output
- Same Command name realized as both AppService and BackgroundJob → ambiguity at dispatch
