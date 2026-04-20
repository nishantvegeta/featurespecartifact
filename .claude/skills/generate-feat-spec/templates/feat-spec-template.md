# Feat Spec Template (ABP-layered)

Canonical structure for the assembled Feature Specification at `<wiki_local_path>/feat-specs/<slug>/feat-spec.md`. Every section fully expanded; no compression.

**Rendering rules:**

- All inter-wiki links use `<wiki_url>` as the base.
- No `.md` extension in any rendered link.
- No `<wiki_local_path>` prefix (e.g., `docs/`) in any rendered link.
- Link labels are human-readable node names or titles.
- Every reference to an FRS clause uses a GitLab section-anchor deep link: `[FRS #<iid> — <Section>](<gitlab_base_url>/issues/<iid>#<slug>)`.
- No opaque clause IDs (`#cN`) appear in the published output.

---

## Section Order

1. Feature Title
2. Feature Overview
3. Open Blockers *(only if critical/high Conflicts exist)*
4. Related FRS
5. Bounded Context and Affected Layers
6. Domain Layer Design
7. Application Layer Design
8. Infrastructure and Persistence Design
9. HTTP API Design
10. Permissions, Security, and Multi-Tenancy
11. Integration, Background Jobs, and Distributed Events
12. UI-API Integration Points *(only if `ui-integration` clauses exist)*
13. Error Handling, Auditing, and Logging
14. Performance and Scalability
15. Deployment Considerations
16. Open Questions and Future Enhancements

---

## Section 1: Feature Title

```markdown
# <Milestone Title> — Feature Specification
```

Derived from milestone title. Single H1.

---

## Section 2: Feature Overview

Three sub-sections as prose paragraphs (no bullet lists unless the FRS structures it as such):

### Purpose

2–4 sentences. What business problem this feature solves. Cite primary source clauses with deep links.

### Scope

2–4 sentences. What IS and IS NOT in scope for this milestone. Reference out-of-scope concerns by name so reviewers know they were considered.

### Business Impact

1–2 sentences. Expected outcome — who benefits, what metric moves, what risk is mitigated.

Example:

```markdown
## Feature Overview

### Purpose

User Request Management lets customer-facing staff register, triage, and route incoming service requests against a single authoritative record. See [FRS #11 — Overview](http://localhost:8080/root/trade-finance/-/issues/11#1-overview) and [FRS #11 — Business context](http://localhost:8080/root/trade-finance/-/issues/11#2-business-context).

### Scope

In scope: request creation, assignment, status transitions, and closure. Out of scope: SLA computation, workload balancing across teams, and customer self-service portal — these are tracked as follow-on milestones.

### Business Impact

Eliminates the manual hand-off between intake and processing teams, reducing time-to-triage from days to hours and providing an audit trail for regulator reviews.
```

---

## Section 3: Open Blockers

**Included only if any Conflict has severity `critical` or `high`.** Omitted entirely otherwise.

Format: numbered list. Each item:

```markdown
1. **Conflict-NN — <short title>** (severity: critical)
   <description>
   Resolution needed: <resolution question>
   Source: [FRS #<iid> — <Section>](<deep link>)
   See: [Conflict-NN](<wiki_url>/conflicts/Conflict-NN)
```

This section is duplicated verbatim into the GitLab coordination issue's "Open Blockers" block.

---

## Section 4: Related FRS

Flat list of source FRS issues. One line per issue:

```markdown
## Related FRS

- [FRS #11 — <Title>](<gitlab_base_url>/issues/11)
- [FRS #12 — <Title>](<gitlab_base_url>/issues/12)
```

If any issues were halted (monolith), include a separate sub-section:

```markdown
### Halted for split

- [FRS #14 — <Title>](<gitlab_base_url>/issues/14) — halted for monolith: <rationale>. Proposed split: <A>, <B>.
```

---

## Section 5: Bounded Context and Affected Layers

Short prose (3–5 sentences) describing the bounded context and which ABP layers this milestone touches. **Do not duplicate CLAUDE.md's full project layout here.** Reference CLAUDE.md for project-wide conventions; enumerate only the layers affected by this milestone.

```markdown
## Bounded Context and Affected Layers

This feature lives in the **UserRequests** bounded context and touches the Domain, Application, Application.Contracts, EntityFrameworkCore, HttpApi.Host, and DbMigrator projects. Full ABP project layout, namespace conventions, and module paths are declared in the project's root `CLAUDE.md`.

### Affected projects for this milestone

- `Domain` — new `UserRequest` aggregate, associated value objects, domain events
- `Application.Contracts` — DTOs, permission definitions under `TradeFinancePermissions.UserRequests`
- `Application` — `UserRequestAppService` (private) and `CustomerUserRequestAppService` (public), Mapperly mappers, FluentValidation validators
- `EntityFrameworkCore` — DbContext registration, new `AppUserRequests` table and migrations
- `HttpApi.Host` — auto-generated controllers from ABP conventional registration
```

---

## Section 6: Domain Layer Design

Aggregates, entities, value objects, and state machines affected by this milestone. **Wiki links only — no inline expansion of entity attribute tables or invariants.** The node pages carry the detail.

```markdown
## Domain Layer Design

### Aggregates

- [UserRequest](<wiki_url>/entities/UserRequest) — aggregate root for the customer request lifecycle
- [RequestAssignment](<wiki_url>/entities/RequestAssignment) — child entity under UserRequest, captures triage ownership

### Value Objects

- [RequestReference](<wiki_url>/value-objects/RequestReference) — immutable business reference identifier

### States

- [UserRequestState](<wiki_url>/states/UserRequestState) — lifecycle for UserRequest

### Domain services

- `UserRequestRoutingService` — centralizes assignment policy; invoked by `AssignRequestCommand`

### Domain events raised

| Event | Raised by | Required / Optional | Consumer |
|---|---|---|---|
| `UserRequestCreated` | UserRequest | Required | NotificationIntegration |
| `UserRequestAssigned` | UserRequest | Required | AssignmentHistoryReadModel |
| `UserRequestClosed` | UserRequest | Optional (future) | — |
```

---

## Section 7: Application Layer Design

Commands, Queries, DTOs, Validators, Mappers. Three sub-sections using tables with wiki links. Audience column present when CLAUDE.md declares the Public/Private split.

```markdown
## Application Layer Design

### Commands

| Command | Actor | Audience | DTO | Validator |
|---|---|---|---|---|
| [CreateUserRequestCommand](<wiki_url>/commands/CreateUserRequestCommand) | [Customer](<wiki_url>/actors/Customer) | Public | `CreateUserRequestInput` | `CreateUserRequestInputValidator` |
| [AssignRequestCommand](<wiki_url>/commands/AssignRequestCommand) | [Triage Officer](<wiki_url>/actors/TriageOfficer) | Private | `AssignRequestInput` | `AssignRequestInputValidator` |

### Queries

| Query | Actor | Audience | Input | Output |
|---|---|---|---|---|
| [GetUserRequestQuery](<wiki_url>/queries/GetUserRequestQuery) | [Customer](<wiki_url>/actors/Customer) | Public | `GetUserRequestInput` | `UserRequestDto` |
| [ListUserRequestsQuery](<wiki_url>/queries/ListUserRequestsQuery) | [Triage Officer](<wiki_url>/actors/TriageOfficer) | Private | `ListUserRequestsInput : PagedAndSortedResultRequestDto` | `PagedResultDto<UserRequestListDto>` |

### DTOs, Validators, Mappers

Contracts are declared in `Application.Contracts`. Validators use **FluentValidation** per CLAUDE.md `validation_library`. Object mapping uses **Mapperly** per `object_mapping_library`.

- `UserRequestDto` — full aggregate projection
- `UserRequestListDto` — flat list row
- `CreateUserRequestInput`, `AssignRequestInput` — command inputs with paired `<CommandName>InputValidator`
- `UserRequestMapper` — static Mapperly mapper for `UserRequest → UserRequestDto`
```

---

## Section 8: Infrastructure and Persistence Design

EF Core design — DbContext registration, table names with `db_table_prefix`, indexes, enum conversion strategy per CLAUDE.md `enum_serialization`. No code.

```markdown
## Infrastructure and Persistence Design

### DbContext

- `TradeFinanceDbContext` registers `DbSet<UserRequest>`.

### Tables

| Entity | Table name | Notes |
|---|---|---|
| UserRequest | `AppUserRequests` | Prefix `App` per CLAUDE.md `db_table_prefix` |
| RequestAssignment | `AppRequestAssignments` | Child of UserRequest |

### Indexes

| Entity | Fields | Direction | Purpose |
|---|---|---|---|
| UserRequest | (TenantId, CustomerId, CreatedOn DESC) | composite | supports the customer history query |
| UserRequest | (TenantId, Status, CreatedOn ASC) | composite | supports triage queue query |

### Enum serialization

Enums are stored as lowercase camelCase strings via the global `JsonStringEnumConverter` — see CLAUDE.md `enum_serialization`.

### Unique constraints

- `UserRequest.RequestReference` — unique within tenant.

### Repositories

- No custom repository interfaces beyond `IRepository<UserRequest, Guid>` — default ABP generic repository covers all access patterns.
```

---

## Section 9: HTTP API Design

Endpoints grouped by Audience. Route prefixes come from CLAUDE.md `api_routing_conventions`.

```markdown
## HTTP API Design

### Public endpoints (Customer UI)

Prefix: `/api/public/app/` per CLAUDE.md `api_routing_conventions.public_prefix`.

| Method | Route | Maps to |
|---|---|---|
| POST | `/api/public/app/user-requests` | [CreateUserRequestCommand](<wiki_url>/commands/CreateUserRequestCommand) |
| GET | `/api/public/app/user-requests/{id}` | [GetUserRequestQuery](<wiki_url>/queries/GetUserRequestQuery) |

### Private endpoints (Backoffice)

Prefix: `/api/private/app/` per CLAUDE.md `api_routing_conventions.private_prefix`.

| Method | Route | Maps to |
|---|---|---|
| POST | `/api/private/app/user-requests/{id}/assign` | [AssignRequestCommand](<wiki_url>/commands/AssignRequestCommand) |
| GET | `/api/private/app/user-requests` | [ListUserRequestsQuery](<wiki_url>/queries/ListUserRequestsQuery) |

Controllers are generated by ABP's conventional registration; no manual controller code required.
```

When CLAUDE.md does not declare the Public/Private split, omit the Audience grouping and use a single endpoints table with prefix `/api/app/` (ABP default).

---

## Section 10: Permissions, Security, and Multi-Tenancy

### Permissions Map

Full merged table from `ddd-synthesizer`. Pattern uses CLAUDE.md `permissions_class`.

```markdown
## Permissions, Security, and Multi-Tenancy

### Permissions Map

| Actor | Use case | Kind | Audience | Permission string |
|---|---|---|---|---|
| [Customer](<wiki_url>/actors/Customer) | [CreateUserRequestCommand](<wiki_url>/commands/CreateUserRequestCommand) | Command | Public | `TradeFinancePermissions.UserRequests.Create` |
| [Customer](<wiki_url>/actors/Customer) | [GetUserRequestQuery](<wiki_url>/queries/GetUserRequestQuery) | Query | Public | `TradeFinancePermissions.UserRequests.View` |
| [Triage Officer](<wiki_url>/actors/TriageOfficer) | [ListUserRequestsQuery](<wiki_url>/queries/ListUserRequestsQuery) | Query | Private | `TradeFinancePermissions.UserRequests.List` |
| [Triage Officer](<wiki_url>/actors/TriageOfficer) | [AssignRequestCommand](<wiki_url>/commands/AssignRequestCommand) | Command | Private | `TradeFinancePermissions.UserRequests.Assign` |

### Multi-tenancy

Tenancy model: `per-customer` (CLAUDE.md). Every `UserRequest` carries `TenantId` (per `IMultiTenant`). `IDataFilter` enforces tenant isolation on read paths. Triage Officer queries always apply `TenantId` filter first, then `Status` and `CustomerId`.
```

---

## Section 11: Integration, Background Jobs, and Distributed Events

Integration wiki links and event outcomes. No payload specs inline.

```markdown
## Integration, Background Jobs, and Distributed Events

### Integrations

- [NotificationIntegration](<wiki_url>/integrations/NotificationIntegration) — outbound email/SMS on request creation and assignment.

### Background jobs

- `UserRequestEscalationJob` — scheduled daily; flags requests unassigned > 24h for manual escalation.

### Distributed events

- `UserRequestCreated` — published after local transaction commits via ABP local event bus; subscribed by `NotificationIntegration`.
- `UserRequestAssigned` — published on assignment; subscribed by `AssignmentHistoryReadModel`.
```

---

## Section 12: UI-API Integration Points

**Included only if `ui-integration` clauses exist.** Omitted entirely otherwise.

Captures the prototype-to-backend contract. The UI prototype is the source of truth for visual design; this section documents what the backend must deliver to make the prototype work.

```markdown
## UI-API Integration Points

### Screen-to-endpoint map

| Screen / component | Endpoint(s) called |
|---|---|
| `CustomerRequestList` | GET `/api/public/app/user-requests` ([GetUserRequestQuery](<wiki_url>/queries/GetUserRequestQuery)) |
| `CustomerNewRequestForm` | POST `/api/public/app/user-requests` ([CreateUserRequestCommand](<wiki_url>/commands/CreateUserRequestCommand)) |
| `TriageQueuePage` | GET `/api/private/app/user-requests` ([ListUserRequestsQuery](<wiki_url>/queries/ListUserRequestsQuery)) |
| `TriageAssignModal` | POST `/api/private/app/user-requests/{id}/assign` ([AssignRequestCommand](<wiki_url>/commands/AssignRequestCommand)) |

### DTO field deviations

| UI field | Backend source | Deviation |
|---|---|---|
| `customerDisplayName` | `Customer.FirstName` + `Customer.LastName` | Composed client-side; backend returns the two fields separately |
| `statusBadgeColor` | `UserRequest.Status` | Mapped client-side via prototype's style guide; backend returns the enum string only |

### Loading and error state backend requirements

- List queries must return within 1.5s P95 at 10,000 records per tenant; the prototype shows a skeleton loader and falls back to an error view if the call exceeds 5s.
- Triage queue polls every 30 seconds. Backend must either accept the polling load or replace with SignalR push; recommended default is polling for M1.
- `CreateUserRequestCommand` must be idempotent on `Idempotency-Key` header — the UI allows optimistic response display and retries on network failure.
- Failed commands return RFC 7807 ProblemDetails so the UI can render field-level validation errors next to the offending input.

### Gap analysis

- **Missing query:** `GetUserRequestStatusSummaryQuery` — the triage dashboard requires aggregated counts by status, which no query in this Feat Spec produces. Recorded as [Conflict-07](<wiki_url>/conflicts/Conflict-07) (`missing_query`).
- **Missing command:** `ReassignRequestCommand` — the triage modal offers "reassign" but this Feat Spec covers only initial assignment. Recorded as [Conflict-08](<wiki_url>/conflicts/Conflict-08) (`missing_command`).

### Prototype reference

Canonical location: `<prototype repo or design tool URL>` (declare in CLAUDE.md `ui_prototype_url` if this is a project-wide convention).
```

**This section does NOT include:**

- Pure visual specs (colors, icons, toasts) — excluded.
- UI-internal routing, state management, or component hierarchy — out of scope.

---

## Section 13: Error Handling, Auditing, and Logging

Prose. Cite ABP conventions and CLAUDE.md gotchas.

```markdown
## Error Handling, Auditing, and Logging

- Domain rule violations throw `BusinessException` subclasses; ABP translates to 4xx ProblemDetails automatically.
- Validation failures from FluentValidation surface as 400 with field-level details.
- `UserRequest` uses `FullAuditedAggregateRoot` — creation and modification audit fields are populated automatically.
- Domain events are recorded in `AbpAuditLog` via ABP's audit integration.
- Structured logging via Serilog with `TenantId` and `UserId` enriched context.
```

---

## Section 14: Performance and Scalability

Prose. Highlight query patterns and expected load.

```markdown
## Performance and Scalability

- Triage queue query expected to serve 50 concurrent officers per tenant at peak; composite index `(TenantId, Status, CreatedOn)` supports this.
- Customer history query bounded by `CustomerId` scope within tenant — linear in the customer's request count (typically < 100).
- No N+1 risks identified — projections use explicit select via Mapperly.
- Background escalation job scheduled off-peak.
```

---

## Section 15: Deployment Considerations

Prose. Migrations, feature flags, configuration.

```markdown
## Deployment Considerations

- Schema change: `AppUserRequests` and `AppRequestAssignments` tables plus indexes. Standard `DbMigrator` run covers both.
- No feature flags required for M1 rollout; capability is gated by Role assignment.
- RabbitMQ bindings for distributed events added to the notification consumer — coordinate deployment so producer is deployed last.
```

---

## Section 16: Open Questions and Future Enhancements

Bullet list. For ambiguous but non-blocking items, and for explicit follow-on work.

```markdown
## Open Questions and Future Enhancements

- SLA computation (elapsed time vs business hours) — tracked as follow-on; see CLAUDE.md scope note.
- Workload balancing across triage officers — out of scope for M1; would require a new `AssignmentPolicyService`.
- Multi-channel request intake (email, chat) — M2 scope.
```

---

## Assembly rules

- **Every section fully expanded.** No "TBD" stubs.
- **Empty optional sections (3, 12) are omitted entirely.** No "none identified" text.
- **Links:** rendered per the rendering rules at the top — full `wiki_url`, no `.md`, no `wiki_local_path` prefix, human-readable labels.
- **Source citations:** use GitLab section-anchor deep links. Opaque clause IDs are prohibited.
- **CLAUDE.md references** are by name (e.g., "per CLAUDE.md `validation_library`"), not by path duplication.
- **Tables:** use pipe-syntax Markdown, not HTML tables.
- **No code fences** anywhere except Mermaid in Architecture Blueprints (which live on their own node pages, not inside this template).
