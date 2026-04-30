---
id: query-get-checklist-item
name: GetChecklistItemQuery
type: query
version: 1.0
created: 2026-04-28
last_modified: 2026-04-28
---

# GetChecklistItemQuery

**Purpose:** Retrieve a single checklist item by ID (for edit dialog pre-population)

**Audience:** Private (/api/private/app/bank-settings/checklist-items/{id})

## Input DTO

**Name:** GetChecklistItemQueryInputDto

**Fields:**
- ItemId: Guid (required)

## Output DTO

**Name:** ChecklistItemDto

**Fields:**
- Id: Guid
- SequenceNumber: int
- Description: string
- IsActive: bool
- CreatedAt: DateTime
- CreatedBy: string
- LastModifiedAt: DateTime
- LastModifiedBy: string

## Authorization

**Permission:** TradeFinancePermissions.BankSettings.ViewChecklistItems

**Attribute:** [Authorize(TradeFinancePermissions.BankSettings.ViewChecklistItems)]

## Query Logic

1. Load ChecklistItem by Id (tenant-scoped)
2. Check exists and IsDeleted=false:
   - If not found or IsDeleted=true → throw ItemNotFoundException
3. Project to ChecklistItemDto
4. Return DTO

## Tenant Scoping

- **Implicit:** TenantId == current tenant (framework-managed)

## Use Cases

- **Edit dialog:** Fetch current description before edit form opens
- **Concurrent delete detection:** If item not found, inform user "Item no longer exists"

## Error Handling

| Condition | Response |
|-----------|----------|
| ItemId not found or IsDeleted=true | ItemNotFoundException; error message "Item not found" |
| Authorization failure | ForbiddenException |
| Database error | DatabaseException |

## Source

- [FRS #17 — Main Flow](http://localhost:8080/root/trade-finance/-/issues/17#7-main-flow)
- [FRS #17 — Functional Requirements](http://localhost:8080/root/trade-finance/-/issues/17#12-functional-requirements)

## Change History

| Version | Date | Author | Notes |
|---------|------|--------|-------|
| 1.0 | 2026-04-28 | generate-feat-spec skill | Initial query synthesis |
