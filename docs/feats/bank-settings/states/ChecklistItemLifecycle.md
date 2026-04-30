---
id: state-checklist-item-lifecycle
name: ChecklistItemLifecycle
type: state
version: 1.0
created: 2026-04-28
last_modified: 2026-04-28
---

# ChecklistItemLifecycle

**Type:** State machine for checklist item lifecycle

## State Transitions

```
Created
  ↓
Active
  ↔ (ToggleChecklistItemStatusCommand)
Inactive
  ↓
  ├→ Edited (EditChecklistItemCommand)
  ├→ Reordered (ReorderChecklistItemCommand)
  └→ Deleted (DeleteChecklistItemCommand)
```

## States

1. **Created:** Item instantiated with initial SequenceNumber, Description, IsActive=true
2. **Active:** Item included in LC review checklists (IsActive=true)
3. **Inactive:** Item toggled to inactive (IsActive=false); hidden from LC review
4. **Edited:** Description updated; SequenceNumber/Status unchanged
5. **Reordered:** SequenceNumber changed via up/down movement
6. **Deleted:** Soft-deleted (IsDeleted=true); no longer visible in queries

## Valid Transitions

| From | To | Operation | Allowed |
|------|----|-----------|---------| 
| Created | Active | Initialization | ✓ (default) |
| Active | Inactive | ToggleChecklistItemStatusCommand | ✓ |
| Inactive | Active | ToggleChecklistItemStatusCommand | ✓ |
| Any | Edited | EditChecklistItemCommand | ✓ |
| Any | Reordered | ReorderChecklistItemCommand | ✓ (if not boundary) |
| Any | Deleted | DeleteChecklistItemCommand | ✓ (idempotent) |

## Notes

- **No return from Deleted:** Once deleted, item is soft-deleted and cannot be restored
- **Edit immutability:** Editing preserves SequenceNumber and IsActive
- **Reorder immutability:** Reordering preserves Description and IsActive
- **Status independence:** Toggling status does not affect ability to edit or reorder

## Source

- [FRS #15 through FRS #20 — Main Flows](http://localhost:8080/root/trade-finance/-/issues/15)

## Change History

| Version | Date | Author | Notes |
|---------|------|--------|-------|
| 1.0 | 2026-04-28 | generate-feat-spec skill | Initial state synthesis |
