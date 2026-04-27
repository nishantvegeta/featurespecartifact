# FRS-LCI-04: Toggle Item Active Status

**Module:** LC Issuance Checklist Management  
**Version:** 1.0  
**Author:** frs-generator skill  
**Date:** 2026-04-24  
**Related FRS:** FRS-LCI-01, FRS-LCI-02, FRS-LCI-03, FRS-LCI-05

---

## 1. Purpose

Bank administrators must be able to temporarily disable LC issuance verification checkpoints without deleting them. By toggling item status between active and inactive, administrators can quickly adjust which verification items Branch and CTF teams see during LC review, without losing the item definition for future re-activation.

---

## 2. Scope

**In scope:** Toggling item active/inactive status via switch control; persisting status change; affecting visibility in LC review checklists.  
**Out of scope:** Scheduling status changes; conditional status rules; dependency-based status locking; bulk status changes.

---

## 3. Actors

| Actor | Role | Notes |
|-------|------|-------|
| Bank Administrator | Initiates status toggle | Must have manage checklist permissions |

---

## 4. Preconditions

- Bank Administrator is logged in
- Administrator is viewing the LC Issuance Checklist page
- At least one checklist item exists and is visible

---

## 5. Dependencies

**Inter-FRS Dependencies:**
- **FRS-LCI-01: Add Checklist Item** — Items added are active by default
- **FRS-LCI-02: Edit Checklist Item** — Edit preserves status; can be edited regardless of status
- **FRS-LCI-03: Delete Checklist Item** — Items can be deleted regardless of status
- **FRS-LCI-05: Reorder Checklist Items** — Order operations work regardless of status

**System & Technical Dependencies:**
- **Authentication & Authorization** — Administrator role must be verified
- **Data Persistence** — Status change persisted immediately
- **External System Impact** — Inactive items must not appear in Branch/CTF LC review UI

---

## 6. Trigger

Administrator clicks the status switch (toggle) for a checklist item.

---

## 7. Main Flow

1. **Administrator** clicks the status switch for target item in the table.
2. **System** inverts the item's active status (active→inactive or inactive→active).
3. **System** persists the new status to storage immediately.
4. **System** updates the switch appearance to reflect new state.
5. **System** refreshes any active LC review checklists to show/hide the item as appropriate.
6. Operation ends successfully.

---

## 8. Alternative Flows

None identified. Toggle is a single atomic action.

---

## 9. Exception Flows

### 9a. Toggle Item While Reordering

- **Trigger:** Administrator toggles status on an item while order-change buttons are visible.
- **Outcome:** Status changes; order buttons remain available for the item.
- **Resolution:** Item can be toggled and reordered independently.

### 9b. Inactive Item Is Toggled Active

- **Trigger:** Administrator clicks toggle on an inactive item to make it active.
- **Outcome:** Item status changes to active; item becomes visible in LC review checklists.
- **Resolution:** Operation completes; item reappears in active reviews.

### 9c. Last Active Item Is Toggled

- **Trigger:** Only one item is active; administrator toggles it to inactive.
- **Outcome:** All items are now inactive; no items will appear in LC review checklists.
- **Resolution:** Operation completes; system may warn administrator or allow it without restriction.

---

## 10. Postconditions

**On success:** 
- Item status inverted in persistent storage
- Switch appearance updated immediately
- Item visibility in LC review checklists updated
- Item remains in the configured checklist with all other attributes preserved

**On failure:** 
- Status unchanged
- Switch remains in original state
- No notification

---

## 11. Form Fields

None. Toggle is a switch control with two states.

---

## 12. Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-LCI-04-01 | System SHALL invert item active status on toggle click | Must |
| FR-LCI-04-02 | System SHALL persist status change immediately to storage | Must |
| FR-LCI-04-03 | System SHALL update switch appearance to reflect new state | Must |
| FR-LCI-04-04 | System SHALL exclude inactive items from Branch/CTF LC review checklists | Must |
| FR-LCI-04-05 | System SHALL allow toggling of the last remaining active item | Should |

---

## 13. Scenarios

### Scenario 1: Toggle Item From Active to Inactive (Successful Flow)

**Feature:** toggle-item-status | **Type:** Functional | **Priority:** High | **Tags:** @smoke @toggle-item-status

**Preconditions:**
- Administrator is logged in
- Checklist displays multiple items
- Item "Verify Document Authenticity" is marked as active (switch is ON)

**Steps:**

1. Locate item "Verify Document Authenticity" in the table -> selector: #checklist-table
2. Verify status toggle is currently ON (active) -> selector: #toggle-status-1
3. Click the status toggle switch -> selector: #toggle-status-1
4. Verify toggle appearance changes to OFF -> selector: #toggle-status-1
5. Verify item remains in the table -> selector: #checklist-table
6. Verify item description is still visible -> selector: #checklist-table

**Expected Result:**
- Toggle switch inverts to OFF (inactive) state
- Item remains in the checklist with all attributes preserved
- Item is removed from active Branch/CTF LC review checklists
- No notification required; action is immediate and obvious

**Test Data:**
- Item: "Verify Document Authenticity" (currently active)

---

### Scenario 2: Toggle Item From Inactive to Active (Variation Flow)

**Feature:** toggle-item-status | **Type:** Functional | **Priority:** High | **Tags:** @regression @toggle-item-status

**Preconditions:**
- Administrator is logged in
- Checklist displays multiple items
- Item "Check LC Amount" is marked as inactive (switch is OFF)

**Steps:**

1. Locate item "Check LC Amount" in the table -> selector: #checklist-table
2. Verify status toggle is currently OFF (inactive) -> selector: #toggle-status-2
3. Click the status toggle switch -> selector: #toggle-status-2
4. Verify toggle appearance changes to ON -> selector: #toggle-status-2
5. Verify item remains in the table -> selector: #checklist-table

**Expected Result:**
- Toggle switch inverts to ON (active) state
- Item reappears in active Branch/CTF LC review checklists
- Item remains in its current position in the configuration list
- All other item attributes preserved

**Test Data:**
- Item: "Check LC Amount" (currently inactive)

---

### Scenario 3: Rapidly Toggle Item Multiple Times (Edge Case)

**Feature:** toggle-item-status | **Type:** Functional | **Priority:** Medium | **Tags:** @regression @toggle-item-status

**Preconditions:**
- Administrator is logged in
- Checklist contains items
- Item "Verify Issuing Bank" exists and is currently active

**Steps:**

1. Locate item "Verify Issuing Bank" -> selector: #checklist-table
2. Click toggle OFF -> selector: #toggle-status-3
3. Immediately click toggle ON -> selector: #toggle-status-3
4. Immediately click toggle OFF -> selector: #toggle-status-3
5. Verify final state is OFF (inactive) -> selector: #toggle-status-3
6. Verify item is inactive in the table -> selector: #checklist-table

**Expected Result:**
- Each toggle click is processed atomically
- Final state correctly reflects last user action
- No race condition or state inconsistency
- Item status in storage matches switch appearance

**Test Data:**
- Item: "Verify Issuing Bank"

---

## 14. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| Performance | Toggle state persists within 100ms; UI updates within 50ms |
| Consistency | Status change must be atomic; no partial state possible |
| Availability | Toggle feature available during standard business hours |

---

## 15. Business Rules

- BR-01: Items marked inactive do not appear in LC review checklists used by Branch and CTF teams, preventing incomplete or outdated requirements from being evaluated.
- BR-02: Toggling status preserves all other item attributes (description, position, serial number), allowing administrators to temporarily disable without losing configuration.

---

## 16. Edge Cases

- EC-01: Toggle last active item to inactive; system allows this, resulting in no active items (all items hidden from reviews).
- EC-02: Rapid successive toggles; system processes each atomically without creating race condition.
- EC-03: Inactive item is toggled active while a concurrent LC review is in progress; item becomes visible only in future reviews.

---

## 17. Open Questions

| # | Question | Owner | Due |
|---|----------|-------|-----|
| 1 | Should system warn if all items are toggled to inactive? | Product | 2026-04-30 |
| 2 | Should status change be logged in an audit trail? | Compliance | 2026-04-30 |

---

## 18. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-04-24 | frs-generator | Initial draft |
