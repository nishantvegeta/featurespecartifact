---
id: add-checklist-item
name: AddChecklistItem
type: command
version: 1.0.0
created: 2026-04-29
last_modified: 2026-04-29
---

# AddChecklistItem

**Node type:** Command

**Name:** AddChecklistItem

**Actor:** [BankAdmin](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/actors/BankAdmin)

**Target aggregate:** [ChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/entities/ChecklistItem)

**Purpose:** Bank administrators add new LC verification requirements to the checklist, expanding the scope of review criteria.

**Audience:** Private (internal backoffice)

**Input DTO**

| Field | Type | Required | Validation | Notes |
|-------|------|----------|------------|-------|
| Description | string | Yes | Non-empty, max 500 chars | Verification requirement text |

**Input DTO base:** `CreateUpdateDto`

**Validation:** `AddChecklistItemInputValidator` (FluentValidation)

**Output DTO:** `ChecklistItemDto` (Id, Description, SequenceNumber, IsActive)

**Authorization:** `TradeFinancePermissions.ChecklistItems.Create`

**HTTP route:** POST `/api/private/app/bank-settings/checklist-items`

**Preconditions**

- User has Bank Admin role
- User has Create permission
- Description is valid (1–500 chars, non-empty)
- TenantId implicit from current tenant context

**Postconditions**

- ChecklistItem created and persisted to data store
- Assigned next available SequenceNumber
- IsActive set to true by default
- ChecklistItem appears immediately in List queries for this tenant

**Domain events raised**

| Event | Required/Optional | Consumer |
|-------|-------------------|----------|
| ChecklistItemAdded | Optional | Future messaging integration |

**Side effects**

None (command is self-contained; no downstream notifications/side effects specified).

**Source**

- [FRS #16 — Purpose](http://localhost:8080/root/trade-finance/-/issues/16#1-purpose)
- [FRS #16 — Main Flow](http://localhost:8080/root/trade-finance/-/issues/16#7-main-flow)

## Change History

- v1.0.0 (2026-04-29): Created from feat spec bank-settings.
