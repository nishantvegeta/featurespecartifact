---
id: command-toggle-checklist-item-status
name: ToggleChecklistItemStatusCommand
type: command
version: 1.0
created: 2026-04-28
last_modified: 2026-04-28
---

# ToggleChecklistItemStatusCommand

**Purpose:** Switch an item's active/inactive status (affects LC review visibility)

**Audience:** Private (/api/private/app/bank-settings/checklist-items/{id}/status)

## Input DTO

**Name:** ToggleChecklistItemStatusCommandInputDto

**Fields:**
- ItemId: Guid (required)

## Output DTO

**Name:** ToggleChecklistItemStatusCommandOutputDto

**Fields:**
- ItemId: Guid
- IsActive: bool (new status after toggle)

## Validation

**Validator:** ToggleChecklistItemStatusCommandInputValidator

- RuleFor(x => x.ItemId)
  - .NotEqual(Guid.Empty)

## Authorization

**Permission:** TradeFinancePermissions.BankSettings.ManageChecklistItems

**Attribute:** [Authorize(TradeFinancePermissions.BankSettings.ManageChecklistItems)]

## Domain Logic

1. Load ChecklistItem by ItemId (tenant-scoped)
2. Validate item exists
3. Toggle IsActive status (true → false, false → true)
4. Preserve Description, SequenceNumber, all other fields
5. Update immediately; no confirmation required
6. Persist to data store
7. Raise ChecklistItemStatusToggledDomainEvent

## Immediate Effect

- **IsActive = true:** Item included in LC review checklists (visible to Branch/CTF staff)
- **IsActive = false:** Item hidden from LC review checklists (excluded from review operations)
- **Confirmation:** Not required; toggle is immediate

## Domain Events Raised

- **ChecklistItemStatusToggledDomainEvent**
  - ItemId: Guid
  - NewIsActive: bool

## Error Handling

| Condition | Response |
|-----------|----------|
| ItemId not found | "Item no longer exists. Please refresh and try again." |
| Database write failure | Toggle switch reverts to previous state; error message displayed |
| Authorization failure | ForbiddenException |

## Success Feedback

- **UI:** Toggle switch updates immediately; success toast notification
- **Table:** Table refreshes to reflect status change

## Edge Cases

- **Item with only one active requirement deactivated:** Leaves zero active items; system allows (checklist may be empty)
- **All items inactive:** LC review checklist appears empty; valid state
- **Rapid successive toggles:** System debounces or queues requests; last state wins

## Business Rules

- **LC Review Visibility:** Only Active items (IsActive=true) are included in LC review checklists
- **Immediate Toggling:** No confirmation required; status change is instant
- **Preservation:** All other item attributes (Description, SequenceNumber) unchanged during toggle

## Concurrency

**Last-write-wins:** Concurrent toggles result in final state determined by last operation.

## Source

- [FRS #18 — Main Flow](http://localhost:8080/root/trade-finance/-/issues/18#7-main-flow)
- [FRS #18 — Functional Requirements](http://localhost:8080/root/trade-finance/-/issues/18#12-functional-requirements)
- [FRS #18 — Business Rules](http://localhost:8080/root/trade-finance/-/issues/18#15-business-rules)

## Change History

| Version | Date | Author | Notes |
|---------|------|--------|-------|
| 1.0 | 2026-04-28 | generate-feat-spec skill | Initial command synthesis |
