# ABP Base Classes Catalog

The authoritative catalog `ddd-synthesizer` consults when assigning ABP base classes, interfaces, and DTO base classes. Every Entity entry must cite a specific base class from this file. Every DTO must cite a specific DTO base class. Deviations require a Decision node.

> **Field contract:** Required fields and base-class enforcement live in `agents/ddd-synthesizer.md`. This file is the **catalog** the synthesizer reads from.
>
> Base class and interface names appear in DDD node entries **only** as bold-labeled field values, e.g., `**Base class:** FullAuditedAggregateRoot<Guid>`. Never inside a code fence, never with `public class`, never with `{ ... }`, never with colon-inheritance syntax.

---

## Aggregate Root Base Classes

Use these for the root entity of an aggregate. Pick the first match from top to bottom.

| Base class | When to pick |
|---|---|
| `FullAuditedAggregateRoot<TKey>` | Aggregate needs creation audit, modification audit, **and** soft-delete. Default choice when FRS clauses imply tracking who created/modified the entity and when, and an archive/soft-delete use case is in scope. |
| `AuditedAggregateRoot<TKey>` | Creation and modification audit, but no soft-delete. Hard-delete (or no delete) is acceptable. |
| `CreationAuditedAggregateRoot<TKey>` | Only creation audit (`CreationTime`, `CreatorId`). Modifications are not tracked or are handled separately. |
| `AggregateRoot<TKey>` | Standard aggregate root with domain event support and extra-property management, but no auditing. Pick when audit is explicitly out of scope. |
| `BasicAggregateRoot<TKey>` | Lightweight root without extra-property management or concurrency stamp. Pick only when the aggregate is intentionally minimal and extensibility is not required. |

**Default selection rule:** if FRS clauses reference "created by", "updated by", timestamps, history, or an archive/delete flow → `FullAuditedAggregateRoot<Guid>`. Otherwise step down to the appropriate lighter class.

`TKey` is almost always `Guid` in ABP projects. Use `int`/`long` only if CLAUDE.md declares a non-Guid key convention.

---

## Child Entity Base Classes

For entities that belong to an aggregate but are not the root.

| Base class | When to pick |
|---|---|
| `FullAuditedEntity<TKey>` | Full auditing + soft-delete. Pick when parent uses `FullAuditedAggregateRoot<TKey>` and the child needs independent audit/soft-delete. |
| `AuditedEntity<TKey>` | Creation and modification audit, no soft-delete. |
| `CreationAuditedEntity<TKey>` | Only creation audit. |
| `Entity<TKey>` | Simplest base: primary key only, no auditing. Pick when the child's lifecycle is fully controlled by the parent aggregate. |

**Mirroring rule:** a child's auditing level normally matches or is lighter than its parent root. `FullAuditedEntity<Guid>` under `AggregateRoot<Guid>` is a red flag — review the FRS and either upgrade the parent or downgrade the child.

---

## Core Interfaces

Implement these on entities (or aggregate roots) when the corresponding behavior is in scope. Use *in addition to* the base class, not instead of it.

| Interface | When to include | Notes |
|---|---|---|
| `IEntity<TKey>` | Always (implicit via base class). | Marks a class as an entity with a specific ID type. |
| `IAggregateRoot<TKey>` | Always on aggregate roots (implicit via base class). | Marks the aggregate entry point. |
| `IHasExtraProperties` | Include when extensibility via the object extension system is in scope. | Implicit on `AggregateRoot` base classes; explicit on `BasicAggregateRoot`. |
| `IHasConcurrencyStamp` | Include when concurrent edits are a documented concern (FRS mentions conflict detection, optimistic locking, or concurrent approvers). | Adds a string `ConcurrencyStamp`. |
| `ISoftDelete` | Include **only** if (a) a delete/archive/deactivate use case is in scope, OR (b) CLAUDE.md declares a project-wide soft-delete convention. Implicit on `FullAudited*` base classes. | Do not add when hard-delete is acceptable. |
| `IMultiTenant` | Include per the resolved `tenancy_model` from Phase 4. If `tenancy_model` is absent and both `TenantId` and `EntityId` appear, the Entity is blocked by a Conflict — do not assign `IMultiTenant` until resolved. | Adds a nullable `TenantId`. |

---

## Auditing Interfaces

Normally satisfied by the base class choice. Use these directly only when inheriting from `Entity<TKey>` or `BasicAggregateRoot<TKey>` and selectively adding audit behavior.

| Interface | Includes |
|---|---|
| `IHasCreationTime` | `CreationTime` |
| `ICreationAuditedObject` | `IHasCreationTime` + `CreatorId` |
| `IHasModificationTime` | `LastModificationTime` |
| `IModificationAuditedObject` | `IHasModificationTime` + `LastModifierId` |
| `IAuditedObject` | `ICreationAuditedObject` + `IModificationAuditedObject` |
| `IFullAuditedObject` | `IAuditedObject` + `ISoftDelete` + `DeletionTime` + `DeleterId` |

---

## Decision Tree: picking an Entity base class

Answer each question based on FRS clause content, not on assumptions:

1. **Is soft-delete/archive in scope for this entity?**
   - Yes → `FullAuditedAggregateRoot<Guid>` (root) or `FullAuditedEntity<Guid>` (child).
   - No → continue.
2. **Are modifications tracked (who changed it, when)?**
   - Yes → `AuditedAggregateRoot<Guid>` or `AuditedEntity<Guid>`.
   - No → continue.
3. **Is creation tracked (who created it, when)?**
   - Yes → `CreationAuditedAggregateRoot<Guid>` or `CreationAuditedEntity<Guid>`.
   - No → continue.
4. **Is the entity a lightweight lookup or value carrier with no extensibility?**
   - Yes → `BasicAggregateRoot<Guid>` (only if it's a root); consider Value Object instead if it has no identity.
   - No → `AggregateRoot<Guid>` or `Entity<Guid>`.

Record the chosen base class in the entry's `**Base class:**` field and the rationale (which FRS clause drove the choice) in `**Base class rationale:**`.

---

## DTO Base Classes

### Basic DTOs

| Base class | Use for |
|---|---|
| `EntityDto<TKey>` | Simplest DTO containing only `Id`. Pick when returning a minimal reference. |
| `ExtensibleObject` | Base for DTOs that support `IHasExtraProperties`. |

### Audited DTOs (match the entity's audit level)

| Base class | Matches entity |
|---|---|
| `CreationAuditedEntityDto<TKey>` | `CreationAudited*` |
| `CreationAuditedEntityWithUserDto<TKey, TUserDto>` | `CreationAudited*` + embed creator user info |
| `AuditedEntityDto<TKey>` | `Audited*` |
| `AuditedEntityWithUserDto<TKey, TUserDto>` | `Audited*` + embed user info |
| `FullAuditedEntityDto<TKey>` | `FullAudited*` |
| `FullAuditedEntityWithUserDto<TKey, TUserDto>` | `FullAudited*` + embed user info |

### Extensible DTOs (for aggregate roots with `IHasExtraProperties`)

| Base class | Matches aggregate |
|---|---|
| `ExtensibleEntityDto<TKey>` | `AggregateRoot<TKey>` (non-audited) |
| `ExtensibleCreationAuditedEntityDto<TKey>` | `CreationAuditedAggregateRoot<TKey>` |
| `ExtensibleAuditedEntityDto<TKey>` | `AuditedAggregateRoot<TKey>` |
| `ExtensibleFullAuditedEntityDto<TKey>` | `FullAuditedAggregateRoot<TKey>` |

`...WithUserDto` variants exist for each; pick them when the API response should embed creator/modifier user details rather than IDs only.

**Mirroring rule:** the output DTO's auditing level matches the entity's. An `AuditedEntityDto<Guid>` returned for a `FullAuditedAggregateRoot<Guid>` silently drops the soft-delete fields from the API contract — flag as a defect unless intentional and explained in a Decision node.

---

## Request & Result DTOs

For application service inputs and outputs. Do not re-invent paging/sorting contracts.

| Class | Use for |
|---|---|
| `LimitedResultRequestDto` | Input with `MaxResultCount` only. |
| `PagedResultRequestDto` | Input with `SkipCount` + `MaxResultCount`. |
| `PagedAndSortedResultRequestDto` | Input with `SkipCount` + `MaxResultCount` + `Sorting`. **Default for all Query inputs.** |
| `ListResultDto<T>` | Output wrapper for a list without total count. |
| `PagedResultDto<T>` | Output wrapper with `Items` + `TotalCount`. **Default for all Query outputs.** |

`feat-spec-validator` checks that every Query specifies an input extending `PagedAndSortedResultRequestDto` (or `PagedResultRequestDto` / `LimitedResultRequestDto` if paging/sorting are explicitly out of scope) and an output wrapper of `PagedResultDto<TDto>` (or `ListResultDto<TDto>` for unbounded small results). Deviations require a Decision node.
