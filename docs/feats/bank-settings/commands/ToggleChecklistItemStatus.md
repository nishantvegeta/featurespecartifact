---
id: toggle-checklist-item-status
name: ToggleChecklistItemStatus
type: command
version: 1.0.0
created: 2026-04-29
last_modified: 2026-04-29
---

# ToggleChecklistItemStatus

**Node type:** Command

**Actor:** [BankAdmin](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/actors/BankAdmin)

**Target aggregate:** [ChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/entities/ChecklistItem)

**Purpose:** Bank administrators activate and deactivate checklist items without deletion, allowing flexible control over which requirements are enforced.

**Audience:** Private

**Input DTO**

| Field | Type | Required | Validation | Notes |
|-------|------|----------|------------|-------|
| Id | Guid | Yes | Valid existing item ID | Item identifier |

**Validation:** `ToggleChecklistItemStatusInputValidator` (FluentValidation)

**Output DTO:** `ChecklistItemDto`

**Authorization:** `TradeFinancePermissions.ChecklistItems.Update`

**HTTP route:** PATCH `/api/private/app/bank-settings/checklist-items/{id}/status`

**Preconditions:** Item exists; user owns tenant

**Postconditions:** IsActive toggled (Active ↔ Inactive); Description and SequenceNumber unchanged

**Domain events raised**

| Event | Required/Optional | Consumer |
|-------|-------------------|----------|
| ChecklistItemStatusToggled | Optional | Future messaging integration |

**Source**

- [FRS #18 — Purpose](http://localhost:8080/root/trade-finance/-/issues/18#1-purpose)
- [FRS #18 — Main Flow](http://localhost:8080/root/trade-finance/-/issues/18#7-main-flow)

## Change History

- v1.0.0 (2026-04-29): Created from feat spec bank-settings.
