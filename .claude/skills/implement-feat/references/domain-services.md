# Domain Services

When an operation needs more than one aggregate, queries the repository, or coordinates with infrastructure ports, it belongs in a Domain Service — NOT in an aggregate method, NOT in an AppService.

## When mandatory

A Domain Service is required when ANY of these hold:

1. **Cross-aggregate work.** Operation reads or modifies more than one aggregate root in a single business action.
2. **Repository query for invariant.** Invariant requires querying the database (e.g., uniqueness check, balance lookup).
3. **External port involvement.** Operation calls an integration interface (`I<X>Port`) defined in Domain.
4. **Polymorphic strategy.** Operation chooses behaviour based on type/state across aggregates (e.g., dispatch to specific handler).
5. **Saga-like sequencing.** Operation involves ordered steps with rollback semantics.

If NONE of these hold, the logic belongs in the aggregate's mutator method instead.

## What Domain Services NEVER do

- Publish events (gate 2 — Domain layer never references `ILocalEventBus`/`IDistributedEventBus`)
- Apply HTTP-layer concerns (authorization, request/response shaping)
- Apply localization (throw `BusinessException(<key>)` instead — middleware translates)
- Talk to `DbContext` directly (use `IRepository<TEntity, TKey>`)
- Replace AppService — DomainService is invoked by AppService, never by HTTP

## File layout

`<Ns>.Domain/<Feature>/<Feature>DomainService.cs`. Namespace `<Ns>.<Feature>`.

```csharp
namespace <Ns>.<Feature>;

public class <Feature>DomainService : DomainService
{
    private readonly IRepository<<Root>, Guid> _repository;
    private readonly IRepository<<OtherRoot>, Guid> _otherRepository;
    private readonly I<X>Port _xPort;

    public <Feature>DomainService(
        IRepository<<Root>, Guid> repository,
        IRepository<<OtherRoot>, Guid> otherRepository,
        I<X>Port xPort)
    {
        _repository = repository;
        _otherRepository = otherRepository;
        _xPort = xPort;
    }

    // No tenantId parameter — ABP handles via ICurrentTenant scope (CRC-D1)
    public async Task<<Root>> ApproveAsync(Guid id, Guid approverId)
    {
        var root = await _repository.GetAsync(id);

        // Cross-aggregate read
        var quota = await _otherRepository.FirstOrDefaultAsync(q => q.UserId == approverId);
        if (quota == null || quota.Remaining <= 0)
            throw new BusinessException(<Feature>Constants.ErrorMessages.QuotaExceeded);

        root.Approve(approverId);    // aggregate method runs invariants
        quota.Decrement();

        await _repository.UpdateAsync(root, autoSave: true);
        await _otherRepository.UpdateAsync(quota, autoSave: true);

        return root;
    }
}
```

## Conventions

- Inherit `Volo.Abp.Domain.Services.DomainService` (provides `Logger`, `Clock`, `CurrentTenant`).
- Method names match Command name on FS, suffixed `Async`.
- Return the modified aggregate (or `Task` for void operations).
- `autoSave: true` on the final write of a multi-aggregate sequence (preserves transactional boundary).

## Anti-patterns

- DomainService that only delegates to one aggregate method (collapse to AppService → aggregate)
- DomainService publishing events (gate 2)
- DomainService injecting `IStringLocalizer` (use exception keys; middleware translates)
- DomainService accepting `tenantId` parameter (CRC-D1 — ABP handles tenancy)
- DomainService calling another DomainService (flatten — single owner of cross-aggregate logic per feature)
- DomainService that returns DTO (return aggregate; AppService maps)
