# Domain Layer — Aggregates, Builders, Domain Methods

Authoritative patterns for Domain layer synthesis: `aggregate-root`, `child-entity`, `value-object`.

## Aggregate Root Skeleton

Structural layout in order:

1. File header XML doc with `<see href="<source_link>"/>`.
2. `using` directives (sorted: System, Microsoft, Volo.Abp.*, project namespaces).
3. Namespace `<Ns>.<Feature>`.
4. Class declaration (see Tenancy section for `IMultiTenant` rules).
5. Public read-only properties with private setters.
6. Read-only collection exposures backed by private lists.
7. Private parameterless constructor for EF Core.
8. Internal constructor taking every required field — called only by `Builder.Build()`.
9. Static `Create(...)` factory delegating to `new Builder(...).Build()`.
10. Domain methods — one per postcondition referenced by a Command.
11. Nested `Builder` class at the bottom.

## Builder Pattern

Enforces invariants **before** the aggregate exists. No invalid aggregate may ever be constructed.

- `public sealed class Builder` nested inside aggregate.
- Constructor takes required inputs. Optional fluent setters (`WithDescription(...)`, `WithLimit(...)`).
- `Build()`: validate invariants → throw `BusinessException` on failure → call internal constructor on success.
- Builder never has side effects (no persistence, no events, no logging).

```csharp
public static <Entity> Create(<required-args>)
{
    return new Builder(<required-args>).Build();
}
```

AppServices and Domain Services call `Create(...)`, never `new Builder(...)` directly.

## Domain Method Conventions

- Name after business operation: `Activate()`, `ChangeCreditLimit(decimal)`, `MarkAsApproved(Guid approverId)`.
- Parameters are primitives or Value Objects — never DTOs.
- Validate preconditions first. Use `Check.NotNull(...)` from ABP or throw `BusinessException`.
- Mutate private state. Always `BusinessException` with codes from `<Feature>Constants.ErrorMessages`.
- Never inject dependencies, call repositories, await, log, or mutate children directly.

## Child Entity Rules

`internal` constructor — root creates children. Mutators are methods on child called by root. No navigation to root. No domain events.

## Value Object Rules

Inherits `ValueObject`. Private constructor for EF. Public constructor validates and assigns. Override `GetAtomicValues()`. Immutable — no setters, no mutators.

## Collections on Root

Backing: `private readonly List<<Child>> _<plural>;`
Exposed: `public IReadOnlyCollection<<Child>> <Plural> => _<plural>.AsReadOnly();`
Add/remove only via aggregate methods with validation.

## Tenancy (CRC-D1, CRC-D2)

**CRC-D1: No explicit TenantId assignment.** Do NOT pass `tenantId` to entity constructors or Builders. ABP's `ICurrentTenant` scope handles it automatically on insert.

```csharp
// WRONG — don't pass tenantId
var item = new ChecklistItem(GuidGenerator.Create(), tenantId, nextSerialNumber, ...);

// CORRECT — ABP handles tenant scope
var item = new ChecklistItem(GuidGenerator.Create(), nextSerialNumber, ...);
```

**CRC-D2: IMultiTenant only for tenant-specific entities.** If entity is managed by backoffice (system-wide config like bank settings), do NOT implement `IMultiTenant`. Only tenant-specific entities need it. Consult the FS page to determine if the entity is tenant-scoped.

```csharp
// Tenant-specific entity
public class LoanApplication : FullAuditedAggregateRoot<Guid>, IMultiTenant

// System-wide config (bank managed) — NO IMultiTenant
public class LcChecklistItem : FullAuditedAggregateRoot<Guid>
```

## Soft Delete

`FullAuditedAggregateRoot<Guid>` provides `IsDeleted`, `DeleterId`, `DeletionTime`. Never redeclare. Domain methods never set these — ABP handles via `_repository.DeleteAsync`.

## Concurrency Stamp

`AggregateRoot<TKey>` implements `IHasConcurrencyStamp` automatically. Never assigned in domain code. Update DTOs carry stamp; ABP validates on `UpdateAsync`.