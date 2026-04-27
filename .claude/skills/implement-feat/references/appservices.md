# AppService Implementation Patterns

AppService interface methods are HTTP endpoints — ABP auto-routes them. No manual controllers. This file specifies patterns the `artifact-synthesizer` emits for `appservice-impl`.

## Public / Private Split

When CLAUDE.md declares `api_routing_conventions` with `public_prefix`/`private_prefix`, emit two classes: `<Feature>PublicAppService` and `<Feature>PrivateAppService`. Without split, a single `<Feature>AppService`.

## Class Skeleton

```csharp
namespace <Ns>.<Feature>;

public class <Feature>PublicAppService : ApplicationService, I<Feature>PublicAppService
{
    private readonly IRepository<<Root>, Guid> _repository;
    private readonly <Feature>DomainService _service;    // only if domain service is planned
    private readonly I<Feature>Mapper _mapper;
    private readonly ILogger<<Feature>PublicAppService> _logger;

    public <Feature>PublicAppService(
        IRepository<<Root>, Guid> repository,
        <Feature>DomainService service,
        I<Feature>Mapper mapper,
        ILogger<<Feature>PublicAppService> logger)
    {
        _repository = repository;
        _service = service;
        _mapper = mapper;
        _logger = logger;
    }
}
```

## Method Patterns

### `CreateAsync`

```csharp
[Authorize(<Feature>Permissions.<Entity>.Create)]
public async Task<<Entity>Dto> CreateAsync(Create<Entity>Dto input)
{
    _logger.LogInformation("{Method} invoked by {UserId} with {@Input}",
        nameof(CreateAsync), CurrentUser.Id, input);

    // No tenantId passed — ABP handles via ICurrentTenant scope
    var entity = <Entity>.Create(
        GuidGenerator.Create(),
        input.Name,
        input.Amount);

    await _repository.InsertAsync(entity, autoSave: true);

    var result = await AsyncExecuter.FirstOrDefaultAsync(
        (await _repository.GetQueryableAsync())
        .Where(x => x.Id == entity.Id)
        .Select(x => MapToDetailDto(x)));

    _logger.LogInformation("{Method} completed for entity {Id}", nameof(CreateAsync), entity.Id);
    return result;
}
```

### `GetAsync` — Select Only Required Fields

```csharp
[Authorize(<Feature>Permissions.<Entity>.Read)]
public async Task<<Entity>Dto> GetAsync(Guid id)
{
    _logger.LogInformation("{Method} invoked for {Id} by {UserId}",
        nameof(GetAsync), id, CurrentUser.Id);

    // CORRECT: project before fetch — don't use _repository.GetAsync(id)
    var item = await AsyncExecuter.FirstOrDefaultAsync(
        (await _repository.GetQueryableAsync())
        .Where(x => x.Id == id)
        .Select(x => MapToDetailDto(x)));

    if (item == null)
        throw new EntityNotFoundException(typeof(<Entity>), id);

    _logger.LogInformation("{Method} completed for {Id}", nameof(GetAsync), id);
    return item;
}
```

### `GetListAsync` — Dynamic Sorting + Select Before Fetch

```csharp
[Authorize(<Feature>Permissions.<Entity>.Read)]
public async Task<PagedResultDto<<Entity>ListDto>> GetListAsync(Get<Entity>ListDto input)
{
    _logger.LogInformation("{Method} invoked by {UserId} with {@Input}",
        nameof(GetListAsync), CurrentUser.Id, input);

    var query = await _repository.GetQueryableAsync();

    // Optional filters
    query = query
        .WhereIf(!string.IsNullOrWhiteSpace(input.Filter),
            x => x.Name.Contains(input.Filter!))
        .WhereIf(input.Status.HasValue,
            x => x.Status == input.Status!.Value);

    // Dynamic sorting — NO switch statements
    query = query.ApplyDynamicSorting(input.Sorting, input.SortDirection,
        defaultSort: x => x.CreationTime, defaultDescending: true);

    var total = await AsyncExecuter.CountAsync(query);

    // CORRECT: Select BEFORE fetch — project in query chain
    var items = await AsyncExecuter.ToListAsync(
        query.Skip(input.SkipCount).Take(input.MaxResultCount)
             .Select(x => MapToListItemDto(x)));

    _logger.LogInformation("{Method} returned {Count}/{Total}", nameof(GetListAsync), items.Count, total);
    return new PagedResultDto<<Entity>ListDto>(total, items);
}
```

### `UpdateAsync`

```csharp
[Authorize(<Feature>Permissions.<Entity>.Update)]
public async Task<<Entity>Dto> UpdateAsync(Update<Entity>Dto input)
{
    _logger.LogInformation("{Method} invoked for {Id} by {UserId}",
        nameof(UpdateAsync), input.Id, CurrentUser.Id);

    var entity = await _repository.GetAsync(input.Id);

    // Domain methods do mutation — never assign properties directly
    entity.Rename(input.Name);
    if (input.Amount is not null) entity.ChangeAmount(input.Amount.Value);

    await _repository.UpdateAsync(entity, autoSave: true);

    _logger.LogInformation("{Method} completed for {Id}", nameof(UpdateAsync), input.Id);
    return _mapper.MapToOutput(entity);
}
```

### `DeleteAsync` — Use ABP Soft Delete

```csharp
[Authorize(<Feature>Permissions.<Entity>.Delete)]
public async Task DeleteAsync(Guid id)
{
    _logger.LogInformation("{Method} invoked for {Id} by {UserId}",
        nameof(DeleteAsync), id, CurrentUser.Id);

    var entity = await _repository.GetAsync(id);
    // Use DeleteAsync — ABP handles IsDeleted, DeleterId, DeletedTime automatically
    await _repository.DeleteAsync(entity);

    _logger.LogInformation("{Method} completed for {Id}", nameof(DeleteAsync), id);
}
```

### Custom Operations

```csharp
[Authorize(<Feature>Permissions.<Entity>.Approve)]
public async Task<<Entity>Dto> ApproveAsync(Guid id)
{
    _logger.LogInformation("{Method} invoked for {Id} by {UserId}",
        nameof(ApproveAsync), id, CurrentUser.Id);

    var entity = await _service.ApproveAsync(id, CurrentUser.Id!.Value);

    _logger.LogInformation("{Method} completed for {Id}", nameof(ApproveAsync), id);
    return _mapper.MapToOutput(entity);
}
```

## Exception Handling — Only When Needed (CRC-A4)

Do NOT wrap every method in try-catch. Use try-catch only for:
- External service calls
- Retry logic
- Domain-specific validations needing translation
- BackgroundJobs/HostedServices (never crash the worker)

For standard AppService CRUD, ABP's exception infrastructure handles HTTP status codes. Business failures use `throw new BusinessException(<Feature>Constants.ErrorMessages.<Key>)`.

## Authorization

Every method gets `[Authorize(<permission>)]`. Use `AsyncExecuter` for materialization. Never `.Result`, `.Wait()`, `.GetAwaiter().GetResult()`.

## Return Shapes

Single-item: `<Entity>Dto`. Paged list: `PagedResultDto<<Entity>Dto>`. Void: `Task` (throw on failure, void on success).

## AppServices NEVER

- Call `SaveChangesAsync` on DbContext directly or inject DbContext.
- Use `ILocalEventBus` — events are out of scope.
- Use `System.Linq.Dynamic.Core` unless CLAUDE.md opts in.
- Orchestrate across multiple aggregates inline — delegate to Domain Service.
- Return domain aggregates directly — always map to DTO.
- Use switch-based sorting.
- Map after fetch — always select-before-fetch.
- Pass tenantId to entity constructors.
- Manually set IsDeleted/DeleterId — use DeleteAsync.