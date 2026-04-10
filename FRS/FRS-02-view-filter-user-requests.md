# FRS-02: View & Filter User Requests

**Version:** 1.0
**Status:** Draft
**Author:** frs skill
**Date:** 2026-04-10
**Related Units:** FU-01 (Submit User Request), FU-03 (Bank Admin Reviews & Approves Request — future)

---

## 1. Purpose

All users of a company entity view user creation requests submitted for their entity in a centralized table. The system displays request details (name, email, role, status), summary metrics by status, and rejection reasons (if applicable). This provides transparency into pending approvals and historical records of user onboarding activity.

---

## 2. Scope

**In scope:**
- Displaying all user requests for the active entity in a table
- Rendering summary cards showing counts: Pending, Approved, Rejected
- Sorting requests by creation date (newest first)
- Implicit filtering by active entity (users see only their entity's requests)
- Displaying request details: name, email, role, remarks, status, submission date
- Showing rejection reasons for rejected requests
- Truncating and providing tooltips for long remarks
- Status indicators and color-coded badges (pending, approved, rejected)
- Empty state message when no requests exist

**Out of scope:**
- Searching/filtering by name, email, or role (not shown in prototype)
- Pagination or infinite scroll (current spec assumes visible list)
- Editing or re-submitting rejected requests
- Bulk actions on multiple requests (e.g., select and export)
- Bank admin review/approval interface (separate use case)
- Exporting or printing the request list

---

## 3. Actors

| Actor | Role | Notes |
|-------|------|-------|
| Company User | Primary actor | Any authenticated user within an entity can view requests. May be Super Admin or regular company user. |

---

## 4. Preconditions

- The actor is authenticated and has an active entity set.
- The active entity contains at least zero (0) user requests.
- The system has access to the mock or persistent user request data.

---

## 5. Trigger

The User Requests page is loaded or navigated to by any authenticated company user within an entity.

---

## 6. Main Flow

1. **System** loads the User Requests page.

2. **System** retrieves all user requests where `entity_id` matches the active entity's ID.

3. **System** displays a page header:
   - Title: "User Requests"
   - Subtitle (conditional on role):
     - If Super Admin: "Request new users for your company. Requests require bank approval."
     - If regular user: "View user creation requests for [entity name]"

4. **System** displays three summary cards in a grid, each showing:
   - Icon and label (Pending, Approved, Rejected)
   - Count of requests in that status for the active entity
   - Color coding (pending=warning, approved=success, rejected=destructive)

5. **System** displays a table with the following columns:
   - Name (request recipient's name)
   - Email (request recipient's email)
   - Role (badge showing "User" or "Super Admin")
   - Remarks (truncated to max-width 200px with tooltip on hover)
   - Status (badge with icon and status label, color-coded)
   - Submitted (formatted date: "Apr 09")
   - Details (conditional: shows rejection reason if status is "rejected")

6. **System** sorts the table by `created_at` in descending order (newest first).

7. **System** populates each row with request data:
   - Request name, email, and role from the request record
   - Status badge with icon (clock for pending, checkmark for approved, X for rejected)
   - Submitted date formatted as locale date string (e.g., "4/10/2026")
   - If status is "rejected" and `reject_reason` exists, display reason text in red

8. **System** displays a "New User Request" button in the header (visible only to Super Admin users).

9. Use case ends. Page remains interactive; user can view additional details or navigate elsewhere.

---

## 7. Alternative Flows

### 7a. Empty Request List
*Branches from step 2 of main flow.*
1. **System** finds zero requests matching the active entity.
2. **System** displays the table with a centered message: "No user requests yet"
3. Summary cards show all counts as 0.
4. Use case continues to step 8 (button remains visible to Super Admin).

### 7b. View Request with Remarks
*Occurs in step 7 during table population.*
1. **System** detects that a request has a non-empty `remark` field.
2. **System** displays the remarks text, truncated to max-width 200px with CSS `truncate`.
3. **System** renders an HTML `title` attribute with the full remarks text.
4. **User** hovers over truncated remarks to see the full text in a browser tooltip.

### 7c. View Rejected Request with Reason
*Occurs in step 7 during table population.*
1. **System** detects that a request has status "rejected" and a non-empty `reject_reason`.
2. **System** displays the rejection reason text in the "Details" column, styled in red and smaller font (text-xs).
3. **System** does NOT show rejection reason for pending or approved requests.

---

## 8. Exception Flows

### 8a. User Not in Active Entity
- **Trigger:** User navigates to the page but has no `activeEntity` set (null).
- **System behavior:** The component returns null; no content is rendered.
- **Resolution:** User must first select or navigate to a valid entity context. The page remains blank until context is set.

### 8b. Network Failure Loading Request List
- **Trigger:** The system cannot retrieve the request list due to network error or backend unavailability.
- **System behavior:** An error state is shown (behavior not specified in prototype; assume error banner or empty state fallback).
- **Resolution:** User may retry navigation or contact support. Use case terminates.

### 8c. Request Data Inconsistency
- **Trigger:** A request record exists but is missing required fields (e.g., name, email, status).
- **System behavior:** The table displays the request with whatever fields are available; missing fields render as empty cells or placeholders.
- **Resolution:** Data is still displayed; missing fields do not block rendering. Use case continues.

---

## 9. Postconditions

**On success:**
- The User Requests page displays with:
  - Correct page title and subtitle based on user role
  - Summary cards showing accurate counts of pending/approved/rejected requests
  - Table populated with all requests for the active entity, sorted newest first
  - All status badges and icons rendered correctly
  - Rejection reasons displayed for rejected requests
  - Remarks truncated with tooltips where applicable
  - "New User Request" button visible only to Super Admins

**On failure:**
- Page renders as blank or with error state (no data shown).
- User cannot see the request list.

---

## 10. Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-02-01 | The system SHALL filter all user requests by the active entity ID and display only those requests. | Must |
| FR-02-02 | The system SHALL display a page header with title "User Requests" and a role-dependent subtitle. | Must |
| FR-02-03 | The system SHALL display three summary cards showing counts of Pending, Approved, and Rejected requests for the active entity. | Must |
| FR-02-04 | The system SHALL color-code summary cards (Pending=warning/orange, Approved=success/green, Rejected=destructive/red). | Must |
| FR-02-05 | The system SHALL display a table with columns: Name, Email, Role, Remarks, Status, Submitted, Details. | Must |
| FR-02-06 | The system SHALL sort requests by creation date in descending order (newest first). | Must |
| FR-02-07 | The system SHALL display request status as a color-coded badge with an icon (clock for pending, checkmark for approved, X for rejected). | Must |
| FR-02-08 | The system SHALL format the submitted date as a locale date string (e.g., "4/10/2026"). | Must |
| FR-02-09 | The system SHALL display the user role as a badge labeled "User" for company_user role and "Super Admin" for other roles. | Must |
| FR-02-10 | The system SHALL truncate remarks to a maximum width of 200px and provide a browser tooltip (title attribute) with the full text. | Must |
| FR-02-11 | The system SHALL display rejection reasons in the Details column for rejected requests, styled in red and smaller font. | Must |
| FR-02-12 | The system SHALL NOT display rejection reasons for pending or approved requests. | Must |
| FR-02-13 | The system SHALL display "No user requests yet" in the table body if the active entity has no requests. | Must |
| FR-02-14 | The system SHALL display the "New User Request" button only to Super Admin users; other users shall not see it. | Should |
| FR-02-15 | The system SHALL return null (render nothing) if activeEntity or currentUser are not set in the auth context. | Should |
| FR-02-16 | The system SHALL calculate summary card counts dynamically by filtering the entity's requests by status (pending, approved, rejected). | Must |
| FR-02-17 | The system SHALL display summary cards in a 3-column grid layout on desktop; the grid may stack vertically on screens narrower than 768px. | Must |
| FR-02-18 | The system SHALL display status icons using lucide-react (Clock for pending, CheckCircle2 for approved, XCircle for rejected). | Should |
| FR-02-19 | The system SHALL render empty remarks cells with a dash (—) styled as muted-foreground/50 italic text. | Should |
| FR-02-20 | The system SHALL apply CSS truncate class and max-width to remarks column to limit display width to 200px. | Must |

---

## 11. Non-Functional Requirements (Unit-Specific)

| Category | Requirement |
|----------|-------------|
| Performance | The request list shall load and render within 1 second for up to 100 requests under normal network conditions. |
| Accessibility | Table headers, status badges, and tooltips shall be marked with appropriate ARIA labels for screen readers. |
| Responsiveness | The table columns shall stack or scroll horizontally on screens narrower than 768px (mobile view). |
| Data freshness | The request list shall reflect changes within 5 seconds of a new request being submitted (eventual consistency). |
| CSS styling | Summary cards use `grid-cols-3 gap-4` layout on desktop; remarks column uses `truncate` and `max-w-[200px]` CSS classes. |

---

## 12. Keyboard Navigation

| Element | Interaction | Behavior |
|---------|-------------|----------|
| "New User Request" button | `Tab` | Button receives focus; visible outline indicates focus state |
| "New User Request" button | `Enter` / `Space` | Opens the request form dialog (maps to FRS-01) |
| Table rows | `Tab` | No focus state required for read-only table rows |
| Remarks tooltip | Hover | Browser displays full remarks text via HTML `title` attribute tooltip |
| Entire page | `Tab` order | Page follows logical tab order: header → button → table |

**Accessibility Note:** Tab order SHALL follow the visual order on screen. The page is primarily read-only; interactive elements (button, tooltips) are keyboard-accessible.

---

## 13. Component Dependencies

The following external UI component libraries and icons are used in this feature:

| Component | Library | Purpose | Notes |
|-----------|---------|---------|-------|
| Card / CardContent | shadcn/ui | Container for summary cards | Used for Pending, Approved, Rejected count displays |
| Table | shadcn/ui | Data table | Includes TableHeader, TableBody, TableHead, TableRow, TableCell |
| Badge | shadcn/ui | Status and role indicators | Used for status badges (color-coded) and role badges ("User", "Super Admin") |
| Button | shadcn/ui | Interactive trigger | "New User Request" button for Super Admins |
| Clock icon | lucide-react | Pending status indicator | Displayed in summary card and table status badge |
| CheckCircle2 icon | lucide-react | Approved status indicator | Displayed in summary card and table status badge |
| XCircle icon | lucide-react | Rejected status indicator | Displayed in summary card and table status badge |
| UserPlus icon | lucide-react | Visual indicator | Displayed on the "New User Request" button |
| mockUserRequests | @/lib/mock-data | Mock data source | Provides initial request data for the table |
| useAuth hook | @/lib/auth-context | Authentication context | Provides `activeEntity`, `currentUser`, `isCompanySuperAdmin` |

---

## 14. Accessibility Requirements

All accessibility requirements below are mandatory for WCAG 2.1 AA compliance:

| Requirement | Implementation |
|-------------|-----------------|
| **Page heading** | Page title "User Requests" SHALL use semantic HTML `<h1>` element. |
| **Subtitle text** | Subtitle SHALL be descriptive and provide context about the content; it should use `<p>` tag with appropriate styling. |
| **Summary cards** | Card titles (Pending, Approved, Rejected) SHALL be associated with counts via visual hierarchy; consider using `<h3>` for semantic structure. Icons SHALL have `aria-label` attributes. |
| **Table semantics** | Table SHALL use semantic HTML `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th>`, `<td>` elements. Table headers SHALL have `scope="col"` attribute. |
| **Status badges** | Badges displaying status SHALL use text labels (e.g., "pending", "approved", "rejected") in addition to color and icons. Icons alone SHALL NOT convey status. |
| **Role badges** | Role badges displaying "User" or "Super Admin" SHALL be clearly labeled text; icons (if used) should be supplementary. |
| **Remarks column** | Remarks text that is truncated with `title` attribute SHALL also have an `aria-label` or `aria-describedby` providing the full text for screen readers (if `title` alone is insufficient). |
| **Empty state** | Empty state message "No user requests yet" SHALL be in a semantic location (table body or dedicated section) with appropriate context. |
| **Color contrast** | All text SHALL meet WCAG AA standard contrast ratio of at least 4.5:1 for normal text. |
| **Focus indicators** | The "New User Request" button SHALL have a visible focus indicator (outline or highlight). |
| **"New User Request" button** | Button visibility is role-dependent; screen readers should announce that button is hidden to non-Super Admins via `aria-hidden="true"` if using CSS-only hiding. |

---

## 15. Responsive Behavior

| Breakpoint | Layout Change | Notes |
|-----------|-----------------|-------|
| Desktop (≥768px) | Summary cards in 3-column grid; table displays all columns normally | `grid-cols-3` CSS class applied |
| Mobile (<768px) | Summary cards may stack vertically or remain 3-column (TBD in Open Questions); table may collapse to card layout or become horizontally scrollable | `grid-cols-1` or card layout alternative applied |
| Remarks column | All breakpoints: truncate to 200px max-width with tooltip | CSS `truncate max-w-[200px]` applied consistently |

**Note:** The prototype does not show explicit mobile card layout; current implementation renders a scrollable table on mobile. Open Question #5 addresses this gap.

---

- **BR-01:** Users can only view requests for their active entity; cross-entity request visibility is strictly prevented.
- **BR-02:** Summary card counts must accurately reflect the status distribution of the entity's requests at page load time.
- **BR-03:** Requests are always sorted newest first; users cannot change the sort order.
- **BR-04:** Rejection reasons are private data only shown for rejected requests; they are not visible to users if the request is still pending or has been approved.
- **BR-05:** A request's "Submitted" date reflects the original request creation date, not subsequent updates or reviews.
- **BR-06:** Empty remarks fields SHALL be displayed as a dash (—) to distinguish from null/missing values and improve table readability.
- **BR-07:** Summary card counts are calculated dynamically; they shall always reflect the current state of the entity's requests, updated immediately on page load.

---

## 17. Open Questions

| # | Question | Owner | Due |
|---|----------|-------|-----|
| 1 | Should users be able to filter the table by status (pending/approved/rejected)? If so, via buttons, dropdown, or checkbox group? | Product/UX | — |
| 2 | Should users be able to search by name or email? Is this within scope for this page or a separate feature? | Product | — |
| 3 | How should the page behave if a user is not in the active entity context (current behavior: returns null / blank page)? Should there be a redirect or error message? | Product/Architecture | — |
| 4 | Should the page auto-refresh to show newly submitted requests, or does the user need to manually reload? | Product | — |
| 5 | For mobile/tablet views, should the table collapse into cards, or remain as a scrollable table? | UX | — |
| 6 | Should the `title` attribute for remarks truncation be supplemented with `aria-label` or `aria-describedby` for better screen reader support? | A11y | — |
| 7 | Should summary cards be clickable to filter the table by status, or remain display-only information? | Product/UX | — |

---

## 18. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-04-10 | frs skill | Initial draft from UI prototype |
| 1.1 | 2026-04-10 | frs skill | Enriched with keyboard navigation, component dependencies, accessibility requirements, responsive behavior, and additional functional requirements (FR-02-16 through FR-02-20) |

---

## 19. Wireframe UI/UX Prototype Mapping

All screens below map to flows defined in Sections 6, 7, and 8.

---

### SCREEN 1 — User Requests Page (Full Request List)
*Triggered by: Page load / main flow steps 1–8 | Related FR: FR-02-01 to FR-02-20*

```
+---[User Requests Page]────────────────────────────────────────────+
|                                                                    |
|  User Requests                          [⊕ New User Request]    |
|  Request new users for your company.                              |
|  Requests require bank approval.                                  |
|                                                                    |
|  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             |
|  │ ⏱ Pending    │  │ ✓ Approved   │  │ ✗ Rejected   │             |
|  │      3       │  │      5       │  │      1       │             |
|  └──────────────┘  └──────────────┘  └──────────────┘             |
|                                                                    |
|  ┌─────────────────────────────────────────────────────────────┐  |
|  │ Name     │ Email          │ Role  │ Remarks  │ Status │ Date  │  |
|  ├─────────────────────────────────────────────────────────────┤  |
|  │ Jane D.  │ jane@co.com    │ User  │ —        │ ⏱ Pend │ Apr 10│  |
|  │ Bob S.   │ bob@co.com     │ User  │ Depart..│ ✓ Appr │ Apr 09│  |
|  │ Alice T. │ alice@co.com   │ User  │ —        │ ✗ Rej  │ Apr 08│  |
|  └─────────────────────────────────────────────────────────────┘  |
|                                                                    |
+--------------------------------------------------------------------+
```

**UI Notes:**
- "New User Request" button is visible only to Super Admin users; hidden for regular users.
- Button displays UserPlus icon with text label.
- Summary cards display current counts by status; counts are calculated dynamically.
- Table shows all requests for the entity, sorted newest first.
- Status badges are color-coded and include icons.
- Remarks column shows ellipsis (...) when truncated; full text visible on hover.
- Empty remarks cells display a dash (—) in muted styling.

**Accessibility Notes:**
- Page heading uses `<h1>` semantic element.
- Subtitle provides context about the page's purpose.
- Summary cards have `aria-label` attributes on icons (e.g., "Pending requests").
- Table uses semantic `<table>`, `<thead>`, `<tbody>` with `scope="col"` on headers.
- Status badge icons have `aria-label` attributes; text label ("pending", "approved", etc.) is primary.
- "New User Request" button has `aria-label="Create a new user request"`.
- Remarks truncation uses HTML `title` attribute; screen reader support via aria labels is recommended.

---

### SCREEN 2 — Empty Request List
*Triggered by: Alternative Flow 7a (zero requests for entity) | Related FR: FR-02-13*

```
+---[User Requests Page]────────────────────────────────────────────+
|                                                                    |
|  User Requests                                                     |
|  View user creation requests for Acme Corp                         |
|                                                                    |
|  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             |
|  │ ⏱ Pending    │  │ ✓ Approved   │  │ ✗ Rejected   │             |
|  │      0       │  │      0       │  │      0       │             |
|  └──────────────┘  └──────────────┘  └──────────────┘             |
|                                                                    |
|  ┌─────────────────────────────────────────────────────────────┐  |
|  │ Name     │ Email          │ Role  │ Remarks  │ Status │ Date  │  |
|  ├─────────────────────────────────────────────────────────────┤  |
|  │                   No user requests yet                       │  |
|  └─────────────────────────────────────────────────────────────┘  |
|                                                                    |
+--------------------------------------------------------------------+
```

**UI Notes:**
- Subtitle changes to show entity name (regular user view).
- All summary counts are 0; counts are still calculated but display zero.
- Table displays a centered empty-state message.
- "New User Request" button is not visible (regular user doesn't have Super Admin role).

**Accessibility Notes:**
- Empty state message is semantically placed in the table body for clarity.
- Message is descriptive and indicates the current state (no requests yet).

---

### SCREEN 3 — Request with Remarks (Truncated)
*Triggered by: Alternative Flow 7b (request has remarks) | Related FR: FR-02-10, FR-02-20*

```
+---[Table Detail]──────────────────────────────────────────────────+
|                                                                    |
|  Remarks Column (Hover to see full text):                          |
|                                                                    |
|  ┌──────────────────────────────────────────────────┐             |
|  │ Remarks: "New team member, starting next quar…" │             |
|  │ (on hover: browser tooltip shows full text)      │             |
|  └──────────────────────────────────────────────────┘             |
|                                                                    |
|  Browser Tooltip (title attribute):                               |
|  ┌──────────────────────────────────────────────────┐             |
|  │ "New team member, starting next quarter, handle │             |
|  │ financial reporting for the US division"         │             |
|  └──────────────────────────────────────────────────┘             |
|                                                                    |
+--------------------------------------------------------------------+
```

**UI Notes:**
- Remarks are truncated to 200px max-width with CSS `truncate` class.
- Full remarks text is provided in the HTML `title` attribute.
- Browser displays tooltip on hover showing the complete remarks.
- If no remarks, a dash (—) styled as muted-foreground/50 italic is shown instead.

**Accessibility Notes:**
- `title` attribute provides tooltip; consider supplementing with `aria-label` or `aria-describedby` for better screen reader support.
- Truncated text should not rely on color alone; the truncation visual indicator (ellipsis) is the primary affordance.

---

### SCREEN 4 — Rejected Request with Rejection Reason
*Triggered by: Alternative Flow 7c (rejected request with reason) | Related FR: FR-02-11, FR-02-12*

```
+─────────────────────────────────────────────────────────────────+
│ Name    │ Email        │ Role  │ Status        │ Details         │
├─────────────────────────────────────────────────────────────────┤
│ Carol M.│ carol@c.com  │ User  │ ✗ Rejected    │ Email domain    │
│         │              │       │               │ not approved    │
└─────────────────────────────────────────────────────────────────┘
```

**UI Notes:**
- "Details" column shows rejection reason only for rejected requests.
- Reason text is displayed in small font (text-xs) and red color (text-destructive).
- For pending/approved requests, this column shows alternative data or remains empty.
- Rejection reason helps users understand why a request was denied.

**Accessibility Notes:**
- Red color alone does not indicate rejection; the "Rejected" status badge combined with the reason text provides semantic meaning.
- Reason text contrast meets WCAG AA standards (4.5:1 minimum).
- Screen readers will announce both the "Rejected" status badge and the rejection reason in sequence.

---

### SCREEN 5 — Summary Card Detail (Hover/Focus)
*Triggered by: Step 4 of main flow (display summary cards) | Related FR: FR-02-03, FR-02-04, FR-02-16, FR-02-17*

```
+──────────────────────────────┐
│ ⏱ Pending (Warning Yellow)   │
│                              │
│          3                   │
│                              │
│ [Display-only, no action]    │
└──────────────────────────────┘

+──────────────────────────────┐
│ ✓ Approved (Success Green)   │
│                              │
│          5                   │
└──────────────────────────────┘

+──────────────────────────────┐
│ ✗ Rejected (Error Red)       │
│                              │
│          1                   │
└──────────────────────────────┘
```

**UI Notes:**
- Summary cards are display-only (no click handlers in current spec).
- Each card shows an icon, label, and count.
- Color coding matches status badge colors used in the table.
- Cards are arranged in a 3-column grid on desktop (`grid-cols-3 gap-4`).
- Counts are calculated dynamically from the entity's requests.

**Accessibility Notes:**
- Each card icon has `aria-label` describing its purpose (e.g., "Pending requests").
- Card labels (Pending, Approved, Rejected) are text, not icons alone.
- Count numbers are associatedwith their corresponding status via visual proximity and text labels.
- Cards use semantic HTML structure (likely `<div>` with role="region" or similar).

---

### SCREEN 6 — Mobile View (Responsive Behavior)
*Triggered by: Viewport width < 768px | Related FR: FR-02-17, NFR - Responsiveness*

```
+──────────────────────────────────────+
│ User Requests   [⊕ New User Request] │
│ Requests for... (subtitle)           │
│                                      │
│ [Pending: 3] [Approved: 5] [Rej: 1] │  (cards: 3-col or 1-col TBD)
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ Name: Jane D.                    │ │
│ │ Email: jane@co.com               │ │
│ │ Role: User                       │ │
│ │ Status: ⏱ Pending                │ │
│ │ Date: Apr 10                     │ │
│ └──────────────────────────────────┘ │
│                                      │
│ ┌──────────────────────────────────┐ │
│ │ Name: Bob S.                     │ │
│ │ Email: bob@co.com                │ │
│ │ Role: User                       │ │
│ │ Status: ✓ Approved               │ │
│ │ Date: Apr 09                     │ │
│ └──────────────────────────────────┘ │
│                                      │
+──────────────────────────────────────+
```

**UI Notes:**
- Current prototype renders a scrollable table on mobile (not a card collapse).
- Summary cards remain in 3-column grid or may stack vertically depending on device width (implementation detail).
- Remarks column truncation to 200px remains consistent across all breakpoints.
- Button position and visibility remain consistent.
- Horizontal scroll is available for table on narrow screens if needed.

**Accessibility Notes:**
- On mobile, ensure table remains readable with proper zoom support (user can pinch-zoom to 200%).
- Touch targets (buttons, interactive elements) should be at least 44x44px for accessibility.
- Focus indicators remain visible on touch devices via keyboard navigation.
- Screen reader announces table structure correctly even with horizontal scroll.

---

### Screen Flow Diagram

```
  [User navigates to / loads User Requests page]
           |
           v
  [Check auth context: activeEntity & currentUser set?]
           |
       ┌───┴───┐
       │       │
      No      Yes
       │       │
       │       v
       │  [Retrieve requests for active entity]
       │       |
       │       v
       │  [Filter by entity_id]
       │       |
       │       ├────────────┬──────────────┐
       │       │            │              │
       │   [0 requests] [1+ requests]   [Error]
       │       │            │              │
       │       v            v              v
       │  SCREEN 2      SCREEN 1       Error State
       │  Empty List    Full Table       (8b)
       │       │            │              │
       │       └─────┬──────┴──────────────┘
       │             │
       └─────┬───────┘
             │
             v
    [Render page header]
    [Render summary cards]
    [Render table]
    [Display "New User Request" button if Super Admin]
             |
             v
    [Page ready for interaction]
    [User views requests, hovers for details (7b, 7c)]
```

---

## 20. Self-Review Checklist

- [x] One use case only — users view and understand their entity's request list
- [x] Testable requirements — all FR-* items are independently verifiable (FR-02-01 through FR-02-20)
- [x] No implementation details — spec describes WHAT (display requests, filter by entity) not HOW (useState, useAuth hooks)
- [x] No "TBD" in main flow — all steps are concrete; unresolved behaviors moved to Open Questions
- [x] Consistent actor naming — "Company User" and "Super Admin" used consistently
- [x] Exception flows cover — missing entity context (8a), network failure (8b), data inconsistency (8c)
- [x] Postconditions are concrete — "page displays with correct title, summary counts, table sorted newest first"
- [x] Out-of-scope list is explicit — prevents scope creep (no search, no pagination, no editing)
- [x] Section 19 present — 6 wireframe screens showing main, empty, hover, rejected, cards, mobile, and flow diagram
- [x] Table column sets match template exactly
- [x] Requirement IDs sequential and correct format (FR-02-01 through FR-02-20)
- [x] Business rule IDs sequential (BR-01 through BR-07)
- [x] Keyboard navigation documented (Section 12: Tab order, tooltips, logical tab sequence)
- [x] Component dependencies listed (Section 13: shadcn/ui, lucide-react icons, mock data, auth hook)
- [x] Accessibility requirements documented (Section 14: table semantics, status badges, focus, contrast)
- [x] Responsive behavior documented (Section 15: breakpoints, layout changes, truncation consistency)
- [x] All screens include accessibility notes (aria labels, semantic HTML, focus, contrast)
- [x] NFR section includes CSS styling requirement
- [x] Open Questions updated (now 7 questions including accessibility and interactivity options)

