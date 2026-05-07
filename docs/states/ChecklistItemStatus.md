---
id: checklist-item-status
name: ChecklistItemStatus
type: State
version: "1.0"
created: "2026-05-07"
last_modified: "2026-05-07"
---

**Node type:** State
**Entity:** [ChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/entities/ChecklistItem)
**Module:** BankSettings
**Sub-module:** ChecklistManagement
**Storage:** enum `ChecklistItemStatus` stored as camelCase string via global `JsonStringEnumConverter` (per CLAUDE.md `enum_serialization`). No per-entity `HasConversion<string>()` is required; the global converter handles both API serialization and EF Core persistence for this enum type.

**States table:**

| State name | Description | Is initial | Is terminal |
|---|---|---|---|
| `Active` | Item is included in the operational LC Issuance Checklist shown to Branch and CTF staff during LC review | yes | no |
| `Inactive` | Item is excluded from the operational checklist but retained in the admin view and audit trail; can be re-activated by a BankAdmin at any time | no | no |

**Note on terminal states:** Neither `Active` nor `Inactive` is terminal — a `ChecklistItem` can be toggled between them indefinitely. The only true terminal state for a `ChecklistItem` is soft-deletion (handled by `ISoftDelete` on the base class, not by this enum). Soft-deleted items are excluded from all list queries and from the status toggle command.

**Transitions table:**

| From | To | Triggered by | Guard | Domain event |
|---|---|---|---|---|
| `Active` | `Inactive` | [ToggleChecklistItemStatus](http://localhost:8080/root/trade-finance/-/wikis/commands/ToggleChecklistItemStatus) | Caller holds `TradeFinancePermissions.BankSettings.ChecklistItems.ToggleStatus`; item not soft-deleted; `ConcurrencyStamp` matches | none |
| `Inactive` | `Active` | [ToggleChecklistItemStatus](http://localhost:8080/root/trade-finance/-/wikis/commands/ToggleChecklistItemStatus) | Caller holds `TradeFinancePermissions.BankSettings.ChecklistItems.ToggleStatus`; item not soft-deleted; `ConcurrencyStamp` matches | none |

**Illegal transitions:**
- Any `ChecklistItemStatus` → any state — via any command other than [ToggleChecklistItemStatus](http://localhost:8080/root/trade-finance/-/wikis/commands/ToggleChecklistItemStatus). Status is immutable from [CreateChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/commands/CreateChecklistItem) (which fixes it to `Active`) and from [UpdateChecklistItemDescription](http://localhost:8080/root/trade-finance/-/wikis/commands/UpdateChecklistItemDescription), [ReorderChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/commands/ReorderChecklistItem), and [DeleteChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/commands/DeleteChecklistItem). — [FRS #15 — Transitions](http://localhost:8080/root/trade-finance/-/issues/15#5-transitions)

**Terminal handling:**
- Neither `Active` nor `Inactive` is terminal in the sense of blocking modifications.
- Soft-delete (`IsDeleted = true`) is the only terminal condition; it is set by [DeleteChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/commands/DeleteChecklistItem) via the `FullAuditedAggregateRoot`'s `ISoftDelete` mechanism. Soft-deleted items are read-only (excluded from queries and commands by ABP's global filter).

**Source:**
- [FRS #15 — Status](http://localhost:8080/root/trade-finance/-/issues/15#5-status)
- [FRS #15 — Transitions](http://localhost:8080/root/trade-finance/-/issues/15#5-transitions)

## Change History

- **1.0** (2026-05-07): Initial draft from Bank Settings milestone feat spec generation.
