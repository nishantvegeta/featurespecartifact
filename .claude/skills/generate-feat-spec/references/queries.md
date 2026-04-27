# Reference: Query nodes

A Query is a read-side application use case. It retrieves data with no side effects — no state changes, no domain events, no mutating external calls. In ABP terms, a Query maps to an application service method that returns `Task<<Dto>>`, `Task<ListResultDto<TDto>>`, or `Task<PagedResultDto<TDto>>`.

> **Field contract:** Required fields, conditional fields (Audience, HTTP route, Sort strategy), and CLAUDE.md-driven enforcement live in `agents/ddd-synthesizer.md`. This file covers when to create a Query, naming, default-sort and tenant-scoping conventions, the worked example, and common defects.
>
> Queries are distinct from Commands. Every Query specifies its input DTO base (default `PagedAndSortedResultRequestDto`) and output wrapper (default `PagedResultDto<TDto>`).

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
- `List<Entities>` — list with paging/filtering.
- `List<Entities>For<Context>` — scoped list (e.g., `ListUserRequestsForReviewer`).

Avoid `Find` (implies fuzzy/optional) unless that's the semantic; avoid `Search` unless full-text search is in scope.

Input DTO naming convention: `<QueryName>Input`.

---

## Input DTO conventions

For list queries, input typically extends `PagedAndSortedResultRequestDto` which provides:

- `SkipCount` (int, default 0)
- `MaxResultCount` (int, default 10)
- `Sorting` (string, optional — e.g., `"SubmissionTime desc"`)

Additional filter fields go on the derived class. Columns: `Name | Type | Required | Notes`.

For single-result queries (`GetX`), input is often a bare `Guid` parameter or a small input DTO with the identifier.

---

## Default sort

Always specify a default sort. Without one, paging is non-deterministic across requests.

Examples of `**Default sort:**` values:

- `SubmissionTime desc`
- `Name asc`
- `Priority desc, CreationTime asc`

When CLAUDE.md declares `sorting_strategy: explicit-switch` (the safer default for long-lived APIs), the entry's `**Sort strategy:**` field documents `explicit switch on input.Sorting?.ToLowerInvariant()` and enumerates the supported sort keys explicitly. Example: "supports `submissiontime asc`, `submissiontime desc`, `name asc`, `name desc`; all other values fall through to default sort". `System.Linq.Dynamic.Core` is **not used** under this strategy.

---

## Output DTO and wrapper

The output DTO is typically the aggregate's DTO (audited to match the aggregate's base class — see `references/abp-base-classes.md`).

For read-model queries (dashboards, reports, summaries), the output DTO may differ from the aggregate DTO and may aggregate fields from multiple sources. Name explicitly (e.g., `UserRequestSummaryDto`) and note as non-audited.

Output wrapper choices:

- **`PagedResultDto<TDto>`** — default for list queries; includes `Items` and `TotalCount`.
- **`ListResultDto<TDto>`** — for small unbounded lists where total count isn't needed.
- **`TDto` (bare)** — for single-result queries.

Deviations from default must be justified in the entry.

---

## Tenant/entity scoping

State how the Query is scoped:

- **Tenant-scoped via `IMultiTenant`** — ABP's built-in filter handles it.
- **Tenant + entity scoped** — describe the additional filter applied on top (e.g., `EntityId == CurrentUser.EntityId`).
- **Actor-scoped** — e.g., "submitters see only their own; reviewers see all in their team".
- **Host-only** — accessible only to host-level users.

For projects with `tenancy_model` declared in CLAUDE.md, tenant scoping always applies first, then additional scoping per CLAUDE.md convention.

---

## Filters supported

One bullet per filter. Describe filter field, operator, and whether it's applied before or after tenant scoping.

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
| `**Source:**` lists opaque IDs like `FRS-123#c10` | Rewrite as GitLab section-anchor deep links |
