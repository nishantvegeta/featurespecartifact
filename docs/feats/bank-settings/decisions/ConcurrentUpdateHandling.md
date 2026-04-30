---
id: decision-concurrent-update-handling
name: ConcurrentUpdateHandling
type: decision
version: 1.0
created: 2026-04-28
last_modified: 2026-04-28
---

# ConcurrentUpdateHandling

**Type:** Concurrency conflict resolution strategy

## Scenario 1: Item Deleted by Another Admin During Edit

**Trigger:**
1. Admin A opens edit dialog for Item X
2. Admin B deletes Item X
3. Admin A submits edit for Item X

**Detection:**
- EditChecklistItemCommand loads item by ItemId
- Item not found or IsDeleted=true

**Resolution:**
- Command fails with "Item no longer exists" error
- UI: Error toast displayed
- Dialog: Remains open with user's entered text preserved (no data loss)
- User: Can copy text and manually add as new item if desired

**Status:** RESOLVED ✓ — Graceful error handling

## Scenario 2: Concurrent Status Toggles

**Trigger:**
1. Admin A clicks toggle for Item X (Active → Inactive)
2. Admin B clicks toggle for Item X (Active → Inactive)
3. Both complete within milliseconds

**Detection:**
- Both operations load Item X concurrently
- Both see IsActive=true
- Both proceed with toggle

**Resolution:** Last-write-wins
- Both operations persist IsActive=false
- Final state: Inactive (both wanted same result)
- OR: Last-write-wins may produce unexpected result if admins toggled in different directions

**Current approach:** Last-write-wins (implicit in EF Core default)

**Improvement opportunity:** Consider optimistic locking with IHasConcurrencyStamp if strict ordering required

## Scenario 3: Concurrent Edits (Different Fields)

**Trigger:**
1. Admin A and Admin B open edit dialogs for Item X
2. Admin A submits edit
3. Admin B submits edit (with older description loaded)

**Detection:**
- Both load Item X, get current description
- Admin A updates successfully
- Admin B's update overwrites Admin A's change

**Resolution:** Last-write-wins
- Admin A's edit is silently overwritten by Admin B
- Data loss: Admin A's change not preserved

**Current approach:** Last-write-wins (implicit)

**Problem:** No notification that concurrent change occurred

**TBD:** Consider optimistic locking:
- Add IHasConcurrencyStamp to ChecklistItem
- Load entity with ConcurrencyStamp
- On update, check ConcurrencyStamp mismatch
- If mismatch, reject with "Item was modified by another user. Reload and try again."

## Scenario 4: Concurrent Reorders

**Trigger:**
1. Admin A reorders Item 2 up (swap with Item 1)
2. Admin B reorders Item 3 down (swap with Item 2)
3. Both complete within milliseconds

**Detection:**
- Both operations load items concurrently
- Both update SequenceNumber values
- Database receives both updates

**Resolution:** Transaction isolation
- Both updates complete or both roll back
- Final state depends on transaction commit order (last-write-wins)

**Status:** MITIGATED ✓ — Transaction isolation prevents partial reordering

## Scenario 5: Concurrent Deletes

**Trigger:**
1. Admin A clicks delete for Item X
2. Admin B clicks delete for Item X
3. Both confirm deletion simultaneously

**Detection:**
- First delete: Sets IsDeleted=true
- Second delete: Item already IsDeleted=true

**Resolution:** Idempotent delete
- Both deletions return success
- No duplicate deletion logic
- No error thrown

**Status:** HANDLED ✓ — Idempotent operation

## Summary Table

| Scenario | Resolution | Status | Risk |
|----------|-----------|--------|------|
| Delete during edit | Error + notification | RESOLVED | Low |
| Concurrent toggles (same direction) | Last-write-wins | HANDLED | Low |
| Concurrent edits (different versions) | Last-write-wins (data loss) | TBD | High |
| Concurrent reorders | Transaction isolation | HANDLED | Low |
| Concurrent deletes | Idempotent | HANDLED | Low |

## Recommendations

1. **High Risk (Concurrent Edits):**
   - Consider adding IHasConcurrencyStamp to ChecklistItem
   - Implement optimistic locking in EditChecklistItemCommand
   - Reject updates if ConcurrencyStamp mismatch detected
   - User re-loads and tries again with fresh data

2. **Low Risk Scenarios:**
   - Current last-write-wins approach acceptable
   - Document behavior in API documentation

## Source

- [FRS #17 — Exception Flows](http://localhost:8080/root/trade-finance/-/issues/17#9-exception-flows)
- [FRS #18 — Edge Cases](http://localhost:8080/root/trade-finance/-/issues/18#16-edge-cases)
- [FRS #20 — Edge Cases](http://localhost:8080/root/trade-finance/-/issues/20#16-edge-cases)

## Change History

| Version | Date | Author | Notes |
|---------|------|--------|-------|
| 1.0 | 2026-04-28 | generate-feat-spec skill | Initial decision synthesis |
