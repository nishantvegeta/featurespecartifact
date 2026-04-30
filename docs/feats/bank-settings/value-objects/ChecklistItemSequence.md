---
id: value-object-checklist-item-sequence
name: ChecklistItemSequence
type: value-object
version: 1.0
created: 2026-04-28
last_modified: 2026-04-28
---

# ChecklistItemSequence

**Type:** Immutable integer value object for ordering

## Semantics

- **One-based indexing:** Starts at 1 (not 0)
- **Uniqueness:** Unique per tenant
- **Auto-managed:** Assigned on creation; automatically recalculated on reorder/delete
- **Display:** Shown as "S.N." in UI table

## Auto-Management Rules

1. On CreateChecklistItem: Assign next available sequence (max current + 1)
2. On ReorderChecklistItem: Swap sequence numbers with adjacent item atomically
3. On DeleteChecklistItem: Recalculate all remaining items (renumber 1, 2, 3...)
4. On EditChecklistItem: Preserve sequence number (immutable field)
5. On ToggleChecklistItemStatus: Preserve sequence number (immutable field)

## Usage

Used in:
- ChecklistItem
- ReorderChecklistItemCommand
- GetChecklistItemsQuery (sort by SequenceNumber ascending)

## Source

- [FRS #15 — Functional Requirements](http://localhost:8080/root/trade-finance/-/issues/15#12-functional-requirements)
- [FRS #19 — Functional Requirements](http://localhost:8080/root/trade-finance/-/issues/19#12-functional-requirements)

## Change History

| Version | Date | Author | Notes |
|---------|------|--------|-------|
| 1.0 | 2026-04-28 | generate-feat-spec skill | Initial value object synthesis |
