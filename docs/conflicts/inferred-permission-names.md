---
id: conflict-inferred-permission-names
name: inferred-permission-names
type: Conflict
version: "1.0"
created: "2026-05-07"
last_modified: "2026-05-07"
---

**Node type:** Conflict
**Conflict ID:** CF-W01
**Source:** [FRS #15 — Permissions](http://localhost:8080/root/trade-finance/-/issues/15#9-permissions)
**Source FRS:** #15
**Conflict type:** `missing_precondition`
**Blocking severity:** low

**Description:**
FRS #15 describes permissions at the role-description level ("BankAdmin must have edit permission", "BankAdmin must have status-toggle permission") without specifying the exact `TradeFinancePermissions` constant names or the nesting structure within the permissions class hierarchy. Six permission constants were inferred: `TradeFinancePermissions.BankSettings.ChecklistItems.View`, `.Create`, `.Edit`, `.ToggleStatus`, `.Reorder`, and `.Delete`. The nesting question is whether `ChecklistItems` sits under a `BankSettings` module node (`TradeFinancePermissions.BankSettings.ChecklistItems.*`) or directly under the root (`TradeFinancePermissions.ChecklistItems.*`).

**Affected categories:**
- All Commands and Queries in `BankSettings.ChecklistManagement` (authorization declarations)
- `TradeFinancePermissions` class (permissions nesting)
- `BankSettingsPermissionDefinitionProvider` (ABP permission registration)
- Permissions Map partial

**Resolution question:**
Should the permission group for checklist management be registered as `TradeFinancePermissions.BankSettings.ChecklistItems` (with `BankSettings` as a parent group node above `ChecklistItems` in the permission tree), or as a flat `TradeFinancePermissions.ChecklistItems` entry without the `BankSettings` module prefix?

**Suggested options:**
- **Option A — Nested under BankSettings (`TradeFinancePermissions.BankSettings.ChecklistItems.*`):** Pro: consistent with a module-grouped permission tree; other BankSettings features (future LC templates, fee schedules, etc.) would share the `BankSettings` parent group, giving BankAdmins a single toggle to grant/revoke all BankSettings permissions. Con: requires the `BankSettings` group node to be registered even if no other BankSettings permissions exist yet.
- **Option B — Flat root (`TradeFinancePermissions.ChecklistItems.*`):** Pro: simpler if BankSettings will only ever have checklist management. Con: as the BankSettings module grows, a flat structure without a module group makes the permission tree harder to navigate in the ABP UI.

**Default if unresolved:** `TradeFinancePermissions.BankSettings.ChecklistItems.*` (Option A) is used throughout this Phase 7 synthesis, per Enforcement Rule 11 in the Phase 7 envelope. This is the recommended default and aligns with the module grouping convention.

**Status:** Open

## Change History

- **1.0** (2026-05-07): Initial draft from Bank Settings milestone feat spec generation.
