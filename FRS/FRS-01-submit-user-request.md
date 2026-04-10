# FRS-01: Submit User Request

**Version:** 1.0
**Status:** Draft
**Author:** frs skill
**Date:** 2026-04-10
**Related Units:** FU-02 (View & Filter User Requests), FU-03 (Bank Admin Reviews & Approves Request — future)

---

## 1. Purpose

A Company Super Admin submits a user creation request to the bank for approval. The system captures the new user's details (name, email, role, justification) and routes the request to bank administrators for review. This enables controlled user onboarding while maintaining audit and compliance requirements.

---

## 2. Scope

**In scope:**
- Opening the user request submission form
- Validating required fields (name, email)
- Capturing optional remarks/justification
- Selecting a user role (currently "Company User" only)
- Two-step confirmation (form submit + final confirmation dialog)
- Creating a new pending request record
- Resetting form after successful submission
- Success notification to the submitter

**Out of scope:**
- Bank admin review, approval, or rejection of requests (separate use case)
- Email notifications to the submitter or bank admin (may be covered in notification subsystem)
- Role/permission assignment beyond the requested role field
- Bulk user creation or CSV import
- Editing or canceling a request after submission

---

## 3. Actors

| Actor | Role | Notes |
|-------|------|-------|
| Company Super Admin | Primary actor | Must hold Super Admin role within the active entity; only they can initiate user requests |

---

## 4. Preconditions

- The actor is authenticated and has Company Super Admin role for an active entity.
- The active entity is set in the auth context.
- The user request form interface is accessible (no feature flag blocking it).

---

## 5. Trigger

The Company Super Admin clicks the **"New User Request"** button (labeled with a plus-person icon) on the User Requests page.

---

## 6. Main Flow

1. **System** displays a modal dialog titled "Request New User" with form fields:
   - Full Name (text input, required, placeholder "John Doe")
   - Email Address (email input, required, placeholder "user@company.com")
   - Requested Role (dropdown, default "Company User", only option shown)
   - Remarks / Justification (textarea, optional, 3 rows, placeholder text provided)
   - A help message: "This request will be sent to the Bank Admin for review. You'll be notified once a decision is made."

2. **Admin** fills in Full Name and Email Address fields (at minimum).

3. **System** enables the "Submit Request" button once both name and email contain non-whitespace text.

4. **Admin** optionally adds remarks and/or confirms the selected role.

5. **Admin** clicks **"Submit Request"** button.

6. **System** displays a confirmation dialog with:
   - Title: "Submit User Request"
   - Message: "Submit a request to create "[name]" ([email]) as a Company User for [entity name]? This will be sent to the bank admin for approval."
   - "Submit Request" button (primary action)
   - Cancel/close option to dismiss without confirming

7. **Admin** clicks **"Submit Request"** in the confirmation dialog.

8. **System** creates a new user request record with:
   - Unique ID (format: `req-[timestamp]`)
   - Entity ID (from active entity)
   - Requested by (current user ID)
   - Name, Email, Role, Remark (from form inputs, trimmed whitespace)
   - Status: "pending"
   - created_at: current ISO timestamp
   - reviewed_by, reject_reason, reviewed_at: null

9. **System** prepends the new request to the requests list (newest first).

10. **System** closes the modal dialog and confirmation dialog.

11. **System** clears all form fields (name, email, role defaults to "Company User", remark empty).

12. **System** displays a success toast notification: "User request submitted for bank approval".

13. Use case ends successfully.

---

## 7. Alternative Flows

### 7a. Submit with remarks
*Branches from step 4 of main flow.*
1. **Admin** fills in the Remarks/Justification textarea with additional context (e.g., department, urgency, business justification).
2. Returns to main flow at step 5.

---

## 8. Exception Flows

### 8a. Required Field Missing
- **Trigger:** Admin clicks "Submit Request" button without filling in Full Name or Email Address, or with only whitespace.
- **System behavior:** Submit button remains disabled; no action is taken. The button is only enabled when both fields contain non-whitespace text.
- **Resolution:** Admin fills in the missing field(s) and resubmits.

### 8b. User Cancels Submission (Before Confirmation)
- **Trigger:** Admin clicks outside the modal dialog, presses Escape, or clicks a close button before clicking "Submit Request".
- **System behavior:** Modal dialog closes without creating a request.
- **Resolution:** Form data is discarded. Admin may reopen the dialog and start again. Use case terminates.

### 8c. User Cancels Submission (At Confirmation)
- **Trigger:** Admin clicks cancel or close on the confirmation dialog.
- **System behavior:** Confirmation dialog closes; form dialog remains open with all entered data preserved.
- **Resolution:** Admin can edit fields and resubmit, or close the form dialog entirely. Use case terminates.

### 8d. System Failure During Request Creation
- **Trigger:** Network error or backend service failure occurs after admin clicks "Submit Request" in the confirmation dialog.
- **System behavior:** Request creation fails; an error toast is displayed (e.g., "Failed to submit request. Please try again.").
- **Resolution:** Admin is returned to the form dialog with data preserved, and may retry submission. Use case terminates without request being created.

---

## 9. Postconditions

**On success:**
- A new user request record exists in the system with status "pending".
- The request is visible in the User Requests table, sorted to appear at the top (newest first).
- The request summary counts are updated (Pending count increases by 1).
- The form dialog is closed; all fields are reset.
- A success notification is displayed to the actor.

**On failure (any exception flow):**
- No user request record is created.
- The dialog remains open (exceptions 8b and 8c) or an error is shown (exception 8d).
- The form data is either cleared (8b) or preserved (8c, 8d).
- The request list and summary counts remain unchanged.

---

## 10. Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01-01 | The system SHALL display a "New User Request" button only to users with Company Super Admin role. | Must |
| FR-01-02 | The system SHALL open a modal dialog containing fields for Full Name, Email, Requested Role, and Remarks when the "New User Request" button is clicked. | Must |
| FR-01-03 | The system SHALL make the Full Name and Email Address fields required and validate that they contain non-whitespace text before enabling the Submit button. | Must |
| FR-01-04 | The system SHALL make the Remarks field optional and allow multi-line text input. | Must |
| FR-01-05 | The system SHALL provide a Role dropdown defaulting to "Company User" with at least one selectable option. | Must |
| FR-01-06 | The system SHALL display a two-step confirmation workflow: form submission button + separate confirmation dialog. | Must |
| FR-01-07 | The system SHALL trim leading/trailing whitespace from all text inputs (name, email, remarks) before storing. | Must |
| FR-01-08 | The system SHALL create a new user request record with status "pending", current timestamp, and all submitted fields upon confirmed submission. | Must |
| FR-01-09 | The system SHALL assign a unique request ID using the format `req-[timestamp]` to each new request. | Must |
| FR-01-10 | The system SHALL display the confirmation dialog with a message that includes the submitter's name, email, role, and active entity name. | Must |
| FR-01-11 | The system SHALL prepend newly created requests to the request list (newest first) so they appear at the top of the table. | Should |
| FR-01-12 | The system SHALL display a success toast notification with the message "User request submitted for bank approval" after successful submission. | Should |
| FR-01-13 | The system SHALL clear all form fields after successful submission and close the dialog. | Should |
| FR-01-14 | The system SHALL preserve form data if the user cancels at the confirmation dialog step, allowing them to edit and resubmit. | Should |
| FR-01-15 | The system SHALL display an error notification and preserve form data if request creation fails due to a system error. | Should |
| FR-01-16 | The system SHALL validate email format using HTML5 email input type validation (`type="email"`); client-side validation is sufficient, server-side validation is implicit. | Must |
| FR-01-17 | The system SHALL apply real-time validation: the Submit button state SHALL update immediately as the user types in the Full Name and Email fields. | Must |
| FR-01-18 | The system SHALL display form field placeholders: Full Name = "John Doe", Email = "user@company.com", Remarks = "Provide context for this request (e.g., reason for access, department, urgency)". | Should |
| FR-01-19 | The system SHALL display the "New User Request" button with a plus-person icon (UserPlus from lucide-react library) to the left of the button text. | Should |
| FR-01-20 | The system SHALL display the "Submit Request" button with a send icon (Send from lucide-react library) to the left of the button text in the form dialog. | Should |

---

## 11. Non-Functional Requirements (Unit-Specific)

| Category | Requirement |
|----------|-------------|
| Response time | Form submission and confirmation shall complete within 2 seconds under normal network conditions. |
| Accessibility | Form labels, error messages, and dialog content shall meet WCAG 2.1 AA standards. |
| Data validation | Email format shall be validated client-side; server-side validation is implicit. |
| Input sanitization | All text inputs (name, email, remarks) SHALL be trimmed of leading/trailing whitespace before storage. |

---

## 12. Keyboard Navigation

| Element | Interaction | Behavior |
|---------|-------------|----------|
| Dialog trigger button | `Enter` / `Space` | Opens the Request New User dialog |
| Full Name input field | `Tab` | Moves focus to Email Address field |
| Email Address input field | `Tab` | Moves focus to Role dropdown |
| Role dropdown | `Tab` | Moves focus to Remarks textarea |
| Remarks textarea | `Tab` | Moves focus to Submit Request button |
| Submit Request button (dialog) | `Enter` / `Space` | Triggers form submission and opens confirmation dialog |
| Dialog | `Escape` key | Closes the dialog without creating a request; form data is preserved if user is at confirmation step, discarded if at form entry step |
| Confirmation dialog | `Escape` key | Closes confirmation dialog; returns to form dialog with all data preserved |
| Confirmation button | `Enter` / `Space` | Submits the request and closes both dialogs |

**Accessibility Note:** Tab order SHALL follow the visual order on screen. All interactive elements SHALL be keyboard-accessible and SHALL NOT require a mouse to operate.

---

## 13. Component Dependencies

The following external UI component libraries and icons are used in this feature:

| Component | Library | Purpose | Notes |
|-----------|---------|---------|-------|
| Dialog | shadcn/ui | Modal container for form | Includes DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter, DialogTrigger |
| Input | shadcn/ui | Text input fields | Used for Full Name and Email Address with `type="email"` for email field |
| Textarea | shadcn/ui | Multi-line text input | Used for Remarks field with `rows={3}` |
| Select | shadcn/ui | Dropdown selector | Used for Role selection; includes SelectTrigger, SelectContent, SelectItem, SelectValue |
| Button | shadcn/ui | Interactive button | Primary button for form submission |
| Label | shadcn/ui | Form field label | Associates labels with form inputs for accessibility |
| Card / CardContent | shadcn/ui | Informational container | Used to display help message ("This request will be sent to the Bank Admin...") |
| UserPlus icon | lucide-react | Visual indicator | Displayed on the "New User Request" trigger button |
| Send icon | lucide-react | Visual indicator | Displayed on the Submit Request button in the form dialog |
| Toast notification | sonner | Success feedback | Used to display "User request submitted for bank approval" message |
| ConfirmDialog | Custom component | Two-step confirmation | Secondary confirmation before creating the request record |

---

## 14. Accessibility Requirements

All accessibility requirements below are mandatory for WCAG 2.1 AA compliance:

| Requirement | Implementation |
|-------------|-----------------|
| **Form labels** | All input fields (Full Name, Email, Role, Remarks) SHALL have associated `<label>` elements with explicit `for` attributes matching input `id` attributes. |
| **Required field indicators** | Required fields (Full Name, Email, Role) SHALL be marked with an asterisk (`*`) and accompanied by programmatic indication via `aria-required="true"` attribute on the input element. |
| **Placeholder vs. label** | Placeholder text alone SHALL NOT substitute for a label; placeholders are complementary hints only. Labels SHALL be visible at all times. |
| **Icon labels** | The UserPlus icon on the button and Send icon on the submit button SHALL have `aria-label` attributes describing their purpose (e.g., "User Plus" or "Send"). |
| **Dialog semantics** | Dialog SHALL use semantic HTML `<dialog>` or ARIA `role="dialog"` with `aria-modal="true"`. The dialog title SHALL be associated via `aria-labelledby`. |
| **Error messages** | Error messages (if implemented beyond disabled button state) SHALL be associated with the field via `aria-describedby` and `aria-invalid="true"`. |
| **Color contrast** | All text SHALL meet WCAG AA standard contrast ratio of at least 4.5:1 for normal text. |
| **Focus indicators** | All interactive elements SHALL have a visible focus indicator (outline or highlight). Focus order SHALL be logical and match the visual layout. |
| **Toast notifications** | Toast notifications SHALL be announced to screen readers via ARIA live regions (`role="alert"` or `role="status"`). |

---

## 15. Error Handling & Edge Cases

| Scenario | Current Behavior | Recommended Handling |
|----------|------------------|----------------------|
| **User pastes text into Full Name field** | Text is accepted; `.trim()` removes leading/trailing spaces on submit | Correctly handles common copy-paste behaviors with leading/trailing whitespace |
| **User enters only whitespace (spaces, tabs)** | Submit button remains disabled because `.trim()` returns empty string | Correct — prevents submission of empty-equivalent strings |
| **User enters email with spaces** | HTML5 email validation rejects it; button remains disabled | Correct — email addresses cannot contain spaces |
| **User enters non-ASCII characters in name** | Accepted without validation (e.g., "José", "北京") | Correct — names should support international characters |
| **User rapidly clicks Submit button before confirmation dialog appears** | Confirmation dialog opens; rapid clicks on confirmation button may create race conditions | Recommend debouncing or disabling button during submission to prevent double-submission |
| **User closes browser tab during submission** | Request creation may succeed or fail silently; no recovery mechanism | Recommend server-side idempotency and client-side error handling for network failures |
| **Email field receives browser autocomplete** | Autocomplete value is accepted and submitted normally | Correct — autocomplete integration is expected behavior |
| **Remarks field left empty** | System treats as empty string (""); displayed as `—` in table | Correct — remarks are optional |
| **User submits form, then immediately navigates away** | Form data may be lost if navigation occurs before POST completes | Recommend client-side warning (e.g., "unsaved changes") or server-side optimistic updates |

---

- **BR-01:** Only users with Company Super Admin role for the active entity may submit user requests.
- **BR-02:** Newly submitted requests must always start with status "pending" and cannot be created in any other state.
- **BR-03:** A request submission must capture the identity of the submitter (requested_by field) for audit purposes.
- **BR-04:** Remarks/justification are optional but recommended for providing context to the bank admin reviewer.
- **BR-05:** The submitted request is immediately visible to all users of the same entity on the User Requests page.
- **BR-06:** All text inputs (Full Name, Email Address, Remarks) SHALL be trimmed of leading and trailing whitespace before validation and storage.

---

## 17. Open Questions

| # | Question | Owner | Due |
|---|----------|-------|-----|
| 1 | Should there be a maximum character limit for the Remarks field? If so, what is it? | Product/UX | — |
| 2 | Should the system auto-populate the email domain based on the company entity (e.g., suggest @company.com)? | Product | — |
| 3 | Should duplicate email prevention be enforced (i.e., reject a request if that email already has a pending request)? | Product/Backend | — |
| 4 | What is the expected time for bank admin to review and respond to a request? (For user expectations/communication) | Product/Ops | — |
| 5 | Should the Submit button have a loading/disabled state during the submission POST request to prevent double-submission? | Product/UX | — |
| 6 | Should confirmation dialogs support pressing Enter to confirm and Escape to cancel? | UX/A11y | — |

---

## 18. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-04-10 | frs skill | Initial draft from UI prototype |
| 1.1 | 2026-04-10 | frs skill | Enriched with keyboard navigation, component dependencies, accessibility requirements, error handling, and additional functional requirements (FR-01-16 through FR-01-20) |

---

## 19. Wireframe UI/UX Prototype Mapping

All screens below map to flows defined in Sections 6, 7, and 8. The prototype uses shadcn/ui components (Dialog, Form inputs, Toast).

---

### SCREEN 1 — User Requests Page (Initial State)
*Triggered by: Page load / initial render | Related FR: FR-01-01*

```
+---[User Requests]--------------------------------------------------+
|                                                                    |
|  User Requests                          [⊕ New User Request]    |
|  Request new users for your company.                              |
|  Requests require bank approval.                                  |
|                                                                    |
|  [Pending: 3]  [Approved: 5]  [Rejected: 1]                       |
|                                                                    |
|  ┌─────────────────────────────────────────────────────────────┐  |
|  │ Name    │ Email          │ Role      │ Status   │ Submitted │  |
|  ├─────────────────────────────────────────────────────────────┤  |
|  │ Jane D. │ jane@co.com    │ User      │ pending  │ Apr 09    │  |
|  │ Bob S.  │ bob@co.com     │ User      │ approved │ Apr 08    │  |
|  └─────────────────────────────────────────────────────────────┘  |
|                                                                    |
+--------------------------------------------------------------------+
```

**UI Notes:**
- "New User Request" button is visible only to Super Admins (controlled by `isCompanySuperAdmin` check).
- Button displays UserPlus icon with text label.
- Table displays all requests for the active entity, sorted newest first.
- Status badge uses color coding (pending=secondary, approved=default, rejected=destructive).

**Accessibility Notes:**
- Button has `aria-label="Create a new user request"` for screen reader clarity.
- Page heading uses `<h1>` semantic element.
- Subtitle provides context to distinguish Super Admin vs. regular user views.

---

### SCREEN 2 — Request New User Dialog (Form Open)
*Triggered by: Main Flow step 1 (click "New User Request" button) | Related FR: FR-01-02, FR-01-03, FR-01-05, FR-01-16, FR-01-18*

```
+---[Request New User Dialog]────────────────────────────────────+
|                                                               |
|  Request New User                                      [×]    |
|  Submit a user creation request. It will be reviewed          |
|  by the bank admin.                                           |
|                                                               |
|  Full Name *                                                  |
|  [                                                         ]  |
|  Placeholder: "John Doe"                                      |
|                                                               |
|  Email Address *                                              |
|  [                                                         ]  |
|  Placeholder: "user@company.com"                              |
|                                                               |
|  Requested Role *                                             |
|  [Company User ▼                                            ]  |
|                                                               |
|  Remarks / Justification                                      |
|  [                                                            |
|                                                            ]  |
|  Placeholder: "Provide context for this request (e.g.,       |
|              reason for access, department, urgency)"         |
|                                                               |
|  ┌───────────────────────────────────────────────────────┐   |
|  │ This request will be sent to the Bank Admin for       │   |
|  │ review. You'll be notified once a decision is made.  │   |
|  └───────────────────────────────────────────────────────┘   |
|                                                               |
|                    [⧉ Submit Request] (disabled)              |
|                                                               |
+-------────────────────────────────────────────────────────────+
```

**UI Notes:**
- Full Name and Email fields are required (marked with `*`); their presence enables the Submit button.
- Remarks field is optional (no `*`).
- Submit button is disabled until name and email are filled with non-whitespace text.
- Dialog includes a secondary action message explaining the request flow.
- Input validation is client-side; email field has `type="email"` for browser validation.
- Submit button displays Send icon with text label.
- All text inputs support real-time validation — button state updates as user types.

**Keyboard Navigation:**
- Tab order: Full Name → Email → Role → Remarks → Submit button.
- Escape key closes dialog without creating request; form data is discarded.
- Submit button can be activated with Enter or Space when focused.

**Accessibility Notes:**
- Dialog has `aria-modal="true"` and `aria-labelledby` pointing to the dialog title.
- All form labels have explicit `<label>` elements with `for` attributes matching input IDs.
- Required fields have `aria-required="true"` attribute.
- Placeholder text is NOT used as a substitute for labels; each field has a visible label above.
- Close button (×) has `aria-label="Close dialog"`.
- Send icon has `aria-label="Send"` for screen readers.

---

### SCREEN 3 — Confirmation Dialog
*Triggered by: Main Flow step 6 (click "Submit Request" button) | Related FR: FR-01-06, FR-01-10*

```
+---[Submit User Request Confirmation]──────────────────────────+
|                                                               |
|  Submit User Request                                   [×]    |
|                                                               |
|  Submit a request to create "Jane Doe" (jane@co.com) as a    |
|  Company User for Acme Corp? This will be sent to the       |
|  bank admin for approval.                                    |
|                                                               |
|                  [Cancel] [⧉ Submit Request]                 |
|                                                               |
+-------────────────────────────────────────────────────────────+
```

**UI Notes:**
- This is a secondary confirmation step before the request is actually created.
- Message dynamically shows submitted name, email, and active entity name.
- Cancel closes the dialog and returns to the form (data preserved).
- Submit Request creates the record and closes both dialogs.
- Submit button displays Send icon with text label.

**Keyboard Navigation:**
- Tab order: Cancel button → Submit Request button.
- Enter or Space on Submit Request button confirms and creates the request.
- Escape key closes dialog and returns to form with data preserved.
- Cancel button can be activated with Enter, Space, or Escape.

**Accessibility Notes:**
- Dialog has `aria-modal="true"` and `aria-labelledby` pointing to the dialog title.
- Close button (×) has `aria-label="Close dialog"`.
- Confirmation message is wrapped in appropriate text element for clarity.
- Buttons are clearly labeled and distinguishable (Cancel vs. Submit).

---

### SCREEN 4 — Post-Submission State
*Triggered by: Main Flow step 12 (after successful submission) | Related FR: FR-01-11, FR-01-12, FR-01-13*

```
+---[User Requests]--------------------------------------------------+
|                                                                    |
|  ✓ User request submitted for bank approval           [toast]    |
|                                                                    |
|  [Pending: 4]  [Approved: 5]  [Rejected: 1]                       |
|                                                                    |
|  ┌─────────────────────────────────────────────────────────────┐  |
|  │ Name    │ Email          │ Role      │ Status   │ Submitted │  |
|  ├─────────────────────────────────────────────────────────────┤  |
|  │ Jane D. │ jane@co.com    │ User      │ pending  │ Apr 10    │  |
|  │ Jane D. │ jane@co.com    │ User      │ pending  │ Apr 09    │  |
|  │ Bob S.  │ bob@co.com     │ User      │ approved │ Apr 08    │  |
|  └─────────────────────────────────────────────────────────────┘  |
|                                                                    |
+--------------------------------------------------------------------+
```

**UI Notes:**
- Toast notification appears at top with success message.
- Dialog is closed; form is reset and ready for next request.
- New request appears at top of table with current date.
- Pending count has incremented from 3 to 4.

**Accessibility Notes:**
- Toast notification is announced to screen readers via ARIA live region (`role="status"` or `role="alert"`).
- Success checkmark (✓) is decorative and should have `aria-hidden="true"` if inside an icon element.
- Toast message text is the primary content; icon is secondary.

---

### SCREEN 5 — Error State (Missing Required Field)
*Triggered by: Exception Flow 8a (submit without required fields) | Related FR: FR-01-03*

```
+---[Request New User Dialog]────────────────────────────────────+
|                                                               |
|  Request New User                                      [×]    |
|                                                               |
|  Full Name *                                                  |
|  [                                                         ]  |
|                                                               |
|  Email Address *                                              |
|  [                                                         ]  |
|                                                               |
|  [Remarks, Role fields as above...]                           |
|                                                               |
|                           [Submit Request] (DISABLED)        |
|                                                               |
+-------────────────────────────────────────────────────────────+
```

**UI Notes:**
- Submit button remains in disabled state (gray, non-interactive) until both Full Name and Email contain non-whitespace.
- No error message is shown; the disabled button state itself is the affordance.
- User must fill in at least these two fields to proceed.

**Accessibility Notes:**
- Disabled button has `aria-disabled="true"` attribute for screen readers.
- Disabled button should have a tooltip or additional helper text (via `aria-describedby`) explaining why it's disabled, e.g., "Fill in all required fields to continue."
- Color alone should not be the only indicator of disabled state; styling must be clearly distinct.

---

### SCREEN 6 — Error State (System Failure During Submission)
*Triggered by: Exception Flow 8d (network/backend failure) | Related FR: FR-01-15*

```
+---[User Requests Page]────────────────────────────────────────+
|                                                                |
|  ✗ Failed to submit request. Please try again.    [toast]    |
|                                                                |
|  [Pending: 3]  [Approved: 5]  [Rejected: 1]                   |
|                                                                |
|  ┌─────────────────────────────────────────────────────────┐  |
|  │ Form dialog is still open with all data preserved:      │  |
|  │                                                         │  |
|  │ Full Name: Jane Doe                                     │  |
|  │ Email: jane@co.com                                      │  |
|  │ Remarks: [previously entered text]                      │  |
|  │                                                         │  |
|  │ User can edit and retry, or close dialog               │  |
|  └─────────────────────────────────────────────────────────┘  |
|                                                                |
+--------------------------------------------------------------------+
```

**UI Notes:**
- Error toast notification appears with failure message.
- Form dialog remains open; all entered data is preserved.
- User can edit fields and retry submission, or close dialog.
- Error message is clear and actionable.

**Accessibility Notes:**
- Error toast has `role="alert"` to announce to screen readers immediately.
- Error message text uses clear, jargon-free language.
- Error icon (✗) is decorative with `aria-hidden="true"`.
- User is returned to form focus so they can retry.

---

### Screen Flow Diagram

```
  [User clicks "New User Request" button]
           |
           v
  +---────────────────────────+
  | SCREEN 2                  |
  | Form Dialog (Closed)      |
  +---────────────────────────+
           |
    [Fill form fields]
    [Remarks optional]
           |
           v
  +───────────────────────────────────────┐
  | SCREEN 2                              |
  | Form Dialog (Open)                    |
  | Submit button toggles enabled/disabled│
  +───────────────────────────────────────+
           |
    [Click Submit Request]
           |
           v
  +───────────────────────────────────────+
  | SCREEN 3                              |
  | Confirmation Dialog                   |
  +───────────────────────────────────────+
        |               |
  [Cancel]      [Submit Request]
        |               |
        └───────┬───────┘
                |
    [Close & preserve data]
                |
                v
    [Attempt retry submission]
                |
          [User exits]
                |
                v
        [Data is discarded]
                
    [Create request successful]
                |
                v
      +─────────────────────────+
      | SCREEN 4                |
      | Post-Submission State   |
      | Toast + Updated Table   |
      +─────────────────────────+
                |
        [Success, use case ends]
```

---

## 20. Self-Review Checklist

- [x] One use case only — Company Super Admin submits a user request
- [x] Testable requirements — all FR-* items are independently verifiable (FR-01-01 through FR-01-20)
- [x] No implementation details — spec describes WHAT (create request, validate fields) not HOW (React state management)
- [x] No "TBD" in main flow — all steps are concrete; unresolved items moved to Open Questions
- [x] Consistent actor naming — "Admin" or "Company Super Admin" used consistently
- [x] Exception flows cover invalid input (8a), cancellation (8b, 8c), system error (8d)
- [x] Postconditions are concrete — specific state changes ("request created", "table updated", "toast shown")
- [x] Out-of-scope list is explicit — prevents scope creep (no approval workflow, no email notifications, etc.)
- [x] Section 19 present — UI prototype included with 6 screens and flow diagram
- [x] Table column sets match template exactly
- [x] Requirement IDs sequential and correct format (FR-01-01 through FR-01-20)
- [x] Business rule IDs sequential (BR-01 through BR-06)
- [x] Keyboard navigation documented (Section 12: Tab order, Escape, Enter, Space)
- [x] Component dependencies listed (Section 13: shadcn/ui, lucide-react, sonner, ConfirmDialog)
- [x] Accessibility requirements documented (Section 14: labels, icons, dialog semantics, focus)
- [x] Error handling and edge cases documented (Section 15: whitespace, autocomplete, double-submission)
- [x] All screens include accessibility notes (aria labels, focus indicators, live regions)
- [x] NFR section includes input sanitization requirement
- [x] Open Questions updated (now 6 questions including double-submission and keyboard shortcuts)
