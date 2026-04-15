---
FRS-ID: FRS-URM-02
Title: View and Filter User Requests by Status
Module: User Request Management
Version: 1.0
Status: pending-approval
Created: 2026-04-15
---

## 1. Purpose

Enable users (both Company Super-Admins and other company members) to view all user requests submitted within their company and filter them by request status (pending, approved, rejected).

---

## 2. Scope

This operation covers the display and filtering of user requests. It includes viewing request details (name, email, role, remarks, status, submission date, rejection reason). Editing, withdrawing, or approving requests is out of scope. Request analytics or reporting is out of scope.

---

## 3. Actors

- **Company Super-Admin** — submits requests and views all company requests
- **Company User** (non-admin) — views requests in read-only mode (permissions TBD)

---

## 4. Preconditions

- Actor is authenticated and logged into the system
- Actor belongs to an active company (entity)
- At least one user request exists for the company, or the company has zero requests
- Actor has permission to view requests (role-based, typically all company members)

---

## 5. Dependencies

**Inter-FRS Dependencies:**
- **FRS-URM-01: Submit New User Request for Approval** — must complete before requests can be viewed (requests must exist to be displayed)

**System & Technical Dependencies:**
- Authentication & Authorization — system must verify actor's company affiliation
- Entity Context — the active company (entity) must be available in the session
- Request Storage — system must have persisted submitted user requests

---

## 6. Trigger

1. Actor navigates to the User Request Management dashboard or page
2. Page loads and displays the requests table automatically

---

## 7. Main Flow

1. The User Request Management page loads
2. A table is displayed showing all user requests for the actor's company
3. The table displays the following columns:
   - **Name** — full name of the requested user
   - **Email** — email address of the requested user
   - **Role** — the role requested (e.g., Company User)
   - **Remarks** — justification or context provided at request submission (truncated with tooltip on hover)
   - **Status** — current status with icon (Pending, Approved, Rejected) and badge color
   - **Submitted** — submission date (formatted as MM/DD/YYYY)
   - **Details** — rejection reason (if applicable) or empty
4. Requests are sorted by submission date in descending order (newest first)
5. Each row is associated with a unique request ID (visible in data, not necessarily on screen)

---

## 8. Alternative Flows

**A1 — Actor scrolls through a large request list:**
- The table supports pagination or infinite scroll (mechanism TBD)
- Requests remain sorted by creation date descending

**A2 — Actor searches for a specific request:**
- Search/filter functionality may be present (not explicitly shown in prototype, left for Phase 2 clarification)

---

## 9. Exception Flows

**E1 — No requests exist for the company:**
- The table displays an empty state with message: "No user requests yet"
- No columns or headers are visible; only the empty state message appears

**E2 — Actor does not hold permission to view requests:**
- The page or table is not displayed
- Actor is redirected or presented with an access denied message
- Only authenticated actors with company affiliation can see this page

**E3 — Request data fails to load (backend error):**
- An error notification is displayed
- The table remains empty or partially loaded
- Actor is prompted to retry or contact support

**E4 — A request status changes while actor is viewing:**
- The page does not auto-refresh; actor must manually reload to see the updated status
- (Real-time updates are out of scope for this operation)

---

## 10. Postconditions

**On Success:**
- A table of all company user requests is displayed
- Request data is accurate and current (as of page load)
- Actor can read and review all request details
- Actor can see which requests are pending, approved, or rejected
- Actor can identify rejection reasons for rejected requests

**On Failure:**
- The table is not displayed or remains empty
- An error message is shown
- Actor cannot proceed to review requests

---

## 11. Form Fields

N/A — this operation displays data, not a form. Filter/search controls may exist:

| Control | Type | Optional | Notes |
|---|---|---|---|
| Status Filter (future) | Multi-select Checkbox | Yes | Filter by Pending / Approved / Rejected |
| Search (future) | Text Input | Yes | Search by name or email |

---

## 12. Functional Requirements

1. **Table must display all requests for the actor's company**
2. **Table columns must include:** Name, Email, Role, Remarks, Status, Submitted, Details
3. **Status column must display a badge with:**
   - An icon (Clock for pending, CheckCircle for approved, XCircle for rejected)
   - Status text (lowercase: "pending", "approved", "rejected")
   - Color-coded badge: secondary for pending, default for approved, destructive for rejected
4. **Remarks column must truncate long text** with a tooltip on hover showing full text
5. **Rejection reason must appear in Details column** only for rejected requests
6. **Submitted column must display date in MM/DD/YYYY format**
7. **Requests must be sorted by creation date in descending order** (newest first, by default)
8. **Empty state must display** when no requests exist for the company
9. **Each row must reference its unique request ID** (req-{timestamp})
10. **Table must be responsive** and readable on standard desktop and tablet widths

---

## 13. Non-Functional Requirements

- Table must load and display within 2 seconds for up to 1000 requests per company
- Table must support smooth scrolling for large datasets
- Page must be accessible via keyboard navigation (arrow keys, tab navigation)
- Status badges must be distinguishable by color-blind users (icons + text, not color alone)
- Remarks truncation must not cut off mid-word

---

## 14. Business Rules

**BR-1:** Only authenticated company members may view user requests for their company.

**BR-2:** Company members can only view requests for their own company; cross-company request visibility is prohibited.

**BR-3:** Request status is immutable from the requester's perspective; status changes are driven by Bank Admin approval only.

**BR-4:** Rejection reasons are visible only to the requesting company and are not shared externally.

**BR-5:** The table displays all requests regardless of age; no archival or purging of old requests is performed.

---

## 15. Edge Cases

**EC-1 — Request list contains many pending requests (100+):**
The table must remain performant. Pagination or virtual scrolling may be required. Sorting by creation date must remain accurate.

**EC-2 — Remarks field contains very long text (500+ characters):**
Text must be truncated in the table and revealed via tooltip without distorting the table layout.

**EC-3 — Email address is very long (e.g., firstname.lastname+tag@subdomain.company.co.uk):**
The Email column must accommodate long addresses without wrapping or being cut off (or must wrap gracefully).

**EC-4 — Rejection reason is very long (e.g., multi-line compliance note):**
The Details column must display the reason without distorting layout; truncation or a modal may be used.

**EC-5 — Request was submitted months ago:**
The date must still display correctly. No aging-based filtering or archival occurs.

**EC-6 — Two requests have the same submission timestamp:**
Both must be displayed; sort order stability is ensured by backend (secondary sort by request ID).

**EC-7 — Actor's company is deactivated while viewing:**
The page may show stale data. On next page reload, access is denied and actor is redirected.

---

## 16. Open Questions

1. Is pagination or infinite scroll preferred for large request lists?
2. Should the Status filter (pending/approved/rejected) be visible and functional, or is it planned for a future phase?
3. Should the table support column sorting (by Name, Email, Submitted date)?
4. Are real-time updates (WebSocket or polling) expected, or is manual reload sufficient?
5. What is the character limit for the rejection reason field?
6. Should non-admin company members have the same visibility as admins, or is there a restricted view?
7. Should the table support bulk actions (export, print)?

---

## 17. Revision History

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-04-15 | FRS Generator | Initial specification from UI prototype |
