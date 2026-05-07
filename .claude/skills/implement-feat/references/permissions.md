# Permissions — Constants and Definition Provider

ABP permissions require two files that ship together. Generating one without the other is a hard-gate violation. Planner's holistic pass fails the plan if pair is broken.

## Files

### `<Feature>Permissions.cs`

- Namespace `<Ns>.Permissions`. `public static class <Feature>Permissions`.
- `public const string GroupName = "<Feature>";`
- One nested `public static class <Entity>` per entity:
  - `public const string Default = GroupName + ":<Entity>";`
  - `public const string Create = Default + ":Create";`
  - `public const string Read   = Default + ":Read";`
  - `public const string Update = Default + ":Update";`
  - `public const string Delete = Default + ":Delete";`
  - Plus one `public const string` per FS-declared custom op (e.g. `Approve`, `Reorder`, `Reject`).

Entities exposing only a CRUD subset on FS get only that subset. Do not declare a permission that is never used.

### `<Feature>PermissionDefinitionProvider.cs`

- Namespace `<Ns>.Permissions`. `public class <Feature>PermissionDefinitionProvider : PermissionDefinitionProvider`.
- Override `Define(IPermissionDefinitionContext context)`:
  1. `var group = context.AddGroup(<Feature>Permissions.GroupName, L("<Feature>:Permission:Group"));`
  2. Per entity: `var <entityLower> = group.AddPermission(<Feature>Permissions.<Entity>.Default, L("<Feature>:Permission:<Entity>"));`
  3. Per operation: `<entityLower>.AddChild(<Feature>Permissions.<Entity>.<Op>, L("<Feature>:Permission:<Entity>:<Op>"));`
- Helper: `private static LocalizableString L(string name) => LocalizableString.Create<<Feature>Resource>(name);`.

## Hierarchy

`AddPermission` creates parent (entity-level). `AddChild` attaches operations. Mirrors how ABP permission management UI renders:

```
<Feature>                      (Group)
├── Applications               (Parent — entity-level)
│   ├── Create
│   ├── Read
│   ├── Update
│   ├── Delete
│   └── Approve                (Custom op)
└── Documents                  (Parent — entity-level)
    ├── Create
    ├── Read
    └── Delete
```

## Naming

Colon-separated, PascalCase per segment: `<Feature>:<Entity>:<Op>`. `<Feature>:` prefix from `GroupName`; constants enforce via `GroupName + ":..."`. Entity segment singular PascalCase (`Application`, not `Applications`). Operation = single verb: Create, Read, Update, Delete, Approve, Reorder.

## Localization keys

Every `AddGroup`, `AddPermission`, `AddChild` takes localized display name via `L(...)`. Matching key must exist in `en.json`:

| Call | Key |
|---|---|
| `AddGroup(GroupName, ...)` | `<Feature>:Permission:Group` |
| `AddPermission(<Entity>.Default, ...)` | `<Feature>:Permission:<Entity>` |
| `AddChild(<Entity>.<Op>, ...)` | `<Feature>:Permission:<Entity>:<Op>` |

`domain-shared` planner plans these keys into `en.json` in parallel with `application-contracts` planner planning the Provider. Planner's holistic pass cross-checks.

## `[Authorize]` on AppServices

Every AppService method gets exactly one `[Authorize(...)]` pointing to the most specific permission:

- `CreateAsync` → `[Authorize(<Feature>Permissions.<Entity>.Create)]`
- `GetAsync` / `GetListAsync` → `[Authorize(<Feature>Permissions.<Entity>.Read)]`
- `UpdateAsync` → `[Authorize(<Feature>Permissions.<Entity>.Update)]`
- `DeleteAsync` → `[Authorize(<Feature>Permissions.<Entity>.Delete)]`
- Custom op → `[Authorize(<Feature>Permissions.<Entity>.<CustomOp>)]`

Reads are NOT exempt. Every method carries an `[Authorize]`.

## Policy or permission?

Skill uses **permissions only** — no policies. If FS declares a policy-based rule, planner translates to permission or raises a Conflict.

## Module registration

`<Ns>ApplicationContractsModule` auto-discovers classes inheriting `PermissionDefinitionProvider` via ABP convention. No explicit `AddTransient` — skill does not add one.

## Actor-to-permission mapping

FS Permission page declares which Actor holds which permission. Skill does **not** seed grants in code — seeding is via data-seeder classes the project owns separately. Skill only generates definitions and `[Authorize]` attributes.

`IMPLEMENTATION_REPORT_<Feature>.md` includes a section listing which Actor should hold which Permission for the deployment team.

## Example pair

Feature `UserRequestManagement` with entities `UserRequest` (Create/Read/Update/Delete/Approve/Reject) and `RequestComment` (Create/Read/Delete):

- Constants file: 1 GroupName + per-entity nested classes containing 6 + 3 = 9 operation-level constants.
- Provider registers exactly those with localization keys.

Application layer uses every constant in at least one `[Authorize(...)]`. Constant declared but never referenced → planner flags `ORPHAN_PERMISSION`.
