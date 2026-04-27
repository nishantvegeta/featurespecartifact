# TC-008: Toggle Checklist Item Active Status

**Feature:** Checklist  
**Scenario:** H — Toggle item between active and inactive states  
**Status:** pending  
**Priority:** Medium  
**Type:** Functional  
**Tags:** @checklist @checklist-TC-008

---

## Steps

| # | Step | Selector | Expected Result |
|---|------|----------|-----------------|
| 1 | Identify an active item in the table | `(discovered by explorer)` | Item row displays with status toggle in "on" position |
| 2 | Verify initial toggle state | `[data-testid="checklist-toggle-{item.id}"]` | Toggle is checked (active) |
| 3 | Click toggle switch to deactivate | `[data-testid="checklist-toggle-{item.id}"]` | Toggle switches to unchecked (inactive) state |
| 4 | Verify item still visible in table | `(discovered by explorer)` | Deactivated item remains in table (not hidden) |
| 5 | Verify item marked as inactive | `(discovered by explorer)` | Item visually appears as inactive or dimmed |
| 6 | Click toggle switch to reactivate | `[data-testid="checklist-toggle-{item.id}"]` | Toggle switches back to checked (active) state |
| 7 | Verify item status returns to active | `(discovered by explorer)` | Item appearance returns to normal/active state |
| 8 | Verify other items unaffected | `(discovered by explorer)` | Other item statuses remain unchanged |

---

## Preconditions
- Checklist page displays with at least one item
- Item has active status initially

## Postconditions
- Toggle state persists in data store
- Item remains in table regardless of active/inactive status
- Toggle state changes are immediate (no dialog required)
- Other items' states unchanged
