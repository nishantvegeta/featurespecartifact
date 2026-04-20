# Permissions — Constants and Definition Provider

ABP permissions require two files that ship together. Generating one without the other is a hard-gate violation. `traceability-validator` fails the plan if the pair is broken.

## Files

### `<Feature>Permissions.cs`

- Namespace `<Ns>.Permissions`.
- `public static class <Feature>Permissions`.
- `public const string GroupName = "<Feature>";`
- One nested `public static class <Entity>` per entity under the feature:
  - `public const string Default = GroupName + ":<Entity>";`
  - `public const string Create = Default + ":Create";`
  - `public const string Read   = Default + ":Read";`
  - `public const string Update = Default + ":Update";`
  - `public const string Delete = Default + ":Delete";`
  - Plus one `public const string` per FS-declared custom operation — e.g. `Approve`, `Reorder`, `Reject`.

Entities that only expose a subset of CRUD on the FS get only the subset as constants. Do not declare a permission that is never used.

### `<Feature>PermissionDefinitionProvider.cs`

- Namespace `<Ns>.Permissions`.
- `public class <Feature>PermissionDefinitionProvider : PermissionDefinitionProvider`.
- Override `Define(IPermissionDefinitionContext context)`:
  1. `var group = context.AddGroup(<Feature>Permissions.GroupName, L("<Feature>:Permission:Group"));`
  2. Per entity: `var <entityLower> = group.AddPermission(<Feature>Permissions.<Entity>.Default, L("<Feature>:Permission:<Entity>"));`
  3. Per operation on that entity: `<entityLower>.AddChild(<Feature>Permissions.<Entity>.<Op>, L("<Feature>:Permission:<Entity>:<Op>"));`
- Private helper: `private static LocalizableString L(string name) => LocalizableString.Create<<Feature>Resource>(name);`.

## Hierarchy rule

`AddPermission` creates the parent (entity-level). `AddChild` attaches operations under it. This mirrors how the ABP permission management UI renders:

```
<Feature>                       (Group)
├── Applications                (Parent — entity-level)
│   ├── Create
│   ├── Read
│   ├── Update
│   ├── Delete
│   └── Approve                 (Custom op)
└── Documents                   (Parent — entity-level)
    ├── Create
    ├── Read
    └── Delete
```

## Permission naming

- Colon-separated, PascalCase each segment: `<Feature>:<Entity>:<Op>`.
- The `<Feature>:` prefix comes from `GroupName`; the constants class enforces it via `GroupName + ":..."`.
- Entity segment is singular PascalCase: `Application`, not `Applications`.
- Operation segment is a single verb: `Create`, `Read`, `Update`, `Delete`, `Approve`, `Reorder`.

## Localization keys

Every `AddGroup`, `AddPermission`, `AddChild` call takes a localized display name via the `L(...)` helper. The matching key must exist in `en.json`:

| Call | Key |
|---|---|
| `AddGroup(GroupName, ...)` | `<Feature>:Permission:Group` |
| `AddPermission(<Entity>.Default, ...)` | `<Feature>:Permission:<Entity>` |
| `AddChild(<Entity>.<Op>, ...)` | `<Feature>:Permission:<Entity>:<Op>` |

The `domain-shared` planner plans these keys into `en.json` in parallel with the `application-contracts` planner planning the Provider. `traceability-validator` cross-checks them.

## `[Authorize]` usage on AppServices

Every AppService method gets exactly one `[Authorize(...)]` attribute pointing to the most specific permission:

- `CreateAsync` → `[Authorize(<Feature>Permissions.<Entity>.Create)]`
- `GetAsync` / `GetListAsync` → `[Authorize(<Feature>Permissions.<Entity>.Read)]`
- `UpdateAsync` → `[Authorize(<Feature>Permissions.<Entity>.Update)]`
- `DeleteAsync` → `[Authorize(<Feature>Permissions.<Entity>.Delete)]`
- Custom op → `[Authorize(<Feature>Permissions.<Entity>.<CustomOp>)]`

Reads are NOT exempt. Every method carries an `[Authorize]`.

## Policy or permission?

ABP allows both `[Authorize(policy-name)]` and `[Authorize(permission-name)]`. This skill uses **permissions only** — no policies. If an FS page declares a policy-based rule, the planner either translates it to a permission or raises a Conflict.

## Module registration

`<Ns>ApplicationContractsModule` auto-discovers classes inheriting `PermissionDefinitionProvider` via ABP's conventional registration. No explicit `AddTransient` line is needed. The skill does not add one.

## Actor-to-permission mapping

The FS Permission page declares which Actor holds which permission. This skill does **not** seed permission grants in code — seeding is done via data-seeder classes the project owns separately. The skill only generates the permission definitions and the `[Authorize]` attributes; who holds what is a deployment/seed concern.

`IMPLEMENTATION_REPORT_<Feature>.md` includes a section listing which Actor should hold which Permission so the deployment team can seed accordingly.

## Example of a compliant pair

For a feature `UserRequestManagement` with entities `UserRequest` and `RequestComment`, the pair would declare:

- Group: `UserRequestManagement`
- Parent `UserRequest`: Create, Read, Update, Delete, Approve, Reject
- Parent `RequestComment`: Create, Read, Delete

The constants file has 10 public constants (1 GroupName + 2 Default + 6 + 3 = 12 total ignoring nested classes; 10 operation-level).

The Provider registers exactly those with localization keys.

The Application layer uses every constant in at least one `[Authorize(...)]`. If a constant is declared but never referenced, `traceability-validator` flags `ORPHAN_PERMISSION`.
