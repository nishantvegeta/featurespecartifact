# TC-006: Edit Checklist Item - Validation (Empty Description)

**Feature:** Checklist  
**Scenario:** F — Prevent editing item to empty description  
**Status:** pending  
**Priority:** High  
**Type:** Functional  
**Tags:** @checklist @checklist-TC-006

---

## Steps

| # | Step | Selector | Expected Result |
|---|------|----------|-----------------|
| 1 | Click edit button on an item | `[data-testid="checklist-edit-{item.id}"]` | Edit dialog opens with current description loaded |
| 2 | Verify "Save Changes" button enabled initially | `[data-testid="btn-edit-confirm"]` | Button is enabled |
| 3 | Select all text and delete | `[data-testid="input-edit-description"]` | Textarea is now empty |
| 4 | Verify "Save Changes" button disabled | `[data-testid="btn-edit-confirm"]` | Button is disabled |
| 5 | Enter whitespace only (spaces/tabs) | `[data-testid="input-edit-description"]` | Textarea contains only whitespace |
| 6 | Verify "Save Changes" button still disabled | `[data-testid="btn-edit-confirm"]` | Button remains disabled (whitespace trimmed) |
| 7 | Enter valid text | `[data-testid="input-edit-description"]` | Valid description entered |
| 8 | Verify "Save Changes" button re-enabled | `[data-testid="btn-edit-confirm"]` | Button is enabled again |
| 9 | Click Cancel button | `[data-testid="btn-edit-cancel"]` | Dialog closes without saving changes |

---

## Preconditions
- Checklist page is displayed
- Edit dialog is open for an existing item
- Item has non-empty description

## Postconditions
- Item description not changed if empty/whitespace submitted
- Save Changes button disabled while description is empty or whitespace-only
- Dialog closes on Cancel without modifying item
