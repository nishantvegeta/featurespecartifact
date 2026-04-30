---
id: command-reorder-checklist-item
name: ReorderChecklistItemCommand
type: command
version: 1.0
created: 2026-04-28
last_modified: 2026-04-28
---

# ReorderChecklistItemCommand

**Purpose:** Move a checklist item up or down one position (adjacent swap)

**Audience:** Private (/api/private/app/bank-settings/checklist-items/{id}/reorder)

## Input DTO

**Name:** ReorderChecklistItemCommandInputDto

**Fields:**
- ItemId: Guid (required)
- Direction: enum string "Up"|"Down" (required)

## Output DTO

**Name:** ReorderChecklistItemCommandOutputDto

**Fields:**
- ItemId: Guid
- NewSequenceNumber: int
- AllItems: ChecklistItemDto[] (all items with updated sequence numbers)

## Validation

**Validator:** ReorderChecklistItemCommandInputValidator

- RuleFor(x => x.ItemId).NotEqual(Guid.Empty)
- RuleFor(x => x.Direction).IsInEnum()
- Custom rule: if Direction="Up", item must not be first (SequenceNumber != 1)
- Custom rule: if Direction="Down", item must not be last (SequenceNumber != max)

## Authorization

**Permission:** TradeFinancePermissions.BankSettings.ManageChecklistItems

**Attribute:** [Authorize(TradeFinancePermissions.BankSettings.ManageChecklistItems)]

## Domain Logic

1. Load ChecklistItem by ItemId (tenant-scoped)
2. Validate boundary conditions:
   - If Direction="Up" and SequenceNumber=1 → reject "Cannot move first item up"
   - If Direction="Down" and SequenceNumber=max → reject "Cannot move last item down"
3. Load adjacent item:
   - If "Up": load item with SequenceNumber - 1
   - If "Down": load item with SequenceNumber + 1
4. Swap SequenceNumber values atomically
5. Renumber all items if needed (ensure 1, 2, 3... sequence)
6. Preserve Description, IsActive, other fields
7. Persist both updates in single transaction
8. Raise ChecklistItemReorderedDomainEvent

## Atomic Reordering

- **Transaction:** Both sequence number updates complete or both roll back
- **No partial reordering:** Either both items swap or neither does
- **Consistency:** Final sequence is always 1, 2, 3... (no gaps)

## Button State Management

- **Up arrow:** Disabled (grayed out) for first item (SequenceNumber=1)
- **Down arrow:** Disabled (grayed out) for last item (SequenceNumber=max)
- **Disabled buttons:** Click has no effect (button event not fired)

## Domain Events Raised

- **ChecklistItemReorderedDomainEvent**
  - ItemId: Guid
  - OldSequenceNumber: int
  - NewSequenceNumber: int

## Error Handling

| Condition | Response |
|-----------|----------|
| Boundary violation (up for first, down for last) | Validation error; button disabled in UI |
| ItemId not found | "Item no longer exists. Please refresh and try again." |
| Database write failure | Transaction rolled back; table reverts to original order; error message displayed |
| Authorization failure | ForbiddenException |

## Success Feedback

- **UI:** Table refreshes with new order; success notification
- **Button states:** Up/down buttons re-evaluated for new position

## Edge Cases

- **Checklist with 1 item:** Both arrows disabled; no reordering possible
- **Checklist with 2 items:** Reordering toggles between two permutations; both arrows functional
- **Large checklist (100+ items):** Reordering at top, middle, bottom all work efficiently

## Business Rules

- **Sequence consistency:** Items always displayed in current SequenceNumber order
- **Atomic operation:** No partial reordering; both items update together
- **Field preservation:** Description, IsActive unchanged during reorder

## Concurrency

**Last-write-wins:** Concurrent reorders may result in unpredictable final order. Consider distributed locks if strict ordering required.

## Source

- [FRS #19 — Main Flow](http://localhost:8080/root/trade-finance/-/issues/19#7-main-flow)
- [FRS #19 — Functional Requirements](http://localhost:8080/root/trade-finance/-/issues/19#12-functional-requirements)
- [FRS #19 — Exception Flows](http://localhost:8080/root/trade-finance/-/issues/19#9-exception-flows)

## Change History

| Version | Date | Author | Notes |
|---------|------|--------|-------|
| 1.0 | 2026-04-28 | generate-feat-spec skill | Initial command synthesis |
