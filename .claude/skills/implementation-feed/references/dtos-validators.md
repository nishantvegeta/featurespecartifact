# DTOs and Validators

## Input DTO rules

Every DTO that flows into the system (Create*, Update*, filter DTOs on Queries) uses `{ get; init; }` properties. Once constructed, the DTO is immutable. `artifact-synthesizer` refuses to emit input DTOs with `set;`.

### `Create<Entity>Dto`

- Namespace `<Ns>.<Feature>.Dtos`.
- `public class Create<Entity>Dto`.
- Properties with `{ get; init; }` — one per field on the Entity page that is required at creation AND not auto-populated.
- **Never includes** `Id`, `TenantId`, `CreationTime`, `CreatorId`, `ConcurrencyStamp`, or any audit field — ABP populates these.
- Enum-typed fields use the Domain.Shared enum type — no string fields for states.
- No validation attributes (`[Required]`, `[MaxLength]`). Validation is the Validator's job.
- Nullable-reference-type annotations honest to requirement: required fields use non-nullable types, optional fields use nullable.

### `Update<Entity>Dto`

- Same as Create, plus:
  - `public Guid Id { get; init; }`
  - `public string? ConcurrencyStamp { get; init; }`
- Covers every **mutable** field on the Entity page — not necessarily every field. Immutable-post-creation fields (e.g., creation timestamp, immutable natural key) are excluded.

### `Get<Entity>ListDto`

- Extends `PagedAndSortedResultRequestDto` when the Query page says `paged: true`.
- Adds optional filter properties per the Query's `filter_fields`, all `{ get; init; }` and all nullable.
- `Sorting` property is inherited from the base when paged — the AppService interprets it via explicit-switch (default) or `System.Linq.Dynamic.Core` (only if CLAUDE.md opts in).

## Output DTO rules

### `<Entity>Dto`

- Namespace `<Ns>.<Feature>.Dtos`.
- Inherits `EntityDto<Guid>` or `FullAuditedEntityDto<Guid>` depending on what the FS page exposes.
- Properties use `{ get; set; }` — ABP serialization and Mapperly both write to these.
- Exposes `Guid? TenantId` only if the FS page says it should be exposed (some back-office features expose it, most don't).
- Enum-typed fields use the Domain.Shared enum — JSON serialization to camelCase strings happens globally via `JsonStringEnumConverter`.
- Collection-valued properties on the root aggregate are exposed as `IReadOnlyCollection<<Child>Dto>` or as explicit nested DTOs — never as the domain types.

## FluentValidation validators

CLAUDE.md default `validation_library: FluentValidation`. The skill supports only FluentValidation as the primary validator library. `DataAnnotations` is not a replacement — it is a complement used only by ABP's built-in base validations (which this skill neither relies on nor contradicts).

### File layout

- Namespace `<Ns>.<Feature>.Validators`.
- One file per input DTO: `Create<Entity>Validator.cs`, `Update<Entity>Validator.cs`, and per-Query filter validator when the FS page declares filter constraints.
- `public class <n> : AbstractValidator<<TDto>>`.

### Construction

- Constructor takes `IStringLocalizer<<Feature>Resource> localizer`, stored in a private readonly field.
- Rules declared in the constructor body:
  ```
  RuleFor(x => x.Name)
      .NotEmpty().WithMessage(localizer[<Feature>Constants.ErrorMessages.NameRequired])
      .MaximumLength(<Feature>Constants.FieldLengths.NameMax)
      .WithMessage(localizer[<Feature>Constants.ErrorMessages.NameTooLong]);
  ```
  (Synthesizer emits equivalent C# without a fence.)

### Rules

- Reference `<Feature>Constants.*` for every numeric bound, regex, and allowed-value list — never inline magic numbers.
- Reference `<Feature>Constants.ErrorMessages.*` for every `WithMessage(...)` — never inline text.
- Use FluentValidation's built-in validators (`NotEmpty`, `MaximumLength`, `GreaterThan`, `Matches`, `When`, `Must`) to keep rules declarative.
- Cross-field rules use `.Must((dto, value) => ...)` with a `WithMessage` pointing to a dedicated error key.
- Async rules (database uniqueness checks) are a sign the check belongs in the aggregate or domain service — prefer to keep validators synchronous and declarative. Async validators are permitted only when the FS page explicitly declares a pre-write uniqueness check.

### DI registration

Module `<Feature>ApplicationModule.ConfigureServices` includes exactly one:

```
context.Services.AddValidatorsFromAssembly(typeof(<Feature>ApplicationModule).Assembly);
```

(The synthesizer dedupes — if an `AddValidatorsFromAssembly` call already exists, it leaves the file unchanged.)

### ABP pipeline integration

ABP's AppService pipeline runs registered FluentValidation validators automatically when the method parameter has a matching validator. No manual `validator.ValidateAsync(...)` call in AppService methods.

## Exposure of localization to validators

The validator injects `IStringLocalizer<<Feature>Resource>`. It does not inject `IStringLocalizerFactory` or a generic `IStringLocalizer`. This ties the validator to its feature's resource file and prevents cross-feature key leakage.

## Anti-patterns the synthesizer refuses

- `[Required]` / `[MaxLength]` attributes on DTO properties (redundant with FluentValidation).
- `public string Name { get; set; } = string.Empty;` (mutable with default) — use `public required string Name { get; init; }` instead.
- `WithMessage("Name is required")` (hardcoded English) — synthesizer refuses to emit this.
- Async-awaiting an EF query inside a validator unless the FS page explicitly declares a unique-field check (flagged as warning if it does).

## Complex DTO composition

When an input DTO contains a nested DTO (e.g., `CreateOrderDto` has `List<CreateOrderLineDto> Lines`), each nested DTO gets its own validator, and the parent validator chains:

```
RuleFor(x => x.Lines).NotEmpty().WithMessage(localizer[ErrorMessages.LinesRequired]);
RuleForEach(x => x.Lines).SetValidator(lineValidator);   // lineValidator injected
```

The Order and OrderLine validators are both registered via `AddValidatorsFromAssembly`.
