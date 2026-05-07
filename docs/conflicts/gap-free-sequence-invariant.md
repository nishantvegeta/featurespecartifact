---
id: conflict-gap-free-sequence-invariant
name: gap-free-sequence-invariant
type: Conflict
version: "1.0"
created: "2026-05-07"
last_modified: "2026-05-07"
---

**Node type:** Conflict
**Conflict ID:** CF-W03
**Source:** [FRS #15 — Data model](http://localhost:8080/root/trade-finance/-/issues/15#5-data-model)
**Source FRS:** #15
**Conflict type:** `missing_precondition`
**Blocking severity:** medium

**Description:**
FRS #15 requires that `SequenceNumber` values for non-deleted checklist items within a tenant are always contiguous and 1-based with no gaps. This invariant must be maintained across three mutation operations: Create (append at end), Delete (compact remaining items), and Reorder (shift items between old and new positions). FRS does not specify the enforcement mechanism. Three candidate strategies exist: (1) a domain service that exclusively manages sequence assignment and compaction, (2) application-level best-effort ordering with a DB CHECK constraint as a guard, and (3) a DB-level trigger. The choice affects locking behavior, testability, and the risk of race conditions under concurrent writes.

**Affected categories:**
- `ChecklistItem` entity invariant: gap-free `SequenceNumber`
- `CreateChecklistItem`, `DeleteChecklistItem`, `ReorderChecklistItem` commands (mutation logic)
- Domain service (`ChecklistItemManager`) — responsible for sequencing operations
- Repository: whether a row-locking query is needed to prevent concurrent sequence corruption

**Resolution question:**
Should the gap-free `SequenceNumber` invariant be enforced exclusively by a domain service (`ChecklistItemManager`) that acquires a pessimistic advisory lock (or uses `SELECT ... FOR UPDATE` via EF Core raw query) on the tenant's checklist rows before each sequencing mutation, or is optimistic concurrency (the `ConcurrencyStamp` on the individual item) sufficient to protect the invariant under the expected concurrent mutation rate?

**Suggested options:**
- **Option A — Domain service with row-level locking on the tenant's checklist:** Domain service reads all non-deleted items for the tenant with a locking query before any sequence mutation, computes the new sequence, and writes atomically. Pros: absolute prevention of concurrent sequence corruption. Cons: serializes all sequence mutations for a tenant; higher contention if many admins operate simultaneously (acceptable given low-frequency nature of this operation).
- **Option B — Domain service with optimistic concurrency only:** Each mutation updates sequence numbers in a single transaction without explicit locking. If two concurrent mutations corrupt the sequence (extremely rare given the low-frequency nature of checklist management), the gap-free invariant is violated until repaired by a subsequent mutation. Pros: simpler; no lock acquisition. Cons: technically possible (though extremely unlikely) to produce gaps under concurrent mutations; no guaranteed invariant without locking.
- **Option C — DB CHECK constraint as fallback guard:** Add a deferred DB constraint that fires at commit time if a gap is detected. Pros: database-level safety net. Cons: PostgreSQL deferred constraints on derived invariants (gap detection) require non-trivial trigger logic; not idiomatic for EF Core projects.

**Default if unresolved:** Option A (domain service with transactional sequencing — all non-deleted items read and resequenced within a single EF Core transaction) is adopted as the default for this synthesis, as it is the safest approach for the correctness guarantee required by the FRS invariant.

**Status:** Open

## Change History

- **1.0** (2026-05-07): Initial draft from Bank Settings milestone feat spec generation.
