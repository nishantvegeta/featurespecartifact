---
id: idempotent-edit-audit-behavior
name: IdempotentEditAuditBehavior
type: Decision
version: "1.0"
created: "2026-05-07"
last_modified: "2026-05-07"
---

**Node type:** Decision
**Title:** Short-circuit no-op edits before persistence to suppress redundant audit records
**Status:** Accepted (pending product owner confirmation per Conflict CF-W02)

**Context:**
FRS [#16 — Idempotent edit](http://localhost:8080/root/trade-finance/-/issues/16#3-idempotent-edit) does not specify whether submitting an identical description (no change) or calling toggle when the status already matches the requested direction should produce an ABP audit log entry. ABP's `FullAuditedAggregateRoot` records `LastModificationTime` and `LastModifierId` on every `SaveChanges` call, even if no data actually changed on the tracked entity. Two approaches are viable: allow EF Core to write a no-op update (generating an audit record with identical before/after values), or detect the no-op at the application service level and return success without persisting.

**Decision:**
Application service methods for `UpdateChecklistItemDescription` and `ToggleChecklistItemStatus` compare the incoming value against the current aggregate value before calling the domain service. If the incoming description is identical (case-sensitive string equality) to the stored description, `UpdateChecklistItemDescription` returns the current `ChecklistItemDto` without calling the domain service or saving changes. For `ToggleChecklistItemStatus`, the toggle always flips the state (Active → Inactive, Inactive → Active) by command contract, so a same-state scenario is impossible unless the caller crafts a non-standard invocation; this case is treated the same way — return current state without mutation. No ABP audit record is produced for a short-circuited call.

**Rationale:**
- Suppressing no-op audit records reduces audit log noise: an administrator reviewing the audit trail should see only meaningful changes, not phantom updates caused by double-clicks or retried network requests.
- EF Core change tracking already handles the case where entity properties are set to their current values (it generates no SQL UPDATE for unchanged columns), but `LastModificationTime` and `LastModifierId` fields are explicitly updated by ABP's `FullAuditedAggregateRoot` interceptor regardless of whether other fields changed — so early-exit is the only reliable way to suppress the audit record.
- The early-exit is idempotent: the caller receives a valid `ChecklistItemDto` with the current state, which is correct and safe.

**Rejected alternatives:**
- **Allow EF Core to proceed and record the audit entry:** rejected because it pollutes the audit trail with meaningless entries for retried requests, double-clicks, or form re-submissions, making compliance audits harder to read. The FRS retention requirement (7 years) amplifies the cost of noisy audit entries.
- **Suppress at the database level with a conditional UPDATE (WHERE Description != @new):** rejected because it silently swallows the operation at the DB layer without the application service being aware, and it bypasses ABP's concurrency stamp update mechanism, potentially leaving a stale stamp on the aggregate.

**Consequences:**
- **Positive:** Audit trail contains only meaningful state-change events.
- **Positive:** Retry-safe: clients can safely retry a network-failed edit without creating spurious audit records.
- **Negative:** Application service must perform an extra equality check before calling the domain service; this is a micro-cost that is negligible at expected call volumes.
- **Negative:** The adopted definition of "no-op" (case-sensitive exact equality for description) may differ from product expectations. If product requires case-insensitive equality (e.g., "VERIFY KYC" == "Verify KYC" as a no-op), this must be revisited. This is tracked in Conflict [CF-W02](http://localhost:8080/root/trade-finance/-/wikis/conflicts/idempotent-edit-audit-behavior).

**Revisit if:** Product owner confirms that a case-insensitive re-submission should also be treated as a no-op, or that all re-submissions regardless of content should produce an audit record (compliance audit trail requirement).

**Source:**
- [FRS #16 — Idempotent edit](http://localhost:8080/root/trade-finance/-/issues/16#3-idempotent-edit)

## Change History

- **1.0** (2026-05-07): Initial draft from Bank Settings milestone feat spec generation.
