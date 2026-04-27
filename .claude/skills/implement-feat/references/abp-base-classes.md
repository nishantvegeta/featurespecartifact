# ABP Base Classes — Decision Reference

Authoritative selection guide for entity base classes in the Domain layer. The `artifact-planner` and `artifact-synthesizer` consult this when emitting aggregate roots and child entities.

## Decision tree

```
Is this class the root of the aggregate?
├─ YES → Is the aggregate multi-tenant?
│        ├─ YES → FullAuditedAggregateRoot<Guid>, IMultiTenant
│        └─ NO  → FullAuditedAggregateRoot<Guid>
└─ NO  → Is the entity audited independently of the root?
         ├─ YES → FullAuditedEntity<Guid>
         └─ NO  → Entity<Guid>
```

Value Objects are always `ValueObject` (from `Volo.Abp.Domain.Values`) — never an entity base.

## Base class summary

| Base | Provides | Use when |
|---|---|---|
| `AggregateRoot<TKey>` | Concurrency stamp, domain events holder | Root with no audit needs (rare) |
| `AuditedAggregateRoot<TKey>` | CreationTime, CreatorId, LastModificationTime, LastModifierId | Root with create+modify audit, never soft-deleted |
| `FullAuditedAggregateRoot<TKey>` | Everything in AuditedAggregateRoot + IsDeleted, DeleterId, DeletionTime | **Default for roots.** Includes soft delete. |
| `Entity<TKey>` | Identity + equality | Child entity, no independent audit |
| `AuditedEntity<TKey>` | Create+modify audit | Child entity that needs audit trail |
| `FullAuditedEntity<TKey>` | Full audit including soft delete | Child that is individually soft-deletable |
| `ValueObject` | Atomic-value equality | Immutable value with no identity |

## Interface additions

| Interface | Add when |
|---|---|
| `IMultiTenant` | CLAUDE.md declares `tenancy_model` AND the Entity page lists `IMultiTenant` in its interfaces field. Adds `Guid? TenantId { get; set; }`. |
| `IHasConcurrencyStamp` | Automatic on `AggregateRoot<TKey>` subclasses — never declare manually. |
| `ISoftDelete` | Automatic on `FullAudited*` bases — never declare manually. |
| `IPassivable` | Entity page explicitly lists an "IsActive" field that is boolean and is toggled by a Command. Adds `bool IsActive { get; set; }`. |
| `IHasExtraProperties` | **Forbidden by the skill.** Every field is explicit. |

## TKey rule

Always `Guid` unless the Entity page explicitly states another key type. The skill does not support composite keys.

## Constructor pattern

Every aggregate root and audited entity has exactly two constructors:

1. **Private parameterless constructor** — for EF Core materialization. Marked `private` (aggregate root) or `internal` (child entity).
2. **Internal/private constructor with all required fields** — called by the `Builder.Build()` method (aggregate root) or by the aggregate root's domain method (child entity).

No public constructors. Creation goes through `Create(...)` factory or an aggregate-scoped domain method.

## Backing collections

Collections on an aggregate root are exposed as `IReadOnlyCollection<T>` and backed by a `private List<T>` field. Mutation happens only through domain methods on the aggregate.

Example declaration pattern (as description, not code fence):

`private readonly List<OrderLine> _lines;` backed field; `public IReadOnlyCollection<OrderLine> Lines => _lines.AsReadOnly();` exposed; `public void AddLine(...)` domain method appends to `_lines` after validation.

## What never belongs on these bases

- `ILocalEventBus` injection.
- `DbContext` injection.
- `IStringLocalizer` injection (aggregates throw `BusinessException` with codes; localization happens at the boundary).
- Any HTTP, logging, or caching infrastructure.
