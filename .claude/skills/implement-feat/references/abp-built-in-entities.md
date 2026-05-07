# ABP Built-in Entities — Do Not Re-create

ABP ships with entities for cross-cutting concerns. If FS describes a domain concept ABP already provides, the skill must not emit a parallel implementation. `fs-loader` flags duplicates; `reconciler` raises `BUILTIN_DUPLICATE` Conflict for user resolution.

## Mapping table

| FS describes | ABP provides | Notes |
|---|---|---|
| User account, login, profile | `IdentityUser` (`Volo.Abp.Identity`) | Extend via Identity Pro extension props or a satellite `UserProfile` aggregate referencing `IdentityUser.Id` — never duplicate `User`. |
| Organization unit, department, team | `OrganizationUnit` (`Volo.Abp.Identity`) | Hierarchy + role binding built-in. |
| Tenant | `Tenant` (`Volo.Abp.TenantManagement`) | Tenant CRUD/UI handled by `TenantManagement` module. |
| Setting | `Setting` (`Volo.Abp.SettingManagement`) | Settings via `ISettingProvider` + `SettingDefinitionProvider` — not a domain entity. |
| Feature flag | `Feature` (`Volo.Abp.FeatureManagement`) | Feature flags via `IFeatureChecker` + `FeatureDefinitionProvider`. |
| Permission grant | `PermissionGrant` (`Volo.Abp.PermissionManagement`) | Skill emits Permission *definitions* (`PermissionDefinitionProvider`); grants are managed by ABP. |
| Audit log | `AuditLogInfo` (`Volo.Abp.AuditLogging`) | Generic audit is automatic. Custom business history is OK as a separate aggregate. |
| BLOB / file | `BlobContainer` (`Volo.Abp.BlobStoring`) | Use `IBlobContainer<T>` instead of byte-array property. |
| Background job record | `BackgroundJobInfo` (`Volo.Abp.BackgroundJobs`) | Internal queue. Skill emits Job classes, not new BackgroundJobInfo. |

## Custom-vs-builtin disambiguation

User asks for "Profile" — refers to `IdentityUser` extension or a separate `Profile` aggregate? Reconciler rule:

- FS Entity page lists fields ABP already has on `IdentityUser` (UserName, Email, PhoneNumber) → **likely BUILTIN_DUPLICATE**, raise Conflict.
- FS lists app-specific fields (LoyaltyTier, OnboardingStep, ApprovedRegions) → **legitimate satellite aggregate**, generate.

When in doubt, raise Conflict at Phase 3.

## Custom business history

Skill is happy to generate a custom history aggregate (e.g. `LoanApplicationHistory`) when the FS calls for **business-meaningful** event log distinct from technical audit. ABP's `AuditLog` captures HTTP-level audit (who called what endpoint with which payload); business history captures domain-level events (state transitions, approvals).

This is generated as a normal aggregate, not as ABP audit log extension.
