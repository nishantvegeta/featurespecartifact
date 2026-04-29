---
id: checklist-item
name: ChecklistItem
type: entity
version: 1.0.0
created: 2026-04-29
last_modified: 2026-04-29
---

# ChecklistItem

**Node type:** Entity

**Module:** Bank Settings

**Aggregate role:** Aggregate root

**Purpose:** Represents a configurable verification requirement in the LC issuance checklist. Bank administrators manage the checklist; Branch and CTF staff use it during LC review.

**Lifecycle:** Created (Active by default) → status toggles between Active/Inactive → Deleted

**Base class:** `AggregateRoot<Guid>` (ABP standard aggregate root pattern)

**Base class rationale:** ChecklistItem is the primary aggregate managing checklist configuration; it owns domain logic for status transitions and sequencing invariants.

**Interfaces:** `IMultiTenant` (per-customer isolation), `IHasConcurrencyStamp` (optimistic locking for concurrent edits)

**Multi-tenancy:** `IMultiTenant` — ChecklistItem filtered by `TenantId` at query time. Implicit in ABP AppService context.

**Attributes**

| Name | Type | Required | Owned by | Notes |
|------|------|----------|----------|-------|
| Id | Guid | Yes | ChecklistItem | Primary key |
| TenantId | Guid? | Yes | ChecklistItem | Multi-tenancy scoping |
| Description | string | Yes | ChecklistItem | 1–500 chars; verification requirement text |
| SequenceNumber | int | Yes | ChecklistItem | Sort order (1, 2, 3...) |
| IsActive | bool | Yes | ChecklistItem | True = included in active LC review checklists |
| ConcurrencyStamp | string | Yes | ChecklistItem | Optimistic lock token |

**Invariants**

- SequenceNumber ≥ 1 and ≤ current max
- Description length ∈ [1, 500]
- TenantId is always set (not null)
- ConcurrencyStamp changes on every update (ABP enforced)

**Domain events raised**

| Event | Required/Optional | Consumer |
|-------|-------------------|----------|
| ChecklistItemAdded | Optional | Future messaging integration |
| ChecklistItemUpdated | Optional | Future messaging integration |
| ChecklistItemStatusToggled | Optional | Future messaging integration |
| ChecklistItemDeleted | Optional | Future messaging integration |
| ChecklistItemsReordered | Optional | Future messaging integration |

*Note: Events marked Optional/future pending confirmation of messaging queue consumer or cross-module async side effects. CRUD commands do NOT raise domain events by default per ABP conventions.*

**Related commands**

- [AddChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/commands/AddChecklistItem)
- [UpdateChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/commands/UpdateChecklistItem)
- [ToggleChecklistItemStatus](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/commands/ToggleChecklistItemStatus)
- [MoveChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/commands/MoveChecklistItem)
- [DeleteChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/commands/DeleteChecklistItem)

**Related queries**

- [ListChecklistItems](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/queries/ListChecklistItems)

**Related states**

- [ChecklistItemStatus](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/states/ChecklistItemStatus)

**Relationships**

- Container: implicit via Bank Settings module (no parent aggregate; top-level domain entity per customer)
- No child entities (attributes map directly to columns)
- No external system reference

**Source**

- [FRS #15 — Purpose](http://localhost:8080/root/trade-finance/-/issues/15#1-purpose)
- [FRS #15 — Scope](http://localhost:8080/root/trade-finance/-/issues/15#2-scope)
- [FRS #16 — Functional Requirements](http://localhost:8080/root/trade-finance/-/issues/16#12-functional-requirements)
- [FRS #17 — Form Fields](http://localhost:8080/root/trade-finance/-/issues/17#11-form-fields)

## Change History

- v1.0.0 (2026-04-29): Created from feat spec bank-settings.
