# Domain Layer — Aggregates, Builders, Domain Methods

Authoritative patterns for Domain layer synthesis. The `artifact-synthesizer` follows these exactly when producing files of kind `aggregate-root`, `child-entity`, `value-object`.

## Aggregate root skeleton

Every aggregate root file has this structural layout, in this order:

1. File header XML doc with `<see href="<source_link>"/>`.
2. `using` directives (sorted: System, Microsoft, Volo.Abp.*, project namespaces).
3. Namespace `<Ns>.<Feature>`.
4. `public class <Entity> : FullAuditedAggregateRoot<Guid>` (plus `IMultiTenant` if applicable).
5. **Public read-only properties** with private setters.
6. **Read-only collection exposures** backed by private lists.
7. **Private parameterless constructor** for EF Core.
8. **Internal constructor** taking every required field — called only by `Builder.Build()`.
9. **Static `Create(...)` factory** delegating to `new Builder(...).Build()`.
10. **Domain methods** — one per postcondition referenced by a Command.
11. **Nested `Builder` class** at the bottom of the type.

## Builder pattern rules

The Builder enforces invariants **before** the aggregate exists in memory. No invalid aggregate may ever be constructed.

- `Builder` is `public sealed class` nested inside the aggregate type.
- Fields of the Builder mirror the required fields of the aggregate.
- Builder constructor takes every required input and stashes it.
- Optional Fluent setters for optional fields (`WithDescription(string)`, `WithLimit(decimal)`).
- `public <Entity> Build()`:
  1. Validate every invariant — null checks, range checks, cross-field checks.
  2. On failure, throw `BusinessException(<Feature>Constants.ErrorMessages.<Key>)`.
  3. On success, call the aggregate's internal constructor and return the instance.
- Builder never has side effects beyond constructing the aggregate. No persistence, no events, no logging.

## Static Create factory

```
public static <Entity> Create(<required-args>) { return new Builder(<required-args>).Build(); }
```

AppServices and Domain Services call `Create(...)`. They never call `new Builder(...)` directly.

## Domain method conventions

- Name each method after the business operation — `Activate()`, `ChangeCreditLimit(decimal)`, `MarkAsApproved(Guid approverId)`.
- Parameters are primitives or Value Objects — never DTOs.
- First lines validate preconditions. Use `Check.NotNull(...)` and `Check.NotNullOrWhiteSpace(...)` from ABP, or explicit throws.
- Mutate private state — `this.Status = ...`.
- Throw `BusinessException` with codes from `<Feature>Constants.ErrorMessages` on precondition failure.
- Never throw raw `InvalidOperationException` or `ArgumentException` — always `BusinessException` so ABP localizes the message at the boundary.

## What aggregate methods NEVER do

- Never inject dependencies (aggregates have no DI).
- Never call `ILocalEventBus` or `Add*Event` — this skill forbids domain events.
- Never call any repository.
- Never await anything — aggregate methods are synchronous.
- Never log.
- Never mutate children's state directly — call the child's own method.

## Child entity rules

- `internal` constructor — the root creates children.
- All mutators are methods on the child, called by the root.
- No backing field navigation to the root (EF handles FK via root's collection configuration).
- No domain events.

## Value Object rules

- Inherits `ValueObject` (Volo.Abp.Domain.Values).
- Private constructor for EF Core materialization.
- Public constructor validates and assigns.
- Override `GetAtomicValues()` yielding every field in declaration order.
- Immutable — no setters, no mutators.
- Equality is by-value, handled by the base.

## Collections on the root

- Backing field: `private readonly List<<Child>> _<plural>;`
- Exposed: `public IReadOnlyCollection<<Child>> <Plural> => _<plural>.AsReadOnly();`
- Add/remove only via aggregate methods that validate cardinality, uniqueness, state preconditions.

## Tenancy

- If aggregate implements `IMultiTenant`, expose `public Guid? TenantId { get; private set; }`.
- `TenantId` is set once at construction — in the Builder — and never mutated afterward.

## Soft delete

- `FullAuditedAggregateRoot<Guid>` provides `IsDeleted`, `DeleterId`, `DeletionTime` — never redeclared.
- Domain methods never set these; ABP's soft-delete interceptor handles it via `_repository.DeleteAsync`.

## Concurrency stamp

- `AggregateRoot<TKey>` and descendants implement `IHasConcurrencyStamp` automatically.
- `ConcurrencyStamp` is set by ABP on every insert/update — never assigned in domain code.
- Update DTOs carry the stamp back to the AppService; ABP validates it on `UpdateAsync`.

## Example structure (described, no code fence)

`public class LoanApplication : FullAuditedAggregateRoot<Guid>, IMultiTenant` with:
- Public properties: `Guid? TenantId`, `string ApplicantName`, `decimal RequestedAmount`, `LoanStatus Status`, `Guid ApproverId?`.
- Private collection `_documents` exposed as `Documents`.
- Private parameterless ctor.
- Internal ctor taking (tenantId, applicantName, requestedAmount).
- Static `Create(Guid? tenantId, string applicantName, decimal requestedAmount)` → `new Builder(...).Build()`.
- Domain methods: `AddDocument(LoanDocument doc)`, `Submit()`, `Approve(Guid approverId)`, `Reject(string reason)`.
- Nested `Builder` with `WithDescription`, `WithPreferredTerm`, `Build()` validating amount > 0, name not empty.
