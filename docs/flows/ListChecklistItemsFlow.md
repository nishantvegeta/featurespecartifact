---
id: list-checklist-items-flow
name: ListChecklistItemsFlow
type: Flow
version: "1.0"
created: "2026-05-07"
last_modified: "2026-05-07"
---

**Node type:** Flow
**Name:** ListChecklistItemsFlow
**Actor(s):**
- [BankAdmin](http://localhost:8080/root/trade-finance/-/wikis/actors/BankAdmin)

**Module:** BankSettings
**Sub-module:** ChecklistManagement
**Purpose:** Coordinate the sequence of actions from the BankAdmin navigating to the Bank Settings page through to the fully rendered LC Issuance Checklist, including handling the empty-state variant and permission-denied error paths.

**Preconditions:**
- BankAdmin is authenticated with an active session.
- BankAdmin holds `TradeFinancePermissions.BankSettings.ChecklistItems.View` permission. — [FRS #15 — Permissions](http://localhost:8080/root/trade-finance/-/issues/15#9-permissions)
- The Bank Settings module is accessible from the navigation menu.

**Numbered steps:**

1. BankAdmin navigates to the Bank Settings checklist management page in the backoffice UI.
2. UI invokes [ListChecklistItems](http://localhost:8080/root/trade-finance/-/wikis/queries/ListChecklistItems) with default parameters (`SkipCount=0`, `MaxResultCount=20`, `Sorting=sequencenumber asc`, no `Status` filter) → system returns `PagedResultDto<ChecklistItemDto>` scoped to the current tenant.
3. UI renders the checklist table, displaying each item's serial number (derived from `SequenceNumber`), description, status badge, reorder controls, and edit/delete action buttons.
4. BankAdmin reviews the displayed list; can initiate [EditChecklistItemFlow](http://localhost:8080/root/trade-finance/-/wikis/flows/EditChecklistItemFlow), [DeleteChecklistItemFlow](http://localhost:8080/root/trade-finance/-/wikis/flows/DeleteChecklistItemFlow), [ToggleChecklistItemStatus](http://localhost:8080/root/trade-finance/-/wikis/commands/ToggleChecklistItemStatus), or [ReorderChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/commands/ReorderChecklistItem) from this view.
5. BankAdmin may optionally filter by `Status` → UI re-invokes [ListChecklistItems](http://localhost:8080/root/trade-finance/-/wikis/queries/ListChecklistItems) with the selected `Status` value → filtered list re-rendered.
6. BankAdmin may page through results using pagination controls → UI re-invokes [ListChecklistItems](http://localhost:8080/root/trade-finance/-/wikis/queries/ListChecklistItems) with updated `SkipCount` → next page rendered.

**Decision branches:**

- **Alternate: no items configured** — trigger: `TotalCount == 0` in step 2 response. Divergence: after step 2. Outcome: UI renders empty-state message "No checklist items configured"; the Add Item button remains available for [CreateChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/commands/CreateChecklistItem). Flow ends at step 3.
- **Error: insufficient permission** — trigger: BankAdmin lacks `View` permission; API returns HTTP 403 at step 2. Divergence: step 2. Outcome: UI displays authorization error; checklist table is not rendered. Flow terminates.
- **Error: data load failure** — trigger: API returns 5xx at step 2. Divergence: step 2. Outcome: UI displays an error notification; table not populated. BankAdmin can retry manually. Flow terminates.

**Postconditions (happy path):**
- BankAdmin sees the complete (or filtered) checklist item list for their tenant, sorted by `SequenceNumber` ascending.
- All management actions (add, edit, toggle, reorder, delete) are accessible from the rendered table rows.
- No automatic refresh occurs after leaving and returning to the page; list reflects server state at last load per [NoRealtimeRefreshDecision](http://localhost:8080/root/trade-finance/-/wikis/decisions/NoRealtimeRefreshDecision).

**Source:**
- [FRS #15 — Flows](http://localhost:8080/root/trade-finance/-/issues/15#6-flows)
- [FRS #15 — Queries](http://localhost:8080/root/trade-finance/-/issues/15#4-queries)

## Change History

- **1.0** (2026-05-07): Initial draft from Bank Settings milestone feat spec generation.
