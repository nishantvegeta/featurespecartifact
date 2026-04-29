# Bank Settings — LC Issuance Checklist Management

**Feature Specification — FRS Milestone: Bank Settings**

---

## Feature Overview

The Bank Settings module enables administrators to configure and manage the LC (Letter of Credit) issuance verification checklist—a customizable list of checks that Branch and CTF staff must perform during LC review. The feature supports full CRUD operations on checklist items, status control (Active/Inactive), and sequencing via reordering.

---

## Related FRS

- [FRS-BS-01: View LC Issuance Checklist Items](http://localhost:8080/root/trade-finance/-/issues/15)
- [FRS-BS-02: Add Checklist Item](http://localhost:8080/root/trade-finance/-/issues/16)
- [FRS-BS-03: Edit Checklist Item](http://localhost:8080/root/trade-finance/-/issues/17)
- [FRS-BS-04: Toggle Checklist Item Status](http://localhost:8080/root/trade-finance/-/issues/18)
- [FRS-BS-05: Reorder Checklist Items](http://localhost:8080/root/trade-finance/-/issues/19)
- [FRS-BS-06: Delete Checklist Item](http://localhost:8080/root/trade-finance/-/issues/20)

---

## Bounded Context and Affected Layers

**Module:** Bank Settings (BS)

**Tenancy model:** per-customer (each tenant has isolated checklist)

**Affected ABP layers:**
- **Domain:** [ChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/entities/ChecklistItem) aggregate with status lifecycle and sequencing invariants
- **Application:** 5 commands, 1 query, 1 implicit domain service (reordering)
- **Contracts:** Input/Output DTOs, paging request/response
- **Permissions:** Role-based CRUD access via `TradeFinancePermissions.ChecklistItems.*`
- **Infrastructure:** EF Core entity config, table, indexes
- **Tests:** Permission tests, validation tests, state transition tests, entity isolation tests

---

## Domain Layer Design

### [ChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/entities/ChecklistItem) Aggregate

- **Aggregate root:** Yes
- **Base class:** `AggregateRoot<Guid>`
- **Multi-tenancy:** `IMultiTenant`
- **Lifecycle:** Created (Active) → toggle status → Deleted
- **Attributes:** Id, TenantId, Description (1–500 chars), SequenceNumber (≥ 1), IsActive (bool), ConcurrencyStamp
- **Invariants:** No gaps in sequence; description non-empty
- **Domain events:** ChecklistItemAdded, Updated, Deleted, StatusToggled, Reordered (all optional/deferred)

### Value Objects & Types

- **[ChecklistItemDescription](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/value-objects/ChecklistItemDescription):** stored as string on entity; 1–500 chars
- **[SequenceNumber](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/value-objects/SequenceNumber):** int ≥ 1; determines sort order
- **[ChecklistItemStatus](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/value-objects/ChecklistItemStatus):** enum {Active, Inactive}; stored as camelCase string

---

## Application Layer Design

### Commands

1. **[AddChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/commands/AddChecklistItem)**
   - Input: Description
   - Authorization: `TradeFinancePermissions.ChecklistItems.Create`
   - Route: POST `/api/private/app/bank-settings/checklist-items`
   - Validation: FluentValidation

2. **[UpdateChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/commands/UpdateChecklistItem)**
   - Input: Id, Description
   - Authorization: `TradeFinancePermissions.ChecklistItems.Update`
   - Route: PUT `/api/private/app/bank-settings/checklist-items/{id}`

3. **[ToggleChecklistItemStatus](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/commands/ToggleChecklistItemStatus)**
   - Input: Id
   - Authorization: `TradeFinancePermissions.ChecklistItems.Update`
   - Route: PATCH `/api/private/app/bank-settings/checklist-items/{id}/status`

4. **[MoveChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/commands/MoveChecklistItem)**
   - Input: Id, Direction (Up|Down)
   - Authorization: `TradeFinancePermissions.ChecklistItems.Update`
   - Route: PATCH `/api/private/app/bank-settings/checklist-items/{id}/reorder`

5. **[DeleteChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/commands/DeleteChecklistItem)**
   - Input: Id
   - Authorization: `TradeFinancePermissions.ChecklistItems.Delete`
   - Route: DELETE `/api/private/app/bank-settings/checklist-items/{id}`

### Queries

**[ListChecklistItems](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/queries/ListChecklistItems)**
- Input: PagedAndSortedResultRequestDto with optional IsActive filter
- Authorization: `TradeFinancePermissions.ChecklistItems.Default`
- Route: GET `/api/private/app/bank-settings/checklist-items`
- Default sort: SequenceNumber ascending
- Sort strategy: explicit switch
- Output: PagedResultDto<ChecklistItemDto>

### Mappers

- **Mapperly mapper:** ChecklistItem ↔ ChecklistItemDto

### Validators

- AddChecklistItemInputValidator (FluentValidation)
- UpdateChecklistItemInputValidator
- ToggleChecklistItemStatusInputValidator
- MoveChecklistItemInputValidator
- DeleteChecklistItemInputValidator

---

## Infrastructure and Persistence Design

**DbContext:** Add `DbSet<ChecklistItem> ChecklistItems`

**Table:** `AppChecklistItem` (with `App` prefix)

**Indexes:**
- (TenantId, SequenceNumber) — for list + sort
- (TenantId, IsActive) — for status filter

**Enum serialization:** `ChecklistItemStatus` as camelCase string ("active", "inactive") via global `JsonStringEnumConverter`

**Soft delete:** Not applicable (items are permanently deleted per FRS)

---

## HTTP API Design

All routes are **Private** (internal backoffice, `/api/private/app/...`):

| Method | Route | Command/Query | Permission |
|--------|-------|---------------|-----------|
| GET | `/api/private/app/bank-settings/checklist-items` | ListChecklistItems | ChecklistItems.Default |
| POST | `/api/private/app/bank-settings/checklist-items` | AddChecklistItem | ChecklistItems.Create |
| PUT | `/api/private/app/bank-settings/checklist-items/{id}` | UpdateChecklistItem | ChecklistItems.Update |
| PATCH | `/api/private/app/bank-settings/checklist-items/{id}/status` | ToggleChecklistItemStatus | ChecklistItems.Update |
| PATCH | `/api/private/app/bank-settings/checklist-items/{id}/reorder` | MoveChecklistItem | ChecklistItems.Update |
| DELETE | `/api/private/app/bank-settings/checklist-items/{id}` | DeleteChecklistItem | ChecklistItems.Delete |

---

## Permissions, Security, and Multi-Tenancy

**Permission strings:**
- `TradeFinancePermissions.ChecklistItems.Create`
- `TradeFinancePermissions.ChecklistItems.Update`
- `TradeFinancePermissions.ChecklistItems.Delete`
- `TradeFinancePermissions.ChecklistItems.Default` (read)

**Tenant isolation:** All queries/commands implicitly scoped to `CurrentTenant.Id` via ABP AppService context.

**Concurrency:** `ConcurrencyStamp` on ChecklistItem for optimistic locking (prevents lost updates in rapid edits).

**Multi-tenancy interfaces:** `IMultiTenant` on ChecklistItem.

---

## Permissions Map

| Actor | Use case | Kind | Audience | Permission |
|-------|----------|------|----------|-----------|
| [BankAdmin](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/actors/BankAdmin) | [AddChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/commands/AddChecklistItem) | Command | Private | TradeFinancePermissions.ChecklistItems.Create |
| [BankAdmin](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/actors/BankAdmin) | [UpdateChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/commands/UpdateChecklistItem) | Command | Private | TradeFinancePermissions.ChecklistItems.Update |
| [BankAdmin](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/actors/BankAdmin) | [ToggleChecklistItemStatus](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/commands/ToggleChecklistItemStatus) | Command | Private | TradeFinancePermissions.ChecklistItems.Update |
| [BankAdmin](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/actors/BankAdmin) | [MoveChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/commands/MoveChecklistItem) | Command | Private | TradeFinancePermissions.ChecklistItems.Update |
| [BankAdmin](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/actors/BankAdmin) | [DeleteChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/commands/DeleteChecklistItem) | Command | Private | TradeFinancePermissions.ChecklistItems.Delete |
| [BankAdmin](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/actors/BankAdmin) | [ListChecklistItems](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/queries/ListChecklistItems) | Query | Private | TradeFinancePermissions.ChecklistItems.Default |

---

## ABP Artifact Map

### Domain Layer

**Namespace:** `Amnil.TradeFinance.Domain.BankSettings`

**Entities:**
- `ChecklistItem` (AggregateRoot<Guid>, IMultiTenant, IHasConcurrencyStamp)

**Value Objects:**
- Stored as properties on ChecklistItem (Description, SequenceNumber, IsActive)

**Enums:**
- `ChecklistItemStatus` { Active, Inactive } — serialized as camelCase string

**Domain Events:**
- ChecklistItemAdded (optional)
- ChecklistItemUpdated (optional)
- ChecklistItemStatusToggled (optional)
- ChecklistItemDeleted (optional)
- ChecklistItemsReordered (optional)

**Repository Interfaces:**
- `IChecklistItemRepository` (custom; extends `IRepository<ChecklistItem, Guid>`)

**Domain Services:**
- ChecklistItemReorderingService (handles sequence swapping logic)

### Application Layer

**Namespace:** `Amnil.TradeFinance.Application.BankSettings`

**AppService:** `ChecklistItemAppService`

| Method | Kind | Audience | Maps to | DTOs |
|--------|------|----------|---------|------|
| CreateAsync(AddChecklistItemInput) | Command | Private | AddChecklistItem | Input: AddChecklistItemInput; Output: ChecklistItemDto |
| UpdateAsync(Guid id, UpdateChecklistItemInput) | Command | Private | UpdateChecklistItem | Input: UpdateChecklistItemInput; Output: ChecklistItemDto |
| ToggleStatusAsync(Guid id) | Command | Private | ToggleChecklistItemStatus | Input: (Id in route); Output: ChecklistItemDto |
| MoveAsync(Guid id, MoveChecklistItemInput) | Command | Private | MoveChecklistItem | Input: MoveChecklistItemInput; Output: ChecklistItemDto |
| DeleteAsync(Guid id) | Command | Private | DeleteChecklistItem | Input: (Id in route); Output: void |
| GetListAsync(GetChecklistItemsInput) | Query | Private | ListChecklistItems | Input: GetChecklistItemsInput (extends PagedAndSortedResultRequestDto); Output: PagedResultDto<ChecklistItemDto> |

**Validators:**
- AddChecklistItemInputValidator (FluentValidation)
- UpdateChecklistItemInputValidator
- ToggleChecklistItemStatusInputValidator
- MoveChecklistItemInputValidator
- DeleteChecklistItemInputValidator

**Mappers:**
- ChecklistItemMapper (Mapperly)

### Contracts Layer

**Namespace:** `Amnil.TradeFinance.Application.Contracts.BankSettings`

**Input DTOs:**
- AddChecklistItemInput { Description: string }
- UpdateChecklistItemInput { Id: Guid, Description: string }
- GetChecklistItemsInput (extends PagedAndSortedResultRequestDto) { IsActive?: bool? }
- MoveChecklistItemInput { Id: Guid, Direction: enum }

**Output DTO:**
- ChecklistItemDto { Id: Guid, Description: string, SequenceNumber: int, IsActive: bool }

**Wrapper DTOs:**
- PagedResultDto<ChecklistItemDto> (ABP standard)

**Permission class:**
- TradeFinancePermissions.ChecklistItems { Create, Update, Delete, Default }

### Permissions Layer

(Defined in TradeFinancePermissions)

- TradeFinancePermissions.ChecklistItems.Create
- TradeFinancePermissions.ChecklistItems.Update
- TradeFinancePermissions.ChecklistItems.Delete
- TradeFinancePermissions.ChecklistItems.Default

### Infrastructure / EF Core Layer

**Namespace:** `Amnil.TradeFinance.EntityFrameworkCore`

**DbSet:** `DbSet<ChecklistItem> ChecklistItems`

**Entity configuration:**
- Primary key: Id (Guid)
- Multi-tenant filter: HasQueryFilter(q => q.TenantId == CurrentTenant.Id)
- Indexes: (TenantId, SequenceNumber), (TenantId, IsActive)
- Concurrency column: ConcurrencyStamp
- Enum conversion: ChecklistItemStatus → camelCase string

**Migrations:**
- Add table AppChecklistItem with columns: Id, TenantId, Description (nvarchar(500)), SequenceNumber (int), IsActive (bit), ConcurrencyStamp, CreationTime, CreatorId, LastModificationTime, LastModifierId, IsDeleted, DeletionTime, DeleterId

### Tests Layer

**Test classes:**
- ChecklistItemPermissionTests (verify CRUD permissions per BankAdmin role)
- ChecklistItemTenantIsolationTests (verify per-tenant scoping)
- ChecklistItemValidationTests (verify FluentValidation rules)
- ChecklistItemStateTransitionTests (verify Active ↔ Inactive, deletion)
- ListChecklistItemsTests (verify sorting, filtering, paging)

---

## Open Questions and Future Enhancements (High-Severity Blockers)

The following 17 unresolved open questions from the FRS issues are recommended for resolution before production deployment:

1. Should inactive items be visually grayed out or hidden from the default view?
2. What is the maximum number of checklist items that can be configured?
3. Should the page include search/filter mechanism for large checklists?
4. Should deleted items be soft-deleted (archived) rather than permanently removed?
5. Should there be an "undo" capability to restore recently deleted items?
6. Should deletion of checklist items be logged for audit purposes?
7. Should confirmation email be sent to stakeholders when items are deleted?
8. Should drag-and-drop reordering be supported as alternative to arrow buttons?
9. Should users be able to jump an item multiple positions (vs. one position at a time)?
10. Should reordering changes be logged for audit purposes?
11. Should deactivating an item send notification to Branch/CTF staff?
12. Should there be a minimum number of active items required?
13. Should toggle changes be logged for audit purposes?
14. Should description text be pre-selected when edit dialog opens?
15. Should edit history be tracked (version control) for descriptions?
16. Can user revert to a previous description version?
17. Is there a maximum number of items that can be added?

---

## Related DDD Nodes

- **Actors:** [BankAdmin](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/actors/BankAdmin)
- **Entities:** [ChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/entities/ChecklistItem)
- **Value Objects:** [ChecklistItemDescription](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/value-objects/ChecklistItemDescription), [SequenceNumber](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/value-objects/SequenceNumber), [ChecklistItemStatus](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/value-objects/ChecklistItemStatus)
- **Commands:** [AddChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/commands/AddChecklistItem), [UpdateChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/commands/UpdateChecklistItem), [ToggleChecklistItemStatus](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/commands/ToggleChecklistItemStatus), [MoveChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/commands/MoveChecklistItem), [DeleteChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/commands/DeleteChecklistItem)
- **Queries:** [ListChecklistItems](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/queries/ListChecklistItems)
- **States:** [ChecklistItemStatus](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/states/ChecklistItemStatus)

---

**Generated by generate-feat-spec skill on 2026-04-29**
