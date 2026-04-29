---
id: move-checklist-item
name: MoveChecklistItem
type: command
version: 1.0.0
created: 2026-04-29
last_modified: 2026-04-29
---

# MoveChecklistItem

**Node type:** Command

**Actor:** [BankAdmin](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/actors/BankAdmin)

**Target aggregate:** [ChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/entities/ChecklistItem)

**Purpose:** Bank administrators arrange checklist items in optimal review sequence using arrow controls.

**Audience:** Private

**Input DTO**

| Field | Type | Required | Validation | Notes |
|-------|------|----------|------------|-------|
| Id | Guid | Yes | Valid existing item ID | Item identifier |
| Direction | enum | Yes | "Up" \| "Down" | Move direction |

**Validation:** `MoveChecklistItemInputValidator` (FluentValidation; Direction must be Up or Down)

**Output DTO:** `ChecklistItemDto`

**Authorization:** `TradeFinancePermissions.ChecklistItems.Update`

**HTTP route:** PATCH `/api/private/app/bank-settings/checklist-items/{id}/reorder`

**Preconditions:** Item exists; Direction is valid; not at boundary (not Up for seq 1, not Down for last)

**Postconditions:** Item and adjacent item swap SequenceNumbers; all other attributes unchanged

**Domain events raised**

| Event | Required/Optional | Consumer |
|-------|-------------------|----------|
| ChecklistItemsReordered | Optional | Future messaging integration |

**Source**

- [FRS #19 — Purpose](http://localhost:8080/root/trade-finance/-/issues/19#1-purpose)
- [FRS #19 — Main Flow](http://localhost:8080/root/trade-finance/-/issues/19#7-main-flow)

## Change History

- v1.0.0 (2026-04-29): Created from feat spec bank-settings.
