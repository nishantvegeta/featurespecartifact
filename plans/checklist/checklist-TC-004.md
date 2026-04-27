# TC-004: Add Checklist Item - Validation (Empty Description)

**Feature:** Checklist  
**Scenario:** D — Prevent adding item with empty description  
**Status:** pending  
**Priority:** High  
**Type:** Functional  
**Tags:** @checklist @checklist-TC-004

---

## Steps

| # | Step | Selector | Expected Result |
|---|------|----------|-----------------|
| 1 | Click "Add Item" button | `[data-testid="btn-add-item"]` | Dialog opens |
| 2 | Leave description field empty | `[data-testid="input-add-description"]` | Textarea is empty (no text entered) |
| 3 | Verify "Add Item" button disabled | `[data-testid="btn-add-confirm"]` | Button is disabled (grayed out) |
| 4 | Enter a space character | `[data-testid="input-add-description"]` | Single space entered |
| 5 | Verify "Add Item" button still disabled | `[data-testid="btn-add-confirm"]` | Button remains disabled (whitespace trimmed) |
| 6 | Clear field and enter valid text | `[data-testid="input-add-description"]` | Valid description text entered |
| 7 | Verify "Add Item" button enabled | `[data-testid="btn-add-confirm"]` | Button is now enabled |
| 8 | Click Cancel | `[data-testid="btn-add-cancel"]` | Dialog closes without adding item |

---

## Preconditions
- Checklist page is displayed
- Add Item dialog is open

## Postconditions
- No item added to checklist when description is empty or whitespace-only
- Add Item button is disabled until valid (non-empty, non-whitespace) description provided
- Dialog closes without submitting on Cancel
