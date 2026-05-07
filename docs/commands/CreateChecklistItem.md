---
id: create-checklist-item
name: CreateChecklistItem
type: Command
version: "1.0"
created: "2026-05-07"
last_modified: "2026-05-07"
---

**Node type:** Command
**Name:** CreateChecklistItem
**Actor:** [BankAdmin](http://localhost:8080/root/trade-finance/-/wikis/actors/BankAdmin)
**Target aggregate:** [ChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/entities/ChecklistItem)
**Module:** BankSettings
**Sub-module:** ChecklistManagement
**Purpose:** Create a new checklist item with the supplied description, auto-assigning the next available sequence number and defaulting status to Active. The operation extends the tenant's LC Issuance Checklist by appending a new verification step at the end of the current ordered list.
**Audience:** Private
**HTTP route:** POST /api/private/app/bank-settings/checklist-items

**Input DTO:** `CreateChecklistItemInput`

| Name | Type | Required | Validation | Notes |
|---|---|---|---|---|
| `Description` | `string` | yes | NotEmpty; MaximumLength(500); not whitespace-only (`Must(x => x.Trim().Length > 0)`) | Uniqueness enforced by domain service pre-check, not by validator alone |

**Input DTO base:** plain (no audit inheritance)
**Validation:** `CreateChecklistItemInputValidator` (FluentValidation)
**Output DTO:** `ChecklistItemDto` (`FullAuditedEntityDto<Guid>`) — mirrors aggregate's auditing level
**Authorization:** `TradeFinancePermissions.BankSettings.ChecklistItems.Create`

**Preconditions:**
- Caller holds permission `TradeFinancePermissions.BankSettings.ChecklistItems.Create`. — [FRS #15 — Permissions](http://localhost:8080/root/trade-finance/-/issues/15#9-permissions)
- `Description` (trimmed) is not empty and does not exceed 500 characters. — [FRS #15 — Data model](http://localhost:8080/root/trade-finance/-/issues/15#5-data-model)
- No non-deleted `ChecklistItem` with the same `Description` (case-insensitive) exists for the current tenant. — [FRS #15 — Uniqueness](http://localhost:8080/root/trade-finance/-/issues/15#7-uniqueness)

**Postconditions:**
- A new `ChecklistItem` is persisted with `Status = Active`, `Description` set to the trimmed input value, and `SequenceNumber` equal to the current maximum `SequenceNumber` for the tenant plus one (or 1 if no items exist). — [FRS #15 — Add behavior](http://localhost:8080/root/trade-finance/-/issues/15#4-add-behavior)
- The gap-free sequence invariant is maintained: the new item is appended at the end, so no resequencing of existing items is required. — [FRS #15 — Data model](http://localhost:8080/root/trade-finance/-/issues/15#5-data-model)
- ABP audit fields (`CreationTime`, `CreatorId`) are populated by the base class.
- The response carries the full `ChecklistItemDto` for the caller to display without a separate refresh round-trip.

**Domain events raised:** none — no cross-module consumer, no message broker integration in this milestone.

**Side effects:** none beyond persistence and audit trail.

**Source:**
- [FRS #15 — Commands](http://localhost:8080/root/trade-finance/-/issues/15#4-commands)
- [FRS #15 — Add behavior](http://localhost:8080/root/trade-finance/-/issues/15#4-add-behavior)
- [FRS #15 — Permissions](http://localhost:8080/root/trade-finance/-/issues/15#9-permissions)
- [FRS #15 — Uniqueness](http://localhost:8080/root/trade-finance/-/issues/15#7-uniqueness)

## Change History

- **1.0** (2026-05-07): Initial draft from Bank Settings milestone feat spec generation.
