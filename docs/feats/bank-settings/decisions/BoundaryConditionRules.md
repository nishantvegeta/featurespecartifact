---
id: decision-boundary-condition-rules
name: BoundaryConditionRules
type: decision
version: 1.0
created: 2026-04-28
last_modified: 2026-04-28
---

# BoundaryConditionRules

**Type:** Validation rules for reordering at list boundaries

## Rule 1: Up Arrow Disabled for First Item

**Condition:** SequenceNumber == 1

**UI State:** Up arrow button grayed out / disabled

**Enforcement:**
- Validation: ReorderChecklistItemCommandInputValidator rejects "Up" for SequenceNumber=1
- UI: Button disabled; click has no effect
- Error (if clicked): ValidationException

**Behavior:** First item cannot move further up

**Rationale:** No previous position available

## Rule 2: Down Arrow Disabled for Last Item

**Condition:** SequenceNumber == MAX(SequenceNumber for tenant)

**UI State:** Down arrow button grayed out / disabled

**Enforcement:**
- Validation: ReorderChecklistItemCommandInputValidator rejects "Down" for SequenceNumber=max
- UI: Button disabled; click has no effect
- Error (if clicked): ValidationException

**Behavior:** Last item cannot move further down

**Rationale:** No next position available

## Rule 3: Single Item Special Case

**Condition:** Only 1 item in checklist

**UI State:** Both up and down arrows disabled for the single item

**Behavior:** No reordering possible with single item

**Rationale:** Reordering requires at least 2 items

## Rule 4: Two Items Special Case

**Condition:** 2 items in checklist

**UI State:** Up arrow disabled for item 1; down arrow disabled for item 2; both available for swap

**Behavior:** Reordering toggles between two permutations

**Rationale:** Both items can swap positions

## Source

- [FRS #19 — Exception Flows](http://localhost:8080/root/trade-finance/-/issues/19#9-exception-flows)
- [FRS #19 — Edge Cases](http://localhost:8080/root/trade-finance/-/issues/19#16-edge-cases)

## Change History

| Version | Date | Author | Notes |
|---------|------|--------|-------|
| 1.0 | 2026-04-28 | generate-feat-spec skill | Initial decision synthesis |
