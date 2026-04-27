# TC-001: Display Checklist Items (Happy Path)

**Feature:** Checklist  
**Scenario:** A — Display items in table with all columns and controls visible  
**Status:** pending  
**Priority:** High  
**Type:** Functional  
**Tags:** @smoke @checklist @checklist-TC-001

---

## Steps

| # | Step | Selector | Expected Result |
|---|------|----------|-----------------|
| 1 | Navigate to checklist page | `n/a` | Page loads, title "LC Issuance Checklist" visible |
| 2 | Verify page title visible | `[data-testid="checklist-title"]` | Title displays with ClipboardCheck icon |
| 3 | Verify subtitle visible | `[data-testid="checklist-subtitle"]` | Subtitle reads "Configure the verification checklist used by Branch and CTF during LC review" |
| 4 | Verify "Add Item" button present | `[data-testid="btn-add-item"]` | Button visible with Plus icon |
| 5 | Verify checklist card rendered | `[data-testid="checklist-card"]` | Card displays with "Checklist Items" header |
| 6 | Verify table headers present | `[data-testid="checklist-table-header"]` | Headers show: S.N, Description, Status, Order, Actions |
| 7 | Verify first item row displays | `[data-testid="checklist-row-{item.id}"]` | Row shows item data: serial number, description, toggle, reorder buttons, edit/delete buttons |
| 8 | Verify all columns populated per row | `(discovered by explorer)` | S.N, description, status toggle, order controls, action buttons all visible |

---

## Preconditions
- Checklist has at least 3 items configured in data store

## Postconditions
- Page displays without errors
- All interactive elements are enabled/disabled appropriately (e.g., move-up disabled for first item, move-down disabled for last item)
