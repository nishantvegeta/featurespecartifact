# ABP Entity Base Classes

Pick the right ABP base class. Wrong base = wrong audit fields, wrong soft-delete behaviour, wrong tenancy. Reconciler uses this for shape comparison; synthesizer uses it for `aggregate-root` / `child-entity` / `value-object` templates.

## Decision tree

```
Is it a Value Object (no identity, equality by content)?
├── YES → ValueObject
└── NO → Is it the root of an aggregate (commands target it)?
        ├── YES → Aggregate Root
        └── NO  → Child Entity inside an aggregate
```

## Aggregate Root bases

| Base | Use when |
|---|---|
| `FullAuditedAggregateRoot<TKey>` | **default** — Created/Modified/Deleted audit + soft delete + concurrency stamp. Both ABP and most teams use this for new aggregates. |
| `AuditedAggregateRoot<TKey>` | Audit + concurrency stamp; **no** soft delete. Pick only when FS explicitly says "hard delete only". |
| `CreationAuditedAggregateRoot<TKey>` | CreationTime/CreatorId only. Rare — read-mostly aggregates that never modify post-create. |
| `AggregateRoot<TKey>` | No audit at all. Almost never appropriate; only when FS marks aggregate as transient/log-like. |

Skill default for new aggregate roots: **`FullAuditedAggregateRoot<Guid>`** unless FS overrides.

## Child Entity bases

| Base | Use when |
|---|---|
| `FullAuditedEntity<TKey>` | Default for child entities under an audited root. |
| `AuditedEntity<TKey>` | Audit but no soft delete. |
| `Entity<TKey>` | No audit, no soft delete. Rare — junction/link entities only. |

Child entities are loaded via the parent aggregate's repository; they don't get their own `IRepository<T>`.

## Tenancy interface

Apply `IMultiTenant` (CRC-D2) **only when the aggregate is owned by a specific tenant**. Cross-tenant aggregates (Tenant configuration, system audit logs, billing-platform records) do NOT carry it.

```csharp
public class LoanApplication : FullAuditedAggregateRoot<Guid>, IMultiTenant
{
    public Guid? TenantId { get; private set; }    // nullable, ABP populates
    // ...
}
```

`TenantId` declared `Guid?` (nullable) — host-tenant data is stored with `null`. Setter `private` so only ABP and the aggregate's ctor set it.

## Other ABP interfaces

| Interface | Apply when FS says |
|---|---|
| `ISoftDelete` | aggregate retains records logically; "deleted" rows hidden by query filter |
| `IPassivable` | aggregate has active/inactive toggle distinct from soft-delete |
| `IHasModificationTime` | only modification timestamp needed without full audit |
| `IHasExtraProperties` | aggregate accepts arbitrary key-value extension data |

`IHasExtraProperties` is rarely declared on FS Entity pages. Do not add it unless FS explicitly mentions it. Adding it later is a non-breaking schema migration; adding it speculatively bloats the table.

## TKey rule

Every aggregate root and child entity in this codebase uses `Guid` as primary key. Skill never emits `<int>` or `<long>`. If FS declares otherwise, the FS is wrong; raise a Conflict.

## Constructor pattern

ABP requires a parameterless protected constructor for EF Core. Skill emits:

```csharp
public class LoanApplication : FullAuditedAggregateRoot<Guid>, IMultiTenant
{
    protected LoanApplication() { }    // EF only

    private LoanApplication(Guid id, ...) : base(id) { ... }    // private — only Builder/Create call

    public static LoanApplication Create(...) { ... }            // factory; runs invariants
}
```

The Builder pattern (`domain-layer.md`) wraps the private ctor.

## Backing collections

Child entities exposed as `IReadOnlyCollection<TChild>` from a private `List<TChild>`:

```csharp
private readonly List<OrderLine> _lines = new();
public IReadOnlyCollection<OrderLine> Lines => _lines.AsReadOnly();
```

EF configures via `b.HasMany<OrderLine>("_lines")` referencing the backing field. AppService never writes to `_lines` directly — uses domain methods like `AddLine(...)`.
