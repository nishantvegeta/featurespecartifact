---
id: list-checklist-items
name: ListChecklistItems
type: Query
version: "1.0"
created: "2026-05-07"
last_modified: "2026-05-07"
---

**Node type:** Query
**Name:** ListChecklistItems
**Actor:** [BankAdmin](http://localhost:8080/root/trade-finance/-/wikis/actors/BankAdmin)
**Target aggregate:** [ChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/entities/ChecklistItem)
**Module:** BankSettings
**Sub-module:** ChecklistManagement
**Purpose:** Return a paged, sorted list of checklist items for the current tenant. Supports optional filtering by `Status` to allow the BankAdmin to view only active or only inactive items. Sorted by `SequenceNumber` ascending by default, reflecting the operational order of the checklist used during LC review. Both active and inactive items are returned unless the caller provides a status filter.
**Audience:** Private
**HTTP route:** GET /api/private/app/bank-settings/checklist-items

**Input DTO:** `ListChecklistItemsInput`

| Name | Type | Required | Notes |
|---|---|---|---|
| `SkipCount` | `int` | no | From `PagedAndSortedResultRequestDto` base; default 0 |
| `MaxResultCount` | `int` | no | From base; default 20, max 100 — [FRS #15 — Pagination](http://localhost:8080/root/trade-finance/-/issues/15#4-pagination) |
| `Sorting` | `string?` | no | From base; matched against supported sort keys by explicit switch |
| `Status` | `ChecklistItemStatus?` | no | Optional filter; exact enum match; serialized as camelCase string on the wire |

**Input DTO base:** `PagedAndSortedResultRequestDto`
**Default sort:** `SequenceNumber asc`
**Sort strategy:** explicit switch on `input.Sorting?.ToLowerInvariant()`; supports `sequencenumber asc`, `sequencenumber desc`, `description asc`, `description desc`; all other values fall through to default `SequenceNumber asc`. `System.Linq.Dynamic.Core` is NOT used — sorting_strategy is `explicit-switch` per CLAUDE.md.

**Output DTO:** `ChecklistItemDto` (`FullAuditedEntityDto<Guid>`) — fields: `Id`, `Description`, `SequenceNumber`, `Status` (camelCase string per `enum_serialization`), plus base audit fields.
**Output wrapper:** `PagedResultDto<ChecklistItemDto>`
**Authorization:** `TradeFinancePermissions.BankSettings.ChecklistItems.View`
**Tenant/entity scoping:** tenant-scoped via `IMultiTenant`; ABP's global data filter ensures cross-tenant isolation automatically. No additional entity-level scoping.

**Filters supported:**
- `Status == <ChecklistItemStatus>` (exact match, applied post-tenant filter). Applied with `.WhereIf(input.Status.HasValue, x => x.Status == input.Status!.Value)` per CLAUDE.md WhereIf convention.

**Total count returned:** yes — `TotalCount` in `PagedResultDto` enables pagination controls on the UI.

**Soft-delete filter:** ABP's global `ISoftDelete` filter excludes deleted items automatically. No explicit `IsDeleted == false` filter needed.

**Source:**
- [FRS #15 — Queries](http://localhost:8080/root/trade-finance/-/issues/15#4-queries)
- [FRS #15 — Filter](http://localhost:8080/root/trade-finance/-/issues/15#4-filter)
- [FRS #15 — Pagination](http://localhost:8080/root/trade-finance/-/issues/15#4-pagination)
- [FRS #15 — Permissions](http://localhost:8080/root/trade-finance/-/issues/15#9-permissions)

## Change History

- **1.0** (2026-05-07): Initial draft from Bank Settings milestone feat spec generation.
