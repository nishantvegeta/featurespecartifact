---
FRS-ID: FRS-URM-01
Title: Submit New User Request for Approval
Module: User Request Management
Version: 1.0
Status: pending-approval
Created: 2026-04-15
---

## 1. Purpose

Enable a Company Super-Admin to request the creation of a new company user. The request is submitted for review and approval by the Bank Admin before the user account is provisioned.

---

## 2. Scope

This operation covers the submission workflow only — from form entry through confirmation and submission. Approval/rejection (reviewed by Bank Admin) is out of scope. User provisioning (account creation in backend systems) is out of scope.

---

## 3. Actors

- **Company Super-Admin** — submits the user request on behalf of the company

---

## 4. Preconditions

- Actor is authenticated and logged into the system
- Actor has Company Super-Admin role
- The company (entity) is active and in good standing
- At least one company exists in the system

---

## 5. Dependencies

**Inter-FRS Dependencies:**
- None — this is the initiating operation for the user request workflow

**System & Technical Dependencies:**
- Authentication & Authorization — system must verify the actor holds Company Super-Admin role
- Entity Context — the active company (entity) must be available in the session
- Notification System — system must be capable of notifying Bank Admin of new requests

---

## 6. Trigger

Actor clicks "New User Request" button in the User Request Management dashboard.

---

## 7. Main Flow

1. A modal form opens titled "Request New User"
2. Actor enters the following information:
   - **Full Name** (required) — the name of the new user
   - **Email Address** (required) — the email address for the new user
   - **Requested Role** (required) — the role to assign to the new user (currently: Company User)
   - **Remarks / Justification** (optional) — free-form context explaining the request (department, urgency, business justification)
3. Actor reviews the information in the form
4. Actor clicks "Submit Request" button
5. A confirmation dialog appears summarizing the request details and requesting final confirmation
6. Actor confirms the submission
7. The request is created with status "pending" and assigned a unique request ID
8. The request is linked to the requesting company (entity)
9. The requesting actor (Company Super-Admin) is recorded as the request creator
10. The form is cleared and closed
11. The new request appears immediately at the top of the User Requests table
12. A success message is displayed: "User request submitted for bank approval"

---

## 8. Alternative Flows

**A1 — Actor changes mind during form entry:**
- Actor clicks outside the modal or presses Escape key
- Form closes without saving any data
- No request is created

**A2 — Actor edits form after entering initial values:**
- Actor modifies any field (name, email, role, remarks)
- All changes are preserved in the form until submission or cancellation
- No auto-save or draft persistence

---

## 9. Exception Flows

**E1 — Required field is empty (name or email):**
- Submit button remains disabled (greyed out)
- Actor cannot proceed until both fields contain valid input
- No error message is displayed (UI prevents submission proactively)

**E2 — Email address format is invalid:**
- If validation is performed, the actor is notified of the invalid format
- Submit button remains disabled until corrected

**E3 — Actor does not hold Company Super-Admin role:**
- The "New User Request" button is not displayed
- The form modal is not accessible to the actor
- Only the User Requests table is visible (view-only mode)

**E4 — Company entity is suspended or inactive:**
- Submit fails silently or displays a system error
- Request is not created
- Actor is notified and directed to contact support

**E5 — Submission request fails (network, backend error):**
- An error notification is displayed
- The form remains open
- Actor may retry the submission

---

## 10. Postconditions

**On Success:**
- A new user request record exists in the system with status "pending"
- The request is associated with the requesting company (entity_id)
- The request is associated with the requesting actor (requested_by)
- The request creation timestamp is recorded (created_at)
- The request appears in the User Requests table sorted by creation date (newest first)
- The success toast is shown to the actor
- The actor is ready to view the new request in the table

**On Failure:**
- No user request is created
- The form remains open for retry
- An error message is displayed

---

## 11. Form Fields

| Field | Type | Required | Validation | Notes |
|---|---|---|---|---|
| Full Name | Text Input | Yes | Non-empty, max 255 chars | Placeholder: "John Doe" |
| Email Address | Email Input | Yes | Valid email format | Placeholder: "user@company.com" |
| Requested Role | Select Dropdown | Yes | Predefined options | Currently supports: Company User |
| Remarks / Justification | Text Area | No | Max 1000 chars (inferred) | Placeholder: "Provide context for this request..." |

---

## 12. Functional Requirements

1. **Form must appear in a modal dialog** with the title "Request New User"
2. **Submit button must be disabled** until both name and email are populated
3. **Form must include a confirmation dialog** before final submission
4. **Confirmation dialog must display the request summary** — name, email, role, company name
5. **Request must be assigned a unique ID** upon creation (format: req-{timestamp})
6. **Request status must default to "pending"**
7. **Request must inherit the actor's company (entity_id)** at submission time
8. **Request must be recorded with the actor's ID** (requested_by field)
9. **Request creation timestamp must be captured** (created_at field)
10. **Success notification must be displayed** immediately after submission

---

## 13. Non-Functional Requirements

- Form submission must complete within 2 seconds (or display a loading state)
- Form fields must be accessible via keyboard navigation
- Modal dialog must be closable via Escape key
- Success toast must remain visible for at least 3 seconds
- Form must support at least 1000 concurrent users per company

---

## 14. Business Rules

**BR-1:** Only Company Super-Admins may initiate user requests; non-admins cannot access the form.

**BR-2:** User requests must be submitted with both name and email; partial submissions are rejected.

**BR-3:** All user requests require Bank Admin review and approval before user provisioning; no auto-approval or direct provisioning occurs.

**BR-4:** Requests are company-scoped; a Company Super-Admin cannot request users on behalf of other companies.

**BR-5:** Role assignments at request time are limited to "Company User"; Super-Admin roles are not available via this workflow and must be granted separately.

---

## 15. Edge Cases

**EC-1 — Multiple requests for the same email:**
The system permits multiple pending requests for the same email address. Bank Admin must resolve duplicates during review. No uniqueness constraint is enforced at submission.

**EC-2 — Actor submits request immediately after company deactivation:**
If the company is deactivated during the form entry, the submission may fail. The system must handle this gracefully and inform the actor.

**EC-3 — Remarks field left empty:**
If the actor does not provide remarks, the request is still created successfully. The remarks field displays a placeholder "—" in the table.

**EC-4 — Actor navigates away after confirmation but before form closes:**
The modal may close before the success toast is displayed. The request is still created (idempotency must be ensured by the backend).

**EC-5 — Form re-opened immediately after submission:**
The form should be cleared of previous values. A new submission should create a distinct request record.

---

## 16. Open Questions

1. What is the maximum length of the Remarks field? (Currently inferred as 1000 chars)
2. Should the system prevent duplicate email requests within a time window (e.g., within 24 hours)?
3. What happens if a Bank Admin rejects a request? Is the requestor notified?
4. Can a Company Super-Admin withdraw or edit a request before Bank Admin approval?
5. Is there a request quota per company (max N pending requests)?
6. What is the expected turnaround time for Bank Admin approval?

---

## 17. Revision History

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-04-15 | FRS Generator | Initial specification from UI prototype |
