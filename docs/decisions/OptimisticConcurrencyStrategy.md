---
id: optimistic-concurrency-strategy
name: OptimisticConcurrencyStrategy
type: Decision
version: "1.0"
created: "2026-05-07"
last_modified: "2026-05-07"
---

**Node type:** Decision
**Title:** Use ABP IHasConcurrencyStamp for optimistic concurrency on ChecklistItem mutations
**Status:** Accepted

**Context:**
FRS [#16 — Concurrency](http://localhost:8080/root/trade-finance/-/issues/16#5-concurrency) requires optimistic concurrency on all mutating operations (Edit, Toggle, Reorder, Delete) to prevent lost updates when two BankAdmins operate on the same checklist item simultaneously. Three strategies were in scope: ABP's `IHasConcurrencyStamp` (string GUID token, mapped via `HasConcurrencyToken()`), EF Core `RowVersion` (database-managed `byte[]` column), and a custom ETag header managed by the application service. The project already uses ABP Framework conventions throughout, and the `FullAuditedAggregateRoot<Guid>` base class does not include `IHasConcurrencyStamp` automatically — it must be applied explicitly.

**Decision:**
`ChecklistItem` implements `IHasConcurrencyStamp` explicitly. The `ConcurrencyStamp` property (string GUID) is mapped in EF Core with `HasConcurrencyToken()`. Every mutating AppService method (`UpdateChecklistItemDescription`, `ToggleChecklistItemStatus`, `ReorderChecklistItem`, `DeleteChecklistItem`) requires the caller to supply the current `ConcurrencyStamp` in the input DTO. The `GetChecklistItemForEdit` query includes `ConcurrencyStamp` in its response DTO so edit flows automatically carry it forward. On a mismatch, EF Core throws `DbUpdateConcurrencyException`, which ABP wraps as `AbpDbConcurrencyException` and surfaces as HTTP 409 Conflict.

**Rationale:**
- `IHasConcurrencyStamp` is the ABP-idiomatic pattern; ABP's built-in entities (`IdentityUser`, etc.) use it, making the approach familiar and consistent with existing project conventions.
- The string GUID token is database-agnostic (PostgreSQL, SQL Server, SQLite). `RowVersion` is database-specific (`byte[]` on SQL Server, `xmin` on PostgreSQL requiring special mapping) and adds DB-vendor coupling.
- Custom ETag header management duplicates what ABP's built-in `IHasConcurrencyStamp` already provides at the application service layer with no framework support, increasing maintenance surface.
- `IHasConcurrencyStamp` regenerates the token on every successful update, so the client always receives a fresh stamp in the response DTO and is ready for the next mutation without an extra round-trip.

**Rejected alternatives:**
- **EF Core RowVersion (`byte[]`):** rejected because it requires database-vendor-specific mapping (`xmin` column on PostgreSQL) and deviates from the ABP convention used by the rest of the project. It offers no operational advantage at the expected row volume.
- **Custom ETag header managed by AppService:** rejected because it duplicates framework capability (token generation, comparison, exception conversion) that `IHasConcurrencyStamp` already provides, creating a non-standard pattern that future maintainers would need to learn.

**Consequences:**
- **Positive:** Mutating commands are protected against lost-update race conditions with minimal code.
- **Positive:** Consistent with ABP's standard entity interfaces; no DB-vendor lock-in.
- **Positive:** `ConcurrencyStamp` flows naturally through the read → edit → write cycle via `GetChecklistItemForEdit` → `UpdateChecklistItemDescription`.
- **Negative:** Every mutating input DTO must carry `ConcurrencyStamp`; clients that call mutation endpoints without first reading the item (e.g., integration tests, scripts) must perform an additional GET to obtain the stamp.
- **Negative:** Reorder affects multiple items' sequence numbers; only the primary target item's stamp is checked, not the collaterally shifted items. This is acceptable because the domain service owns the shift logic atomically.

**Revisit if:** A high-concurrency requirement emerges (e.g., bulk programmatic updates) where the extra GET round-trip for stamp acquisition becomes a measurable bottleneck.

**Source:**
- [FRS #16 — Concurrency](http://localhost:8080/root/trade-finance/-/issues/16#5-concurrency)

## Change History

- **1.0** (2026-05-07): Initial draft from Bank Settings milestone feat spec generation.
