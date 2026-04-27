# Domain Services — When and How

A Domain Service is a stateless, domain-layer class that coordinates operations across multiple aggregates. It is NOT a catch-all for AppService logic.

## When MANDATORY

Create a Domain Service when any condition is true:

1. **Multi-aggregate state change.** Command changes ≥2 aggregates atomically.
2. **Reorder / ranking across siblings.** Touches ≥2 sibling entities' ordering fields.
3. **Cross-aggregate calculation.** Computes value from data across aggregates.
4. **External-system validation.** Must check external system before mutation.
5. **Business rule reused by ≥2 Commands.**

If none apply, do NOT create one. Simple single-aggregate logic lives on the aggregate, called directly by AppService.

## When FORBIDDEN

Transaction management (ABP UoW handles), HTTP invocations (use Integration port), persistence mechanics (use `IRepository<T>`), event publishing, reading DTOs, authorization.

## Class Skeleton

```csharp
namespace <Ns>.<Feature>.DomainServices;

public class <Feature>DomainService : DomainService
{
    private readonly IRepository<<Root1>, Guid> _root1Repository;
    private readonly IRepository<<Root2>, Guid> _root2Repository;

    public <Feature>DomainService(
        IRepository<<Root1>, Guid> root1Repository,
        IRepository<<Root2>, Guid> root2Repository)
    {
        _root1Repository = root1Repository;
        _root2Repository = root2Repository;
    }

    // No tenantId parameter — ABP handles tenant scope automatically (CRC-D1)
    public async Task<<Root1>> ApproveWithDisbursementAsync(Guid applicationId, Guid approverId)
    {
        var app = await _root1Repository.GetAsync(applicationId);
        var disb = await _root2Repository.FindAsync(d => d.ApplicationId == applicationId)
            ?? throw new BusinessException(<Feature>Constants.ErrorMessages.DisbursementMissing);

        app.Approve(approverId);
        disb.Schedule(DateTime.UtcNow.AddDays(2));

        await _root1Repository.UpdateAsync(app);
        await _root2Repository.UpdateAsync(disb);

        return app;
    }
}
```

## Method Contract

- Public async methods, one per orchestration operation.
- **No tenantId parameter** — ABP's `ICurrentTenant` scope handles tenant filtering automatically.
- Load aggregates via repository. Call aggregate domain methods to mutate. Persist via repository.
- Return primary aggregate for AppService to map to DTO.
- Throw `BusinessException` with FS-sourced error codes on failure.

## AppService-to-Service Pattern

AppService: `[Authorize]` → delegate to `_service.ApproveWithDisbursementAsync(id, CurrentUser.Id.Value)` → map returned aggregate to DTO → return.

AppService does not orchestrate. Service does not authorize.

## Input/Output Types

Inputs: primitives or Value Objects — never DTOs. Outputs: aggregates or primitives — never DTOs. DTO mapping in AppService via Mapperly.

## DI Registration

Domain Services registered by ABP convention via `DomainService` base. Generator adds explicit `AddScoped` for visibility and test overrides.

## Anti-pattern

"Helper" services with grab-bag methods that don't meet mandatory criteria = God object. Refuse to create. Decompose into aggregate methods or distinct services.