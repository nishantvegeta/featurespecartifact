---
id: delete-checklist-item-flow
name: DeleteChecklistItemFlow
type: Flow
version: "1.0"
created: "2026-05-07"
last_modified: "2026-05-07"
---

**Node type:** Flow
**Name:** DeleteChecklistItemFlow
**Actor(s):**
- [BankAdmin](http://localhost:8080/root/trade-finance/-/wikis/actors/BankAdmin)

**Module:** BankSettings
**Sub-module:** ChecklistManagement
**Purpose:** Coordinate the confirmation-guarded soft-delete of a checklist item, including the post-delete sequence compaction step and list reload. A confirmation dialog is required before the delete command is dispatched to prevent accidental deletion. Optimistic concurrency is enforced using the `ConcurrencyStamp` present in the list row's DTO at the time the BankAdmin initiates the delete.

**Preconditions:**
- BankAdmin is authenticated and holds `TradeFinancePermissions.BankSettings.ChecklistItems.Delete` permission. — [FRS #16 — Permissions](http://localhost:8080/root/trade-finance/-/issues/16#9-permissions)
- The checklist list page is loaded (see [ListChecklistItemsFlow](http://localhost:8080/root/trade-finance/-/wikis/flows/ListChecklistItemsFlow)).
- At least one non-deleted `ChecklistItem` exists in the tenant for the BankAdmin to select.

**Numbered steps:**

1. BankAdmin clicks the Delete action on a checklist item row in the list view.
2. UI presents a confirmation dialog: "Are you sure you want to delete this checklist item? This action cannot be undone." The `ConcurrencyStamp` from the row's DTO is held in UI state.
3. BankAdmin clicks Confirm in the dialog.
4. UI invokes [DeleteChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/commands/DeleteChecklistItem) with the item's `Id` and `ConcurrencyStamp` → system soft-deletes the item, compacts sequence numbers of remaining items within the same transaction, returns HTTP 204.
5. UI closes the dialog and displays a success notification: "Checklist item deleted".
6. UI re-invokes [ListChecklistItems](http://localhost:8080/root/trade-finance/-/wikis/queries/ListChecklistItems) to reload the list with the compacted sequence numbers → flow ends.

**Decision branches:**

- **Alternate: BankAdmin cancels the confirmation** — trigger: BankAdmin clicks Cancel at step 3. Divergence: step 3. Outcome: dialog closes; no item is deleted; list remains unchanged. Flow ends.
- **Error: optimistic concurrency conflict** — trigger: `DeleteChecklistItem` returns HTTP 409 at step 4 (another admin updated the item after BankAdmin opened the confirmation dialog). Divergence: step 4. Outcome: dialog closes; UI shows "The item was modified by another user — please review and retry" notification; list is reloaded so BankAdmin sees the current state. Flow terminates; BankAdmin may restart the delete from the refreshed list.
- **Error: item not found** — trigger: `DeleteChecklistItem` returns HTTP 404 at step 4 (item was already deleted by another admin). Divergence: step 4. Outcome: dialog closes; UI shows "Item no longer exists" message; list is reloaded. Flow terminates.

**Timing:** No asynchronous steps. The soft-delete and sequence compaction are synchronous within the HTTP request. The list reload (step 6) is a separate UI-triggered query call; manual reload per [NoRealtimeRefreshDecision](http://localhost:8080/root/trade-finance/-/wikis/decisions/NoRealtimeRefreshDecision).

**Postconditions (happy path):**
- The deleted `ChecklistItem` has `IsDeleted = true`; it is excluded from all list queries via ABP's soft-delete filter.
- The audit record is retained in the database for minimum 7 years per retention policy.
- Remaining items have contiguous `SequenceNumber` values starting at 1 with no gaps.
- The list view reflects the updated sequence.

**Source:**
- [FRS #15 — Flows](http://localhost:8080/root/trade-finance/-/issues/15#6-flows)
- [FRS #16 — Delete](http://localhost:8080/root/trade-finance/-/issues/16#3-delete)
- [FRS #16 — Resequence](http://localhost:8080/root/trade-finance/-/issues/16#4-resequence)

## Change History

- **1.0** (2026-05-07): Initial draft from Bank Settings milestone feat spec generation.
