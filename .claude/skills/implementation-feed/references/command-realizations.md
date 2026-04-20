# Command Realization Types

A Command in the FS can be realized as any of six execution models. This file is the authoritative guide for how each type is detected, when each is appropriate, and what the synthesizer emits for each. The reconciler consults this when matching candidates; the planner consults this when emitting descriptors.

## The six types

| Type | Invocation style | Where it lives | Authorization |
|---|---|---|---|
| `AppService` | HTTP request (synchronous, user-invoked) | `<Ns>.Application/<Feature>/<Feature>AppService.cs` | `[Authorize(<permission>)]` per method; `CurrentUser` populated |
| `BackgroundJob` | Enqueued on a queue, processed later | Worker/BackgroundJobs project | System identity; no `CurrentUser` |
| `HostedService` | Long-running loop inside the host process | HTTP API Host or dedicated HostedServices project | System identity; scoped per iteration |
| `HubMethod` | SignalR (or similar) real-time client call | Hubs project | `[Authorize]` on hub class + per-method when needed |
| `EventHandler` | Fired in response to a domain or integration event | Application or dedicated EventHandlers project | System identity; `CurrentUser` may or may not be populated depending on dispatcher |
| `CliCommand` | Command-line invocation | CLI host project | Whatever the CLI authenticates as; typically operator or service account |

## Selection rules

The Feat Spec page's `**Execution model:**` field is authoritative. If absent, the reconciler infers from:

### 1. Command name patterns

| Name pattern | Likely realization |
|---|---|
| `Create*`, `Update*`, `Delete*`, `Approve*`, `Submit*`, `Get*`, `List*` | `AppService` |
| `Scheduled*`, `Nightly*`, `Daily*`, `Recurring*`, `EveryMinute*` | `BackgroundJob` |
| `Process*Queue*`, `Monitor*`, `Watch*`, `Pump*` | `HostedService` |
| `Broadcast*`, `Notify*`, `Push*`, `SendToAllAsync` | `HubMethod` |
| `On*Async`, `Handle*`, `*Handler` | `EventHandler` |
| `Run*`, `Migrate*`, `Import*`, `Export*` (invoked offline) | `CliCommand` |

### 2. FS prose hints

- "invoked by the user via the UI" → `AppService`.
- "scheduled every N minutes/hours" → `BackgroundJob`.
- "runs continuously" → `HostedService`.
- "pushed to connected clients" → `HubMethod`.
- "triggered when <event> happens" → `EventHandler`.
- "run from the command line" → `CliCommand`.

### 3. Ambiguity escalation

If the name and prose don't unanimously point to one realization, `AskUserQuestion` per Command:

> How is Command `<n>` invoked?
> Options: AppService / BackgroundJob / HostedService / HubMethod / EventHandler / CliCommand

The user's selection becomes authoritative and is recorded in the implementation report.

## Infrastructure prerequisites (by realization)

| Realization | Prerequisite | Where verified |
|---|---|---|
| `AppService` | Application project present | `solution-inspector` |
| `BackgroundJob` | Worker project OR ABP BackgroundJobs package in Application project | `repo-scout.supported_realizations.BackgroundJob` |
| `HostedService` | Any `IHostedService` implementation in the solution (signal) OR explicit HostedServices project | `repo-scout.supported_realizations.HostedService` |
| `HubMethod` | Hubs project with at least one `Hub`-derived class, AND `realtime_library` declared in CLAUDE.md | `repo-scout.supported_realizations.HubMethod` |
| `EventHandler` | ABP LocalEventBus / DistributedEventBus registered (signal: any `ILocalEventHandler<>` in the solution) | `repo-scout.supported_realizations.EventHandler` |
| `CliCommand` | `cli_host_project` declared in CLAUDE.md AND project exists | `repo-scout.supported_realizations.CliCommand` |

Missing prerequisite + Command needs that realization → reconciler emits `CONFLICT` code `REALIZATION_INFRA_MISSING`. User resolves at Phase 7.

## Default delegation pattern

All realizations beyond `AppService` delegate the actual business operation to either:
- An `AppService` method on the Application layer, OR
- A Domain Service method.

**Why:** Authorization, validation, and transaction boundaries live with the AppService/Domain Service. Workers, hubs, and handlers add dispatch mechanics on top of the canonical implementation.

**Consequence:** A BackgroundJob is almost never a standalone unit. It's a thin adapter that constructs its args, resolves its target service, and calls a method. The business logic lives in the service it calls.

### Exception: pure infrastructure jobs

If a Command is purely infrastructural (e.g., "cleanup expired sessions from Redis"), it may live entirely in the worker with no AppService counterpart. In that case the FS page declares `**Execution model:** BackgroundJob (standalone)` and the skill emits only the job class, no AppService.

## Authorization patterns

### AppService

Every method has `[Authorize(<Feature>Permissions.<Entity>.<Op>)]`. Tenant guard after every entity load. `CurrentUser.Id` available.

### BackgroundJob

Runs as the system. `CurrentUser` is not reliably populated. Authorization happens on the delegate target — the AppService or Domain Service the job calls. Inside the job, do not re-check `[Authorize]` (no `HttpContext`).

If the delegate target's `[Authorize(...)]` attribute would reject system invocation, the job must use `AuthorizationService.IsGrantedAsync(...)` with `ClaimsPrincipal.System()`, OR the target method must be invoked via a non-AppService path (a Domain Service method, typically).

### HostedService

Same as BackgroundJob — system identity, scope-per-iteration. Create a scope with `IServiceScopeFactory.CreateScope()` inside each iteration to ensure scoped dependencies (DbContext, UoW) reset between runs.

### HubMethod

Hub class declares `[Authorize]` (user must be authenticated to connect). Per-method `[Authorize(<permission>)]` is applied the same way as AppService methods for methods that require a specific permission beyond connection.

`CurrentUser.Id` is populated inside hub methods just like AppService methods.

### EventHandler

Depends on the event dispatcher. `ILocalEventHandler<T>` runs in-process, possibly under the originating user's context; `IDistributedEventHandler<T>` runs across processes with the dispatcher's identity. In practice, treat event handlers as system-identity unless the event itself carries the originating user ID as payload.

### CliCommand

The CLI host authenticates however the project declares — typically with a service account or machine credential. Permissions are enforced by the delegate target.

## Idempotency requirements

Non-AppService realizations execute without user supervision. Idempotency is required:

- **BackgroundJob:** the queue may redeliver on failure. Jobs must be idempotent — either by natural key (e.g., "accrue interest for account X on day Y" is idempotent on (X, Y)) or by idempotency key stored in the aggregate.
- **HostedService:** the loop runs forever. Skipping an iteration because the previous one succeeded is trivial; the danger is double-execution under failover. Use a distributed lock (Redlock, blob lease) or a DB-level "last processed" marker.
- **HubMethod:** clients may retry on network failure. Server methods should be idempotent on the payload.
- **EventHandler:** events may be redelivered by the bus. Handlers must be idempotent by event ID or aggregate state check.
- **CliCommand:** the operator may rerun a failed command. Commands should be re-runnable without corrupting state.

The synthesizer emits idempotency scaffolding (comments + TODO markers) but the actual idempotency logic is business-specific and is surfaced in the implementation report as a manual follow-up.

## Scheduling (for BackgroundJob)

The skill **does not** emit scheduling code. Emitting a `RecurringJob.AddOrUpdate` or a cron registration is deployment policy, not code-generation.

The final implementation report lists the job classes and says: "Register these jobs for scheduling in your deployment pipeline (ABP BackgroundJob Manager, Hangfire dashboard, or equivalent)."

## Hub registration (for HubMethod)

If the hub class is `CREATE_NEW`, the HTTP API host's `MapHub` chain gets an edit adding the new hub. If the hub is `UPDATE_IN_PLACE` (adding methods to existing hub), no host-registration edit is needed.

## Reconciler matching rules (reminder)

- `AppService` Command matches only `appservice-impl` candidates with `appservice-interface` counterparts.
- `BackgroundJob` Command matches only `background-job` candidates.
- `HostedService` Command matches only `hosted-service` candidates.
- `HubMethod` Command matches methods on `hub` candidates — class itself may pre-exist (UPDATE adds the method); if the hub doesn't exist, CREATE the hub too.
- `EventHandler` Command matches only `event-handler` candidates.
- `CliCommand` Command matches only `cli-command` candidates.

Cross-type name collisions (`AppService` Command named identically to an existing `background-job` class) are flagged as `MIXED_REALIZATION_AMBIGUITY` by the scout and surfaced by the reconciler as `CONFLICT`.

## When the FS changes realization for an existing artifact

Example: an existing `SubmitApplicationAppService.SubmitAsync` method is classified by the FS as `BackgroundJob` in a later revision. The reconciler flags this as `CONFLICT` code `REALIZATION_MISMATCH` and surfaces to the user:

Suggested resolutions:
1. Create a new `SubmitApplicationJob` and keep the existing AppService method (dual invocation).
2. Deprecate the AppService method and move logic to the job (requires `UPDATE_IN_PLACE` on AppService to call the job; out of this skill's scope if it implies call-site changes).
3. Override the FS: keep realization as AppService.

The user picks; the skill proceeds with the chosen path.
