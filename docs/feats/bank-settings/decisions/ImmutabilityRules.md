---
id: decision-immutability-rules
name: ImmutabilityRules
type: decision
version: 1.0
created: 2026-04-28
last_modified: 2026-04-28
---

# ImmutabilityRules

**Type:** Field immutability constraints per operation

## Rule 1: SequenceNumber Immutable During Edit

**Field:** SequenceNumber

**Operation:** EditChecklistItemCommand (description update)

**Constraint:** SequenceNumber must not change during edit

**Enforcement:**
- Domain service: Preserves SequenceNumber from loaded entity
- Rejection: Any attempt to modify SequenceNumber in edit is silently ignored (field not editable)
- Consequence: Reordering requires separate ReorderChecklistItemCommand

**Rationale:** Sequence numbering managed by reordering logic; edit is description-only

## Rule 2: IsActive Immutable During Edit

**Field:** IsActive (status/visibility flag)

**Operation:** EditChecklistItemCommand (description update)

**Constraint:** IsActive must not change during edit

**Enforcement:**
- Domain service: Preserves IsActive from loaded entity
- Rejection: Any attempt to modify IsActive in edit is silently ignored
- Consequence: Status toggling requires separate ToggleChecklistItemStatusCommand

**Rationale:** Toggling status is a separate concern from description editing

## Rule 3: IsActive Immutable During Reorder

**Field:** IsActive (status/visibility flag)

**Operation:** ReorderChecklistItemCommand (sequence number swap)

**Constraint:** IsActive must not change during reorder

**Enforcement:**
- Domain service: Preserves IsActive during sequence number swap
- Rejection: IsActive field excluded from swap logic

**Rationale:** Reordering is about sequence; status changes are separate

## Rule 4: CreatedAt/CreatedBy Immutable

**Fields:** CreatedAt, CreatedBy

**Operations:** All operations (edit, toggle, reorder, delete)

**Constraint:** Audit fields immutable

**Enforcement:**
- Framework (ABP): FullAuditedAggregateRoot enforces immutability
- Rejection: Any attempt to modify creation audit fails

**Rationale:** Audit trail integrity

## Source

- [FRS #17 — Business Rules](http://localhost:8080/root/trade-finance/-/issues/17#15-business-rules)
- [FRS #19 — Business Rules](http://localhost:8080/root/trade-finance/-/issues/19#15-business-rules)

## Change History

| Version | Date | Author | Notes |
|---------|------|--------|-------|
| 1.0 | 2026-04-28 | generate-feat-spec skill | Initial decision synthesis |
