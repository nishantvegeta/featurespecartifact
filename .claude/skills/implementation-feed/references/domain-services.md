# Domain Services — When and How

A Domain Service is a stateless, domain-layer class that coordinates operations across multiple aggregates, performs computations that span aggregates, or validates against external systems. It is NOT a catch-all for AppService logic.

## When a Domain Service is MANDATORY

`artifact-planner` creates a Domain Service when any of these conditions is true (one is enough):

1. **Multi-aggregate state change.** A Command changes state on ≥2 aggregates atomically (e.g., "Approve Loan" updates `LoanApplication.Status` AND creates a `Disbursement`).
2. **Reorder / ranking across a sibling set.** "Move item up in list" touches ≥2 sibling entities' ordering fields.
3. **Cross-aggregate calculation.** A Command computes a value from data across aggregates the caller doesn't own (e.g., "Compute available credit" from customer + active loans + pending applications).
4. **External-system validation.** A Command must check an external system before mutating a domain aggregate (e.g., "Verify bank account exists before saving").
5. **Business rule reused by ≥2 Commands.** The same non-trivial rule appears in more than one Command's postconditions — extract it.

If none apply, do NOT create a Domain Service. Simple single-aggregate logic lives on the aggregate itself, and the AppService calls the aggregate directly.

## When a Domain Service is FORBIDDEN

- Transaction management — ABP handles this via UoW at the AppService boundary.
- HTTP invocations — use an Integration port on the Application layer.
- Persistence mechanics — never call `SaveChangesAsync` directly; use `IRepository<T>`.
- Event publishing — this skill forbids domain events entirely.
- Reading DTOs — the service operates on domain types, not Application DTOs.
- Authorization — that's the AppService's `[Authorize]` attribute.

## Class skeleton

```
namespace <Ns>.<Feature>.DomainServices;

public class <Feature>Service : DomainService
{
    private readonly IRepository<<Root1>, Guid> _root1Repository;
    private readonly IRepository<<Root2>, Guid> _root2Repository;

    public <Feature>Service(
        IRepository<<Root1>, Guid> root1Repository,
        IRepository<<Root2>, Guid> root2Repository)
    {
        _root1Repository = root1Repository;
        _root2Repository = root2Repository;
    }

    public async Task<<Root1>> ApproveWithDisbursementAsync(Guid tenantId, Guid applicationId, Guid approverId)
    {
        var app  = await _root1Repository.GetAsync(applicationId);
        var disb = await _root2Repository.FindAsync(d => d.ApplicationId == applicationId) ?? throw new BusinessException(<Feature>Constants.ErrorMessages.DisbursementMissing);

        app.Approve(approverId);
        disb.Schedule(DateTime.UtcNow.AddDays(2));

        await _root1Repository.UpdateAsync(app);
        await _root2Repository.UpdateAsync(disb);

        return app;
    }
}
```

(The synthesizer emits equivalent code without a code fence in the file — the fence here is illustrative for the reference.)

## Method contract

- Public async methods, one per orchestration operation.
- First parameter is usually `Guid tenantId` (forwarded from the AppService) — allows the service to cross-check tenant boundaries when loading sibling aggregates.
- Load aggregates via the repository.
- Call aggregate domain methods to mutate state.
- Persist via `_repository.UpdateAsync(...)` / `InsertAsync` / `DeleteAsync`.
- Return the primary aggregate so the AppService can map to a DTO.
- Throw `BusinessException` with FS-sourced error codes on precondition failure.

## AppService-to-service pattern

AppService:
1. `[Authorize(...)]`
2. Load the primary aggregate via repository.
3. Tenant guard.
4. Delegate to `await _service.ApproveWithDisbursementAsync(CurrentTenant.Id.Value, id, CurrentUser.Id.Value);`.
5. Map the returned aggregate to a DTO.
6. Return.

The AppService does not orchestrate — it delegates. The service does not authorize — it trusts the AppService.

## Input / output types

- Inputs are primitives (`Guid`, `string`, `int`) or domain Value Objects — never DTOs.
- Outputs are domain aggregates or primitives — never DTOs.
- Mapping to DTOs happens in the AppService via Mapperly.

## DI registration

Domain Services are registered by ABP's conventional DI when they inherit `DomainService`. The generator adds an explicit `AddScoped<<Feature>Service>()` in `<Feature>ApplicationModule.ConfigureServices` to make the registration visible and to allow for test overrides.

## What makes a Domain Service "stateless"

- No mutable instance fields beyond injected dependencies (which are themselves stateless via ABP DI scope).
- No static state.
- Every method is pure with respect to its inputs and the repositories.

## Anti-pattern: "Helper" services

A "Helper" service that holds a grab-bag of methods, none of which meet the mandatory criteria above, is not a Domain Service — it's a God object. Refuse to create it. Decompose into aggregate methods or distinct domain services per business area.
