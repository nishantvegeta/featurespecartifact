---
id: list-checklist-items
name: ListChecklistItems
type: query
version: 1.0.0
created: 2026-04-29
last_modified: 2026-04-29
---

# ListChecklistItems

**Node type:** Query

**Actor:** [BankAdmin](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/actors/BankAdmin)

**Target aggregate:** [ChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/entities/ChecklistItem)

**Purpose:** Bank administrators retrieve the full LC issuance checklist to review, manage, and maintain verification requirements.

**Audience:** Private

**Input DTO**

| Field | Type | Required | Validation | Notes |
|-------|------|----------|------------|-------|
| SkipCount | int | No | ≥ 0 | Paging: items to skip (from PagedAndSortedResultRequestDto) |
| MaxResultCount | int | No | ≤ 100 | Paging: max items per page |
| Sorting | string | No | See Sort strategy | Sort expression |
| IsActive | bool? | No | null \| true \| false | Filter: active/inactive items |

**Input DTO base:** `PagedAndSortedResultRequestDto`

**Default sort:** SequenceNumber ascending (asc)

**Sort strategy:** explicit switch on `input.Sorting` (per CLAUDE.md `sorting_strategy: explicit-switch`)

**Output DTO**

| Field | Type | Notes |
|-------|------|-------|
| Id | Guid | Primary key |
| Description | string | Verification requirement text |
| SequenceNumber | int | Sort order |
| IsActive | bool | Active/Inactive status |

**Output wrapper:** `PagedResultDto<ChecklistItemDto>`

**Authorization:** `TradeFinancePermissions.ChecklistItems.Default`

**HTTP route:** GET `/api/private/app/bank-settings/checklist-items`

**Tenant/entity scoping:** Filtered to current tenant (`TenantId` implicit in ABP AppService context)

**Filters supported**

- `IsActive` (bool): true = active items only, false = inactive items only, null = all items
- Default: all items (no filter)

**Total count returned:** Yes (included in PagedResultDto)

**Source**

- [FRS #15 — Purpose](http://localhost:8080/root/trade-finance/-/issues/15#1-purpose)
- [FRS #15 — Main Flow](http://localhost:8080/root/trade-finance/-/issues/15#7-main-flow)

## Change History

- v1.0.0 (2026-04-29): Created from feat spec bank-settings.
