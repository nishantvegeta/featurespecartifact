---
id: conflict-concurrent-delete-conflict
name: Item Deleted by Another Administrator During Edit
type: conflict
version: 1.0
created: 2026-04-28
last_modified: 2026-04-28
---

# Item Deleted by Another Administrator During Edit

**Blocking Severity:** high

**Type:** concurrent-delete

## Description

Admin A is editing Item 5 while Admin B deletes it before Admin A submits.

**Scenario:**
1. Admin A: Loads Item 5, opens edit dialog (reads current description)
2. Admin B: Deletes Item 5 (soft delete, IsDeleted=true)
3. Admin A: Submits edit for Item 5

## Resolution (Graceful Error Detection)

**Mechanism:**
1. EditChecklistItemCommand loads item by ItemId
2. Check if item exists AND IsDeleted=false:
   - If not found or IsDeleted=true: Raise "Item no longer exists" error
3. Do NOT proceed with edit
4. Return error to user

**UI Behavior:**
- Error toast: "Item no longer exists. Please refresh and try again."
- Dialog remains open
- User's entered text is preserved (no data loss for user)

**User Recovery:**
- User can copy entered text
- Click "Cancel" or "X" to close dialog
- Manually add as new item if needed

## Why This Works

1. **Detection:** Timestamp-based soft delete makes item invisible to queries
2. **Prevention:** Edit fails before persisting invalid change
3. **UX:** User notified immediately; no silent failures
4. **Data integrity:** Deleted item never partially restored

## Idempotency

**DeleteChecklistItemCommand is idempotent:**
- Deleting an already-deleted item returns success (no error)
- Safe to retry failed deletes
- Prevents double-deletion logic

## Status

**RESOLVED ✓** — Graceful error handling prevents data corruption.

## Source

- [FRS #17 — Exception Flows](http://localhost:8080/root/trade-finance/-/issues/17#9-exception-flows) (Item No Longer Exists scenario)
- [FRS #20 — Exception Flows](http://localhost:8080/root/trade-finance/-/issues/20#9-exception-flows)

## Change History

| Version | Date | Author | Notes |
|---------|------|--------|-------|
| 1.0 | 2026-04-28 | generate-feat-spec skill | Initial conflict synthesis; resolved |
