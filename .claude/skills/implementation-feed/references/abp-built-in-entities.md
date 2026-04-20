# ABP Built-in Entities — Do Not Duplicate

ABP ships with identity, tenant, setting, feature, audit-log, permission, and BLOB-storage entities. Features built with this skill MUST NOT re-synthesize any of these. If an FS page defines a concept that matches a built-in, the page must reference the built-in rather than declare a new Entity.

`fs-loader` flags duplicates as warnings; `traceability-validator` escalates them to defects.

## Identity module

| Built-in | Namespace | Replaces |
|---|---|---|
| `IdentityUser` | `Volo.Abp.Identity` | Any "User" aggregate — reference it, add domain fields via a separate aggregate if needed |
| `IdentityRole` | `Volo.Abp.Identity` | Any "Role" aggregate |
| `IdentityUserClaim`, `IdentityUserToken`, `IdentityUserLogin` | `Volo.Abp.Identity` | Claim/token/login children |
| `OrganizationUnit` | `Volo.Abp.Identity` | Any "OrgUnit", "Department", "Team" where the intent is hierarchical grouping of users |

## Tenant management module

| Built-in | Replaces |
|---|---|
| `Tenant` | Any "Tenant" aggregate |
| `TenantConnectionString` | Per-tenant connection string storage |

## Settings module

| Built-in | Replaces |
|---|---|
| `Setting` | Any key-value setting store scoped by global/tenant/user |
| `SettingDefinition` | Any declarative setting metadata |

Feature-level settings are defined in code via `SettingDefinitionProvider`, not as Entity pages.

## Features module

| Built-in | Replaces |
|---|---|
| `Feature` | Tenant-visible feature flags |
| `FeatureDefinition` | Metadata for feature flags |

## Permission management module

| Built-in | Replaces |
|---|---|
| `PermissionGrant` | Any "UserPermission" / "RolePermission" aggregate |
| `PermissionDefinition` | Metadata — defined via `PermissionDefinitionProvider` (which this skill generates) |

## Audit logging module

| Built-in | Replaces |
|---|---|
| `AuditLog`, `AuditLogAction`, `EntityChange`, `EntityPropertyChange` | Any custom audit trail aggregate for generic create/modify/delete tracking |

Use ABP's audit logging rather than synthesizing a parallel audit aggregate. Custom business-domain history (e.g., "LoanStatusHistory") is fine — that is not a generic audit log.

## BLOB storing module

| Built-in | Replaces |
|---|---|
| `BlobContainer` / `IBlobContainer` | Any "FileStorage" / "Attachment" aggregate for binary persistence |

Business-domain attachments that carry metadata (who uploaded, tags, business state) legitimately get their own aggregate — the file content lives in a BLOB container, the metadata in a custom Entity.

## Background workers / jobs

| Built-in | Replaces |
|---|---|
| `BackgroundJobInfo` | Any "QueuedJob" aggregate |
| `IBackgroundJobManager` | Any custom job-enqueuing port |

## Tables prefix convention

Built-ins use their own table prefix (`Abp*`). Project tables use the CLAUDE.md `db_table_prefix` (default `App`). Never collide.

## How FS pages should reference built-ins

- FS Entity page titled "User" → add a note: `**Built-in reference:** this feature uses `IdentityUser`; no new Entity is generated.`
- FS Command "AssignRoleToUser" → source Entity is `IdentityUser`; the skill generates the Command + validator + AppService against `IIdentityUserAppService` or a custom orchestration layer — but does NOT create a new `User.cs`.

## Detection heuristic

`fs-loader` matches by name (case-insensitive) against this list. `traceability-validator` confirms no aggregate descriptor collides. Collision = defect `BUILT_IN_DUPLICATE`.
