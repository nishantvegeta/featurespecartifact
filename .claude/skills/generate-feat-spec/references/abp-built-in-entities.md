# ABP Built-in Entities Catalog

This file lists the entities, concepts, and tables ABP Framework provides out of the box. The `ddd-synthesizer` sub-agent **must run the three-step decision flow (see below) before emitting every Entity entry, without exception**. If an FRS clause implies a concept in this catalog, the built-in is referenced — never re-synthesized as a new Entity node.

> **Enforcement rule:** a synthesized Entity whose name or responsibility duplicates a built-in below is a validation defect. The `feat-spec-validator` blocks the preview if any Entity name matches a built-in's concept.
>
> **Mandatory pre-synthesis flow:** before emitting any Entity, `ddd-synthesizer` must answer the three questions in the Decision Flow below. If step 1 matches a built-in, do not emit the Entity. If step 3 fires (ambiguous), emit a `builtin_collision` Conflict instead of the Entity — never silently emit a duplicate. The Conflict must reference the specific built-in catalog entry and include a `resolution_question` asking whether the concept is truly distinct from the built-in.

---

## Identity Module

| Built-in | Table | Purpose | Reference instead of synthesizing when FRS clauses mention… |
|---|---|---|---|
| `IdentityUser` | `AbpUsers` | Application user with email, username, credentials, lockout, 2FA. | "user", "account", "login", "register", "password", "email verification", "lockout" |
| `IdentityRole` | `AbpRoles` | Role with name, is-default, is-public, is-static. | "role", "user role", "role assignment" |
| `IdentityClaimType` | `AbpClaimTypes` | Claim type definition for user/role claims. | "custom claim", "claim type" |
| `IdentityUserClaim` | `AbpUserClaims` | Per-user claim values. | "user claims" |
| `IdentityRoleClaim` | `AbpRoleClaims` | Per-role claim values. | "role claims" |
| `IdentityUserRole` | `AbpUserRoles` | User ↔ role assignment. | "assign role to user", "user's roles" |
| `IdentityUserLogin` | `AbpUserLogins` | External login provider linkage (Google, Microsoft, etc.). | "SSO", "external login", "Google login" |
| `IdentityUserToken` | `AbpUserTokens` | Per-user authentication tokens. | "refresh token", "auth token" |
| `OrganizationUnit` | `AbpOrganizationUnits` | Hierarchical org unit. | "organization unit", "department", "team hierarchy" |
| `IdentityUserOrganizationUnit` | `AbpUserOrganizationUnits` | User ↔ OU assignment. | "user's OU", "OU members" |

**Rule:** if an FRS clause describes a "user" with email, password, or role — reference `IdentityUser`. Do not create a `User` Entity node. If the project's user has milestone-specific fields (e.g., a custom profile), synthesize a **companion Entity** (e.g., `UserProfile`) that holds those fields and references `IdentityUser` via `UserId`.

---

## Tenant Management

| Built-in | Table | Purpose | Reference instead of synthesizing when FRS clauses mention… |
|---|---|---|---|
| `Tenant` | `AbpTenants` | Tenant with name, editions, activation state. | "tenant", "company" (if the project's tenancy model treats a company as a tenant) |
| `TenantConnectionString` | `AbpTenantConnectionStrings` | Per-tenant connection strings. | "tenant-specific database" |

**Rule:** if `tenancy_model` in CLAUDE.md declares `per-company` and an FRS clause mentions "company" in the tenancy sense, reference `Tenant`. If the project treats "company" as a business entity *within* a tenant (tenancy_model = `per-entity-within-tenant`), synthesize a `Company` Entity normally — it is not the ABP tenant.

---

## Permission Management

| Built-in | Table | Purpose | Reference instead of synthesizing when FRS clauses mention… |
|---|---|---|---|
| `PermissionDefinition` | (in-memory, via `PermissionDefinitionProvider`) | Declaration of available permissions. | "permission", "access right" — permissions are declared, not stored as entities. |
| `PermissionGrant` | `AbpPermissionGrants` | Granted permissions per user/role/client. | "grant permission to", "permission assignment" |
| `PermissionGroupDefinition` | (in-memory) | Grouping of permissions in the UI. | "permission group" |

**Rule:** permissions are declared in `PermissionDefinitionProvider` classes, not synthesized as Entity nodes. The Permissions Map in the Feat Spec enumerates them; their storage is handled by ABP.

---

## Feature Management

| Built-in | Table | Purpose | Reference instead of synthesizing when FRS clauses mention… |
|---|---|---|---|
| `FeatureDefinition` | (in-memory) | Feature toggle/quota declaration. | "feature flag", "feature toggle", "feature quota" |
| `FeatureValue` | `AbpFeatureValues` | Per-tenant/edition feature value. | "tenant feature", "edition feature" |
| `FeatureGroupDefinition` | (in-memory) | Grouping of features in the UI. | "feature group" |

---

## Setting Management

| Built-in | Table | Purpose | Reference instead of synthesizing when FRS clauses mention… |
|---|---|---|---|
| `SettingDefinition` | (in-memory, via `SettingDefinitionProvider`) | Declaration of available settings. | "setting", "configuration value" |
| `Setting` | `AbpSettings` | Per-scope (global/tenant/user) setting value. | "tenant-level setting", "user preference" |

---

## Audit Logging

| Built-in | Table | Purpose | Reference instead of synthesizing when FRS clauses mention… |
|---|---|---|---|
| `AuditLog` | `AbpAuditLogs` | HTTP request / method execution audit record. | "audit log", "who did what", "request log" |
| `AuditLogAction` | `AbpAuditLogActions` | Method-level audit detail. | "action audit" |
| `EntityChange` | `AbpEntityChanges` | Per-entity change audit record. | "entity change history", "field-level audit" |
| `EntityPropertyChange` | `AbpEntityPropertyChanges` | Per-property change audit. | "property-level audit trail" |

**Rule:** if FRS clauses say "audit who changed X and when", rely on ABP's entity change tracking — set the Entity to `AuditedAggregateRoot` or `FullAuditedAggregateRoot`. Do not create an `AuditLog` Entity node.

---

## Background Jobs

| Built-in | Table | Purpose | Reference instead of synthesizing when FRS clauses mention… |
|---|---|---|---|
| `BackgroundJobInfo` | `AbpBackgroundJobs` | Persisted background job queue entry. | "background job", "async task" — reference this for queue storage; synthesize the job's *domain args* as a Value Object if applicable. |

**Rule:** a background job is represented by (a) an Actor entry named `System: BackgroundJob: <JobName>`, (b) optionally a Value Object for its args, and (c) references in the relevant Command or Integration entries. The `AbpBackgroundJobs` table is not synthesized as an Entity.

---

## BLOB Storage

| Built-in | Table | Purpose | Reference instead of synthesizing when FRS clauses mention… |
|---|---|---|---|
| `BlobContainer` | `AbpBlobContainers` | Logical container for stored blobs. | "file upload", "document storage", "attachment" |
| `BlobInfo` | `AbpBlobs` | Individual blob record. | "uploaded file record" |

**Rule:** if FRS clauses describe uploading/storing files, reference ABP BLOB Storing via an Integration entry. Synthesize a milestone-specific Entity (e.g., `AttachmentMetadata`) only if the feature tracks business metadata about the blob beyond what ABP stores.

---

## Other Commonly Referenced Built-ins

| Built-in | Purpose | Reference when… |
|---|---|---|
| `LanguageInfo` / `AbpLanguages` | Supported languages for localization. | "language support", "locale" |
| `TextTemplateDefinition` | Email/SMS template declaration. | "email template", "notification template" |
| `EmailingModule` | Email sending abstraction. | "send email" → use Integration entry, not Entity |
| `SmsModule` | SMS sending abstraction. | "send SMS" → use Integration entry |
| `CurrentUser` (service) | Abstraction for the authenticated caller. | "current user", "logged-in user" in any Command/Query — use as context, not as Entity |
| `DataFilter` (service) | Tenant/soft-delete filter toggle. | "disable tenant filter", "include soft-deleted" |

---

## Decision Flow

**This flow is mandatory before emitting every Entity entry.** `ddd-synthesizer` must answer all three questions in order.

1. **Does the concept appear in this catalog?**
   - Yes → do not synthesize. Reference the built-in via Actor, Integration, or as a relationship target on a milestone-specific Entity.
   - No → continue.
2. **Is the concept a *companion* to a built-in (project-specific fields attached to a built-in concept)?**
   - Yes → synthesize a companion Entity (e.g., `UserProfile`, `TenantConfiguration`) with an ID field referencing the built-in.
   - No → synthesize as a regular milestone Entity.
3. **Is the concept ambiguous — could be a built-in or a milestone Entity?**
   - Yes → **do not emit the Entity**. Instead, emit a `builtin_collision` Conflict with `conflict_type: builtin_ambiguity`, referencing the specific catalog entry, and a `resolution_question` asking whether this concept is truly distinct from the built-in. Surface this Conflict in Open Blockers. Never silently emit a potentially-duplicate Entity.
   - No → synthesize as a regular milestone Entity (step 2 No path).

---

## Examples

### Example 1: "User submits a request"
- `User` → reference `IdentityUser` (no new Entity).
- `Request` → synthesize as milestone Entity with `SubmitterUserId: Guid` referencing `AbpUsers.Id`.

### Example 2: "Company admin approves the request within their tenant"
- Depends on `tenancy_model`:
  - `per-company` → `Company` = `Tenant`. Reference `Tenant`.
  - `per-entity-within-tenant` → `Company` is a milestone Entity inside a tenant. Synthesize `Company`.

### Example 3: "System sends an email reminder after 48 hours"
- `System` → Actor entry `System: BackgroundJob: EmailReminderJob`.
- Email sending → Integration entry referencing ABP Emailing module.
- No Entity is created.

### Example 4: "User's profile includes a biography and avatar"
- `IdentityUser` is referenced.
- Synthesize companion Entity `UserProfile` with `UserId: Guid`, `Biography: string`, `AvatarBlobId: Guid` (referencing `AbpBlobs`).
