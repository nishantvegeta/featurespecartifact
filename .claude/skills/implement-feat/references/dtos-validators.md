# DTOs and Validators

## Input DTOs

Every DTO that flows IN (`Create*`, `Update*`, filter DTOs on Queries) uses `{ get; init; }`. Once constructed, immutable. Synthesizer refuses input DTOs with `set;`.

### `Create<Entity>Dto`

- Namespace `<Ns>.<Feature>.Dtos`. `public class Create<Entity>Dto`.
- `{ get; init; }` props — one per Entity field required at creation AND not auto-populated.
- **Never includes** `Id`, `TenantId`, `CreationTime`, `CreatorId`, `ConcurrencyStamp`, or any audit field — ABP populates these.
- Enum-typed fields use Domain.Shared enum type — no string fields for states.
- No validation attributes (`[Required]`, `[MaxLength]`) — that's the validator's job.
- Nullable annotations honest: required fields non-nullable, optional nullable.

### `Update<Entity>Dto`

Same as Create plus `public Guid Id { get; init; }` and `public string? ConcurrencyStamp { get; init; }`. Covers every **mutable** Entity field — not necessarily every field. Immutable-post-creation fields excluded.

### `Get<Entity>ListDto`

Extends `PagedAndSortedResultRequestDto` when Query says `paged: true`. Optional filter properties per Query's `filter_fields`, all `{ get; init; }` and nullable. `Sorting` inherited from base; AppService interprets per `sorting_strategy` (default dynamic-expression).

## Output DTOs

### `<Entity>Dto`

- Namespace `<Ns>.<Feature>.Dtos`.
- Inherits `EntityDto<Guid>` or `FullAuditedEntityDto<Guid>` per FS exposure.
- `{ get; set; }` — ABP serialization and Mapperly write to these.
- Exposes `Guid? TenantId` only if FS says it should be exposed (rare; some back-office features).
- Enum-typed fields use Domain.Shared enum — JSON serialization to camelCase strings via global `JsonStringEnumConverter`.
- Collection-valued root-aggregate properties exposed as `IReadOnlyCollection<<Child>Dto>` or explicit nested DTOs — never domain types.

## FluentValidation

CLAUDE.md default `validation_library: FluentValidation`. Skill supports only FluentValidation as primary library. `DataAnnotations` is not a replacement.

### File layout

- Namespace `<Ns>.<Feature>.Validators`.
- One file per input DTO: `Create<Entity>Validator.cs`, `Update<Entity>Validator.cs`, plus per-Query filter validator when FS declares filter constraints.
- `public class <n> : AbstractValidator<<TDto>>`.

### Construction

Constructor takes `IStringLocalizer<<Feature>Resource> localizer`, stored in private readonly field. Rules in ctor body:

```csharp
RuleFor(x => x.Name)
    .NotEmpty().WithMessage(localizer[<Feature>Constants.ErrorMessages.NameRequired])
    .MaximumLength(<Feature>Constants.FieldLengths.NameMax)
    .WithMessage(localizer[<Feature>Constants.ErrorMessages.NameTooLong]);
```

### Rules

- Reference `<Feature>Constants.*` for every numeric bound, regex, allowed-value list — never inline magic numbers.
- Reference `<Feature>Constants.ErrorMessages.*` for every `WithMessage(...)` — never inline text.
- Use built-in validators (`NotEmpty`, `MaximumLength`, `GreaterThan`, `Matches`, `When`, `Must`).
- Cross-field rules: `.Must((dto, value) => ...).WithMessage(...)` with dedicated error key.
- Async rules (DB uniqueness checks) usually belong in aggregate or domain service. Permitted only when FS explicitly declares pre-write uniqueness check.

### DI registration

`<Feature>ApplicationModule.ConfigureServices` includes:

```csharp
context.Services.AddValidatorsFromAssembly(typeof(<Feature>ApplicationModule).Assembly);
```

Synthesizer dedupes — if call already exists, leaves file unchanged.

### ABP pipeline

ABP's AppService pipeline runs registered FluentValidation validators automatically when method parameter has matching validator. No manual `validator.ValidateAsync(...)` in AppService methods.

## Localization injection

Validator injects `IStringLocalizer<<Feature>Resource>` — not `IStringLocalizerFactory` or generic `IStringLocalizer`. Ties validator to its feature's resource and prevents cross-feature key leakage.

## Anti-patterns the synthesizer refuses

- `[Required]` / `[MaxLength]` attributes on DTO properties (redundant with FluentValidation).
- `public string Name { get; set; } = string.Empty;` on input DTO — use `public required string Name { get; init; }`.
- `WithMessage("Name is required")` (hardcoded English).
- Async-awaiting EF query inside validator unless FS declares unique-field check.

## Complex DTO composition

Nested input DTO (e.g., `CreateOrderDto` has `List<CreateOrderLineDto> Lines`) → each nested DTO gets its own validator; parent chains:

```csharp
RuleFor(x => x.Lines).NotEmpty().WithMessage(localizer[ErrorMessages.LinesRequired]);
RuleForEach(x => x.Lines).SetValidator(lineValidator);
```

Both validators registered via `AddValidatorsFromAssembly`.
