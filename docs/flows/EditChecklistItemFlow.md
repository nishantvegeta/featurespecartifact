---
id: edit-checklist-item-flow
name: EditChecklistItemFlow
type: Flow
version: "1.0"
created: "2026-05-07"
last_modified: "2026-05-07"
---

**Node type:** Flow
**Name:** EditChecklistItemFlow
**Actor(s):**
- [BankAdmin](http://localhost:8080/root/trade-finance/-/wikis/actors/BankAdmin)

**Module:** BankSettings
**Sub-module:** ChecklistManagement
**Purpose:** Coordinate the multi-step process from the BankAdmin opening the edit dialog for a checklist item through description update submission, optimistic concurrency validation, and return to the refreshed list view. The flow ensures the edit form is pre-filled with current data and the submitted concurrency stamp matches the server state at the moment of update.

**Preconditions:**
- BankAdmin is authenticated and holds `TradeFinancePermissions.BankSettings.ChecklistItems.View` and `TradeFinancePermissions.BankSettings.ChecklistItems.Edit` permissions. — [FRS #15 — Permissions](http://localhost:8080/root/trade-finance/-/issues/15#9-permissions)
- The checklist list page is loaded (see [ListChecklistItemsFlow](http://localhost:8080/root/trade-finance/-/wikis/flows/ListChecklistItemsFlow)).
- At least one non-deleted `ChecklistItem` exists in the tenant for the BankAdmin to select.

**Numbered steps:**

1. BankAdmin clicks the Edit action on a checklist item row in the list view.
2. UI invokes [GetChecklistItemForEdit](http://localhost:8080/root/trade-finance/-/wikis/queries/GetChecklistItemForEdit) with the selected item's ID → system returns the current `ChecklistItemDto` including `Description` and `ConcurrencyStamp`.
3. UI opens the edit dialog pre-filled with the current `Description`; `ConcurrencyStamp` is held in UI state (not shown to user).
4. BankAdmin modifies the description text in the dialog.
5. BankAdmin clicks the Save/Confirm button.
6. UI invokes [UpdateChecklistItemDescription](http://localhost:8080/root/trade-finance/-/wikis/commands/UpdateChecklistItemDescription) with `Id`, updated `Description`, and `ConcurrencyStamp` → system validates, persists, returns updated `ChecklistItemDto`.
7. UI closes the dialog and displays a success notification.
8. UI re-invokes [ListChecklistItems](http://localhost:8080/root/trade-finance/-/wikis/queries/ListChecklistItems) to reload the updated list → flow ends.

**Decision branches:**

- **Alternate: BankAdmin cancels the dialog** — trigger: BankAdmin clicks Cancel at step 4 or 5. Divergence: after step 3. Outcome: dialog closes; no mutation occurs; list remains unchanged. Flow ends.
- **Error: item not found at pre-fill** — trigger: `GetChecklistItemForEdit` returns HTTP 404 at step 2 (item deleted by another admin between list load and edit click). Divergence: step 2. Outcome: UI shows "Item no longer exists" error; list is reloaded. Flow terminates.
- **Error: optimistic concurrency conflict** — trigger: `UpdateChecklistItemDescription` returns HTTP 409 at step 6 (another admin updated the item after BankAdmin opened the edit dialog). Divergence: step 6. Outcome: UI informs BankAdmin of the conflict and automatically re-fetches fresh data (re-enters at step 2) so BankAdmin can review and re-apply their change. Flow re-enters step 2.
- **Error: description uniqueness violation** — trigger: submitted `Description` already exists on another non-deleted item in the tenant; service returns HTTP 422. Divergence: step 6. Outcome: UI shows inline validation error on the description field; dialog remains open. BankAdmin corrects the description and retries step 5.

**Postconditions (happy path):**
- The target `ChecklistItem`'s `Description` is updated to the new value.
- `LastModificationTime`, `LastModifierId`, and `ConcurrencyStamp` are refreshed on the aggregate.
- The list view reflects the updated description.

**Source:**
- [FRS #15 — Flows](http://localhost:8080/root/trade-finance/-/issues/15#6-flows)
- [FRS #15 — Commands](http://localhost:8080/root/trade-finance/-/issues/15#4-commands)
- [FRS #16 — Concurrency](http://localhost:8080/root/trade-finance/-/issues/16#5-concurrency)

## Change History

- **1.0** (2026-05-07): Initial draft from Bank Settings milestone feat spec generation.
