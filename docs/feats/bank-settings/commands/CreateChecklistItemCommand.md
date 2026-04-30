---
id: command-create-checklist-item
name: CreateChecklistItemCommand
type: command
version: 1.0
created: 2026-04-28
last_modified: 2026-04-28
---

# CreateChecklistItemCommand

**Purpose:** Add a new LC Issuance Checklist item

**Audience:** Private (/api/private/app/bank-settings/checklist-items)

## Input DTO

**Name:** CreateChecklistItemCommandInputDto

**Fields:**
- Description: string (required, non-empty, max 500 chars)

## Output DTO

**Name:** CreateChecklistItemCommandOutputDto

**Fields:**
- ItemId: Guid (newly created item ID)
- SequenceNumber: int (assigned sequence)
- IsActive: bool (default true)
- Description: string (stored text)

## Validation

**Validator:** CreateChecklistItemCommandInputValidator

- RuleFor(x => x.Description)
  - .NotEmpty() — must not be empty
  - .NotWhitespace() — must not be only whitespace
  - .MaximumLength(500) — must not exceed 500 characters

## Authorization

**Permission:** TradeFinancePermissions.BankSettings.ManageChecklistItems

**Role:** Bank Admin (implicit via permission)

**Attribute:** [Authorize(TradeFinancePermissions.BankSettings.ManageChecklistItems)]

## Domain Logic

1. Create new ChecklistItem aggregate
2. Assign next available SequenceNumber (max current + 1)
3. Set IsActive = true by default
4. Set Description from input
5. Save to data store (tenant-scoped)
6. Raise ChecklistItemCreatedDomainEvent

## Domain Events Raised

- **ChecklistItemCreatedDomainEvent**
  - ItemId: Guid
  - TenantId: Guid
  - Description: string
  - SequenceNumber: int
  - CreatedAt: DateTime

## Error Handling

| Condition | Response |
|-----------|----------|
| Description empty or whitespace | ValidationException; "Add Item" button disabled in UI |
| Description > 500 characters | ValidationException; validation error message in UI |
| Database write failure | DatabaseException; error toast "Failed to add item. Please try again." |
| Authorization failure | ForbiddenException; access denied message |

## Success Feedback

- **UI:** Success toast notification "Checklist item added"
- **Dialog:** Dialog closes automatically
- **Table:** Table refreshed to show new item

## Edge Cases

- **Adding when checklist has 99 items:** New item becomes #100; system handles large sequence numbers
- **Description with special/unicode characters:** Stored and displayed correctly
- **Rapid successive clicks:** Debouncing or button disable during submission prevents duplicates

## Idempotency

Not idempotent (each invocation creates a new item). Use ChecklistItemCreatedDomainEvent deduplication if retry needed.

## Source

- [FRS #16 — Main Flow](http://localhost:8080/root/trade-finance/-/issues/16#7-main-flow)
- [FRS #16 — Functional Requirements](http://localhost:8080/root/trade-finance/-/issues/16#12-functional-requirements)

## Change History

| Version | Date | Author | Notes |
|---------|------|--------|-------|
| 1.0 | 2026-04-28 | generate-feat-spec skill | Initial command synthesis |
