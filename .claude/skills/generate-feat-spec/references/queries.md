# Reference: Query nodes

A Query is a read-side application use case. It retrieves data with no side effects — no state changes, no domain events, no external calls that mutate. In ABP terms, a Query maps to an application service method that returns `Task<<Dto>>`, `Task<ListResultDto<TDto>>`, or `Task<PagedResultDto<TDto>>`.

> **Enforcement:** Queries are distinct from Commands. Every Query must specify its input DTO base (default `PagedAndSortedResultRequestDto`) and output wrapper (default `PagedResultDto<TDto>`).

---

## When to create a Query

Create a Query when a clause describes:

- Retrieving a single aggregate or DTO by ID, OR
- Listing aggregates with filtering, sorting, or paging, OR
- A report or aggregation that produces a read model.

Do **not** create a Query for:

- A write operation (see Command).
- An internal lookup used only inside a Command's execution — that's a repository call, not a standalone use case.
- A pure visual UI concern (route to exclusion ledger).
- A UI-to-backend contract concern that describes polling/refresh/loading behavior without implying a new read endpoint (route to UI-API Integration Points).

---

## Naming

Query names use `Get` (single result) or `List` (multiple results) prefix:

- `Get<Entity>` — retrieve a single aggregate by ID.
- `Get<Entity>By<Criterion>` — retrieve a single aggregate by non-ID criterion.
- `List<Entities>` — list aggregates with paging/filtering.
- `List<Entities>For<Context>` — scoped list (e.g., `ListUserRequestsForReviewer`).

Avoid `Find` (implies fuzzy/optional) unless that's the semantic; avoid `Search` unless full-text search is in scope.

Input DTO naming convention: `<QueryName>Input` (e.g., `ListUserRequestsInput`, `GetUserRequestInput`).

---

## Required fields

Every Query entry must include these bold-labeled fields:

- `**Node type:** Query`
- `**Name:** <PascalCase, Get/List prefix>`
- `**Actor:** <wiki link to Actor>`
- `**Target aggregate:** <wiki link to Entity>`
- `**Purpose:** <1–2 sentences, business-level>`
- `**Input DTO:** <DtoName>` with fields table
- `**Input DTO base:** PagedAndSortedResultRequestDto` (default) or explicit deviation
- `**Default sort:** <field and direction>`
- `**Output DTO:** <DtoName>` with fields table
- `**Output wrapper:** PagedResultDto<<DtoName>>` (default) or `ListResultDto<<DtoName>>` or explicit deviation
- `**Authorization:** <PermissionsClass>.<AggregateNamePlural>.<Verb>` — pattern uses CLAUDE.md `permissions_class`
- `**Tenant/entity scoping:** <resolved scoping>`
- `**Filters supported:** <bullet list of filter fields>`
- `**Total count returned:** yes | no`
- `**Source:** <bullet list of GitLab section-anchor deep links; see SKILL.md Clause Source Deep-Linking>`

**Required when CLAUDE.md declares `sorting_strategy`:**

- `**Sort strategy:** <strategy>` — for `sorting_strategy: explicit-switch`, value is `explicit switch on input.Sorting?.ToLowerInvariant()` and the entry lists the supported sort keys explicitly.

**Required when CLAUDE.md declares Public/Private API split** (`api_routing_conventions`):

- `**Audience:** Public | Private` — inferred from the Actor.
- `**HTTP route:** <public_prefix OR private_prefix><aggregate-slug>/...` — uses the prefix matching Audience.

Optional:

- `**Includes:** <bullet list of related entities eagerly loaded>` *(when `.Include()` is needed for DTO projection)*
- `**Caching:** <cache key, TTL, invalidation rule>` *(when the Query is cache-read)*
- `**Exclusions:** <soft-deleted, inactive tenants, ...>` *(when the Query filters beyond default ABP filters)*

---

## Input DTO

For list queries, input usually extends `PagedAndSortedResultRequestDto` which already provides:

- `SkipCount` (int, default 0)
- `MaxResultCount` (int, default 10)
- `Sorting` (string, optional — e.g., `"SubmissionTime desc"`)

Additional filter fields are added in the derived class. Columns for the fields table:

| Name | Type | Required | Notes |
|---|---|---|---|
| `<FilterField>` | `<C# type>` | yes/no | Short note |

For single-result queries (`GetX`), input is often a bare `Guid` parameter or a small input DTO with the identifier.

---

## Default sort and sort strategy

Always specify a default sort. Without one, paging is non-deterministic across requests.

When CLAUDE.md declares `sorting_strategy: explicit-switch` (the safer default for long-lived APIs):

- The entry's `**Sort strategy:**` field documents `explicit switch on input.Sorting?.ToLowerInvariant()`.
- The entry enumerates the supported sort keys explicitly (e.g., "supports `submissiontime asc`, `submissiontime desc`, `name asc`, `name desc`; all other values fall through to default sort").
- `System.Linq.Dynamic.Core` is **not used** — it exposes arbitrary property paths and side-steps index strategy.

When CLAUDE.md declares `sorting_strategy: dynamic-linq` or does not declare a strategy (older ABP default):

- The entry may use `.OrderBy(input.Sorting ?? "<default>")` via `System.Linq.Dynamic.Core`.
- `**Sort strategy:**` field is optional.

Examples of Default sort values:

- `SubmissionTime desc`
- `Name asc`
- `Priority desc, CreationTime asc`

---

## Output DTO

The output DTO is typically the aggregate's DTO (audited to match the aggregate's base class — see `references/abp-base-classes.md`).

Fields table:

| Name | Type | Notes |
|---|---|---|
| `Id` | `Guid` | |
| `<Field>` | `<C# type>` | |

For read-model queries (dashboards, reports, summaries), the output DTO may differ from the aggregate DTO and may aggregate fields from multiple sources. Name explicitly (e.g., `UserRequestSummaryDto`) and note as non-audited.

---

## Output wrapper

- **`PagedResultDto<TDto>`** — default for list queries; includes `Items` and `TotalCount`.
- **`ListResultDto<TDto>`** — for small unbounded lists where total count isn't needed.
- **`TDto` (bare)** — for single-result queries.

Deviations from default must be justified in the entry.

---

## Authorization

Permission string pattern follows CLAUDE.md `permissions_class`. For queries, verb is typically `View` or `List`.

Examples (for `permissions_class: TradeFinancePermissions`):

- `TradeFinancePermissions.UserRequests.View`
- `TradeFinancePermissions.UserRequests.List`

Some features distinguish view scopes:

- `TradeFinancePermissions.UserRequests.ViewAll` — reviewer sees all in their tenant
- `TradeFinancePermissions.UserRequests.ViewOwn` — submitter sees only their own

When scoping differs by actor, document the distinct permissions.

---

## Audience and HTTP route

When CLAUDE.md declares `api_routing_conventions.public_prefix` and `private_prefix`:

- **Public** — Queries invoked by customer-facing Actors. Routed under `public_prefix`. Typically on a `PublicAppService` base class.
- **Private** — Queries invoked by internal/backoffice Actors. Routed under `private_prefix`. Typically on a `PrivateAppService` base class.

Route format: `<prefix><aggregate-slug>` for lists, `<prefix><aggregate-slug>/{id}` for single-result.

Examples:

- `GET /api/public/app/user-requests/{id}`
- `GET /api/private/app/user-requests`

---

## Tenant/entity scoping

State how the Query is scoped:

- **Tenant-scoped via `IMultiTenant`** — ABP's built-in filter handles it.
- **Tenant + entity scoped** — describe the additional filter applied on top (e.g., "`EntityId == CurrentUser.EntityId`").
- **Actor-scoped** — e.g., "submitters see only their own; reviewers see all in their team".
- **Host-only** — for queries accessible only to host-level users.

For projects with `tenancy_model` declared in CLAUDE.md, tenant scoping always applies first, then additional scoping per CLAUDE.md convention.

---

## Filters supported

One bullet per filter. Describe the filter field, operator, and whether it's applied before or after tenant scoping.

Examples:

- `Status == <UserRequestStatus>` (exact match)
- `SubmissionTime >= <DateTime>` (range)
- `Email` (contains, case-insensitive)
- `ReviewerId == <Guid>` (exact match; applied after tenant filter)

---

## Example entry (reference only — follow format)

> **Node type:** Query
> **Name:** ListPendingUserRequests
> **Actor:** [Reviewer](http://localhost:8080/root/trade-finance/-/wikis/actors/Reviewer)
> **Target aggregate:** [UserRequest](http://localhost:8080/root/trade-finance/-/wikis/entities/UserRequest)
> **Purpose:** Return a paged, sorted list of user requests awaiting the reviewer's action within the reviewer's team.
> **Audience:** Private
> **HTTP route:** GET /api/private/app/user-requests
>
> **Input DTO:** `ListUserRequestsInput`
>
> | Name | Type | Required | Notes |
> |---|---|---|---|
> | `SkipCount` | `int` | no | From base, default 0 |
> | `MaxResultCount` | `int` | no | From base, default 10, max 100 |
> | `Sorting` | `string?` | no | From base; matched against supported keys |
> | `Status` | `UserRequestStatus?` | no | Filter by exact status |
> | `SubmittedAfter` | `DateTime?` | no | Lower bound on `SubmissionTime` |
> | `EmailContains` | `string?` | no | Case-insensitive contains |
>
> **Input DTO base:** `PagedAndSortedResultRequestDto`
> **Default sort:** `SubmissionTime desc`
> **Sort strategy:** explicit switch on `input.Sorting?.ToLowerInvariant()`; supports `submissiontime asc`, `submissiontime desc`, `email asc`, `email desc`; all other values fall through to default sort
>
> **Output DTO:** `UserRequestDto` (`FullAuditedEntityDto<Guid>`)
>
> | Name | Type | Notes |
> |---|---|---|
> | `Id` | `Guid` | |
> | `Email` | `string` | |
> | `Status` | `UserRequestStatus` | Serialized as camelCase string per CLAUDE.md `enum_serialization` |
> | `SubmissionTime` | `DateTime` | |
> | `SubmitterUserId` | `Guid` | |
> | `ReviewerId` | `Guid?` | |
> | *(audit fields from base)* | | `CreationTime`, `CreatorId`, `LastModificationTime`, `LastModifierId`, `IsDeleted` |
>
> **Output wrapper:** `PagedResultDto<UserRequestDto>`
> **Authorization:** `TradeFinancePermissions.UserRequests.View`
> **Tenant/entity scoping:** tenant-scoped via `IMultiTenant`; team-scoped via `TeamId == CurrentUser.TeamId` applied post-tenant filter.
> **Filters supported:**
> - `Status == <UserRequestStatus>` (exact)
> - `SubmissionTime >= SubmittedAfter` (range)
> - `Email` contains `EmailContains` (case-insensitive)
>
> **Total count returned:** yes
>
> **Source:**
> - [FRS #123 — Reviewer dashboard](http://localhost:8080/root/trade-finance/-/issues/123#10-reviewer-dashboard)
> - [FRS #123 — Filter requirements](http://localhost:8080/root/trade-finance/-/issues/123#11-filter-requirements)
> - [FRS #124 — Team scoping](http://localhost:8080/root/trade-finance/-/issues/124#2-team-scoping)

---

## Common defects

| Defect | Fix |
|---|---|
| Query with no `**Input DTO base:**` | Add it; default is `PagedAndSortedResultRequestDto` |
| Query with no `**Default sort:**` | Add it; pick a deterministic field |
| Query with no `**Output wrapper:**` | Add it; default is `PagedResultDto<TDto>` |
| Query with no `**Tenant/entity scoping:**` | Document explicitly, even if "tenant-scoped via IMultiTenant" |
| Query that raises domain events or mutates state | That's a Command — move |
| Query returning aggregate DTO with mismatched audit level | Mirror the aggregate's base class to its DTO |
| Query with no authorization and no justification | Add permission string or note "anonymous" with rationale |
| `**Filters supported:**` missing when FRS lists filters | Extract from FRS clauses |
| `**Sort strategy:**` missing when CLAUDE.md declares `sorting_strategy` | Add; document supported sort keys when `explicit-switch` |
| Uses `System.Linq.Dynamic.Core` when `sorting_strategy: explicit-switch` | Rewrite as switch; enumerate supported keys |
| `**Audience:**` missing when CLAUDE.md declares Public/Private split | Infer from Actor; update HTTP route prefix accordingly |
| `**HTTP route:**` uses wrong prefix for Audience | Public → `public_prefix`; Private → `private_prefix` |
| Permission string uses wrong class | Use the CLAUDE.md `permissions_class` |
| `**Source:**` lists opaque IDs like `FRS-123#c10` | Rewrite as GitLab section-anchor deep links |
