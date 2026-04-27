# TC-005: Edit Checklist Item (Happy Path)

**Feature:** Checklist  
**Scenario:** E — Edit existing checklist item description  
**Status:** pending  
**Priority:** High  
**Type:** Functional  
**Tags:** @checklist @checklist-TC-005

---

## Steps

| # | Step | Selector | Expected Result |
|---|------|----------|-----------------|
| 1 | Locate an item in the checklist table | `(discovered by explorer)` | Checklist table displays with at least one item |
| 2 | Click edit button for an item | `[data-testid="checklist-edit-{item.id}"]` | Edit dialog opens with title "Edit Checklist Item" |
| 3 | Verify current description in textarea | `[data-testid="input-edit-description"]` | Textarea contains the current item description |
| 4 | Clear current text | `[data-testid="input-edit-description"]` | Textarea is cleared |
| 5 | Enter new description | `[data-testid="input-edit-description"]` | Text "Updated description text" entered in textarea |
| 6 | Verify "Save Changes" button enabled | `[data-testid="btn-edit-confirm"]` | Button is enabled |
| 7 | Click "Save Changes" button | `[data-testid="btn-edit-confirm"]` | Dialog closes |
| 8 | Verify success toast appears | `(discovered by explorer)` | Toast message "Checklist item updated" displays |
| 9 | Verify updated description in table | `(discovered by explorer)` | Table row shows updated description text |

---

## Preconditions
- Checklist page displays with at least one item
- Item has initial description text

## Postconditions
- Item description updated in data store
- Updated text displays in table
- Dialog closed and form cleared
- Toast notification displayed
