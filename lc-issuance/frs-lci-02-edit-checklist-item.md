# FRS-LCI-02: Edit Checklist Item

**Module:** LC Issuance Checklist Management  
**Version:** 1.0  
**Author:** frs-generator skill  
**Date:** 2026-04-24  
**Related FRS:** FRS-LCI-01, FRS-LCI-03, FRS-LCI-04, FRS-LCI-05

---

## 1. Purpose

Bank administrators must modify existing LC issuance verification checkpoints when business requirements change or when existing descriptions need clarification. The Edit operation allows administrators to update item descriptions without losing their position, status, or other attributes in the checklist.

---

## 2. Scope

**In scope:** Opening edit dialog for an item; updating description text; saving changes to persistent storage; refreshing display.  
**Out of scope:** Changing item serial number; renumbering other items; bulk edit; moving items during edit.

---

## 3. Actors

| Actor | Role | Notes |
|-------|------|-------|
| Bank Administrator | Initiates item edit | Must have manage checklist permissions |

---

## 4. Preconditions

- Bank Administrator is logged in
- Administrator is viewing the LC Issuance Checklist page with at least one existing item
- Edit dialog is not already open

---

## 5. Dependencies

**Inter-FRS Dependencies:**
- **FRS-LCI-01: Add Checklist Item** — Items to edit are created via this operation
- **FRS-LCI-03: Delete Checklist Item** — Edited items may subsequently be deleted
- **FRS-LCI-04: Toggle Item Active Status** — Edited items may have status toggled

**System & Technical Dependencies:**
- **Authentication & Authorization** — Administrator role must be verified
- **Data Persistence** — Changes persisted immediately
- **UI State** — Edit dialog must load current description value

---

## 6. Trigger

Administrator clicks the pencil (edit) icon button next to a checklist item.

---

## 7. Main Flow

1. **Administrator** clicks pencil icon for target item in the table.
2. **System** loads current description and opens "Edit Checklist Item" dialog.
3. **Administrator** modifies the description text.
4. **Administrator** clicks "Save Changes" button in the dialog.
5. **System** validates description is not empty.
6. **System** updates item with new description in persistent storage.
7. **System** closes dialog and displays success toast notification.
8. **System** refreshes checklist display to show updated item.
9. Operation ends successfully.

---

## 8. Alternative Flows

### 8a. Close Dialog Without Saving

*Branches from step 2 of the main flow.*

1. **Administrator** clicks "Cancel" button or X button in the dialog.
2. **System** closes the dialog without saving changes.
3. Item retains its previous description.
4. Operation ends without modification.

### 8b. Clear Description and Retype

*Branches from step 3 of the main flow.*

1. **Administrator** selects all text and deletes it.
2. **Administrator** enters new description.
3. Continues with step 4 of main flow.

---

## 9. Exception Flows

### 9a. Clear Description to Empty

- **Trigger:** Administrator clears the description field completely and attempts to save.
- **Outcome:** "Save Changes" button is disabled; no save occurs.
- **Resolution:** Administrator must enter non-empty description before save is possible.

### 9b. No Changes Made

- **Trigger:** Administrator clicks "Save Changes" without modifying the description.
- **Outcome:** System processes save as normal (idempotent operation); success toast shown.
- **Resolution:** No error; operation completes normally.

### 9c. Item Deleted by Another Administrator

- **Trigger:** Item is deleted by another user after this administrator opened the edit dialog but before save.
- **Outcome:** Save fails; error toast indicates item no longer exists.
- **Resolution:** Administrator closes dialog and refreshes page to see updated list.

---

## 10. Postconditions

**On success:** 
- Item description updated in storage
- Item retains its S.N, active status, and position
- Administrator sees "Checklist item updated" confirmation
- Table refreshes to display new description

**On failure:** 
- Dialog remains open or closes with error message
- Item retains previous description
- No persistence change

---

## 11. Form Fields

| Field Name | Mandatory | Input Method | Description | Validation / Remarks |
|------------|-----------|--------------|-------------|----------------------|
| Description | Yes | Textarea | Updated text description of the verification checkpoint | Must not be empty or whitespace-only; max length appropriate for display |

---

## 12. Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-LCI-02-01 | System SHALL load current description into textarea when edit dialog opens | Must |
| FR-LCI-02-02 | System SHALL update item description in storage when valid new description submitted | Must |
| FR-LCI-02-03 | System SHALL preserve item S.N, active status, and position during edit | Must |
| FR-LCI-02-04 | System SHALL persist changes immediately to storage | Must |
| FR-LCI-02-05 | System SHALL display success toast after update | Should |
| FR-LCI-02-06 | System SHALL disable "Save Changes" button when description is empty | Should |

---

## 13. Scenarios

### Scenario 1: Edit Item Description (Successful Flow)

**Feature:** edit-checklist-item | **Type:** Functional | **Priority:** High | **Tags:** @smoke @edit-checklist-item

**Preconditions:**
- Administrator is logged in
- Checklist displays multiple items
- Item "Verify Document Authenticity" exists in the list

**Steps:**

1. Locate the item "Verify Document Authenticity" in table -> selector: #checklist-table
2. Click pencil (edit) icon for that item -> selector: #btn-edit-item-1
3. Verify "Edit Checklist Item" dialog opens -> selector: #dialog-edit-item
4. Verify current description appears in textarea -> selector: getByLabel("Description")
5. Clear description field -> selector: getByLabel("Description")
6. Enter updated description -> selector: getByLabel("Description")
7. Click "Save Changes" button -> selector: #btn-dialog-save-changes
8. Verify success toast appears -> selector: #toast-success
9. Verify updated description displays in table -> selector: #checklist-table

**Expected Result:**
- Dialog closes automatically after save
- Item shows updated description in the table
- Item S.N and active status unchanged
- Item position in list unchanged
- Success notification displays "Checklist item updated"

**Test Data:**
- Original Description: `Verify Document Authenticity`
- Updated Description: `Verify Authenticity of LC Documents {timestamp}`

---

### Scenario 2: Edit Item But Close Without Saving (Variation Flow)

**Feature:** edit-checklist-item | **Type:** Functional | **Priority:** Medium | **Tags:** @regression @edit-checklist-item

**Preconditions:**
- Administrator is logged in
- "Edit Checklist Item" dialog is open with an item loaded
- Administrator has modified the description

**Steps:**

1. Verify dialog is open with edited text -> selector: #dialog-edit-item
2. Verify description field contains modified text -> selector: getByLabel("Description")
3. Click "Cancel" button -> selector: #btn-dialog-cancel
4. Verify dialog closes -> selector: #dialog-edit-item
5. Verify item in table shows original description -> selector: #checklist-table

**Expected Result:**
- Dialog closes without saving
- Item retains original description
- No success or error notification
- No changes persisted

**Test Data:**
- No changes saved

---

### Scenario 3: Edit Item Description to Empty (Failure Flow)

**Feature:** edit-checklist-item | **Type:** Functional | **Priority:** High | **Tags:** @regression @edit-checklist-item

**Preconditions:**
- Administrator is logged in
- "Edit Checklist Item" dialog is open
- Dialog contains a description

**Steps:**

1. Click in description field -> selector: getByLabel("Description")
2. Select all text -> selector: getByLabel("Description")
3. Delete all text -> selector: getByLabel("Description")
4. Verify "Save Changes" button is disabled -> selector: #btn-dialog-save-changes
5. Click "Cancel" to close dialog -> selector: #btn-dialog-cancel

**Expected Result:**
- Submit button becomes disabled when field is empty
- Save operation cannot proceed
- Dialog closes without making changes
- Item retains original description

**Test Data:**
- None

---

## 14. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| Performance | Dialog opens with description loaded within 200ms; update persists within 500ms |
| Data Retention | Updated descriptions retained indefinitely |
| Availability | Edit feature available during standard business hours |

---

## 15. Business Rules

- BR-01: Items preserve their position and serial number when edited, maintaining the configured order.
- BR-02: Description updates must be non-empty to ensure all checklist items have meaningful content for LC review teams.

---

## 16. Edge Cases

- EC-01: Administrator edits description to be identical to current value; system treats as valid change and updates timestamp.
- EC-02: Description with only whitespace is rejected; trimmed value must be non-empty.
- EC-03: Very long descriptions are accepted if within max length; display may wrap in table cells.

---

## 17. Open Questions

| # | Question | Owner | Due |
|---|----------|-------|-----|
| 1 | Should edit timestamp be recorded and displayed to administrators? | Product | 2026-04-30 |
| 2 | Should edit history be retained (audit trail)? | Product | 2026-04-30 |

---

## 18. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-04-24 | frs-generator | Initial draft |
