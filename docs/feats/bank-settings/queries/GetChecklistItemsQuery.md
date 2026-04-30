---
id: query-get-checklist-items
name: GetChecklistItemsQuery
type: query
version: 1.0
created: 2026-04-28
last_modified: 2026-04-28
---

# GetChecklistItemsQuery

**Purpose:** Retrieve all configured LC Issuance Checklist items with pagination and sorting

**Audience:** Private (/api/private/app/bank-settings/checklist-items)

## Input DTO

**Name:** GetChecklistItemsQueryInputDto (extends PagedAndSortedResultRequestDto)

**Fields:**
- SkipCount: int (page offset; default 0)
- MaxResultCount: int (page size; default 20, max 50)
- Sorting: string (field names: "SequenceNumber", "IsActive", "CreatedAt")
- IsActiveFilter: bool? (optional; null = all items, true = active only, false = inactive only)

## Output DTO

**Name:** PagedResultDto<ChecklistItemDto>

**Fields:**
- Items: ChecklistItemDto[] (array of items)
  - Id: Guid
  - SequenceNumber: int
  - Description: string
  - IsActive: bool (serialized as "active"/"inactive" per enum serialization)
  - CreatedAt: DateTime
  - CreatedBy: string
- TotalCount: long (total items matching filter)

## Authorization

**Permission:** TradeFinancePermissions.BankSettings.ViewChecklistItems

**Attribute:** [Authorize(TradeFinancePermissions.BankSettings.ViewChecklistItems)]

## Query Logic

1. Start with all ChecklistItem records for current tenant
2. Filter by IsDeleted=false (soft delete filtering)
3. Apply IsActiveFilter if provided:
   - If IsActiveFilter=true: where IsActive=true
   - If IsActiveFilter=false: where IsActive=false
   - If IsActiveFilter=null: no filter (all items)
4. Sort by field (explicit switch):
   - "SequenceNumber": ascending (default)
   - "IsActive": true first, then false
   - "CreatedAt": descending (newest first)
5. Apply pagination:
   - Skip(input.SkipCount)
   - Take(input.MaxResultCount)
6. Project to ChecklistItemDto
7. Return PagedResultDto with TotalCount

## Default Sorting

**Default:** SequenceNumber ascending (maintains configured order)

## Tenant Scoping

- **Implicit:** TenantId == current tenant (framework-managed)
- **Database:** Query filtered at DbContext level via IMultiTenant

## Pagination

- **SkipCount:** Offset (0-based)
- **MaxResultCount:** Items per page (default 20; max 50 per CLAUDE.md)
- **TotalCount:** Returned for UI pagination controls

## Error Handling

| Condition | Response |
|-----------|----------|
| Invalid SkipCount or MaxResultCount | ValidationException |
| Authorization failure | ForbiddenException |
| Database error | DatabaseException; error toast "Unable to load checklist. Please try again." |

## Performance

- **Large datasets:** Pagination required for 50+ item checklists
- **Database indexes:** TenantId + SequenceNumber for fast ordering
- **Sorting:** Explicit switch avoids LINQ.Dynamic.Core overhead

## Edge Cases

- **Empty checklist:** TotalCount=0; Items=[]; UI displays "No checklist items configured"
- **Single item:** Pagination not needed; displayed on page 1
- **100+ items:** Paginated into 5+ pages (20 items/page); smooth navigation

## Source

- [FRS #15 — Main Flow](http://localhost:8080/root/trade-finance/-/issues/15#7-main-flow)
- [FRS #15 — Functional Requirements](http://localhost:8080/root/trade-finance/-/issues/15#12-functional-requirements)

## Change History

| Version | Date | Author | Notes |
|---------|------|--------|-------|
| 1.0 | 2026-04-28 | generate-feat-spec skill | Initial query synthesis |
