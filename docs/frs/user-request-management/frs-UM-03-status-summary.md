---
FRS-ID: FRS-URM-03
Title: View Request Status Summary Dashboard
Module: User Request Management
Version: 1.0
Status: pending-approval
Created: 2026-04-15
---

## 1. Purpose

Provide users with a quick overview of the status distribution of all user requests in their company. Summary cards display counts of pending, approved, and rejected requests, enabling users to understand the overall request workflow health at a glance.

---

## 2. Scope

This operation covers the display of summary metrics only. It presents high-level counts aggregated by status. Detailed request data, filtering, sorting, or trend analysis is out of scope. Historical or time-series data is out of scope.

---

## 3. Actors

- **Company Super-Admin** — views summary of all company requests
- **Company User** (non-admin) — views summary of company requests (permissions TBD)

---

## 4. Preconditions

- Actor is authenticated and logged into the system
- Actor belongs to an active company (entity)
- The system has calculated request counts by status for the company (may be zero)

---

## 5. Dependencies

**Inter-FRS Dependencies:**
- **FRS-URM-01: Submit New User Request for Approval** — must complete before requests can be counted and summarized

**System & Technical Dependencies:**
- Authentication & Authorization — system must verify actor's company affiliation
- Entity Context — the active company (entity) must be available in the session
- Request Storage & Aggregation — system must have persisted requests and be able to count them by status
- Data Consistency — summary counts must reflect the current state of requests

---

## 6. Trigger

1. Actor navigates to the User Request Management dashboard
2. The summary section loads automatically above the request table

---

## 7. Main Flow

1. The User Request Management page loads
2. A grid of three summary cards is displayed at the top of the page
3. **First card (Pending Requests):**
   - Icon: Clock (in warning/yellow color)
   - Label: "Pending"
   - Count: Number of requests with status "pending"
   - Example: "5"
4. **Second card (Approved Requests):**
   - Icon: CheckCircle (in success/green color)
   - Label: "Approved"
   - Count: Number of requests with status "approved"
   - Example: "12"
5. **Third card (Rejected Requests):**
   - Icon: XCircle (in destructive/red color)
   - Label: "Rejected"
   - Count: Number of requests with status "rejected"
   - Example: "2"
6. Each card displays a large, bold count number
7. Cards are laid out in a responsive grid (3 columns on desktop, responsive on mobile)
8. The count updates when the page is reloaded or refreshed

---

## 8. Alternative Flows

**A1 — Actor has no requests in the company:**
- All three cards display a count of 0
- Cards are still visible and provide visual confirmation that no requests exist

**A2 — All requests are in one status (e.g., all pending):**
- Only the "pending" card shows a non-zero count; others show 0
- All cards are still visible and styled consistently

---

## 9. Exception Flows

**E1 — Request counts fail to load (backend error):**
- An error notification is displayed above the summary cards
- Cards may display loading spinners or remain blank
- Actor is prompted to retry or contact support

**E2 — Actor does not have permission to view summary:**
- The summary cards are not displayed
- Actor is redirected or presented with an access denied message

**E3 — Summary counts are stale (last loaded 10+ minutes ago):**
- Counts reflect the state at page load time
- No auto-refresh occurs; actor must manually reload to see updated counts
- (Real-time updates are out of scope)

---

## 10. Postconditions

**On Success:**
- Three summary cards are visible and display accurate request counts by status
- Counts reflect all requests for the actor's company
- Cards are properly styled with status-specific icons and colors
- Actor can quickly assess the overall request workflow state

**On Failure:**
- Summary cards are not displayed or remain empty
- An error message is shown
- Actor cannot see the request status overview

---

## 11. Form Fields

N/A — this operation displays data only. No user input or interactive controls.

---

## 12. Functional Requirements

1. **Three summary cards must be displayed** in a grid layout
2. **Each card must display:**
   - A status-specific icon (Clock, CheckCircle, XCircle)
   - A status label (Pending, Approved, Rejected)
   - A large, bold count number
3. **Icons must use status-appropriate colors:**
   - Pending: Warning/yellow color (Clock icon)
   - Approved: Success/green color (CheckCircle icon)
   - Rejected: Destructive/red color (XCircle icon)
4. **Counts must be accurate** and reflect all company requests in that status
5. **Cards must be responsive** and reflow to single column on mobile devices
6. **Card styling must be consistent** with the rest of the dashboard (same component style as request table card)
7. **Count must display as a large number** (font-size: 2xl or equivalent) with high visual hierarchy
8. **Label text must be readable** in all supported languages (i18n placeholder)

---

## 13. Non-Functional Requirements

- Summary cards must load and display within 1 second
- Counts must be accurate as of the last page load
- Cards must be accessible via keyboard navigation
- Icons must be sized appropriately (h-4 w-4 for icon, h-6 w-6 for label context)
- Card layout must support devices from 320px width upwards
- Summary calculation must not impact overall page load time

---

## 14. Business Rules

**BR-1:** Summary counts aggregate all requests for the company, regardless of requester identity.

**BR-2:** Only authenticated company members may view summary counts for their company.

**BR-3:** Cross-company summary counts are prohibited; each company sees only its own request counts.

**BR-4:** Summary counts include all requests in any status; no filtering or exclusion is applied.

**BR-5:** Request status is the sole categorization criterion for summary counts; no other segmentation (by role, date, requester) is provided at summary level.

---

## 15. Edge Cases

**EC-1 — Company has zero requests:**
All cards display "0"; summary is still useful as a confirmation that no requests exist.

**EC-2 — Very large request counts (e.g., 9999+ requests):**
Count display must accommodate large numbers without wrapping or distorting the card layout. Abbreviation (e.g., "9.9K") may be used if necessary.

**EC-3 — Request counts change while actor is viewing:**
Summary cards do not auto-refresh; counts remain static until page reload. Actor may see discrepancy between summary and table if a new request is submitted during viewing.

**EC-4 — Actor navigates away and returns to the page:**
Summary cards are recalculated on page reload and display fresh counts.

**EC-5 — Summary section loads before table data:**
Cards may display while table is still loading. Counts and table may briefly show different totals (counts are 1-2 seconds faster than full table data).

---

## 16. Open Questions

1. Should the summary cards support drill-down/click-through to filter the table by that status?
2. Should the summary include historical data (requests from past months) or only current-month requests?
3. What should happen if counts differ between the summary cards and the filtered table? (Caching vs. real-time)
4. Should the summary include a total count (sum of all three statuses)?
5. Are there plans to add additional status categories (e.g., "in-review", "withdrawn")?
6. Should the cards display trend indicators (e.g., "↑ 3 from yesterday")?
7. Should non-admin users see the same summary as admins, or a restricted view?

---

## 17. Revision History

| Version | Date | Author | Change |
|---|---|---|---|
| 1.0 | 2026-04-15 | FRS Generator | Initial specification from UI prototype |
