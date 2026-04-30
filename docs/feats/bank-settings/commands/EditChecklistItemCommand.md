---
id: command-edit-checklist-item
name: EditChecklistItemCommand
type: command
version: 1.0
created: 2026-04-28
last_modified: 2026-04-28
---

# EditChecklistItemCommand

**Purpose:** Update the description of an existing checklist item

**Audience:** Private (/api/private/app/bank-settings/checklist-items/{id})

## Input DTO

**Name:** EditChecklistItemCommandInputDto

**Fields:**
- ItemId: Guid (required; identifies which item to edit)
- Description: string (required, non-empty, max 500 chars)

## Output DTO

**Name:** EditChecklistItemCommandOutputDto

**Fields:**
- ItemId: Guid (edited item ID)
- Description: string (new description)
- SequenceNumber: int (unchanged)
- IsActive: bool (unchanged)

## Validation

**Validator:** EditChecklistItemCommandInputValidator

- RuleFor(x => x.ItemId)
  - .NotEqual(Guid.Empty) — must be a valid GUID

- RuleFor(x => x.Description)
  - .NotEmpty() — must not be empty
  - .NotWhitespace() — must not be only whitespace
  - .MaximumLength(500) — must not exceed 500 characters

## Authorization

**Permission:** TradeFinancePermissions.BankSettings.ManageChecklistItems

**Attribute:** [Authorize(TradeFinancePermissions.BankSettings.ManageChecklistItems)]

## Domain Logic

1. Load ChecklistItem by ItemId (tenant-scoped)
2. Validate item exists; if not found or IsDeleted=true, raise "Item no longer exists" error
3. Update Description field only
4. Preserve SequenceNumber, IsActive, and all other fields (immutable during edit)
5. Save to data store
6. Raise ChecklistItemEditedDomainEvent

## Immutability Rules

- **SequenceNumber:** Immutable during edit (reordering via separate ReorderChecklistItemCommand)
- **IsActive:** Immutable during edit (toggling via separate ToggleChecklistItemStatusCommand)
- **CreatedAt/CreatedBy:** Immutable (audit fields)

## Domain Events Raised

- **ChecklistItemEditedDomainEvent**
  - ItemId: Guid
  - OldDescription: string
  - NewDescription: string
  - LastModifiedAt: DateTime

## Error Handling

| Condition | Response |
|-----------|----------|
| ItemId not found or IsDeleted=true | "Item no longer exists. Please refresh and try again." |
| Description empty or whitespace | ValidationException; "Save Changes" button disabled |
| Description > 500 characters | ValidationException; validation error message |
| Database write failure (concurrent edit) | DatabaseException; error toast + dialog remains open with text preserved |
| Authorization failure | ForbiddenException |

## Success Feedback

- **UI:** Success toast notification "Checklist item updated"
- **Dialog:** Dialog closes automatically
- **Table:** Table refreshed to display updated item

## Edge Cases

- **Concurrent delete during edit:** User edits item; another user deletes it; edit attempt fails with "Item no longer exists"
- **Description with newlines/tabs:** Formatting preserved in stored and displayed text
- **Editing item with 500-char description:** Can modify while staying within 500-char limit

## Concurrency & Conflict Resolution

**Scenario:** Two users edit the same item simultaneously
- **Current approach:** Last-write-wins (second user's edit overwrites first)
- **TBD:** Consider adding IHasConcurrencyStamp for optimistic locking if data loss unacceptable

## Source

- [FRS #17 — Main Flow](http://localhost:8080/root/trade-finance/-/issues/17#7-main-flow)
- [FRS #17 — Functional Requirements](http://localhost:8080/root/trade-finance/-/issues/17#12-functional-requirements)
- [FRS #17 — Exception Flows](http://localhost:8080/root/trade-finance/-/issues/17#9-exception-flows)

## Change History

| Version | Date | Author | Notes |
|---------|------|--------|-------|
| 1.0 | 2026-04-28 | generate-feat-spec skill | Initial command synthesis |
