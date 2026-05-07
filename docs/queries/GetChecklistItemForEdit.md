---
id: get-checklist-item-for-edit
name: GetChecklistItemForEdit
type: Query
version: "1.0"
created: "2026-05-07"
last_modified: "2026-05-07"
---

**Node type:** Query
**Name:** GetChecklistItemForEdit
**Actor:** [BankAdmin](http://localhost:8080/root/trade-finance/-/wikis/actors/BankAdmin)
**Target aggregate:** [ChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/entities/ChecklistItem)
**Module:** BankSettings
**Sub-module:** ChecklistManagement
**Purpose:** Fetch a single checklist item by its ID for the purpose of pre-filling an edit form. The response includes the current `ConcurrencyStamp` so the caller can submit it back with the subsequent [UpdateChecklistItemDescription](http://localhost:8080/root/trade-finance/-/wikis/commands/UpdateChecklistItemDescription) command to enforce optimistic concurrency. The `SequenceNumber` and `Status` are returned for display context but are not editable via the edit form.
**Audience:** Private
**HTTP route:** GET /api/private/app/bank-settings/checklist-items/{id}

**Input:** bare `Guid id` (route parameter — no wrapper DTO needed for a single-ID lookup)

**Input DTO base:** n/a (single bare parameter)
**Default sort:** n/a — single-item query; no sorting applicable
**Sort strategy:** explicit switch on `input.Sorting?.ToLowerInvariant()` — n/a for single-item query; field not present on input

**Output DTO:** `ChecklistItemDto` (`FullAuditedEntityDto<Guid>`) — same DTO used by list queries; includes `ConcurrencyStamp` field from `IHasConcurrencyStamp` binding so the edit form can propagate it to the update command
**Output wrapper:** bare `ChecklistItemDto` (not paged)
**Authorization:** `TradeFinancePermissions.BankSettings.ChecklistItems.View`
**Tenant/entity scoping:** tenant-scoped via `IMultiTenant`; ABP's filter ensures the caller cannot retrieve an item belonging to a different tenant even if they supply a valid GUID from another tenant.

**Filters supported:** none — single-item retrieval by primary key only. Not-found items (deleted or wrong tenant) result in `EntityNotFoundException` (HTTP 404).

**Total count returned:** n/a — single-item query.

**Source:**
- [FRS #15 — Queries](http://localhost:8080/root/trade-finance/-/issues/15#4-queries)
- [FRS #15 — Permissions](http://localhost:8080/root/trade-finance/-/issues/15#9-permissions)

## Change History

- **1.0** (2026-05-07): Initial draft from Bank Settings milestone feat spec generation.
