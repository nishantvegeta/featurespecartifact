---
id: conflict-concurrent-edit-conflict
name: Concurrent Edit by Multiple Administrators
type: conflict
version: 1.0
created: 2026-04-28
last_modified: 2026-04-28
---

# Concurrent Edit by Multiple Administrators

**Blocking Severity:** high

**Type:** concurrent-write

## Description

Two Bank Admins simultaneously edit the same ChecklistItem description.

**Scenario:**
1. Admin A opens edit dialog for Item 5, loads current description: "old text"
2. Admin B opens edit dialog for Item 5, loads same description: "old text"
3. Admin A submits edit: "Admin A's new text" → succeeds
4. Admin B submits edit: "Admin B's new text" → succeeds (overwrites Admin A)

**Outcome:** Admin A's edit is silently overwritten; no notification.

## Current Resolution (Last-Write-Wins)

**Mechanism:**
- EditChecklistItemCommand loads item by ItemId
- Sets Description = user's input
- Persists to database
- No version checking

**Result:** Last command to complete overwrites earlier edit

**Risk:** Data loss (Admin A's change discarded)

## Proposed Resolution (Optimistic Locking)

**Mechanism:**
1. Add IHasConcurrencyStamp to ChecklistItem entity
2. EF Core auto-manages ConcurrencyStamp on each update
3. EditChecklistItemCommand loads entity WITH ConcurrencyStamp
4. On SaveChanges(), EF Core checks ConcurrencyStamp match
5. If mismatch: DbUpdateConcurrencyException thrown
6. Catch exception; reject edit with "Item was modified by another user. Reload and try again."

**Benefit:** Prevents silent data loss; user notified of conflict

**Drawback:** Slightly more complex; requires entity refresh to retry

## Decision (TBD)

| Option | Pros | Cons | Recommendation |
|--------|------|------|---|
| Last-write-wins (current) | Simple; no changes | Data loss risk | Use for v1.0; monitor |
| Optimistic locking | Prevents data loss | Slightly more complex | Implement in v1.1+ if needed |
| Distributed lock | Strict serialization | Performance impact | Overkill for this scenario |

## Mitigation for v1.0

1. Document last-write-wins behavior in API docs
2. Monitor for concurrent edit incidents
3. If incidents occur frequently, implement optimistic locking in v1.1

## Source

- [FRS #17 — Edge Cases](http://localhost:8080/root/trade-finance/-/issues/17#16-edge-cases) (mentions concurrent edits)

## Change History

| Version | Date | Author | Notes |
|---------|------|--------|-------|
| 1.0 | 2026-04-28 | generate-feat-spec skill | Initial conflict synthesis; TBD resolution |
