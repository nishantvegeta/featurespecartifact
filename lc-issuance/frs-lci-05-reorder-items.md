# FRS-LCI-05: Reorder Checklist Items

**Module:** LC Issuance Checklist Management  
**Version:** 1.0  
**Author:** frs-generator skill  
**Date:** 2026-04-24  
**Related FRS:** FRS-LCI-01, FRS-LCI-02, FRS-LCI-03, FRS-LCI-04

---

## 1. Purpose

Bank administrators must be able to adjust the sequence of LC issuance verification checkpoints to match the logical flow of document review. By reordering items, administrators can present checkpoints to Branch and CTF teams in the most efficient verification sequence, improving review process efficiency.

---

## 2. Scope

**In scope:** Moving items up or down in the list; updating serial numbers to reflect new order; persisting new order to storage; displaying updated sequence.  
**Out of scope:** Drag-and-drop reordering; bulk reordering; custom position numbering; conditional ordering based on item attributes.

---

## 3. Actors

| Actor | Role | Notes |
|-------|------|-------|
| Bank Administrator | Initiates item reordering | Must have manage checklist permissions |

---

## 4. Preconditions

- Bank Administrator is logged in
- Administrator is viewing the LC Issuance Checklist page
- Checklist contains at least 2 items
- No reorder operation is already in progress

---

## 5. Dependencies

**Inter-FRS Dependencies:**
- **FRS-LCI-01: Add Checklist Item** — New items are added at end of list and may be reordered
- **FRS-LCI-02: Edit Checklist Item** — Edited items can be reordered; edit preserves order
- **FRS-LCI-03: Delete Checklist Item** — Delete may trigger serial number updates
- **FRS-LCI-04: Toggle Item Active Status** — Status does not affect reorder capability

**System & Technical Dependencies:**
- **Authentication & Authorization** — Administrator role must be verified
- **Data Persistence** — New order persisted immediately
- **Serial Number Management** — S.N values updated to reflect new positions

---

## 6. Trigger

Administrator clicks "up" or "down" arrow button next to a checklist item.

---

## 7. Main Flow (Move Up)

1. **Administrator** clicks up arrow for an item that is not in the first position.
2. **System** swaps the item with the one above it.
3. **System** updates both items' S.N values accordingly.
4. **System** persists new order to storage immediately.
5. **System** refreshes the table to display items in new order.
6. Operation ends successfully.

---

## 7b. Main Flow (Move Down)

1. **Administrator** clicks down arrow for an item that is not in the last position.
2. **System** swaps the item with the one below it.
3. **System** updates both items' S.N values accordingly.
4. **System** persists new order to storage immediately.
5. **System** refreshes the table to display items in new order.
6. Operation ends successfully.

---

## 8. Alternative Flows

None identified. Reorder is a simple swap operation.

---

## 9. Exception Flows

### 9a. Move Up on First Item

- **Trigger:** Administrator clicks up arrow on the first (topmost) item.
- **Outcome:** Up arrow button is disabled; operation does not execute.
- **Resolution:** No action taken; user cannot move item further up.

### 9b. Move Down on Last Item

- **Trigger:** Administrator clicks down arrow on the last (bottommost) item.
- **Outcome:** Down arrow button is disabled; operation does not execute.
- **Resolution:** No action taken; user cannot move item further down.

### 9c. Reorder Item With Inactive Status

- **Trigger:** Administrator reorders an item that is marked inactive.
- **Outcome:** Item is reordered regardless of active/inactive status.
- **Resolution:** Operation completes; inactive item moves but remains hidden from reviews.

---

## 10. Postconditions

**On success:** 
- Item position changes in the checklist
- S.N values updated for affected items
- New order persisted to storage
- Table refreshes to display new sequence
- Order preserved across sessions

**On failure:** 
- Order unchanged
- S.N values unchanged
- No persistence

---

## 11. Form Fields

None. Reorder uses button controls with up/down arrow icons.

---

## 12. Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-LCI-05-01 | System SHALL swap item with adjacent item when move up/down clicked | Must |
| FR-LCI-05-02 | System SHALL update S.N values to reflect new positions | Must |
| FR-LCI-05-03 | System SHALL persist new order to storage immediately | Must |
| FR-LCI-05-04 | System SHALL disable move up button on first item | Must |
| FR-LCI-05-05 | System SHALL disable move down button on last item | Must |
| FR-LCI-05-06 | System SHALL preserve item active/inactive status during reorder | Should |

---

## 13. Scenarios

### Scenario 1: Move Item Up Within List (Successful Flow)

**Feature:** reorder-items | **Type:** Functional | **Priority:** High | **Tags:** @smoke @reorder-items

**Preconditions:**
- Administrator is logged in
- Checklist contains at least 3 items
- Item "Verify Issuing Bank" is at position 3 (S.N = 3)
- Item "Check LC Amount" is at position 2 (S.N = 2)

**Steps:**

1. Verify item order in table: position 2 = "Check LC Amount", position 3 = "Verify Issuing Bank" -> selector: #checklist-table
2. Click up arrow button for "Verify Issuing Bank" -> selector: #btn-move-up-item-3
3. Verify items swap positions in table -> selector: #checklist-table
4. Verify "Verify Issuing Bank" is now at position 2 (S.N = 2) -> selector: #checklist-table
5. Verify "Check LC Amount" moved to position 3 (S.N = 3) -> selector: #checklist-table
6. Verify up arrow for "Verify Issuing Bank" is now enabled -> selector: #btn-move-up-item-2

**Expected Result:**
- Items swap positions
- S.N values updated correctly (2 and 3 swapped)
- New order persists
- Arrow buttons enable/disable appropriately
- No notification required

**Test Data:**
- Item to move: "Verify Issuing Bank" (moving from position 3 to position 2)

---

### Scenario 2: Move Item Down to Last Position (Variation Flow)

**Feature:** reorder-items | **Type:** Functional | **Priority:** High | **Tags:** @regression @reorder-items

**Preconditions:**
- Administrator is logged in
- Checklist contains exactly 3 items
- Item "Verify Document Authenticity" is at position 1 (S.N = 1)
- Item "Check LC Amount" is at position 2 (S.N = 2)
- Item "Verify Issuing Bank" is at position 3 (S.N = 3)

**Steps:**

1. Verify initial item order -> selector: #checklist-table
2. Click down arrow for "Check LC Amount" -> selector: #btn-move-down-item-2
3. Verify "Check LC Amount" moved to position 3 -> selector: #checklist-table
4. Verify "Verify Issuing Bank" moved to position 2 -> selector: #checklist-table
5. Verify down arrow for "Check LC Amount" is now disabled -> selector: #btn-move-down-item-3

**Expected Result:**
- Items swap correctly
- Item at last position now has disabled down arrow
- Item that moved up has enabled down arrow
- Order persists across sessions

**Test Data:**
- Item to move: "Check LC Amount" (moving from position 2 to position 3)

---

### Scenario 3: Attempt to Move Boundary Items (Edge Case)

**Feature:** reorder-items | **Type:** Functional | **Priority:** Medium | **Tags:** @regression @reorder-items

**Preconditions:**
- Administrator is logged in
- Checklist contains at least 3 items
- First item has up arrow disabled
- Last item has down arrow disabled

**Steps:**

1. Locate first item in table -> selector: #checklist-table
2. Verify up arrow is disabled -> selector: #btn-move-up-item-1
3. Attempt to click disabled up arrow -> selector: #btn-move-up-item-1
4. Verify item does not move -> selector: #checklist-table
5. Locate last item in table -> selector: #checklist-table
6. Verify down arrow is disabled -> selector: #btn-move-down-item-last
7. Attempt to click disabled down arrow -> selector: #btn-move-down-item-last
8. Verify item does not move -> selector: #checklist-table

**Expected Result:**
- Disabled buttons cannot be clicked (cursor shows disabled state)
- Items do not move when disabled buttons are targeted
- Order remains unchanged

**Test Data:**
- First item: "Verify Document Authenticity"
- Last item: "Verify Issuing Bank"

---

## 14. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| Performance | Reorder operation completes within 200ms; display refreshes within 100ms |
| Consistency | Order change is atomic; no partial state possible |
| Availability | Reorder feature available during standard business hours |

---

## 15. Business Rules

- BR-01: Items can only move one position at a time (adjacent swap), ensuring administrators control the exact sequence with precision.
- BR-02: Serial numbers (S.N) are always sequential and contiguous (1, 2, 3, ...) and automatically update to reflect current position.

---

## 16. Edge Cases

- EC-01: First item cannot move up; up arrow disabled to prevent confusion.
- EC-02: Last item cannot move down; down arrow disabled to prevent confusion.
- EC-03: Moving an inactive item reorders it visually but does not affect its inactive status or visibility in reviews.
- EC-04: Rapid successive moves; system processes atomically without creating gaps or duplicates in S.N.

---

## 17. Open Questions

| # | Question | Owner | Due |
|---|----------|-------|-----|
| 1 | Should reorder support drag-and-drop as an alternative to up/down buttons? | Product | 2026-04-30 |
| 2 | Should reorder history be audited? | Compliance | 2026-04-30 |
| 3 | Should administrator be able to specify absolute position (jump to position N)? | Product | 2026-04-30 |

---

## 18. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-04-24 | frs-generator | Initial draft |
