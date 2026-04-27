# Mapperly Mappers

CLAUDE.md default `object_mapping_library: Mapperly`. The skill emits a Mapperly-annotated interface that the Mapperly source generator turns into a concrete class at build time. The AppService injects the interface.

`System.Text.Json` or any reflection-based mapping is not an alternative. `AutoMapper` is also not an alternative. `traceability-validator` fails the plan if an AutoMapper `Profile` is planned while CLAUDE.md says `Mapperly`.

## Package reference

Requires `Riok.Mapperly` installed in the `<Ns>.Application` project. If `solution-inspector` reports the package missing, the final report lists it as a prerequisite; the skill does not add packages to `.csproj` files.

## Interface file

- Path: `<Ns>.Application/<Feature>/<Feature>Mapper.cs`.
- Namespace: `<Ns>.<Feature>`.
- File header XML doc with `<see href="<feature wiki URL>"/>`.
- `using Riok.Mapperly.Abstractions;`.
- Declaration:

```
[Mapper]
public partial interface I<Feature>Mapper
{
    <Entity>Dto MapToOutput(<Entity> entity);
    IEnumerable<<Entity>Dto> MapToOutputList(IEnumerable<<Entity>> entities);
    // ... one pair per entity whose output is emitted
}
```

Mapperly generates the implementation class `<Feature>Mapper` at build time.

## Property mapping

- Auto-mapped — Mapperly matches source-to-target by name and type.
- For deviations (name mismatch, type coercion), add `[MapProperty(...)]` attributes on the interface method. The planner flags the need based on FS page notes; the synthesizer emits the attribute.
- Nested DTOs — Mapperly auto-maps nested types if both types have a matching mapping method in the same `[Mapper]`.
- Collections — `IEnumerable<T>`, `List<T>`, `IReadOnlyCollection<T>` all auto-map when the element types have mappings.

## Enum mapping

- Enums with matching member names auto-map.
- With the global `JsonStringEnumConverter` (CamelCase), enum values serialize to camelCase strings at the HTTP boundary — Mapperly is unaffected, it maps enum-to-enum.

## Null handling

Mapperly's default is non-throwing: mapping a `null` source to a reference-type target produces `null`. Do not override this unless the FS page calls for throwing on null.

## DI registration

`<Feature>ApplicationModule.ConfigureServices` adds:

```
context.Services.AddScoped<I<Feature>Mapper, <Feature>Mapper>();
```

(`<Feature>Mapper` is the class Mapperly generates. ABP's conventional registration also picks it up via `[Mapper]` — the explicit registration is documented for test-override clarity.)

## Usage in AppService

The AppService constructor injects `I<Feature>Mapper _mapper`. Methods call:

- `_mapper.MapToOutput(entity)` — single.
- `_mapper.MapToOutputList(entities).ToList()` — collection, with `.ToList()` at call site since Mapperly returns `IEnumerable<T>`.

No manual property assignment. No `new <Entity>Dto { Name = entity.Name, ... }` in AppServices — that pattern is an anti-pattern and the synthesizer refuses to emit it.

## Input DTO to entity mapping

By default, **no input-to-entity mapping method is emitted**. Aggregates are constructed through `<Entity>.Create(...)` (Builder pattern), not by mapping a DTO to an entity. The AppService unpacks the DTO and calls the factory:

```
var entity = <Entity>.Create(input.Name, input.Amount, CurrentTenant.Id);
```

Mapperly is used exclusively for entity-to-DTO projection on the way out. Input mapping would bypass the Builder's invariant checks.

## Partial updates

For `Update<Entity>Dto`, the AppService loads the aggregate and calls domain methods — it does NOT project DTO-to-entity via Mapperly. Mapping `Update*Dto` fields onto an entity via reflection would mutate state without routing through domain methods, violating aggregate invariants.

If the FS page explicitly says "mass assignment allowed" (rare — only for CRUD-heavy admin tables), the Entity page must declare so and the planner may emit a mapping method with `[MapperIgnoreSource]` on audit fields. Default behavior: no input mapping.

## Anti-patterns the synthesizer refuses

- `AutoMapper.Profile` subclasses — refused; library mismatch.
- `IMapper` (AutoMapper's generic interface) as a constructor dependency — refused.
- Reflection-based mappers (`object.MapTo<T>()` extension helpers) — refused.
- Manual property-by-property DTO population in AppServices — refused; use `_mapper`.
- Mapperly methods that return the source type unchanged (identity mappers) — skipped; the synthesizer simply doesn't emit these.
