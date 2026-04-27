# FRS-LCI-03: Delete Checklist Item

**Module:** LC Issuance Checklist Management  
**Version:** 1.0  
**Author:** frs-generator skill  
**Date:** 2026-04-24  
**Related FRS:** FRS-LCI-01, FRS-LCI-02, FRS-LCI-04, FRS-LCI-05

---

## 1. Purpose

Bank administrators must remove obsolete or incorrect LC issuance verification checkpoints from the checklist when they are no longer required or when they were added in error. Delete capability allows administrators to clean up the checklist and prevent outdated items from appearing in LC reviews.

---

## 2. Scope

**In scope:** Deleting an item from the checklist; immediate removal from storage; immediate removal from display.  
**Out of scope:** Soft-delete or archival; restore/undo functionality; cascade deletion of related items; bulk delete.

---

## 3. Actors

| Actor | Role | Notes |
|-------|------|-------|
| Bank Administrator | Initiates item deletion | Must have manage checklist permissions |

---

## 4. Preconditions

- Bank Administrator is logged in
- Administrator is viewing the LC Issuance Checklist page with at least one item
- Item to delete is visible in the checklist table

---

## 5. Dependencies

**Inter-FRS Dependencies:**
- **FRS-LCI-01: Add Checklist Item** — Deleted items must have been created via add operation
- **FRS-LCI-02: Edit Checklist Item** — Edited items may be subsequently deleted
- **FRS-LCI-04: Toggle Item Active Status** — Item status (active/inactive) does not affect delete capability
- **FRS-LCI-05: Reorder Checklist Items** — Item position does not affect delete capability

**System & Technical Dependencies:**
- **Authentication & Authorization** — Administrator role must be verified
- **Data Persistence** — Item must be removed from permanent storage
- **UI State** — Table must update immediately to reflect removal

---

## 6. Trigger

Administrator clicks the trash can (delete) icon button next to a checklist item.

---

## 7. Main Flow

1. **Administrator** clicks trash can icon for target item.
2. **System** removes item from persistent storage immediately.
3. **System** displays confirmation toast notification.
4. **System** removes item row from the checklist table display.
5. **System** updates S.N values of subsequent items (if renumbering is required).
6. Operation ends successfully.

---

## 8. Alternative Flows

None identified. Delete is a direct action without intermediate steps.

---

## 9. Exception Flows

### 9a. Delete Last Item in Checklist

- **Trigger:** Administrator deletes the final item from a multi-item checklist.
- **Outcome:** Item is deleted; table displays "No checklist items configured" message.
- **Resolution:** Operation completes successfully; administrator may add new items if needed.

### 9b. Item Deleted by Concurrent Administrator

- **Trigger:** Item is deleted by another user; current administrator attempts to delete the same item.
- **Outcome:** Delete is idempotent; success notification shown regardless.
- **Resolution:** No error state; operation completes normally.

### 9c. Delete Item With Active Status

- **Trigger:** Administrator deletes an item that is marked as active.
- **Outcome:** Item is deleted regardless of active/inactive status.
- **Resolution:** Item removed from both storage and all active checklists immediately.

---

## 10. Postconditions

**On success:** 
- Item completely removed from persistent storage
- Item removed from checklist table display
- Administrator sees "Checklist item removed" confirmation
- Remaining items displayed in correct order
- If serial numbers are recalculated, new S.N values reflect current count

**On failure:** 
- Item remains in storage
- Item remains in table
- No notification displayed

---

## 11. Form Fields

None. Delete is a single-action operation.

---

## 12. Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-LCI-03-01 | System SHALL remove item from persistent storage on delete click | Must |
| FR-LCI-03-02 | System SHALL remove item row from table immediately after deletion | Must |
| FR-LCI-03-03 | System SHALL display confirmation toast notification | Should |
| FR-LCI-03-04 | System SHALL not require confirmation dialog before delete | Should |

---

## 13. Scenarios

### Scenario 1: Delete Item From Middle of List (Successful Flow)

**Feature:** delete-checklist-item | **Type:** Functional | **Priority:** High | **Tags:** @smoke @delete-checklist-item

**Preconditions:**
- Administrator is logged in
- Checklist contains at least 3 items
- Item "Verify Document Authenticity" is in the middle (e.g., position 2 of 3+)

**Steps:**

1. Verify item "Verify Document Authenticity" displays in table at position 2 -> selector: #checklist-table
2. Click trash can (delete) icon for that item -> selector: #btn-delete-item-2
3. Verify success toast appears -> selector: #toast-success
4. Verify item is removed from table -> selector: #checklist-table
5. Verify items that were below the deleted item have moved up -> selector: #checklist-table
6. Verify table displays correct number of items -> selector: #checklist-table

**Expected Result:**
- Item deleted immediately without confirmation dialog
- Item row removed from table
- Remaining items shift up to fill the gap
- Success notification displays "Checklist item removed"
- Subsequent items' S.N values updated if applicable

**Test Data:**
- Item to delete: Row 2 with "Verify Document Authenticity"

---

### Scenario 2: Delete Last Item From List (Variation Flow)

**Feature:** delete-checklist-item | **Type:** Functional | **Priority:** Medium | **Tags:** @regression @delete-checklist-item

**Preconditions:**
- Administrator is logged in
- Checklist contains exactly 1 item
- Item to delete is the last (and only) item

**Steps:**

1. Verify single item displays in table -> selector: #checklist-table
2. Click trash can icon for the item -> selector: #btn-delete-item-1
3. Verify success toast appears -> selector: #toast-success
4. Verify item is removed from table -> selector: #checklist-table
5. Verify empty state message displays -> selector: #checklist-empty-state

**Expected Result:**
- Final item deleted successfully
- Table shows "No checklist items configured" message
- Success notification displays
- Administrator can add new items to rebuild the list

**Test Data:**
- Item to delete: The only item in the list

---

### Scenario 3: Delete Item That Is Currently Active (Edge Case)

**Feature:** delete-checklist-item | **Type:** Functional | **Priority:** Medium | **Tags:** @regression @delete-checklist-item

**Preconditions:**
- Administrator is logged in
- Checklist contains multiple items
- Item "Check LC Amount" is marked as active (toggle is ON)

**Steps:**

1. Locate item "Check LC Amount" in the table -> selector: #checklist-table
2. Verify item's status toggle is ON (active) -> selector: #toggle-status-3
3. Click trash can icon for that item -> selector: #btn-delete-item-3
4. Verify item is removed from table -> selector: #checklist-table
5. Verify success toast appears -> selector: #toast-success

**Expected Result:**
- Item deleted successfully regardless of active status
- Item no longer available in any LC review checklist
- Other active items remain in the list
- Success notification displayed

**Test Data:**
- Item to delete: "Check LC Amount" (active status)

---

## 14. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| Performance | Delete action completes within 200ms; display refreshes within 100ms |
| Data Integrity | Deletion is permanent and irreversible; no backup option provided |
| Availability | Delete feature available during standard business hours |

---

## 15. Business Rules

- BR-01: Deleted items are permanently removed and cannot be recovered; administrators should exercise care when deleting.
- BR-02: Delete operates immediately without confirmation, so administrators must verify the correct item before clicking delete.

---

## 16. Edge Cases

- EC-01: Delete final item in checklist; system displays "No checklist items configured" state.
- EC-02: Administrator attempts to delete same item twice in rapid succession; second delete is idempotent and does not cause error.
- EC-03: Item is actively in use in a branch LC review and is deleted; existing review is unaffected; future reviews exclude the deleted item.

---

## 17. Open Questions

| # | Question | Owner | Due |
|---|----------|-------|-----|
| 1 | Should delete require confirmation dialog for safety? | Product | 2026-04-30 |
| 2 | Should soft-delete (archive) be available instead of hard delete? | Product | 2026-04-30 |
| 3 | Should audit log record who deleted an item and when? | Compliance | 2026-04-30 |

---

## 18. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-04-24 | frs-generator | Initial draft |
