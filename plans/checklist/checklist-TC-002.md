# TC-002: Empty Checklist State

**Feature:** Checklist  
**Scenario:** B — Display empty state message when no items exist  
**Status:** pending  
**Priority:** High  
**Type:** Functional  
**Tags:** @checklist @checklist-TC-002

---

## Steps

| # | Step | Selector | Expected Result |
|---|------|----------|-----------------|
| 1 | Navigate to checklist page with no items | `n/a` | Page loads |
| 2 | Verify table body renders | `[data-testid="checklist-table-body"]` | Table body is present |
| 3 | Verify empty state message displays | `[data-testid="checklist-empty-state"]` | Message reads "No checklist items configured" |
| 4 | Verify message spans full table width | `(discovered by explorer)` | Message is centered in table cell with appropriate padding |
| 5 | Verify "Add Item" button still accessible | `[data-testid="btn-add-item"]` | Add Item button is enabled and clickable |

---

## Preconditions
- Checklist data store is empty (no items exist)

## Postconditions
- No table rows rendered (only empty state row visible)
- "Add Item" button remains functional to create first item
