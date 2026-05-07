# Domain Layer — Aggregate Roots, Child Entities, Value Objects

The Domain layer encodes business rules. ABP-shaped: aggregates inherit a base, expose state via private setters, mutate via methods, never publish events directly.

## File layout

```
<Ns>.Domain/<Feature>/
    <Root>.cs                    // aggregate root
    <Child>.cs                   // child entities (one per file)
    <ValueObject>.cs             // value objects
    <Feature>DomainService.cs    // when domain service is needed
```

## 11-step aggregate layout (synthesizer template order)

1. File header XML doc with `<see href="<wiki-url>"/>` to the FS Entity page
2. `using` directives
3. Namespace declaration
4. Class declaration with base class + interfaces
5. Public properties (private setters)
6. Private backing fields
7. Public read-only collections
8. **Constructors** — protected parameterless (EF), private value-taking (Builder), public NEVER (gate 1 of HARD-GATE)
9. Static factory `Create(...)` (delegates to Builder)
10. Public mutator methods (one per business operation; runs invariants)
11. Nested `Builder` class (private constructor wrapper)

## Builder pattern

```csharp
public class LoanApplication : FullAuditedAggregateRoot<Guid>, IMultiTenant
{
    public Guid? TenantId { get; private set; }
    public string ApplicantName { get; private set; } = null!;
    public decimal Amount { get; private set; }
    public LoanStatus Status { get; private set; }

    private readonly List<LoanComment> _comments = new();
    public IReadOnlyCollection<LoanComment> Comments => _comments.AsReadOnly();

    protected LoanApplication() { }    // EF only

    private LoanApplication(Guid id, string applicantName, decimal amount) : base(id)
    {
        ApplicantName = applicantName;
        Amount = amount;
        Status = LoanStatus.Submitted;
    }

    public static LoanApplication Create(Guid id, string applicantName, decimal amount)
        => new Builder(id).WithApplicantName(applicantName).WithAmount(amount).Build();

    public void Approve(Guid approverId)
    {
        if (Status != LoanStatus.Submitted)
            throw new BusinessException(LoanApplicationConstants.ErrorMessages.CannotApproveNonSubmitted);

        Status = LoanStatus.Approved;
    }

    private class Builder
    {
        private readonly Guid _id;
        private string? _applicantName;
        private decimal _amount;

        public Builder(Guid id) { _id = id; }

        public Builder WithApplicantName(string name)
        {
            if (string.IsNullOrWhiteSpace(name))
                throw new BusinessException(LoanApplicationConstants.ErrorMessages.ApplicantNameRequired);
            _applicantName = name;
            return this;
        }

        public Builder WithAmount(decimal amount)
        {
            if (amount <= 0)
                throw new BusinessException(LoanApplicationConstants.ErrorMessages.AmountMustBePositive);
            _amount = amount;
            return this;
        }

        public LoanApplication Build()
        {
            if (_applicantName == null)
                throw new BusinessException(LoanApplicationConstants.ErrorMessages.ApplicantNameRequired);
            return new LoanApplication(_id, _applicantName, _amount);
        }
    }
}
```

Why Builder: invariants run in a place that's testable in isolation, and `Create(...)`'s signature is short even when the aggregate has many required fields.

## CRC-D1 — No explicit TenantId in constructors

Aggregate constructors must NOT take a `tenantId` parameter. ABP populates `TenantId` automatically via `ICurrentTenant` scope when the entity is inserted.

```csharp
// CORRECT — no tenantId param
private LoanApplication(Guid id, string name, decimal amount) : base(id) { ... }

// WRONG — synthesizer refuses
private LoanApplication(Guid id, string name, decimal amount, Guid? tenantId) : base(id)
{
    TenantId = tenantId;
}
```

## CRC-D2 — IMultiTenant only for tenant-specific entities

Apply `IMultiTenant` ONLY when the entity is owned by a specific tenant. Cross-tenant entities (system audit logs, tenant configuration, billing platform records) MUST NOT carry `IMultiTenant`.

If FS Entity page is silent on tenancy and the bounded context is tenant-scoped, default to `IMultiTenant`. If FS marks the entity as cross-tenant, omit it.

## Soft delete

Aggregates inheriting `FullAuditedAggregateRoot<TKey>` automatically implement `ISoftDelete`. Repository `DeleteAsync(entity)` sets `IsDeleted = true`, populates `DeleterId`, `DeletedTime`. Query filter `!IsDeleted` is auto-applied by ABP — do NOT add explicit `HasQueryFilter` (CRC-E2).

Skill never assigns `IsDeleted` / `DeleterId` / `DeletedTime` directly (gate 7).

## Concurrency stamp

`FullAuditedAggregateRoot` provides `ConcurrencyStamp`. Update DTO carries it; AppService passes via `SetConcurrencyStamp` before `UpdateAsync`. EF Core handles the optimistic check.

## Invariants location

| Invariant kind | Location |
|---|---|
| "field must be non-empty" | Builder method |
| "value within range" | Builder method |
| "transition only allowed in state X" | mutator method |
| "across multiple aggregates" | DomainService |
| "uniqueness against database" | DomainService (queries via repo) |

Aggregate methods throw `BusinessException(<key>)`; localizer at HTTP boundary turns it into a translated message.

## Anti-patterns

- Public constructor on aggregate root
- Setter visibility `public` on aggregate properties (always `private set`)
- `void Mutate(state)` methods that just assign without running invariants
- Direct `_collection.Add(...)` from AppService (use a domain method)
- Cross-aggregate orchestration inside one aggregate's method (use DomainService)
- Aggregate calling `ILocalEventBus.PublishAsync` (gate 2)
- `tenantId` constructor parameter (CRC-D1)
- `IMultiTenant` on cross-tenant entity (CRC-D2)
- Ctor running EF queries — keep aggregates pure
