---
id: checklist-item-description
name: ChecklistItemDescription
type: value-object
version: 1.0.0
created: 2026-04-29
last_modified: 2026-04-29
---

# ChecklistItemDescription

**Node type:** Value Object

**Module:** Bank Settings

**Purpose:** Encapsulates the immutable text of a verification requirement in the LC issuance checklist. Ensures consistent validation and length constraints.

**Base class:** stored as string property on [ChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/entities/ChecklistItem) (demoted from VO pattern due to single primitive attribute)

**Attributes**

| Name | Type | Required | Validation | Notes |
|------|------|----------|------------|-------|
| Value | string | Yes | Length [1, 500], non-whitespace | Requirement text |

**Equality rule:** Two descriptions are equal iff their text values match (case-sensitive)

**Invariants**

- Length must be between 1 and 500 characters
- No leading/trailing whitespace
- Non-empty after trimming

**Used by**

- [ChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/entities/ChecklistItem) — `Description` field

**Source**

- [FRS #16 — Form Fields](http://localhost:8080/root/trade-finance/-/issues/16#11-form-fields)
- [FRS #17 — Form Fields](http://localhost:8080/root/trade-finance/-/issues/17#11-form-fields)

## Change History

- v1.0.0 (2026-04-29): Created from feat spec bank-settings.
