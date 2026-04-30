---
id: command-delete-checklist-item
name: DeleteChecklistItemCommand
type: command
version: 1.0
created: 2026-04-28
last_modified: 2026-04-28
---

# DeleteChecklistItemCommand

**Purpose:** Remove a checklist item from the system (soft delete)

**Audience:** Private (/api/private/app/bank-settings/checklist-items/{id})

## Input DTO

**Name:** DeleteChecklistItemCommandInputDto

**Fields:**
- ItemId: Guid (required)

## Output DTO

**Name:** DeleteChecklistItemCommandOutputDto

**Fields:**
- ItemId: Guid (deleted item ID)
- DeletedAt: DateTime

## Validation

**Validator:** DeleteChecklistItemCommandInputValidator

- RuleFor(x => x.ItemId).NotEqual(Guid.Empty)

## Authorization

**Permission:** TradeFinancePermissions.BankSettings.ManageChecklistItems

**Attribute:** [Authorize(TradeFinancePermissions.BankSettings.ManageChecklistItems)]

## Domain Logic

1. Load ChecklistItem by ItemId (tenant-scoped)
2. Check if item exists:
   - If IsDeleted=true or not found → operation is idempotent; return success
   - If exists and IsDeleted=false → proceed to deletion
3. Soft delete: Set IsDeleted=true, DeletionTime=now, DeleterUserId=currentUser
4. Recalculate SequenceNumber for all remaining items (renumber 1, 2, 3...)
5. Persist changes
6. Raise ChecklistItemDeletedDomainEvent

## Soft Delete

- **IsDeleted:** Set to true (item marked as deleted but not physically removed)
- **DeletionTime:** Timestamp of deletion
- **DeleterUserId:** User who performed deletion
- **Recovery:** Item cannot be recovered (no restore mechanism)
- **Visibility:** Item hidden from all queries (LINQ filters on IsDeleted=false)

## Idempotency

- **Deleting already-deleted item:** Returns success without error (idempotent)
- **Delete within same transaction:** Safe; transaction isolation ensures consistency
- **Retry safety:** Can safely retry failed deletes without duplicate deletion logic

## Confirmation Gate

- **UI:** Confirmation dialog "Are you sure you want to remove this item?" required before deletion
- **Domain:** No confirmation logic in command; UI enforces gate
- **Prevention:** Confirmation prevents accidental deletion

## Domain Events Raised

- **ChecklistItemDeletedDomainEvent**
  - ItemId: Guid
  - TenantId: Guid
  - DeletedSequenceNumber: int (for resequencing downstream)
  - DeletedAt: DateTime

## Error Handling

| Condition | Response |
|-----------|----------|
| ItemId not found or already deleted | Returns success (idempotent); no error |
| Database write failure during delete | Delete fails; error toast "Failed to delete item. Please try again."; dialog remains open |
| Authorization failure | ForbiddenException |

## Success Feedback

- **UI:** Success toast "Checklist item removed"
- **Dialog:** Confirmation dialog closes
- **Table:** Table refreshes; item removed from display; empty state shown if all items deleted

## Edge Cases

- **Delete last remaining item:** Checklist becomes empty; valid state; empty state message displayed
- **Delete and immediately add:** Sequence numbers remain consistent (1, 2, 3...)
- **Delete item with 500-char description:** Full description displayed in confirmation dialog

## Business Rules

- **Permanent deletion:** No undo/restore mechanism available
- **Confirmation mandatory:** Prevents accidental data loss
- **Sequence recalculation:** Remaining items renumbered to maintain 1, 2, 3... order

## Performance

- **Soft delete:** Item remains in database (marked IsDeleted); no physical removal
- **Cleanup:** Historical data retained for audit trail
- **Index impact:** Filtered indexes on IsDeleted=false reduce query impact

## Source

- [FRS #20 — Main Flow](http://localhost:8080/root/trade-finance/-/issues/20#7-main-flow)
- [FRS #20 — Functional Requirements](http://localhost:8080/root/trade-finance/-/issues/20#12-functional-requirements)
- [FRS #20 — Business Rules](http://localhost:8080/root/trade-finance/-/issues/20#15-business-rules)

## Change History

| Version | Date | Author | Notes |
|---------|------|--------|-------|
| 1.0 | 2026-04-28 | generate-feat-spec skill | Initial command synthesis |
