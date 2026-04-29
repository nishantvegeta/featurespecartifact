---
id: sequence-number
name: SequenceNumber
type: value-object
version: 1.0.0
created: 2026-04-29
last_modified: 2026-04-29
---

# SequenceNumber

**Node type:** Value Object

**Module:** Bank Settings

**Purpose:** Represents the position of a checklist item in the review sequence. Maintains ordering invariant (1, 2, 3...).

**Base class:** stored as `int` property on [ChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/entities/ChecklistItem)

**Attributes**

| Name | Type | Required | Validation | Notes |
|------|------|----------|------------|-------|
| Value | int | Yes | ≥ 1 | Position in sequence |

**Equality rule:** Two sequence numbers are equal iff their integer values match

**Invariants**

- Must be ≥ 1
- No gaps (1, 2, 3... with no missing numbers for a tenant's checklist)
- Unique within tenant's checklist

**Used by**

- [ChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/entities/ChecklistItem) — `SequenceNumber` field
- [ListChecklistItems](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/queries/ListChecklistItems) — default sort key

**Source**

- [FRS #15 — Main Flow](http://localhost:8080/root/trade-finance/-/issues/15#7-main-flow)
- [FRS #19 — Purpose](http://localhost:8080/root/trade-finance/-/issues/19#1-purpose)

## Change History

- v1.0.0 (2026-04-29): Created from feat spec bank-settings.
