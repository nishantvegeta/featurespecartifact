---
id: conflict-idempotent-edit-audit-behavior
name: idempotent-edit-audit-behavior
type: Conflict
version: "1.0"
created: "2026-05-07"
last_modified: "2026-05-07"
---

**Node type:** Conflict
**Conflict ID:** CF-W02
**Source:** [FRS #16 — Idempotent edit](http://localhost:8080/root/trade-finance/-/issues/16#3-idempotent-edit)
**Source FRS:** #16
**Conflict type:** `missing_postcondition`
**Blocking severity:** low

**Description:**
FRS #16 does not specify whether submitting an edit that results in no change (e.g., the same description re-submitted, or a toggle command processed twice in rapid succession against the same initial state via concurrent requests) should produce an ABP audit log entry or be silently suppressed. ABP's `FullAuditedAggregateRoot` automatically updates `LastModificationTime` and `LastModifierId` on every `SaveChanges` call for the tracked entity, regardless of whether domain-significant fields changed. If the application service allows the no-op to reach `SaveChanges`, a phantom audit record is produced with identical before/after values. If the service detects the no-op before calling the domain service, no audit record exists for the request.

**Affected categories:**
- `UpdateChecklistItemDescription` AppService method (no-op description detection)
- `ToggleChecklistItemStatus` AppService method (conceptual no-op case for rapid double-toggle)
- Audit trail completeness requirements under FRS #17

**Resolution question:**
For `UpdateChecklistItemDescription`: should the application service produce an ABP audit log entry when the submitted description is identical to the stored description (no semantic change), or should it short-circuit before `SaveChanges` to suppress the audit record? If the answer is "suppress", should the comparison be case-sensitive or case-insensitive?

**Suggested options:**
- **Option A — Short-circuit and suppress (adopted default):** Application service compares incoming vs. stored value before calling the domain service. If identical (case-sensitive), returns current DTO without persisting. Pros: clean audit trail; retry-safe; no phantom records. Cons: no audit evidence that the admin attempted a re-submission; case-sensitivity definition may not match product expectations.
- **Option B — Persist and record:** Allow the no-op to reach `SaveChanges`; an audit entry is created. Pros: every administrative action is traceable, even re-submissions. Cons: audit trail noise for retried requests; compliance auditors must interpret phantom entries.

**Default if unresolved:** Option A (short-circuit, suppress, case-sensitive comparison) per the [IdempotentEditAuditBehavior](http://localhost:8080/root/trade-finance/-/wikis/decisions/IdempotentEditAuditBehavior) decision. Product owner should confirm whether case-sensitive exact match is the correct equality definition.

**Status:** Open

## Change History

- **1.0** (2026-05-07): Initial draft from Bank Settings milestone feat spec generation.
