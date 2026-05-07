---
id: conflict-reorder-boundary-check-timing
name: reorder-boundary-check-timing
type: Conflict
version: "1.0"
created: "2026-05-07"
last_modified: "2026-05-07"
---

**Node type:** Conflict
**Conflict ID:** CF-W04
**Source:** [FRS #15 — Reorder validation](http://localhost:8080/root/trade-finance/-/issues/15#5-reorder-validation)
**Source FRS:** #15
**Conflict type:** `missing_precondition`
**Blocking severity:** low

**Description:**
FRS #15 requires that the new sequence number for a `ReorderChecklistItem` operation is within the valid range `[1, totalNonDeletedItemCount]` for the tenant. The specification does not state whether this range check should be applied before any database write (pre-validation, returning HTTP 422 before any mutation) or after applying the reorder (post-validation, rolling back if the resulting state violates the invariant). Both strategies enforce the invariant but differ in when the error is surfaced and whether any rows are written to the database before the error is detected.

**Affected categories:**
- `ReorderChecklistItem` command (validation logic placement)
- Domain service (`ChecklistItemManager`) — sequencing and validation
- Error handling: HTTP 422 vs. rollback-derived error for out-of-range inputs

**Resolution question:**
For `ReorderChecklistItem`, should the `NewSequenceNumber` range validation be performed before any database write (pre-validation: count items, check range, throw business exception with HTTP 422 if invalid — no rows touched), or after applying the reorder in a transaction that rolls back if the resulting state is invalid (post-validation)?

**Suggested options:**
- **Option A — Pre-validation (adopted default):** Count non-deleted items within the transaction, validate `NewSequenceNumber ∈ [1, count]`, throw `BusinessException` (HTTP 422) if out of range, never touch reorder writes on invalid input. Pros: cleaner UX (explicit 422 before any mutation); no write-amplification on error path; consistent with standard ABP FluentValidation-first approach. Cons: one extra COUNT query per reorder call.
- **Option B — Post-validation:** Apply shifts within the transaction; if the resulting sequence contains a gap or out-of-range value, roll back and throw. Pros: no extra COUNT query. Cons: causes unnecessary write amplification on the error path; rollback-derived error is harder to map cleanly to HTTP 422; more complex transaction management.

**Default if unresolved:** Option A (pre-validation) per the [ReorderBoundaryCheckTiming](http://localhost:8080/root/trade-finance/-/wikis/decisions/ReorderBoundaryCheckTiming) decision. This is the adopted default.

**Status:** Open

## Change History

- **1.0** (2026-05-07): Initial draft from Bank Settings milestone feat spec generation.
