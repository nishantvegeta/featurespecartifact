# TC-009: Reorder Checklist Items (Move Up/Down)

**Feature:** Checklist  
**Scenario:** I — Reorder items using up/down arrow buttons with boundary constraints  
**Status:** pending  
**Priority:** Medium  
**Type:** Functional  
**Tags:** @checklist @checklist-TC-009

---

## Steps

| # | Step | Selector | Expected Result |
|---|------|----------|-----------------|
| 1 | Locate first item in table | `[data-testid="checklist-row-{item.id}"]` | First item is in row 1 (index 0) |
| 2 | Verify move-up button disabled on first item | `[data-testid="checklist-move-up-{item.id}"]` | Button is disabled (cannot move up from first position) |
| 3 | Verify move-down button enabled on first item | `[data-testid="checklist-move-down-{item.id}"]` | Button is enabled |
| 4 | Click move-down on first item | `[data-testid="checklist-move-down-{item.id}"]` | First item moves to second position |
| 5 | Verify item order changed | `(discovered by explorer)` | Second item now appears first, original first item appears second |
| 6 | Verify S.N values updated | `(discovered by explorer)` | Serial numbers reflect new order (items renumbered) |
| 7 | Locate last item in table | `(discovered by explorer)` | Last item is at bottom of table |
| 8 | Verify move-down button disabled on last item | `[data-testid="checklist-move-down-{item.id}"]` | Button is disabled |
| 9 | Verify move-up button enabled on last item | `[data-testid="checklist-move-up-{item.id}"]` | Button is enabled |
| 10 | Click move-up on last item | `[data-testid="checklist-move-up-{item.id}"]` | Last item moves up one position |
| 11 | Verify new order reflected in table | `(discovered by explorer)` | Item now appears at second-to-last position |

---

## Preconditions
- Checklist displays with at least 3 items
- Items have serial numbers (S.N) displayed

## Postconditions
- Item order persists in data store
- Move-up button disabled for first item
- Move-down button disabled for last item
- Move-up/down enabled for middle items
- Serial numbers (S.N) updated after each move
- Other item properties (description, status) unchanged
