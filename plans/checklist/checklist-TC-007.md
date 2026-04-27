# TC-007: Delete Checklist Item

**Feature:** Checklist  
**Scenario:** G — Delete a checklist item from table  
**Status:** pending  
**Priority:** High  
**Type:** Functional  
**Tags:** @checklist @checklist-TC-007

---

## Steps

| # | Step | Selector | Expected Result |
|---|------|----------|-----------------|
| 1 | Identify an item in the checklist table | `(discovered by explorer)` | Checklist displays with at least 2 items |
| 2 | Note the item count before deletion | `(discovered by explorer)` | Count visible items in table (e.g., 5 items) |
| 3 | Click delete button on an item | `[data-testid="checklist-delete-{item.id}"]` | Item is immediately removed from table |
| 4 | Verify success toast appears | `(discovered by explorer)` | Toast message "Checklist item removed" displays |
| 5 | Verify item count decreased | `(discovered by explorer)` | Table now shows one fewer item (e.g., 4 items) |
| 6 | Verify deleted item no longer in table | `(discovered by explorer)` | Deleted item's description and row are gone |
| 7 | Verify remaining items unchanged | `(discovered by explorer)` | Other items maintain their order and content |

---

## Preconditions
- Checklist page displays with at least 2 items
- Item to be deleted is visible in table

## Postconditions
- Item removed from data store and table
- Item count decreases by 1
- Other items unaffected
- Toast notification displayed
- If last item deleted, empty state message appears
