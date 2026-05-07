---
id: reorder-checklist-item
name: ReorderChecklistItem
type: Command
version: "1.0"
created: "2026-05-07"
last_modified: "2026-05-07"
---

**Node type:** Command
**Name:** ReorderChecklistItem
**Actor:** [BankAdmin](http://localhost:8080/root/trade-finance/-/wikis/actors/BankAdmin)
**Target aggregate:** [ChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/entities/ChecklistItem)
**Module:** BankSettings
**Sub-module:** ChecklistManagement
**Purpose:** Move a checklist item to a new position in the ordered list by assigning it a target sequence number. The domain service shifts all items between the old and new positions by ±1 to maintain the gap-free 1-based sequence invariant across the tenant's entire checklist. Optimistic concurrency is enforced on the primary target item; collateral shifts on other items are handled transactionally by the domain service without individual concurrency stamps.
**Audience:** Private
**HTTP route:** POST /api/private/app/bank-settings/checklist-items/{id}/reorder

**Input DTO:** `ReorderChecklistItemInput`

| Name | Type | Required | Validation | Notes |
|---|---|---|---|---|
| `Id` | `Guid` | yes | NotEmpty | Route-bound from URL path parameter |
| `ConcurrencyStamp` | `string` | yes | NotEmpty | Token from the most recent read of the target item. See [OptimisticConcurrencyStrategy](http://localhost:8080/root/trade-finance/-/wikis/decisions/OptimisticConcurrencyStrategy) |
| `NewSequenceNumber` | `int` | yes | GreaterThanOrEqualTo(1) | Target position in the list; must be within the current count of non-deleted items for the tenant |

**Input DTO base:** plain (no audit inheritance)
**Validation:** `ReorderChecklistItemInputValidator` (FluentValidation)
**Output DTO:** `Task` (void) — the list must be re-fetched by the caller via [ListChecklistItems](http://localhost:8080/root/trade-finance/-/wikis/queries/ListChecklistItems) to reflect all position shifts
**Authorization:** `TradeFinancePermissions.BankSettings.ChecklistItems.Reorder`

**Preconditions:**
- Caller holds permission `TradeFinancePermissions.BankSettings.ChecklistItems.Reorder`. — [FRS #15 — Permissions](http://localhost:8080/root/trade-finance/-/issues/15#9-permissions)
- Target `ChecklistItem` exists and is not soft-deleted. — [FRS #15 — Commands](http://localhost:8080/root/trade-finance/-/issues/15#4-commands)
- `ConcurrencyStamp` matches the current stored value on the target item; mismatch throws `AbpDbConcurrencyException` (HTTP 409). — [FRS #16 — Concurrency](http://localhost:8080/root/trade-finance/-/issues/16#5-concurrency)
- `NewSequenceNumber` is within the valid range `[1, totalNonDeletedItemCount]` for the tenant. Pre-validation timing: see [ReorderBoundaryCheckTiming](http://localhost:8080/root/trade-finance/-/wikis/decisions/ReorderBoundaryCheckTiming) — the adopted approach is pre-validation (validate before any DB write; return HTTP 422 if out of range).

**Postconditions:**
- The target item's `SequenceNumber` is updated to `NewSequenceNumber`.
- All items between the old and new positions are shifted by +1 (when moving up) or -1 (when moving down) so the sequence remains contiguous and gap-free. — [FRS #15 — Data model](http://localhost:8080/root/trade-finance/-/issues/15#5-data-model)
- If `NewSequenceNumber` equals the item's current `SequenceNumber`, the operation is a no-op and returns success without modifying any rows.
- `LastModificationTime` and `LastModifierId` are updated on the target item (and on shifted items, by virtue of the update).
- `ConcurrencyStamp` is regenerated on the target item by ABP.
- Caller must reload the list to see updated positions; no realtime push per [NoRealtimeRefreshDecision](http://localhost:8080/root/trade-finance/-/wikis/decisions/NoRealtimeRefreshDecision).

**Domain events raised:** none — reorder is an internal presentation-order change with no external consumer.

**Side effects:** none beyond persistence and audit trail. All position shifts happen within the same EF Core transaction as the primary update.

**Source:**
- [FRS #15 — Commands](http://localhost:8080/root/trade-finance/-/issues/15#4-commands)
- [FRS #15 — Data model](http://localhost:8080/root/trade-finance/-/issues/15#5-data-model)
- [FRS #15 — Permissions](http://localhost:8080/root/trade-finance/-/issues/15#9-permissions)
- [FRS #15 — Reorder validation](http://localhost:8080/root/trade-finance/-/issues/15#5-reorder-validation)
- [FRS #16 — Concurrency](http://localhost:8080/root/trade-finance/-/issues/16#5-concurrency)

## Change History

- **1.0** (2026-05-07): Initial draft from Bank Settings milestone feat spec generation.
