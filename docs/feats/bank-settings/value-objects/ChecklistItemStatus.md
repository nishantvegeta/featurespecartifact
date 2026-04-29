---
id: checklist-item-status
name: ChecklistItemStatus
type: value-object
version: 1.0.0
created: 2026-04-29
last_modified: 2026-04-29
---

# ChecklistItemStatus

**Node type:** Value Object

**Module:** Bank Settings

**Purpose:** Encapsulates the active/inactive state of a checklist item. Stored as enum with camelCase string serialization.

**Base class:** C# enum `ChecklistItemStatus { Active = 0, Inactive = 1 }`

**Attributes**

| Name | Type | Required | Validation | Notes |
|------|------|----------|------------|-------|
| Active | enum | Yes | — | Item included in active LC review checklists |
| Inactive | enum | Yes | — | Item excluded from active LC review checklists |

**Equality rule:** Two statuses are equal iff their enum values match

**Invariants**

- Only two valid states: Active or Inactive
- No null or undefined states allowed
- Serialized as lowercase camelCase string ("active", "inactive") per global `JsonStringEnumConverter`

**Used by**

- [ChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/entities/ChecklistItem) — `IsActive` field (boolean representation; enum name reference)
- [ListChecklistItems](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/queries/ListChecklistItems) — filter parameter
- [ChecklistItemStatus](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/states/ChecklistItemStatus) — state definition

**Source**

- [FRS #15 — Scope](http://localhost:8080/root/trade-finance/-/issues/15#2-scope)
- [FRS #18 — Purpose](http://localhost:8080/root/trade-finance/-/issues/18#1-purpose)

## Change History

- v1.0.0 (2026-04-29): Created from feat spec bank-settings.
