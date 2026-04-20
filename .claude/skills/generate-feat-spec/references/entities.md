# Reference: Entity nodes

An Entity is a domain structure with persistent identity and a lifecycle. Aggregate roots are Entities that are the consistency boundary of an aggregate; child entities are Entities owned by an aggregate root.

> **Enforcement:** Before creating an Entity, consult `references/abp-built-in-entities.md`. If the concept is provided by ABP (`AbpUsers`, `AbpTenants`, `AbpRoles`, etc.), reference the built-in — do not synthesize.
>
> Every Entity must cite a specific base class from `references/abp-base-classes.md`. Base class and interface names appear only as bold-labeled field values — never inside code fences, never with `public class` or colon-inheritance syntax.

---

## When to create an Entity

Create an Entity when a clause describes a structure with:

- A distinct identity that persists across state changes (not a bare value), AND
- A lifecycle with observable state transitions (created, updated, completed, archived), OR
- Invariants that must be enforced regardless of where it's accessed from.

Do **not** create an Entity for:

- A concept already provided by ABP (see `abp-built-in-entities.md`).
- A bare value without identity — use a Value Object.
- A transient calculation result — that's part of a Query output DTO.
- A join table between two existing entities — model the relationship on the aggregate.

---

## Aggregate root vs. child entity

- **Aggregate root** — the consistency boundary. External code only references it by ID. Contains or orchestrates child entities. Has a repository interface (`IRepository<T, Guid>`).
- **Child entity** — lives inside an aggregate. Has identity within the aggregate, but is never referenced from outside the aggregate boundary. Accessed through the root.

When in doubt, start with an aggregate root and demote to a child only if the concept has no independent lifecycle.

---

## Required fields

Every Entity entry must include these bold-labeled fields:

- `**Node type:** Entity`
- `**Name:** <PascalCase noun>`
- `**Module:** <module>` / `**Sub-module:** <sub-module>`
- `**Aggregate role:** Aggregate root | Child entity`
- `**Parent aggregate:** <wiki link>` *(only if child)*
- `**Purpose:** <1–2 sentences, business-level>`
- `**Lifecycle:** <1 sentence; cross-link to State page if applicable>`
- `**Base class:** <from abp-base-classes.md>`
- `**Base class rationale:** <which clause drove the choice>`
- `**Interfaces:** <comma-separated>`
- `**Multi-tenancy:** <resolved scoping model, or "blocked by Conflict-NN">`
- `**Attributes table:** <columns: Name, Type, Required, Owned by, Notes>`
- `**Invariants:** <bullet list, one per clause-source>`
- `**Domain events raised:** <table: Event name, Required/Optional, Consumer>`
- `**Related commands:** <bullet list of wiki links>`
- `**Related queries:** <bullet list of wiki links>`
- `**Related states:** <wiki link to State page, or "none">`
- `**Relationships:** <bullet list: kind (1:1/1:N/N:N), target entity, FK field, cardinality notes>`
- `**Source:** <bullet list of GitLab section-anchor deep links; see SKILL.md Clause Source Deep-Linking>`

Optional fields:

- `**ABP built-in referenced:** <BuiltInName> (<TableName>)` *(when the entity ties to an ABP built-in via FK)*
- `**Domain services:** <bullet list of wiki links>` *(when cross-aggregate logic exists)*
- `**Repository:** <I<Entity>Repository>` *(only if custom repository methods are needed beyond default `IRepository`)*

---

## Attributes table

Columns:

| Name | Type | Required | Owned by | Notes |
|---|---|---|---|---|
| `Id` | `Guid` | yes | This milestone | Inherited from base |
| `<FieldName>` | `<C# type>` | yes/no | This milestone / External dependency / Future enhancement | Short note |

Guidelines:

- Field names are **PascalCase**, matching ABP conventions.
- `Owned by: External dependency` means the field is set by a workflow outside this milestone (e.g., audit fields set by ABP base class, or a field set by a different team's feature). In this milestone, annotate it read-only.
- `Owned by: Future enhancement` means the field is anticipated but not yet driven by in-scope clauses. Include with `Required: no` and a note pointing at the future work.
- Never include audit fields (`CreationTime`, `CreatorId`, `LastModificationTime`, `LastModifierId`, `IsDeleted`, `DeletionTime`, `DeleterId`) — these come from the base class. Mention them in the `**Base class:**` rationale instead.
- For foreign key fields referencing ABP built-ins, write the type as `Guid` and the Notes as `FK → AbpUsers.Id` (or the relevant built-in table).
- For enum fields, name the enum in Type (e.g., `RegistrationStatus`) and note the storage strategy in Notes (e.g., `stored as string via HasConversion<string>()`).

---

## Invariants

One bullet per invariant, sourced to a clause. An invariant is a rule that must hold true regardless of the path taken to modify the entity.

Format: `<rule> — [FRS #<iid> — <Section>](<gitlab_base_url>/issues/<iid>#<slug>)` (same deep-link format as the `**Source:**` field).

Examples:

- A registration request cannot be approved unless it has a verified email. — [FRS #123 — Approval rules](http://localhost:8080/root/trade-finance/-/issues/123#8-approval-rules)
- A registration request's `SubmissionTime` is immutable after creation. — [FRS #123 — Immutable fields](http://localhost:8080/root/trade-finance/-/issues/123#2-immutable-fields)
- An approved request may not transition back to pending. — [FRS #123 — State transitions](http://localhost:8080/root/trade-finance/-/issues/123#5-state-transitions)

Invariants that cannot be enforced inside the aggregate (cross-aggregate rules) belong on a **Domain service**, not here.

---

## Domain events raised

Table columns: `Event name | Required/Optional | Consumer`.

- **Event name** — PascalCase, suffix `Eto` (e.g., `RegistrationRequestApprovedEto`).
- **Required** — a consumer is identified in scope.
- **Optional / future integration hook** — emitted to support future consumers, no in-scope subscriber.
- **Consumer** — wiki link to the Integration entry or "future".

Local (in-process) domain events are fired via `IDomainEventHandler<T>`. Distributed events use ABP Event Bus via `IDistributedEventBus.PublishAsync(...)`. Note which kind in the Consumer column if it matters.

---

## Relationships

Describe relationships to other entities and ABP built-ins. Columns implicit:

- **Kind:** `1:1` | `1:N` | `N:N`.
- **Target:** wiki link to the entity OR ABP built-in name (with table).
- **FK field:** the field on *this* entity holding the foreign key.
- **Cardinality notes:** e.g., "exactly one submitter, never null", "zero or more attachments".

N:N relationships usually require a join table. Model the join as a child entity inside the aggregate that owns it.

---

## Example entry (reference only — follow format)

> **Node type:** Entity
> **Name:** RegistrationRequest
> **Module:** Onboarding
> **Sub-module:** Registration
> **Aggregate role:** Aggregate root
> **Purpose:** A pending request by a customer to register as a user of the platform, subject to reviewer approval.
> **Lifecycle:** See [RegistrationRequestState](<wiki_url>/states/RegistrationRequestState).
> **Base class:** `FullAuditedAggregateRoot<Guid>`
> **Base class rationale:** [FRS #123 — Audit requirements](http://localhost:8080/root/trade-finance/-/issues/123#2-audit-requirements) and [FRS #123 — Archival rules](http://localhost:8080/root/trade-finance/-/issues/123#8-archival-rules) require tracking who created, modified, and archived each request, and soft-delete is in scope for canceled requests.
> **Interfaces:** `IMultiTenant`, `IHasConcurrencyStamp`
> **Multi-tenancy:** per-company (tenancy_model from CLAUDE.md)
>
> **Attributes table:**
>
> | Name | Type | Required | Owned by | Notes |
> |---|---|---|---|---|
> | `Id` | `Guid` | yes | This milestone | Inherited |
> | `TenantId` | `Guid?` | yes | This milestone | From `IMultiTenant` |
> | `SubmitterUserId` | `Guid` | yes | This milestone | FK → AbpUsers.Id |
> | `Email` | `string` | yes | This milestone | Max 256 chars |
> | `EmailVerified` | `bool` | yes | This milestone | Default false |
> | `Status` | `RegistrationStatus` | yes | This milestone | stored as string |
> | `SubmissionTime` | `DateTime` | yes | This milestone | Immutable after creation |
> | `ReviewerId` | `Guid?` | no | This milestone | FK → AbpUsers.Id, set on approval/rejection |
>
> **Invariants:**
> - A request cannot be approved unless `EmailVerified == true`. — [FRS #123 — Approval rules](http://localhost:8080/root/trade-finance/-/issues/123#8-approval-rules)
> - `SubmissionTime` is immutable after creation. — [FRS #123 — Immutable fields](http://localhost:8080/root/trade-finance/-/issues/123#2-immutable-fields)
> - An approved request cannot transition back to `Pending`. — [FRS #123 — State transitions](http://localhost:8080/root/trade-finance/-/issues/123#5-state-transitions)
>
> **Domain events raised:**
>
> | Event name | Required/Optional | Consumer |
> |---|---|---|
> | `RegistrationRequestSubmittedEto` | Required | [EmailVerificationReminder](<wiki_url>/integrations/EmailVerificationReminder) |
> | `RegistrationRequestApprovedEto` | Required | [PartnerNotification](<wiki_url>/integrations/PartnerNotification) |
> | `RegistrationRequestRejectedEto` | Optional | future |
>
> **Related commands:**
> - [CreateRegistrationRequest](<wiki_url>/commands/CreateRegistrationRequest)
> - [VerifyEmailForRegistrationRequest](<wiki_url>/commands/VerifyEmailForRegistrationRequest)
> - [ApproveRegistrationRequest](<wiki_url>/commands/ApproveRegistrationRequest)
> - [RejectRegistrationRequest](<wiki_url>/commands/RejectRegistrationRequest)
>
> **Related queries:**
> - [GetRegistrationRequest](<wiki_url>/queries/GetRegistrationRequest)
> - [ListPendingRegistrationRequests](<wiki_url>/queries/ListPendingRegistrationRequests)
>
> **Related states:** [RegistrationRequestState](<wiki_url>/states/RegistrationRequestState)
>
> **Relationships:**
> - 1:1 with `IdentityUser` (AbpUsers) via `SubmitterUserId`. Exactly one submitter, never null.
> - 0..1 with `IdentityUser` (AbpUsers) via `ReviewerId`. Null until reviewer acts.
>
> **Source:**
> - [FRS #123 — Overview](http://localhost:8080/root/trade-finance/-/issues/123#1-overview)
> - [FRS #123 — Preconditions](http://localhost:8080/root/trade-finance/-/issues/123#2-preconditions)
> - [FRS #123 — Actors](http://localhost:8080/root/trade-finance/-/issues/123#3-actors)
> - [FRS #123 — Success outcomes](http://localhost:8080/root/trade-finance/-/issues/123#4-success-outcomes)
> - [FRS #123 — State transitions](http://localhost:8080/root/trade-finance/-/issues/123#5-state-transitions)
> - [FRS #123 — Invariants](http://localhost:8080/root/trade-finance/-/issues/123#6-invariants)

---

## Common defects

| Defect | Fix |
|---|---|
| Entity duplicates an ABP built-in (`User`, `Role`, `Tenant`) | Reference the built-in; if project-specific fields are needed, synthesize a companion entity (e.g., `UserProfile`) with an FK |
| `ISoftDelete` included without a soft-delete use case | Remove; hard-delete is fine when no archival clause exists |
| `IMultiTenant` added without resolving tenancy_model | Add Conflict with `scoping_ambiguity`; leave `**Multi-tenancy:**` as "blocked by Conflict-NN" |
| Audit fields listed in the attributes table | Remove; they come from the base class |
| `public class` declaration or code fences | Rewrite as bold-labeled field values only |
| No invariants listed when FRS has clearly stated rules | Extract invariants from the FRS; if none exist, confirm this is a data-holder entity and note in `**Purpose:**` |
| Entity used as a join table for N:N | Move inside the owning aggregate as a child entity |
