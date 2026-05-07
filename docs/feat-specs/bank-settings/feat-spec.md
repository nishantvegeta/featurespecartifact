# Bank Settings — LC Issuance Checklist Management

**Module:** BankSettings
**Sub-module:** ChecklistManagement
**Milestone:** Bank Settings
**Spec version:** 1.0
**Status:** Draft

---

## 1. Feature Overview

**Purpose:** Provide BankAdmin users with a fully-managed backoffice UI for creating, editing, reordering, toggling, and deleting items in the tenant’s LC Issuance Checklist — the ordered list of verification steps presented to Branch and CTF staff during letter-of-credit review.

**Scope:** Five mutating operations (create, edit description, toggle active/inactive, reorder, delete) and two read operations (paginated list, edit pre-fill). All operations are scoped to the current tenant. Deleted items are soft-deleted and retained in the audit trail for a minimum of 7 years. Optimistic concurrency is enforced on all mutating operations.

**Business impact:** BankAdmin has direct, auditable control over the LC Issuance Checklist content and order. Changes take effect immediately for all operational users (Branch, CTF) within the same tenant.

---

## 2. Related FRS

- [FRS #15 — LC Issuance Checklist Management](http://localhost:8080/root/trade-finance/-/issues/15)
- [FRS #16 — Concurrency and Conflict Handling](http://localhost:8080/root/trade-finance/-/issues/16)
- [FRS #17 — Data Retention](http://localhost:8080/root/trade-finance/-/issues/17)
- [FRS #18 — Permissions](http://localhost:8080/root/trade-finance/-/issues/18)
- [FRS #19 — Audit Logging](http://localhost:8080/root/trade-finance/-/issues/19)
- [FRS #20 — Non-functional Requirements](http://localhost:8080/root/trade-finance/-/issues/20)

---

## 3. Bounded Context and Affected Layers

**Bounded context:** BankSettings  
**Sub-module:** ChecklistManagement  
**Tenancy model:** per-customer (all data scoped to `TenantId` via `IMultiTenant`)

**Affected layers:**

| Layer | Project | Key addition |
|---|---|---|
| Domain | Amnil.TradeFinance.Domain | `ChecklistItem` aggregate, `ChecklistItemManager` domain service |
| Domain.Shared | Amnil.TradeFinance.Domain.Shared | `ChecklistItemStatus` enum |
| Application.Contracts | Amnil.TradeFinance.Application.Contracts | DTOs, `IChecklistItemAppService` interface |
| Application | Amnil.TradeFinance.Application | `ChecklistItemAppService`, validators, Mapperly mapper |
| EntityFrameworkCore | Amnil.TradeFinance.EntityFrameworkCore | `AppChecklistItems` table config, indexes, concurrency token |
| HttpApi | Amnil.TradeFinance.HttpApi | `ChecklistItemController` (thin delegator) |

---
## 4. Domain Layer Design

### Entities

**[ChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/entities/ChecklistItem)**

- **Base class:** `FullAuditedAggregateRoot<Guid>`
- **Interfaces:** `IMultiTenant`, `IHasConcurrencyStamp`
- **Attributes:** `Description` (string, max 500, unique per tenant), `SequenceNumber` (int, 1-based, gap-free), `Status` (`ChecklistItemStatus` enum, camelCase string)
- **Invariants:** Description unique per tenant; SequenceNumber gap-free across non-deleted items; Status = Active on creation; mutation methods are `internal` (domain service enforces prechecks)
- **Domain events:** none

### States

**[ChecklistItemStatus](http://localhost:8080/root/trade-finance/-/wikis/states/ChecklistItemStatus)**

| State | Description | Initial | Terminal |
|---|---|---|---|
| `Active` | Included in operational checklist | yes | no |
| `Inactive` | Excluded from operational checklist; retained for audit | no | no |

Transitions: `Active` to `Inactive` or reverse via [ToggleChecklistItemStatus](http://localhost:8080/root/trade-finance/-/wikis/commands/ToggleChecklistItemStatus) only. Soft-delete (`IsDeleted = true`) is the only terminal condition.

### Domain Service

**ChecklistItemManager**

Owns all sequencing logic. Responsibilities: description uniqueness pre-check, gap-free sequence maintenance (append on create, compact on delete, shift-range on reorder). AppServices must route all mutations through this service. Entity mutation methods (`SetDescription`, `SetSequenceNumber`, `Toggle`) are `internal`.

### Actors

**[BankAdmin](http://localhost:8080/root/trade-finance/-/wikis/actors/BankAdmin)** — authenticated human; holds `BankAdmin` role in `IdentityUser`; initiates all 5 commands and 2 queries; backoffice (Private API) only; tenant-scoped.

---

## 5. Application Layer Design

### Commands

| Command | HTTP | Permission |
|---|---|---|
| [CreateChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/commands/CreateChecklistItem) | POST /api/private/app/bank-settings/checklist-items | `...ChecklistItems.Create` |
| [UpdateChecklistItemDescription](http://localhost:8080/root/trade-finance/-/wikis/commands/UpdateChecklistItemDescription) | PUT /api/private/app/bank-settings/checklist-items/{id} | `...ChecklistItems.Edit` |
| [ToggleChecklistItemStatus](http://localhost:8080/root/trade-finance/-/wikis/commands/ToggleChecklistItemStatus) | POST /api/private/app/bank-settings/checklist-items/{id}/toggle-status | `...ChecklistItems.ToggleStatus` |
| [ReorderChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/commands/ReorderChecklistItem) | POST /api/private/app/bank-settings/checklist-items/{id}/reorder | `...ChecklistItems.Reorder` |
| [DeleteChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/commands/DeleteChecklistItem) | DELETE /api/private/app/bank-settings/checklist-items/{id} | `...ChecklistItems.Delete` |

### Queries

| Query | HTTP | Permission |
|---|---|---|
| [ListChecklistItems](http://localhost:8080/root/trade-finance/-/wikis/queries/ListChecklistItems) | GET /api/private/app/bank-settings/checklist-items | `...ChecklistItems.View` |
| [GetChecklistItemForEdit](http://localhost:8080/root/trade-finance/-/wikis/queries/GetChecklistItemForEdit) | GET /api/private/app/bank-settings/checklist-items/{id} | `...ChecklistItems.View` |

### DTOs

| DTO | Base | Fields |
|---|---|---|
| `ChecklistItemDto` | `FullAuditedEntityDto<Guid>` | `Id`, `Description`, `SequenceNumber`, `Status` (camelCase string), plus base audit fields |
| `CreateChecklistItemInput` | plain | `Description` (string, NotEmpty, MaxLength 500) |
| `UpdateChecklistItemDescriptionInput` | plain | `Id`, `ConcurrencyStamp`, `Description` |
| `ToggleChecklistItemStatusInput` | plain | `Id`, `ConcurrencyStamp` |
| `ReorderChecklistItemInput` | plain | `Id`, `ConcurrencyStamp`, `NewSequenceNumber` (int >= 1) |
| `DeleteChecklistItemInput` | plain | `Id`, `ConcurrencyStamp` |
| `ListChecklistItemsInput` | `PagedAndSortedResultRequestDto` | `Status?` (`ChecklistItemStatus`) |

### Validators

- `CreateChecklistItemInputValidator` — NotEmpty, MaxLength(500), whitespace guard on Description
- `UpdateChecklistItemDescriptionInputValidator` — NotEmpty on all fields; MaxLength(500) on Description
- `ToggleChecklistItemStatusInputValidator` — NotEmpty on Id and ConcurrencyStamp
- `ReorderChecklistItemInputValidator` — NotEmpty on Id/ConcurrencyStamp; GreaterThanOrEqualTo(1) on NewSequenceNumber
- `DeleteChecklistItemInputValidator` — NotEmpty on Id and ConcurrencyStamp

### Object Mapping

Mapperly mapper: `ChecklistItemMapper`

- `ChecklistItem` -> `ChecklistItemDto`

### Application Service

`ChecklistItemAppService` implements `IChecklistItemAppService`. Every method carries `[Authorize(TradeFinancePermissions.BankSettings.ChecklistItems.X)]`. All mutations delegate sequencing logic to `ChecklistItemManager`. No direct EF Core calls from the application layer.

### Flows

- [ListChecklistItemsFlow](http://localhost:8080/root/trade-finance/-/wikis/flows/ListChecklistItemsFlow) — BankAdmin navigates to checklist page; list renders with pagination
- [EditChecklistItemFlow](http://localhost:8080/root/trade-finance/-/wikis/flows/EditChecklistItemFlow) — BankAdmin opens edit dialog; ConcurrencyStamp carries through; HTTP 409 triggers re-fetch and retry
- [DeleteChecklistItemFlow](http://localhost:8080/root/trade-finance/-/wikis/flows/DeleteChecklistItemFlow) — confirmation dialog; soft-delete; list reloads

---

## 6. Infrastructure and Persistence Design

**Table:** `AppChecklistItems` (prefix `App` per `db_table_prefix`)

**Column mapping:**

| Column | Type | Notes |
|---|---|---|
| `Id` | `uuid` | PK |
| `TenantId` | `uuid?` | FK to AbpTenants; null invalid in per-customer deployment |
| `Description` | `varchar(500)` | — |
| `SequenceNumber` | `int` | — |
| `Status` | `varchar` | Stored as camelCase string via global converter |
| `ConcurrencyStamp` | `varchar(40)` | `HasConcurrencyToken()` — see [OptimisticConcurrencyStrategy](http://localhost:8080/root/trade-finance/-/wikis/decisions/OptimisticConcurrencyStrategy) |
| Full audit columns | — | From `FullAuditedAggregateRoot` |

**Indexes:**

- Unique index on `(TenantId, Description)` with case-insensitive collation — enforces uniqueness at DB layer
- Non-unique index on `(TenantId, SequenceNumber)` — ordering performance

**EF Core notes:**

- `Status` stored as string via global `JsonStringEnumConverter`; no per-entity `HasConversion<string>()` required
- `ConcurrencyStamp` requires explicit `HasConcurrencyToken()` in entity configuration
- ABP global `ISoftDelete` filter excludes deleted items automatically; no explicit `IsDeleted == false` filter needed in queries

---

## 7. HTTP API Design

All routes are **Private** (`/api/private/app/...`). `ChecklistItemController` is a thin delegator to `ChecklistItemAppService`.

| Method | Route | Handler | HTTP success |
|---|---|---|---|
| GET | /api/private/app/bank-settings/checklist-items | ListChecklistItems | 200 |
| GET | /api/private/app/bank-settings/checklist-items/{id} | GetChecklistItemForEdit | 200 |
| POST | /api/private/app/bank-settings/checklist-items | CreateChecklistItem | 200 |
| PUT | /api/private/app/bank-settings/checklist-items/{id} | UpdateChecklistItemDescription | 200 |
| POST | /api/private/app/bank-settings/checklist-items/{id}/toggle-status | ToggleChecklistItemStatus | 200 |
| POST | /api/private/app/bank-settings/checklist-items/{id}/reorder | ReorderChecklistItem | 204 |
| DELETE | /api/private/app/bank-settings/checklist-items/{id} | DeleteChecklistItem | 204 |

---

## 8. Permissions, Security, and Multi-Tenancy

**Permission class:** `TradeFinancePermissions.BankSettings.ChecklistItems`

| Permission string | Grants |
|---|---|
| `TradeFinancePermissions.BankSettings.ChecklistItems.View` | ListChecklistItems, GetChecklistItemForEdit |
| `TradeFinancePermissions.BankSettings.ChecklistItems.Create` | CreateChecklistItem |
| `TradeFinancePermissions.BankSettings.ChecklistItems.Edit` | UpdateChecklistItemDescription |
| `TradeFinancePermissions.BankSettings.ChecklistItems.ToggleStatus` | ToggleChecklistItemStatus |
| `TradeFinancePermissions.BankSettings.ChecklistItems.Reorder` | ReorderChecklistItem |
| `TradeFinancePermissions.BankSettings.ChecklistItems.Delete` | DeleteChecklistItem |

**Multi-tenancy:** `IMultiTenant` on `ChecklistItem`; ABP data filter enforces tenant isolation automatically. Null `TenantId` is invalid in per-customer deployment.

**Open conflict:** [inferred-permission-names](http://localhost:8080/root/trade-finance/-/wikis/conflicts/inferred-permission-names) — FRS does not enumerate exact permission string names; names above are inferred from ABP conventions. Low severity.

---

## 9. Integration, Background Jobs, and Distributed Events

**Integration:** [AuditTrail](http://localhost:8080/root/trade-finance/-/wikis/integrations/AuditTrail)

ABP's built-in `AuditingInterceptor` records every AppService method call automatically. `FullAuditedAggregateRoot` provides field-level audit columns (`CreationTime`, `CreatorId`, `LastModificationTime`, `LastModifierId`, `DeletionTime`, `DeleterId`). No custom audit code required. Audit write is non-blocking (failure does not roll back primary operation).

**Background jobs:** none in this milestone.

**Distributed events:** none. No cross-module async side effects.

---

## 10. UI-API Integration Points

### Screen-to-Endpoint Map

| Screen / action | Endpoint | Input | Output |
|---|---|---|---|
| Checklist list page load | GET /api/private/app/bank-settings/checklist-items | `ListChecklistItemsInput` | `PagedResultDto<ChecklistItemDto>` |
| Status filter change | GET /api/private/app/bank-settings/checklist-items | `ListChecklistItemsInput` + `Status` | `PagedResultDto<ChecklistItemDto>` |
| Open edit dialog | GET /api/private/app/bank-settings/checklist-items/{id} | route `id` | `ChecklistItemDto` (incl. `ConcurrencyStamp`) |
| Save edit dialog | PUT /api/private/app/bank-settings/checklist-items/{id} | `UpdateChecklistItemDescriptionInput` | `ChecklistItemDto` |
| Toggle status row action | POST /api/private/app/bank-settings/checklist-items/{id}/toggle-status | `ToggleChecklistItemStatusInput` | `ChecklistItemDto` |
| Reorder drag-drop | POST /api/private/app/bank-settings/checklist-items/{id}/reorder | `ReorderChecklistItemInput` | 204 (list must reload) |
| Add item form submit | POST /api/private/app/bank-settings/checklist-items | `CreateChecklistItemInput` | `ChecklistItemDto` |
| Delete confirmation | DELETE /api/private/app/bank-settings/checklist-items/{id} | `DeleteChecklistItemInput` | 204 (list must reload) |

### DTO Field Notes

- `Status` serialized as camelCase string (`active` / `inactive`), not integer. Use badge variant matching the string value directly.
- `ConcurrencyStamp` must be held in UI state after every read; passed back on every mutating call.
- `ReorderChecklistItem` and `DeleteChecklistItem` return 204 (no body); UI must reload list via `ListChecklistItems` after these operations.

### Loading and Error Requirements

- List page shows loading state while `ListChecklistItems` is in flight; empty state when `TotalCount = 0`.
- Edit dialog shows loading state while `GetChecklistItemForEdit` is in flight; if 404 received, close dialog, show item-no-longer-exists notification, then reload list.
- HTTP 409 on any mutation: notify user of concurrency conflict; auto re-fetch item and re-open dialog (edit flow) or prompt to reload. See [OptimisticConcurrencyStrategy](http://localhost:8080/root/trade-finance/-/wikis/decisions/OptimisticConcurrencyStrategy).
- HTTP 422 on create/edit: show inline validation error on the Description field.
- After every successful mutation, re-invoke `ListChecklistItems` to reload. No polling or WebSocket. See [NoRealtimeRefreshDecision](http://localhost:8080/root/trade-finance/-/wikis/decisions/NoRealtimeRefreshDecision).

### Gap Analysis

No missing queries or commands identified. All screen actions map to existing endpoints.

---

## 11. Error Handling, Auditing, and Logging

| Error condition | Exception type | HTTP status | UI behavior |
|---|---|---|---|
| Description uniqueness violation | `BusinessException` | 422 | Inline field error |
| `NewSequenceNumber` out of range | `BusinessException` | 422 | Inline field error |
| Concurrency stamp mismatch | `AbpDbConcurrencyException` | 409 | Conflict notification + reload prompt |
| Item not found / soft-deleted | `EntityNotFoundException` | 404 | Notification + list reload |
| Unauthorized | ABP authorization exception | 403 | Permission-denied UI state |

**Auditing:** ABP `AuditingInterceptor` handles audit logging for all AppService calls automatically. `FullAuditedAggregateRoot` provides field-level audit columns. No-op edits short-circuit before `SaveChanges` and do not produce an `AuditLog` entry — see [IdempotentEditAuditBehavior](http://localhost:8080/root/trade-finance/-/wikis/decisions/IdempotentEditAuditBehavior). 7-year retention via soft-deleted rows in `AppChecklistItems` and platform `AuditLogs` — see [FRS #17](http://localhost:8080/root/trade-finance/-/issues/17#6-retention).

**Logging:** ABP logs audit write failures at `Warning` level. No additional custom metrics in this milestone.

---

## 12. Performance and Scalability

- Default page size 20, maximum 100 per `ListChecklistItems` request — prevents unbounded result sets.
- Index on `(TenantId, SequenceNumber)` ensures ordered list queries are efficient even at large item counts.
- Unique index on `(TenantId, Description)` provides a DB-level uniqueness guard.
- Reorder shifts a range of rows in a single transaction; range bounded by total item count per tenant (expected: tens to low hundreds for a checklist).
- No caching layer needed at this milestone given low-frequency admin operation profile.

---

## 13. Deployment Considerations

- EF Core migration required to create `AppChecklistItems` table with all columns, indexes, and unique constraints.
- `ChecklistItemStatus` enum added to `Domain.Shared`; no migration required for enum values since stored as string.
- Permission definitions must be seeded into ABP's permission store; `TradeFinancePermissions.BankSettings.ChecklistItems.*` constants defined in `Application.Contracts` and registered in the permissions provider.
- No new infrastructure components (no queues, no background workers, no external services).

---

## 14. Open Questions and Future Enhancements

**Open conflicts (medium severity):**

- [gap-free-sequence-invariant](http://localhost:8080/root/trade-finance/-/wikis/conflicts/gap-free-sequence-invariant) — FRS implies gap-free sequence; exact compaction strategy on delete is inferred. Medium severity: if a non-contiguous sequence is acceptable, the reorder and delete implementations can be simplified.
- [optimistic-concurrency-strategy](http://localhost:8080/root/trade-finance/-/wikis/conflicts/optimistic-concurrency-strategy) — `IHasConcurrencyStamp` adopted as the ABP-idiomatic approach; `RowVersion` and custom ETag alternatives evaluated and rejected. Medium severity: if DB-vendor portability requirements change, strategy may need revisiting.

**Open conflicts (low severity):**

- [inferred-permission-names](http://localhost:8080/root/trade-finance/-/wikis/conflicts/inferred-permission-names) — permission string names inferred from ABP conventions; FRS does not enumerate them explicitly.
- [idempotent-edit-audit-behavior](http://localhost:8080/root/trade-finance/-/wikis/conflicts/idempotent-edit-audit-behavior) — no-op edit short-circuits before `SaveChanges` (no audit entry); acceptable per [IdempotentEditAuditBehavior](http://localhost:8080/root/trade-finance/-/wikis/decisions/IdempotentEditAuditBehavior) decision.
- [reorder-boundary-check-timing](http://localhost:8080/root/trade-finance/-/wikis/conflicts/reorder-boundary-check-timing) — pre-validation adopted; out-of-range `NewSequenceNumber` returns HTTP 422 before any DB write.

**Future enhancements (not in scope):**

- Bulk import/export of checklist items.
- Per-item notes or attachment fields.
- Real-time collaboration (SignalR) if concurrent multi-admin editing becomes a requirement — see [NoRealtimeRefreshDecision](http://localhost:8080/root/trade-finance/-/wikis/decisions/NoRealtimeRefreshDecision).

