---
id: bank-admin
name: BankAdmin
type: Actor
version: "1.0"
created: "2026-05-07"
last_modified: "2026-05-07"
---

**Node type:** Actor
**Name:** BankAdmin
**Kind:** Human
**Module:** BankSettings
**Sub-module:** ChecklistManagement
**ABP identity binding:** `IdentityUser` + role `BankAdmin`

**Goals:**
- Maintain the tenant-specific LC Issuance Checklist by adding, editing, toggling, reordering, and deleting checklist items.
- Ensure the checklist accurately reflects the verification checks required by the bank's compliance procedures before LC issuance.
- Review the full list (including inactive items) to audit configuration state and history.

**Commands initiated:**
- [CreateChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/commands/CreateChecklistItem)
- [UpdateChecklistItemDescription](http://localhost:8080/root/trade-finance/-/wikis/commands/UpdateChecklistItemDescription)
- [ToggleChecklistItemStatus](http://localhost:8080/root/trade-finance/-/wikis/commands/ToggleChecklistItemStatus)
- [ReorderChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/commands/ReorderChecklistItem)
- [DeleteChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/commands/DeleteChecklistItem)

**Queries initiated:**
- [ListChecklistItems](http://localhost:8080/root/trade-finance/-/wikis/queries/ListChecklistItems)
- [GetChecklistItemForEdit](http://localhost:8080/root/trade-finance/-/wikis/queries/GetChecklistItemForEdit)

**Constraints:**
- BankAdmin operates exclusively within their own tenant context; cross-tenant access is never permitted. Tenant scoping is enforced by `IMultiTenant` on all aggregates and queries.
- All checklist management actions require specific granular permissions under `TradeFinancePermissions.BankSettings.ChecklistItems`. Access to the checklist list view requires `.View`; mutating actions each require their specific verb permission (`.Create`, `.Edit`, `.ToggleStatus`, `.Reorder`, `.Delete`).
- BankAdmin cannot access checklist management via the public API prefix (`/api/public/app/`); all routes use the private prefix (`/api/private/app/`) as this is a backoffice management function.

**Notifications received:** none — the system does not emit notifications back to BankAdmin for checklist mutations; feedback is synchronous HTTP responses. See [NoRealtimeRefreshDecision](http://localhost:8080/root/trade-finance/-/wikis/decisions/NoRealtimeRefreshDecision).

**Source:**
- [FRS #15 — Actors](http://localhost:8080/root/trade-finance/-/issues/15#3-actors)
- [FRS #15 — Permissions](http://localhost:8080/root/trade-finance/-/issues/15#9-permissions)

## Change History

- **1.0** (2026-05-07): Initial draft from Bank Settings milestone feat spec generation.
