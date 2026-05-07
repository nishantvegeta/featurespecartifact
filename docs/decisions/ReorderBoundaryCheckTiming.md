---
id: reorder-boundary-check-timing
name: ReorderBoundaryCheckTiming
type: Decision
version: "1.0"
created: "2026-05-07"
last_modified: "2026-05-07"
---

**Node type:** Decision
**Title:** Pre-validate NewSequenceNumber range before writing to enforce 422 before any mutation
**Status:** Accepted (pending product owner confirmation per Conflict CF-W04)

**Context:**
FRS [#15 — Reorder validation](http://localhost:8080/root/trade-finance/-/issues/15#5-reorder-validation) requires that the new sequence number for a reorder operation is within the valid range `[1, totalNonDeletedItemCount]` for the tenant. Two timing strategies exist for this check: pre-validation (count non-deleted items, validate range, and only then apply the reorder) or post-validation (apply the reorder and rely on the gap-free invariant enforcement to detect and roll back an out-of-range value). The choice affects error UX and transactional complexity.

**Decision:**
`ReorderChecklistItem` performs pre-validation. The domain service (or AppService) counts non-deleted `ChecklistItem` rows for the tenant before any write, checks that `NewSequenceNumber` is within `[1, count]`, and throws a `BusinessException` (HTTP 422 Unprocessable Entity) if the range is violated. The check and the subsequent reorder write both occur within the same database transaction to prevent a TOCTOU race where the item count changes between check and write.

**Rationale:**
- Pre-validation produces a predictable HTTP 422 response before any mutation occurs, giving the UI a clear signal to show an inline validation message. Post-validation would require a rolled-back transaction and a re-wrapped exception to produce an equivalent 422, adding complexity for no gain.
- If the range check fails, no DB row is touched. This is cleaner for audit trail: no partial writes, no rolled-back modification timestamps.
- Wrapping both the count query and the reorder write in one transaction prevents the TOCTOU race: if another admin deletes an item concurrently, the count re-checked at write time is consistent.
- The optimistic concurrency stamp on the primary target item catches concurrent modifications to the item being moved; the pre-validation count catches changes to the overall list size.

**Rejected alternatives:**
- **Post-validation (apply reorder, then check invariant):** rejected because it requires writing rows to the database and then rolling back on invariant failure. This produces write amplification, may trigger unnecessary `LastModificationTime` updates on shifted items, and yields a less clear error response (rollback-derived exception vs. explicit business exception before any write).
- **No range validation (accept out-of-range and clamp to nearest boundary):** rejected because silently clamping an admin's explicit position request violates the principle of least surprise and introduces a discrepancy between what the BankAdmin intended and what the system did, with no visible feedback.

**Consequences:**
- **Positive:** BankAdmin receives a clear 422 with an informative message if the target position is out of bounds; no partial mutation occurred.
- **Positive:** No wasted write-then-rollback cycles in the normal error path.
- **Negative:** The additional `COUNT` query before the write is an extra DB round-trip per reorder operation; negligible at expected volumes (checklists are short, operations are low-frequency human-initiated).
- **Negative:** The count query and the write must be in the same transaction; the repository and domain service must not release the transaction between them, which requires attention when refactoring.

**Revisit if:** Bulk programmatic reorder operations are introduced that make the extra COUNT query a performance concern.

**Source:**
- [FRS #15 — Reorder validation](http://localhost:8080/root/trade-finance/-/issues/15#5-reorder-validation)
- [FRS #15 — Data model](http://localhost:8080/root/trade-finance/-/issues/15#5-data-model)

## Change History

- **1.0** (2026-05-07): Initial draft from Bank Settings milestone feat spec generation.
