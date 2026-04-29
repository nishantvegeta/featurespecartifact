---
id: delete-checklist-item
name: DeleteChecklistItem
type: command
version: 1.0.0
created: 2026-04-29
last_modified: 2026-04-29
---

# DeleteChecklistItem

**Node type:** Command

**Actor:** [BankAdmin](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/actors/BankAdmin)

**Target aggregate:** [ChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/entities/ChecklistItem)

**Purpose:** Bank administrators permanently remove obsolete or redundant checklist items from the system.

**Audience:** Private

**Input DTO**

| Field | Type | Required | Validation | Notes |
|-------|------|----------|------------|-------|
| Id | Guid | Yes | Valid existing item ID | Item identifier |

**Validation:** `DeleteChecklistItemInputValidator` (FluentValidation)

**Output DTO:** none (void)

**Authorization:** `TradeFinancePermissions.ChecklistItems.Delete`

**HTTP route:** DELETE `/api/private/app/bank-settings/checklist-items/{id}`

**Preconditions:** Item exists; user owns tenant

**Postconditions:** Item permanently removed from data store; no recovery possible; remaining items retain SequenceNumbers (no renumbering from gaps)

**Domain events raised**

| Event | Required/Optional | Consumer |
|-------|-------------------|----------|
| ChecklistItemDeleted | Optional | Future messaging integration |

**Source**

- [FRS #20 — Purpose](http://localhost:8080/root/trade-finance/-/issues/20#1-purpose)
- [FRS #20 — Main Flow](http://localhost:8080/root/trade-finance/-/issues/20#7-main-flow)

## Change History

- v1.0.0 (2026-04-29): Created from feat spec bank-settings.
