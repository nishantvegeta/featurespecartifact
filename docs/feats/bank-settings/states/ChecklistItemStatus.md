---
id: checklist-item-status-state
name: ChecklistItemStatus
type: state
version: 1.0.0
created: 2026-04-29
last_modified: 2026-04-29
---

# ChecklistItemStatus

**Node type:** State

**Entity:** [ChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/entities/ChecklistItem)

**Storage:** enum `ChecklistItemStatus { Active = 0, Inactive = 1 }` stored as camelCase string ("active", "inactive") via global `JsonStringEnumConverter`

**States**

| State | Description | Is initial | Is terminal |
|-------|-------------|-----------|-----------|
| Active | Item is included in LC review checklists presented to Branch/CTF staff | Yes | No |
| Inactive | Item is excluded from active LC review checklists (archived, pending review, or disabled) | No | No |

**Transitions**

| From | To | Triggered by | Guard | Domain event |
|------|-----|--------------|-------|-------------|
| Active | Inactive | [ToggleChecklistItemStatus](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/commands/ToggleChecklistItemStatus) | Item exists | ChecklistItemStatusToggled (optional) |
| Inactive | Active | [ToggleChecklistItemStatus](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/commands/ToggleChecklistItemStatus) | Item exists | ChecklistItemStatusToggled (optional) |
| Active | (deleted) | [DeleteChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/commands/DeleteChecklistItem) | Item exists | ChecklistItemDeleted (optional) |
| Inactive | (deleted) | [DeleteChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/commands/DeleteChecklistItem) | Item exists | ChecklistItemDeleted (optional) |

**Illegal transitions**

- No illegal transitions (both states are valid end-states; toggling is unrestricted)

**Terminal handling**

- **Deleted:** Item is permanently removed from data store (no recovery)
- **Active/Inactive:** Both are stable states; item may remain indefinitely in either state

**Source**

- [FRS #18 — Purpose](http://localhost:8080/root/trade-finance/-/issues/18#1-purpose)
- [FRS #18 — Main Flow](http://localhost:8080/root/trade-finance/-/issues/18#7-main-flow)

## Change History

- v1.0.0 (2026-04-29): Created from feat spec bank-settings.
