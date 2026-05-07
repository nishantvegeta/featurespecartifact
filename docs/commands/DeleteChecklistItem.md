---
id: delete-checklist-item
name: DeleteChecklistItem
type: Command
version: "1.0"
created: "2026-05-07"
last_modified: "2026-05-07"
---

**Node type:** Command
**Name:** DeleteChecklistItem
**Actor:** [BankAdmin](http://localhost:8080/root/trade-finance/-/wikis/actors/BankAdmin)
**Target aggregate:** [ChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/entities/ChecklistItem)
**Module:** BankSettings
**Sub-module:** ChecklistManagement
**Purpose:** Soft-delete a checklist item, removing it from the tenant's visible and operational checklist while retaining the audit record for the minimum 7-year retention period. After deletion the domain service compacts the sequence numbers of the remaining items to close the gap left by the deleted item, restoring the gap-free 1-based sequence invariant. Optimistic concurrency is enforced on the target item before deletion proceeds.
**Audience:** Private
**HTTP route:** DELETE /api/private/app/bank-settings/checklist-items/{id}

**Input DTO:** `DeleteChecklistItemInput`

| Name | Type | Required | Validation | Notes |
|---|---|---|---|---|
| `Id` | `Guid` | yes | NotEmpty | Route-bound from URL path parameter |
| `ConcurrencyStamp` | `string` | yes | NotEmpty | Token from the most recent read of the target item; prevents deleting a stale version. See [OptimisticConcurrencyStrategy](http://localhost:8080/root/trade-finance/-/wikis/decisions/OptimisticConcurrencyStrategy) |

**Input DTO base:** plain (no audit inheritance)
**Validation:** `DeleteChecklistItemInputValidator` (FluentValidation)
**Output DTO:** `Task` (void) — on success the caller reloads the list; no DTO returned
**Authorization:** `TradeFinancePermissions.BankSettings.ChecklistItems.Delete`

**Preconditions:**
- Caller holds permission `TradeFinancePermissions.BankSettings.ChecklistItems.Delete`. — [FRS #16 — Permissions](http://localhost:8080/root/trade-finance/-/issues/16#9-permissions)
- Target `ChecklistItem` exists and is not already soft-deleted. — [FRS #16 — Delete](http://localhost:8080/root/trade-finance/-/issues/16#3-delete)
- `ConcurrencyStamp` matches the current stored value; mismatch throws `AbpDbConcurrencyException` (HTTP 409). — [FRS #16 — Concurrency](http://localhost:8080/root/trade-finance/-/issues/16#5-concurrency)

**Postconditions:**
- `IsDeleted = true`, `DeletionTime`, and `DeleterId` are set by `FullAuditedAggregateRoot`'s `ISoftDelete` implementation. The row is retained in the database and excluded from all queries via ABP's global soft-delete filter. — [FRS #16 — Delete behavior](http://localhost:8080/root/trade-finance/-/issues/16#4-delete-behavior)
- Sequence numbers of all remaining non-deleted items with `SequenceNumber > deleted item's SequenceNumber` are decremented by one, restoring the gap-free invariant. — [FRS #16 — Resequence](http://localhost:8080/root/trade-finance/-/issues/16#4-resequence)
- The deleted item and all resequenced items are persisted within the same EF Core transaction.
- The audit record is retained for minimum 7 years per retention policy. — [FRS #17 — Retention](http://localhost:8080/root/trade-finance/-/issues/17#6-retention)
- Caller must reload the list; no realtime push per [NoRealtimeRefreshDecision](http://localhost:8080/root/trade-finance/-/wikis/decisions/NoRealtimeRefreshDecision).

**Domain events raised:** none — soft-delete is a local operation with no external consumer.

**Side effects:** none beyond soft-delete persistence, audit trail population, and sequence compaction on remaining items.

**Source:**
- [FRS #16 — Delete](http://localhost:8080/root/trade-finance/-/issues/16#3-delete)
- [FRS #16 — Delete behavior](http://localhost:8080/root/trade-finance/-/issues/16#4-delete-behavior)
- [FRS #16 — Resequence](http://localhost:8080/root/trade-finance/-/issues/16#4-resequence)
- [FRS #16 — Permissions](http://localhost:8080/root/trade-finance/-/issues/16#9-permissions)
- [FRS #17 — Retention](http://localhost:8080/root/trade-finance/-/issues/17#6-retention)
- [FRS #16 — Concurrency](http://localhost:8080/root/trade-finance/-/issues/16#5-concurrency)

## Change History

- **1.0** (2026-05-07): Initial draft from Bank Settings milestone feat spec generation.
