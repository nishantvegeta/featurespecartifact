---
id: bank-admin
name: BankAdmin
type: actor
version: 1.0.0
created: 2026-04-29
last_modified: 2026-04-29
---

# BankAdmin

**Node type:** Actor

**Kind:** Human

**ABP identity binding:** `IdentityUser` with role `BankAdmin` (per ABP role-based authorization)

**Goals**

- Configure and maintain the LC issuance verification checklist used across all Branch and CTF operations
- Ensure checklist items accurately reflect current LC review requirements
- Manage item lifecycle (add, edit, delete, reorder) and active/inactive status
- Maintain consistency in checklist sequencing and description quality

**Commands initiated**

- [AddChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/commands/AddChecklistItem)
- [UpdateChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/commands/UpdateChecklistItem)
- [ToggleChecklistItemStatus](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/commands/ToggleChecklistItemStatus)
- [MoveChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/commands/MoveChecklistItem)
- [DeleteChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/commands/DeleteChecklistItem)

**Queries initiated**

- [ListChecklistItems](http://localhost:8080/root/trade-finance/-/wikis/feats/bank-settings/queries/ListChecklistItems)

**Source**

- [FRS #15 — Actors](http://localhost:8080/root/trade-finance/-/issues/15#3-actors)

## Change History

- v1.0.0 (2026-04-29): Created from feat spec bank-settings.
