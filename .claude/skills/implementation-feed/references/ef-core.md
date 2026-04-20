# EF Core Configuration

ABP uses EF Core via `IEntityTypeConfiguration<T>` classes applied by `ApplyConfigurationsFromAssembly` in the DbContext's `OnModelCreating`. `solution-inspector` verified this wiring already exists. The skill generates one configuration per entity.

## File layout

- Path: `<Ns>.EntityFrameworkCore/<Feature>/<Entity>Configuration.cs`.
- Namespace: `<Ns>.EntityFrameworkCore.<Feature>`.
- File header XML doc pointing to the Entity's wiki page.
- Class: `public class <Entity>Configuration : IEntityTypeConfiguration<<Entity>>`.
- Single method: `Configure(EntityTypeBuilder<<Entity>> builder)`.

## Configure method structure

Ordered as follows — every block is required in this order:

1. `builder.ToTable(<Ns>DbProperties.DbTablePrefix + "<EntityPlural>", <Ns>DbProperties.DbSchema);`
   - `DbTablePrefix` typically equals CLAUDE.md `db_table_prefix` (default `App`).
   - `DbSchema` may be `null` — that's fine.
   - Plural form follows PascalCase English pluralization: `Application` → `Applications`, `RequestComment` → `RequestComments`.
2. `builder.ConfigureByConvention();`
   - ABP helper that configures audit fields, soft delete, tenant id, and concurrency stamp automatically based on implemented interfaces. Always called.
3. Property configurations — one `builder.Property(x => x.<Field>)` call per field that has non-default constraints.
4. Value Object ownership — `builder.OwnsOne(x => x.<Vo>, vo => { ... });`
5. Relationships — `builder.HasMany(x => x.<Children>).WithOne().HasForeignKey("<FK>")` with explicit `OnDelete(...)`.
6. Indexes — `builder.HasIndex(x => x.<Field>)` with names when uniqueness or search needs require it.

## Property configuration

Per the Entity page's attribute table:

| FS page declares | EF configuration |
|---|---|
| `maxLength: 128` | `.HasMaxLength(<Feature>Constants.FieldLengths.<Field>Max);` |
| `required: true` | `.IsRequired();` |
| `regex: "..."` | No EF mapping — validator enforces (EF column check constraints are optional and need CLAUDE.md opt-in) |
| `precision: 18, scale: 4` | `.HasPrecision(18, 4);` |
| `column: "CustomColumn"` | `.HasColumnName("CustomColumn");` |
| `stored as string (via converter)` | `.HasConversion<string>();` for enums stored as strings |
| `default: current_timestamp` | `.HasDefaultValueSql("GETUTCDATE()");` — only if declared |

Refer to `<Feature>Constants.FieldLengths.*` for every length — never inline numbers.

## Enum storage

Default: enums stored as `int`. Reflects the default `EF Core` behavior.

If CLAUDE.md `enum_serialization` says `camelCase strings, global`, that applies to **JSON boundary only** — the database still stores `int`. Storing enums as strings in the database requires an explicit `HasConversion<string>()` declared on the Entity page.

## Value Object ownership

Value Objects persist via `OwnsOne`:

```
builder.OwnsOne(x => x.Address, address =>
{
    address.Property(a => a.Line1).HasMaxLength(<Feature>Constants.FieldLengths.AddressLine1Max).IsRequired();
    address.Property(a => a.City).HasMaxLength(<Feature>Constants.FieldLengths.CityMax).IsRequired();
    address.Property(a => a.PostalCode).HasMaxLength(20);
});
```

For single-column Value Objects (e.g., `Money` as decimal+currency pair stored in two columns but exposed as one type), `HasConversion` with a custom converter is preferred only when the FS page specifies it.

## Relationships

### One-to-many (root → children)

```
builder.HasMany<OrderLine>("_lines")                       // reference the backing field
    .WithOne()
    .HasForeignKey("OrderId")
    .OnDelete(DeleteBehavior.Cascade);                     // children die with root by default
```

The child's configuration sets no navigation back to the root.

### Many-to-one (child → root, or aggregate → referenced aggregate)

```
builder.HasOne<Customer>()                                 // referenced aggregate
    .WithMany()
    .HasForeignKey(x => x.CustomerId)
    .OnDelete(DeleteBehavior.Restrict);                    // cannot cascade across aggregate boundaries
```

Referenced aggregates are never cascade-deleted.

### Cross-aggregate foreign key discipline

A property `CustomerId: Guid` on `Order` is a **reference to another aggregate**, not a navigation. No `.HasOne(x => x.Customer)` — that would expose navigation into another aggregate's internals.

## Indexes

Every index declared on the Entity page becomes a configuration:

```
builder.HasIndex(x => x.Name);                                                // non-unique
builder.HasIndex(x => new { x.TenantId, x.Email }).IsUnique();                // composite unique
builder.HasIndex(x => x.ExternalReference).HasDatabaseName("IX_Entity_ExtRef");
```

Unique indexes on tenant-scoped aggregates always include `TenantId` as the leading column. `traceability-validator` checks this.

## Global query filters

`ConfigureByConvention()` installs ABP's default filters:

- Soft delete: `IsDeleted == false`.
- Multi-tenancy: `TenantId == CurrentTenantId`.

The skill does not add custom global filters.

## Table prefix and schema

- `<Ns>DbProperties.DbTablePrefix` — string constant in the EntityFrameworkCore project (project-owned, not generated by this skill).
- `<Ns>DbProperties.DbSchema` — optional string, typically `null`.

The skill assumes these exist. `solution-inspector` does not check for them — if they are missing, the first EF configuration to reference them will cause a compile error, which `build-validator` catches.

## Migrations

**The skill never generates migrations.** After the skill completes, the user runs:

```
dotnet ef migrations add Add<Feature>Tables --context <Ns>DbContext --output-dir Migrations --project <Ns>.EntityFrameworkCore --startup-project <Ns>.HttpApi.Host
dotnet ef database update                   --context <Ns>DbContext                              --project <Ns>.EntityFrameworkCore --startup-project <Ns>.HttpApi.Host
```

The exact commands appear in the final implementation report with paths substituted.

## What EF configurations NEVER contain

- Business logic.
- Seed data — that belongs in a separate `IDataSeedContributor`.
- `DbSet<T>` properties — those live on the DbContext, and this skill does not modify the DbContext.
- `OnModelCreating` overrides — `ApplyConfigurationsFromAssembly` picks up every `IEntityTypeConfiguration` automatically.
