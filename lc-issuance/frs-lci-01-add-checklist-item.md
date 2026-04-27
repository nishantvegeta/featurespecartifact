# FRS-LCI-01: Add Checklist Item

**Module:** LC Issuance Checklist Management  
**Version:** 1.0  
**Author:** frs-generator skill  
**Date:** 2026-04-24  
**Related FRS:** FRS-LCI-02, FRS-LCI-03, FRS-LCI-04, FRS-LCI-05

---

## 1. Purpose

Bank administrators configure LC issuance verification requirements by adding checklist items to the LC Issuance Checklist. When a new verification checkpoint is identified by Branch or CTF teams, administrators must be able to create and store the item so it appears in all subsequent LC reviews.

---

## 2. Scope

**In scope:** Adding a new checklist item with a description; saving to persistent storage; displaying success confirmation.  
**Out of scope:** Bulk import of items; item templates; field validation beyond empty/non-empty; item categorization.

---

## 3. Actors

| Actor | Role | Notes |
|-------|------|-------|
| Bank Administrator | Initiates checklist item creation | Has permission to manage LC issuance settings |

---

## 4. Preconditions

- Bank Administrator is logged in
- Administrator has navigated to the LC Issuance Checklist page
- Checklist exists and is accessible

---

## 5. Dependencies

**Inter-FRS Dependencies:**
- **FRS-LCI-02: Edit Checklist Item** — Edited items must use the same description field format
- **FRS-LCI-03: Delete Checklist Item** — Newly added items must be deletable

**System & Technical Dependencies:**
- **Authentication & Authorization** — Administrator role must be verified
- **Data Persistence** — Item must persist across sessions
- **UI State** — Dialog must reset after successful add

---

## 6. Trigger

Administrator clicks "Add Item" button on the LC Issuance Checklist page.

---

## 7. Main Flow

1. **Administrator** clicks "Add Item" button.
2. **System** opens "Add Checklist Item" dialog.
3. **Administrator** enters description in the textarea field.
4. **Administrator** clicks "Add Item" button in the dialog.
5. **System** validates description is not empty.
6. **System** creates checklist item and stores to persistent storage.
7. **System** closes dialog and displays success toast notification.
8. **System** refreshes checklist display to show new item at end of list.
9. Operation ends successfully.

---

## 8. Alternative Flows

### 8a. Close Dialog Without Adding

*Branches from step 2 of the main flow.*

1. **Administrator** clicks "Cancel" button in the dialog.
2. **System** closes the dialog without saving.
3. Operation ends without creating an item.

---

## 9. Exception Flows

### 9a. Empty Description

- **Trigger:** Administrator clicks "Add Item" with empty or whitespace-only description.
- **Outcome:** "Add Item" button remains disabled in the dialog; no error message displayed.
- **Resolution:** Administrator must enter non-empty description before submission is possible.

### 9b. Dialog Close Button Clicked

- **Trigger:** Administrator clicks X button to close the dialog.
- **Outcome:** Dialog closes without saving; no toast displayed.
- **Resolution:** Administrator can click "Add Item" again to retry.

---

## 10. Postconditions

**On success:** 
- New item created with unique ID and assigned next serial number (S.N)
- Item marked as active by default
- Item appears in checklist table
- Administrator sees "Checklist item added" confirmation

**On failure:** 
- Dialog remains open
- No item created
- No persistence change

---

## 11. Form Fields

| Field Name | Mandatory | Input Method | Description | Validation / Remarks |
|------------|-----------|--------------|-------------|----------------------|
| Description | Yes | Textarea | Text description of the verification checkpoint | Must not be empty or whitespace-only; max length appropriate for display in table |

---

## 12. Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-LCI-01-01 | System SHALL create a new checklist item when valid description is submitted | Must |
| FR-LCI-01-02 | System SHALL assign next sequential S.N to new item | Must |
| FR-LCI-01-03 | System SHALL mark new item as active by default | Must |
| FR-LCI-01-04 | System SHALL persist new item to storage immediately | Must |
| FR-LCI-01-05 | System SHALL display success toast notification after item creation | Should |
| FR-LCI-01-06 | System SHALL disable "Add Item" button when description is empty | Should |

---

## 13. Scenarios

### Scenario 1: Add Item With Valid Description (Successful Flow)

**Feature:** add-checklist-item | **Type:** Functional | **Priority:** High | **Tags:** @smoke @add-checklist-item

**Preconditions:**
- Administrator is logged in
- Administrator is viewing the LC Issuance Checklist page
- Dialog is closed

**Steps:**

1. Click "Add Item" button -> selector: #btn-add-item
2. Verify "Add Checklist Item" dialog opens -> selector: #dialog-add-item
3. Fill in Description field -> selector: getByLabel("Description")
4. Click "Add Item" button in dialog -> selector: #btn-dialog-add-item
5. Verify success toast appears -> selector: #toast-success
6. Verify new item appears in checklist table -> selector: #checklist-table

**Expected Result:**
- Dialog closes automatically
- New item appears at the end of the checklist with next S.N value
- Item marked as active (toggle switch is ON)
- Success notification displays

**Test Data:**
- Description: `Verify Document Authenticity {timestamp}`

---

### Scenario 2: Add Item With Empty Description (Failure Flow)

**Feature:** add-checklist-item | **Type:** Functional | **Priority:** High | **Tags:** @regression @add-checklist-item

**Preconditions:**
- Administrator is logged in
- "Add Checklist Item" dialog is open
- Description field is empty

**Steps:**

1. Verify "Add Item" button is disabled -> selector: #btn-dialog-add-item
2. Type and then clear the Description field -> selector: getByLabel("Description")
3. Verify "Add Item" button remains disabled -> selector: #btn-dialog-add-item
4. Click "Cancel" button -> selector: #btn-dialog-cancel

**Expected Result:**
- Submit button stays disabled while field is empty
- No item is created
- Dialog closes when Cancel is clicked
- No success notification displayed

**Test Data:**
- None required

---

### Scenario 3: Add Multiple Items In Succession (Variation Flow)

**Feature:** add-checklist-item | **Type:** Functional | **Priority:** Medium | **Tags:** @regression @add-checklist-item

**Preconditions:**
- Administrator is logged in
- Administrator is viewing the LC Issuance Checklist page
- Checklist contains at least 2 items

**Steps:**

1. Click "Add Item" button -> selector: #btn-add-item
2. Fill Description field with first item -> selector: getByLabel("Description")
3. Click "Add Item" in dialog -> selector: #btn-dialog-add-item
4. Verify first new item appears with correct S.N -> selector: #checklist-table
5. Click "Add Item" button again -> selector: #btn-add-item
6. Fill Description field with second item -> selector: getByLabel("Description")
7. Click "Add Item" in dialog -> selector: #btn-dialog-add-item
8. Verify second new item appears with incremented S.N -> selector: #checklist-table

**Expected Result:**
- Both items created successfully in order
- Each item gets unique S.N values (previous last + 1, then previous last + 2)
- Dialog resets between additions
- Both items marked as active

**Test Data:**
- First Description: `Check LC Amount {timestamp}`
- Second Description: `Verify Issuing Bank {timestamp}`

---

## 14. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| Performance | Dialog opens within 200ms; item saves within 500ms |
| Data Retention | Items retained indefinitely until explicitly deleted |
| Availability | Checklist page available during standard business hours |

---

## 15. Business Rules

- BR-01: New items must be marked active by default so they immediately appear in LC review checklists used by Branch and CTF teams.
- BR-02: Each new item must receive the next available serial number to maintain sequential ordering without gaps.

---

## 16. Edge Cases

- EC-01: Description with leading/trailing whitespace is trimmed before storage; no item created if only whitespace provided.
- EC-02: Description exceeding max character length is rejected; form field should indicate max length to administrator.
- EC-03: Administrator navigates away while dialog is open; state is lost and dialog closes without saving.

---

## 17. Open Questions

| # | Question | Owner | Due |
|---|----------|-------|-----|
| 1 | What is the maximum character length for description field? | Product | 2026-04-30 |
| 2 | Should duplicate descriptions be allowed, or should system warn administrator? | Product | 2026-04-30 |

---

## 18. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-04-24 | frs-generator | Initial draft |
