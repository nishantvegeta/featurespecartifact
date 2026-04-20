# AppService Implementation Patterns

AppService interface methods are HTTP endpoints — ABP auto-routes them. No manual controllers. This file specifies the implementation patterns the `artifact-synthesizer` emits for the `appservice-impl` kind.

## Public / Private split

When CLAUDE.md declares:

```
api_routing_conventions:
  public_prefix:  /api/public/app/
  private_prefix: /api/private/app/
```

The skill emits two implementation classes:

- `<Feature>PublicAppService`  — methods whose Audience is `Public` on the FS.
- `<Feature>PrivateAppService` — methods whose Audience is `Private` on the FS.

ABP routes them via the `RemoteServiceAttribute`:

```
[RemoteService(IsEnabled = true, IsMetadataEnabled = true)]
public class <Feature>PublicAppService : ApplicationService, I<Feature>PublicAppService { ... }
```

Plus a conventional route prefix declared in `<Ns>HttpApiHostModule` (which the skill does not touch — the project already has these declared once).

Without the split declaration, a single `<Feature>AppService` class implements a single interface under the ABP default `/api/app/...` prefix.

## Class skeleton

```
namespace <Ns>.<Feature>;

public class <Feature>PublicAppService : ApplicationService, I<Feature>PublicAppService
{
    private readonly IRepository<<Root>, Guid> _repository;
    private readonly <Feature>Service _service;              // only if domain service is planned
    private readonly I<Feature>Mapper _mapper;

    public <Feature>PublicAppService(
        IRepository<<Root>, Guid> repository,
        <Feature>Service service,
        I<Feature>Mapper mapper)
    {
        _repository = repository;
        _service = service;
        _mapper = mapper;
    }
    // methods ...
}
```

## Method patterns

### `CreateAsync(Create<Entity>Dto input)`

```
[Authorize(<Feature>Permissions.<Entity>.Create)]
public async Task<<Entity>Dto> CreateAsync(Create<Entity>Dto input)
{
    var entity = <Entity>.Create(
        CurrentTenant.Id,                      // only if IMultiTenant
        input.Name,
        input.Amount
    );
    await _repository.InsertAsync(entity, autoSave: true);
    return _mapper.MapToOutput(entity);
}
```

- FluentValidation runs before method entry — the method trusts the DTO shape.
- `autoSave: true` on `InsertAsync` only when the AppService method is a pure single-aggregate write; for multi-step flows coordinated via the domain service, rely on UoW batching.
- Map and return.

### `GetAsync(Guid id)`

```
[Authorize(<Feature>Permissions.<Entity>.Read)]
public async Task<<Entity>Dto> GetAsync(Guid id)
{
    var entity = await _repository.GetAsync(id);
    EnsureTenantOwnership(entity);             // helper, see below
    return _mapper.MapToOutput(entity);
}
```

### `GetListAsync(Get<Entity>ListDto input)`

```
[Authorize(<Feature>Permissions.<Entity>.Read)]
public async Task<PagedResultDto<<Entity>Dto>> GetListAsync(Get<Entity>ListDto input)
{
    var query = await _repository.GetQueryableAsync();

    // Tenant scope first
    if (CurrentTenant.Id.HasValue)
    {
        query = query.Where(x => x.TenantId == CurrentTenant.Id);
    }

    // Optional filters
    query = query
        .WhereIf(!string.IsNullOrWhiteSpace(input.Filter), x => x.Name.Contains(input.Filter!))
        .WhereIf(input.Status.HasValue,                     x => x.Status == input.Status!.Value);

    // Sorting — explicit switch (default strategy)
    query = ApplySorting(query, input.Sorting);

    var total = await AsyncExecuter.CountAsync(query);
    var items = await AsyncExecuter.ToListAsync(query.PageBy(input));

    return new PagedResultDto<<Entity>Dto>(
        total,
        _mapper.MapToOutputList(items).ToList());
}

private static IQueryable<<Entity>> ApplySorting(IQueryable<<Entity>> query, string? sorting)
{
    return (sorting?.Trim().ToLowerInvariant()) switch
    {
        "name asc"       => query.OrderBy(x => x.Name),
        "name desc"      => query.OrderByDescending(x => x.Name),
        "createdat asc"  => query.OrderBy(x => x.CreationTime),
        "createdat desc" => query.OrderByDescending(x => x.CreationTime),
        _                => query.OrderByDescending(x => x.CreationTime)   // default from Query page
    };
}
```

The allowed sort keys come directly from the Query page's sort-allowed list. The default branch mirrors the page's `default_sort`.

`System.Linq.Dynamic.Core` is used **only** when `sorting_strategy: dynamic-linq` is declared in CLAUDE.md — otherwise forbidden (open-column-name surface is an injection vector).

### `UpdateAsync(Update<Entity>Dto input)`

```
[Authorize(<Feature>Permissions.<Entity>.Update)]
public async Task<<Entity>Dto> UpdateAsync(Update<Entity>Dto input)
{
    var entity = await _repository.GetAsync(input.Id);
    EnsureTenantOwnership(entity);

    // Domain methods do the mutation — never assign properties directly.
    entity.Rename(input.Name);
    if (input.Amount is not null) entity.ChangeAmount(input.Amount.Value);

    // Concurrency stamp is carried by the entity; ABP compares it to input implicitly.
    await _repository.UpdateAsync(entity, autoSave: true);
    return _mapper.MapToOutput(entity);
}
```

### `DeleteAsync(Guid id)`

```
[Authorize(<Feature>Permissions.<Entity>.Delete)]
public async Task DeleteAsync(Guid id)
{
    var entity = await _repository.GetAsync(id);
    EnsureTenantOwnership(entity);
    await _repository.DeleteAsync(entity);
}
```

### Custom operations

```
[Authorize(<Feature>Permissions.<Entity>.Approve)]
public async Task<<Entity>Dto> ApproveAsync(Guid id)
{
    var entity = await _repository.GetAsync(id);
    EnsureTenantOwnership(entity);
    entity = await _service.ApproveAsync(CurrentTenant.Id, id, CurrentUser.Id!.Value);
    return _mapper.MapToOutput(entity);
}
```

## Tenant guard helper

When the aggregate implements `IMultiTenant`, every AppService class includes a private helper:

```
private void EnsureTenantOwnership(<Entity> entity)
{
    if (entity.TenantId != CurrentTenant.Id)
    {
        throw new AbpAuthorizationException(
            L["<Feature>:Error:CrossTenantAccessDenied"]);
    }
}
```

The error message key is declared in `en.json`. No hardcoded English. `L` is the built-in localizer helper from `ApplicationService`.

## Authorization completeness

Every single method gets exactly one `[Authorize(...)]`. Read methods included. `traceability-validator` fails the plan on any method without an `[Authorize]`.

## Async conventions

- Every AppService method is `async Task` or `async Task<T>`.
- Names end in `Async`.
- Use `AsyncExecuter` for materialization (`CountAsync`, `ToListAsync`, `FirstOrDefaultAsync`) — it's ABP's async bridge that works across EF Core and MongoDB without direct EF Core dependency in the Application layer.
- Never `.Result`, `.Wait()`, `.GetAwaiter().GetResult()`.

## Return shapes

- Single-item returns: `<Entity>Dto`.
- List returns without paging: `List<<Entity>Dto>`.
- Paged list returns: `PagedResultDto<<Entity>Dto>`.
- Void-ish returns: `Task` (not `Task<Unit>` or `Task<bool>` for "did it work" — throw on failure, return void on success).

## Error handling

- Expected business failures: `throw new BusinessException(<Feature>Constants.ErrorMessages.<Key>);` — ABP localizes via the resource.
- Authorization failures: `throw new AbpAuthorizationException(...)`.
- Unexpected failures: let them propagate — ABP's exception middleware maps to 500 with a safe response body.

## What AppServices NEVER do

- Never call `SaveChangesAsync` on the DbContext directly.
- Never inject `DbContext`.
- Never inject `ILocalEventBus` — events are out of scope for this skill.
- Never use `System.Linq.Dynamic.Core` unless CLAUDE.md opts in.
- Never orchestrate across multiple aggregates inline — delegate to the Domain Service.
- Never skip the tenant guard when `IMultiTenant` is present.
- Never return domain aggregates directly — always map to a DTO.
