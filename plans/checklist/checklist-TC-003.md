# TC-003: Add Checklist Item (Happy Path)

**Feature:** Checklist  
**Scenario:** C — Add new checklist item via dialog with valid description  
**Status:** pending  
**Priority:** High  
**Type:** Functional  
**Tags:** @smoke @checklist @checklist-TC-003

---

## Steps

| # | Step | Selector | Expected Result |
|---|------|----------|-----------------|
| 1 | Click "Add Item" button | `[data-testid="btn-add-item"]` | Dialog opens with title "Add Checklist Item" |
| 2 | Verify dialog content | `[data-testid="dialog-add-item"]` | Dialog contains Description label, textarea, Cancel and Add Item buttons |
| 3 | Enter description text | `[data-testid="input-add-description"]` | Text "Verify bank account details" entered in textarea |
| 4 | Verify "Add Item" button enabled | `[data-testid="btn-add-confirm"]` | Button is enabled (not disabled) |
| 5 | Click "Add Item" button | `[data-testid="btn-add-confirm"]` | Dialog closes |
| 6 | Verify success toast appears | `(discovered by explorer)` | Toast message "Checklist item added" displays briefly |
| 7 | Verify new item appears in table | `(discovered by explorer)` | New item row appears in table with entered description |
| 8 | Verify form resets | `[data-testid="input-add-description"]` | Dialog textarea is cleared and dialog is closed |

---

## Preconditions
- Checklist page is displayed
- Add Item dialog is closed initially

## Postconditions
- New item added to checklist data store
- Item appears in table with active status enabled by default
- Dialog closed and form cleared
- Toast notification displayed and auto-dismissed
