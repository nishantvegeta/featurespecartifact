---
id: checklist-item
name: ChecklistItem
type: Entity
version: "1.0"
created: "2026-05-07"
last_modified: "2026-05-07"
---

**Node type:** Entity
**Name:** ChecklistItem
**Module:** BankSettings
**Sub-module:** ChecklistManagement
**Aggregate role:** Aggregate root
**Purpose:** Represents a single verification step in a tenant's LC Issuance Checklist. Each item carries a human-readable description, a 1-based gap-free sequence number defining display and operational order, and a binary active/inactive status. The entity is the sole consistency boundary for checklist data; no child entities exist within this aggregate.
**Lifecycle:** See [ChecklistItemStatus](http://localhost:8080/root/trade-finance/-/wikis/states/ChecklistItemStatus).
**Base class:** `FullAuditedAggregateRoot<Guid>`
**Base class rationale:** Soft-delete is required — [FRS #16 — Delete behavior](http://localhost:8080/root/trade-finance/-/issues/16#4-delete-behavior) — deleted items must remain in the audit trail for a minimum of 7 years per [FRS #17 — Retention](http://localhost:8080/root/trade-finance/-/issues/17#6-retention). Full audit fields (creation, last modification, deletion metadata) are required per [FRS #15 — Audit](http://localhost:8080/root/trade-finance/-/issues/15#8-audit). `FullAuditedAggregateRoot<Guid>` provides all of these with no custom code.
**Interfaces:** `IMultiTenant`, `IHasConcurrencyStamp`
**Multi-tenancy:** per-customer (tenancy_model from CLAUDE.md). Every query and mutation is automatically scoped to the current tenant via ABP's `IMultiTenant` data filter. Cross-tenant access is impossible at the data layer.

**Attributes table:**

| Name | Type | Required | Owned by | Notes |
|---|---|---|---|---|
| `Description` | `string` | yes | This milestone | Max 500 chars; must be unique within the tenant's active+inactive item set |
| `SequenceNumber` | `int` | yes | This milestone | 1-based integer; gap-free across all non-deleted items in the tenant; assigned by domain service on Create, maintained on Reorder and Delete |
| `Status` | `ChecklistItemStatus` | yes | This milestone | Enum stored as camelCase string via global `JsonStringEnumConverter`; initial value `Active` |

**Invariants:**
- `Description` must be unique within the tenant (case-insensitive comparison recommended) at all times. — [FRS #15 — Uniqueness](http://localhost:8080/root/trade-finance/-/issues/15#7-uniqueness)
- `SequenceNumber` must form a contiguous 1-based sequence with no gaps across all non-deleted items for a given `TenantId`. This invariant must hold after every Create, Reorder, and Delete operation. Enforcement is the responsibility of the domain service. — [FRS #15 — Data model](http://localhost:8080/root/trade-finance/-/issues/15#5-data-model)
- `SequenceNumber` must be ≥ 1. — [FRS #15 — Data model](http://localhost:8080/root/trade-finance/-/issues/15#5-data-model)
- On creation, `Status` must be `Active`. — [FRS #15 — Status](http://localhost:8080/root/trade-finance/-/issues/15#5-status)
- Mutation methods (`SetDescription`, `SetSequenceNumber`, `Toggle`) are `internal` because domain-service prechecks are required to enforce the gap-free sequence invariant and uniqueness rule before persistence. AppServices must route through the domain service (`ChecklistItemManager`). — [CLAUDE.md conventions — Domain service prechecks](http://localhost:8080/root/trade-finance/-/wikis/decisions/OptimisticConcurrencyStrategy)

**Domain events raised:** none. ChecklistItem CRUD operations have no external consumers, no cross-module async side effects, and no message-broker integrations in this milestone. ABP's `FullAuditedAggregateRoot` provides the audit trail integration natively. Synthesizing speculative events is prohibited per the domain-events gating policy.

**Related commands:**
- [CreateChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/commands/CreateChecklistItem)
- [UpdateChecklistItemDescription](http://localhost:8080/root/trade-finance/-/wikis/commands/UpdateChecklistItemDescription)
- [ToggleChecklistItemStatus](http://localhost:8080/root/trade-finance/-/wikis/commands/ToggleChecklistItemStatus)
- [ReorderChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/commands/ReorderChecklistItem)
- [DeleteChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/commands/DeleteChecklistItem)

**Related queries:**
- [ListChecklistItems](http://localhost:8080/root/trade-finance/-/wikis/queries/ListChecklistItems)
- [GetChecklistItemForEdit](http://localhost:8080/root/trade-finance/-/wikis/queries/GetChecklistItemForEdit)

**Related states:** [ChecklistItemStatus](http://localhost:8080/root/trade-finance/-/wikis/states/ChecklistItemStatus)

**Relationships:**
- N:1 with `Tenant` (AbpTenantInfo) via `TenantId` from `IMultiTenant`. Every `ChecklistItem` belongs to exactly one tenant. Null `TenantId` is invalid in this per-customer deployment.

**DTO:** `ChecklistItemDto` extends `FullAuditedEntityDto<Guid>` — mirrors the aggregate's auditing level per CLAUDE.md conventions. Fields: `Id`, `Description`, `SequenceNumber`, `Status` (camelCase string), plus base audit fields (`CreationTime`, `CreatorId`, `LastModificationTime`, `LastModifierId`, `IsDeleted`, `DeletionTime`, `DeleterId`).

**EF Core mapping notes:**
- Table name: `AppChecklistItems` (prefix `App` per `db_table_prefix`).
- `Status` stored as string via global `JsonStringEnumConverter`; no per-entity `HasConversion<string>()` required.
- `ConcurrencyStamp` from `IHasConcurrencyStamp` mapped with `HasConcurrencyToken()`. See [OptimisticConcurrencyStrategy](http://localhost:8080/root/trade-finance/-/wikis/decisions/OptimisticConcurrencyStrategy).
- Unique index on `(TenantId, Description)` (case-insensitive collation) to enforce description uniqueness at DB level as a secondary guard.
- Non-unique index on `(TenantId, SequenceNumber)` for ordering performance.

**Source:**
- [FRS #15 — Data model](http://localhost:8080/root/trade-finance/-/issues/15#5-data-model)
- [FRS #15 — Audit](http://localhost:8080/root/trade-finance/-/issues/15#8-audit)
- [FRS #15 — Tenancy](http://localhost:8080/root/trade-finance/-/issues/15#6-tenancy)
- [FRS #16 — Delete behavior](http://localhost:8080/root/trade-finance/-/issues/16#4-delete-behavior)
- [FRS #17 — Retention](http://localhost:8080/root/trade-finance/-/issues/17#6-retention)

## Change History

- **1.0** (2026-05-07): Initial draft from Bank Settings milestone feat spec generation.
