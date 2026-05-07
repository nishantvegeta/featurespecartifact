# Code Quality Gates

Ten regex-based checks the synthesizer runs after every successful write and after every repair edit. Gate 1 ABORTS the entire phase. Gates 2–10 halt synthesis pending main-agent decision (revise / override / cancel).

Reconciler runs the same checks as a **pre-flight** during planning so violations surface at Phase 5, not Phase 6.

## Gate 1 — No controllers (ABORT)

**Rule.** No file under `<src>/<Ns>.<Layer>/` defines `class \w+ : (Controller|ControllerBase)` or carries `[ApiController]`. AppServices + ABP automatic-routing are the HTTP entry point.

**Detection regex** (per `*.cs`):
```
^\s*(\[ApiController\]|public\s+(sealed\s+)?(partial\s+)?class\s+\w+\s*:\s*(Controller|ControllerBase))
```

**Violation handling.** Hit → `halt: "QUALITY_ABORT_CONTROLLER"`. Phase aborts. Synthesizer surfaces the snippet and stops; main agent reports `CONTROLLER_DETECTED` and unwinds.

## Gate 2 — Domain layer publishes no events

**Rule.** Domain layer files (`<Ns>.Domain/**/*.cs`) must not reference `ILocalEventBus`, `IDistributedEventBus`, or call `PublishAsync(`. Cross-aggregate orchestration uses Domain Services; cross-module reactions use an Application-layer EventHandler.

**Detection regex** (per `<Ns>.Domain/**/*.cs`):
```
ILocalEventBus|IDistributedEventBus|PublishAsync\(
```

**Violation.** halt `QUALITY_VIOLATION` (gate 2).

## Gate 3 — Exception handling discipline (CRC-A4)

**Rule.** Use try-catch ONLY for:
- External service calls (HTTP, message queue, etc.)
- Retry logic
- Domain-specific validations requiring translation
- BackgroundJobs / HostedServices (never crash the worker)

Standard AppService CRUD does NOT need try-catch — ABP's exception middleware handles it. Wrapping every method in try-catch is an anti-pattern.

**Detection.** Per AppService method body, count try-catch blocks. If method body has try-catch AND the catch block does not invoke external service, retry, translate to BusinessException, OR the file is not Background/HostedService → flag as gate 3 violation.

For BackgroundJobs/HostedServices: catch must **log and not re-throw** (else the worker crashes).

**Violation.** halt `QUALITY_VIOLATION` (gate 3).

## Gate 4 — Naming convention

**Rule.** Generated class names follow `<Context><Aggregate><Suffix>` per CLAUDE.md `naming_convention`. Where:

- `<Context>` = bounded-context prefix (e.g. `LoanApplicationManagement` → `LoanApp`)
- `<Aggregate>` = aggregate root name
- `<Suffix>` = role suffix (`AppService`, `Dto`, `Validator`, `Mapper`, `Configuration`, `DomainService`, `Job`, `Hub`, etc.)

**Detection.** Walk every newly-created class. Check class name starts with bounded-context prefix from CLAUDE.md.

**Violation.** halt `QUALITY_VIOLATION` (gate 4).

## Gate 5 — Dynamic sorting (no switch)

**Rule.** AppService `GetListAsync` methods sort via `ApplyDynamicSorting(input.Sorting, ...)` extension. No `switch (input.Sorting)` blocks.

**Detection regex** (per `appservice-impl` files):
```
switch\s*\(\s*\w*[Ss]ort
```

**Violation.** halt `QUALITY_VIOLATION` (gate 5).

## Gate 6 — Select before fetch

**Rule.** AppServices project to DTO **inside the LINQ query chain**, before materialization. No `.ToListAsync()` followed by separate `.Select(...)` mapping over the result.

**Detection regex** (per `appservice-impl` files):
```
\.ToListAsync\s*\(\s*\)[^\n]*\n[^\n]*\.Select\s*\(
```

(I.e., a `.ToListAsync()` call followed within a few lines by a `.Select(`.)

**Violation.** halt `QUALITY_VIOLATION` (gate 6).

## Gate 7 — Soft-delete handling

**Rule.** Use `_repository.DeleteAsync(entity)` for soft delete. Do NOT manually assign `IsDeleted`, `DeleterId`, or `DeletedTime` — ABP populates them.

**Detection regex** (per Domain/Application files):
```
\.IsDeleted\s*=|\.DeleterId\s*=|\.DeletedTime\s*=
```

**Violation.** halt `QUALITY_VIOLATION` (gate 7).

## Gate 8 — EF config style consistency (CRC-E1)

**Rule.** Use `ModelBuilder` extension method pattern (`Configure<Module>` extension). Do NOT mix per-entity `IEntityTypeConfiguration<T>` classes with the extension pattern within one module.

**Detection.** If this run touched an EF config:
- Synthesizer's edit produced `IEntityTypeConfiguration<T>` AND scout reports an existing `Configure<Module>` extension method → halt.
- Or vice versa.

**Violation.** halt `QUALITY_VIOLATION` (gate 8).

## Gate 9 — Tenant scoping (CRC-D1)

**Rule.** Domain layer files must NOT contain `tenantId` constructor parameters or assign `TenantId` directly. ABP populates `TenantId` automatically via `ICurrentTenant` scope.

**Detection regex** (per `<Ns>.Domain/**/*.cs`):
```
TenantId\s*=|Guid\??\s+tenantId\s*[,)]
```

(Ctor parameter named `tenantId` of type `Guid` or `Guid?`, or any assignment to `TenantId`.)

**Violation.** halt `QUALITY_VIOLATION` (gate 9).

## Gate 10 — Structured logging

**Rule.** Every AppService / Job / HostedService / Hub method body has at least one `_logger.LogInformation` / `LogWarning` / `LogError` call. No `Console.WriteLine`. No `string.Format(...)` interpolation passed to logger; use structured templates.

**Detection regex** (per AppService/Job/HostedService/Hub method body):
```
_logger\.Log(Information|Warning|Error)\s*\(
```

If method body lacks any match → flag.

**Violation.** halt `QUALITY_VIOLATION` (gate 10).

## Gate output schema

Per file:
```
{
  path,
  gates: {
    gate_1_no_controller: "pass" | "violation" | "n/a",
    gate_2_no_events: "...", gate_3_exception_handling: "...",
    gate_4_naming: "...", gate_5_dynamic_sorting: "...",
    gate_6_select_before_fetch: "...", gate_7_soft_delete: "...",
    gate_8_ef_style: "...", gate_9_tenant_scope: "...",
    gate_10_logging: "..."
  },
  violations: [{gate, line, snippet, suggestion}]
}
```

## Override behaviour

User can override gates 2–10 (not gate 1) at Phase 5 via the artifact-plan approval flow. Overrides recorded in the final report's Quality Coverage Summary as "violation, user override". Gate 1 violations cannot be overridden — phase aborts.
