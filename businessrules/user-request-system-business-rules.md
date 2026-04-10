# User Request System — Business Rules

**Version:** 1.0  
**Date:** 2026-04-10  
**Scope:** FRS-01 (Submit User Request) + FRS-02 (View & Filter User Requests)

---

## Access Control & Authorization

- **BR-A-01:** Only users with Company Super Admin role for the active entity may submit user requests.
  - *Enforces:* FRS-01 FR-01-01
  - *Impact:* "New User Request" button is visible only to Super Admins

- **BR-A-02:** Users can only view requests for their active entity; cross-entity request visibility is strictly prevented.
  - *Enforces:* FRS-02 FR-02-01, BR-01
  - *Impact:* Entity isolation is a security boundary; filtering must be enforced server-side

---

## Request Lifecycle & State

- **BR-R-01:** Newly submitted requests must always start with status "pending" and cannot be created in any other state.
  - *Enforces:* FRS-01 FR-01-08, BR-02
  - *Impact:* Default status is immutable at creation; no bypass for initial state

- **BR-R-02:** A request submission must capture the identity of the submitter (requested_by field) for audit purposes.
  - *Enforces:* FRS-01 FR-01-08, BR-03
  - *Impact:* All requests must be traceable to the user who created them; cannot be null

- **BR-R-03:** The submitted request is immediately visible to all users of the same entity on the User Requests page.
  - *Enforces:* FRS-01 BR-05, FRS-02 FR-02-06
  - *Impact:* No visibility delay; newly created requests appear instantly (or within 5s per NFR)

---

## Data Integrity & Display

- **BR-D-01:** Rejection reasons are private data only shown for rejected requests; they are not visible to users if the request is still pending or has been approved.
  - *Enforces:* FRS-02 FR-02-11, FR-02-12, BR-04
  - *Impact:* Conditional display logic; rejection reason field is null/hidden for non-rejected requests

- **BR-D-02:** A request's "Submitted" date reflects the original request creation date, not subsequent updates or reviews.
  - *Enforces:* FRS-02 BR-05
  - *Impact:* `created_at` is immutable; any review/approval updates do not modify submission date

- **BR-D-03:** Remarks/justification are optional but recommended for providing context to the bank admin reviewer.
  - *Enforces:* FRS-01 FR-01-04, BR-04
  - *Impact:* Remarks field can be empty; no validation prevents blank submissions, but UX should encourage population

---

## Display & Sorting

- **BR-S-01:** Requests are always sorted newest first; users cannot change the sort order.
  - *Enforces:* FRS-02 FR-02-06, BR-03
  - *Impact:* Sort order is fixed; no user-facing sort controls; backend must sort by `created_at` DESC

- **BR-S-02:** Summary card counts must accurately reflect the status distribution of the entity's requests at page load time.
  - *Enforces:* FRS-02 FR-02-03, BR-02
  - *Impact:* Counts are calculated at page load, not real-time; eventual consistency acceptable within 5s

---

## Summary: Business Rule Categories

| Category | Count | Key Theme |
|----------|-------|-----------|
| Access Control & Authorization | 2 | Role-based visibility, entity isolation |
| Request Lifecycle & State | 3 | Immutable pending status, audit trail, instant visibility |
| Data Integrity & Display | 3 | Conditional field visibility, immutable dates, optional remarks |
| Display & Sorting | 2 | Fixed sort order, accurate counts |
| **Total** | **10** | **Security, auditability, data integrity** |

---

## Dependencies & Notes

- **Cross-referencing:** These rules apply to both submission (FRS-01) and viewing (FRS-02) workflows.
- **Database constraints:** Rules BR-R-01, BR-R-02, BR-D-02 should be enforced at the database schema level (NOT NULL constraints, immutable timestamps).
- **Server-side enforcement:** Rules BR-A-01, BR-A-02, BR-S-01 must be enforced server-side; client-side UI is only for UX, not security.
- **Future interactions:** These rules set the foundation for FU-03 (Bank Admin Review & Approval), which will add additional rules around approval workflows and status transitions.

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-04-10 | Consolidated from FRS-01 and FRS-02 |