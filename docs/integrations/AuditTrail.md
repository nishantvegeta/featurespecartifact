---
id: audit-trail
name: AuditTrail
type: Integration
version: "1.0"
created: "2026-05-07"
last_modified: "2026-05-07"
---

**Node type:** Integration
**Name:** AuditTrail
**Module:** BankSettings
**Sub-module:** ChecklistManagement
**External party:** ABP Framework built-in audit logging infrastructure (`IAuditingStore`, `AuditLog`, `AuditLogAction` entities managed by ABP).
**Direction:** outbound (this module writes to ABP's audit store; no inbound callback)
**Trigger:** Automatically triggered by ABP's `AuditingInterceptor` on every AppService method call (each Command and Query execution). No explicit domain event or manual invocation required.

**Contract summary:**
ABP's audit logging middleware intercepts every AppService method call and records an `AuditLog` entry containing: the caller's `UserId` and `TenantId`, the method name, execution duration, HTTP status, client IP, and any unhandled exception detail. For `FullAuditedAggregateRoot<Guid>` entities, EF Core's `SaveChanges` interception additionally records field-level change data (old and new values per modified property) into `AuditLogAction` rows. This means every Create, Update, Toggle, Reorder, and Delete operation on `ChecklistItem` produces structured audit records without any module-specific code. The audit store is the shared ABP `AuditLogs` and `AuditLogActions` tables in the same database.

**Authentication:** n/a — same-process infrastructure integration; no external credentials required.

**Failure impact boundary:**
- ABP's audit logging is non-blocking by default: if the audit store write fails (e.g., DB contention on the audit tables), the primary operation (ChecklistItem mutation) is NOT rolled back. ABP logs the audit failure as a warning but does not surface it to the caller.
- Hard failure on audit write: never — primary operation succeeds regardless.
- Soft failure: audit record may be missing for a given operation if the audit store is unavailable; acceptable for this use case since audit records are best-effort supplementary data; the primary entity row itself carries `CreationTime`, `CreatorId`, `LastModificationTime`, `LastModifierId`, `DeletionTime`, and `DeleterId` from `FullAuditedAggregateRoot`, providing a field-level fallback audit trail even if the `AuditLog` table entry is absent.

**Retry strategy:** ABP's built-in audit logging does not implement retry for failed store writes. The field-level audit columns on the entity itself serve as the durable fallback. No custom retry logic is added in this module.

**Retention requirement:**
FRS [#17 — Retention](http://localhost:8080/root/trade-finance/-/issues/17#6-retention) specifies a minimum 7-year retention period for audit data, including for deleted checklist items. Soft-delete ensures the `ChecklistItem` row (including its `DeletionTime`, `DeleterId`, and `IsDeleted` flag) is retained in the `AppChecklistItems` table indefinitely unless explicitly purged. ABP audit log entries in `AuditLogs` / `AuditLogActions` are subject to the platform-level audit log retention policy. The 7-year retention requirement is met by the combination of soft-deleted rows in `AppChecklistItems` (owned by this module) and the platform audit log tables (owned by ABP). No module-specific archival or purge logic is implemented in this milestone.

**Idempotency:** n/a — ABP creates a new `AuditLog` row per request; duplicate rows for retried requests are acceptable and expected.

**Data sensitivity:** Audit records contain BankAdmin user IDs, tenant IDs, and field values (including `Description` text). Classification: Internal. Covered by the platform's standard data-at-rest encryption and access controls applied to the shared database.

**Related events:** none — the audit trail integration uses ABP's interceptor pipeline, not domain events.

**Observability:** ABP writes audit failures at `Warning` level to the application log. No additional custom metrics are added in this milestone.

**Source:**
- [FRS #15 — Audit](http://localhost:8080/root/trade-finance/-/issues/15#8-audit)
- [FRS #17 — Retention](http://localhost:8080/root/trade-finance/-/issues/17#6-retention)

## Change History

- **1.0** (2026-05-07): Initial draft from Bank Settings milestone feat spec generation.
