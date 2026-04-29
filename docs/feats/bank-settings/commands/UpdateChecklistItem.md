---
id: update-checklist-item
name: UpdateChecklistItem
type: command
version: 1.0.0
created: 2026-04-29
last_modified: 2026-04-29
---

# UpdateChecklistItem

**Node type:** Command

**Actor:** [BankAdmin](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/actors/BankAdmin)

**Target aggregate:** [ChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/entities/ChecklistItem)

**Purpose:** Bank administrators update checklist item descriptions to refine verification requirements or correct errors.

**Audience:** Private

**Input DTO**

| Field | Type | Required | Validation | Notes |
|-------|------|----------|------------|-------|
| Id | Guid | Yes | Valid existing item ID | Item identifier |
| Description | string | Yes | Non-empty, max 500 chars | Updated requirement text |

**Validation:** `UpdateChecklistItemInputValidator` (FluentValidation)

**Output DTO:** `ChecklistItemDto`

**Authorization:** `TradeFinancePermissions.ChecklistItems.Update`

**HTTP route:** PUT `/api/private/app/bank-settings/checklist-items/{id}`

**Preconditions:** Item exists; Description valid; user owns tenant

**Postconditions:** Description updated; SequenceNumber and IsActive unchanged

**Domain events raised**

| Event | Required/Optional | Consumer |
|-------|-------------------|----------|
| ChecklistItemUpdated | Optional | Future messaging integration |

**Source**

- [FRS #17 — Purpose](http://localhost:8080/root/trade-finance/-/issues/17#1-purpose)
- [FRS #17 — Main Flow](http://localhost:8080/root/trade-finance/-/issues/17#7-main-flow)

## Change History

- v1.0.0 (2026-04-29): Created from feat spec bank-settings.
