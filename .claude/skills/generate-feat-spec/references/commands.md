# Reference: Command nodes

A Command is a write-side application use case. It mutates state, has preconditions and postconditions, and may raise domain events. In ABP terms, a Command maps to an application service method that returns either `Task`, `Task<Guid>`, or `Task<<Aggregate>Dto>`.

> **Enforcement:** Queries are a separate node type. If the clause describes retrieval with no side effects, use `references/queries.md`. Do not conflate Commands and Queries.

---

## When to create a Command

Create a Command when a clause describes:

- A state change on an Entity, OR
- An action that produces a persistent side effect (emits an event, calls an external system, queues a background job), OR
- An API endpoint that is POST / PUT / PATCH / DELETE.

Do **not** create a Command for:

- Retrieving data (see Query).
- A pure visual UI action (route to exclusion ledger).
- A UI-to-backend contract concern that doesn't imply a new write action (route to UI-API Integration Points).
- A step within a larger Flow that doesn't have its own domain meaning — describe it inside the Flow's steps.

---

## Naming

Command names are **verb-prefixed PascalCase**:

- `Create<Entity>` — creates a new aggregate.
- `Update<Entity>` — modifies an existing aggregate.
- `Delete<Entity>` or `Archive<Entity>` — soft/hard delete.
- `<Action><Entity>` — domain-specific action: `ApproveUserRequest`, `RejectUserRequest`, `VerifyEmailForUserRequest`.

Avoid bare nouns (`UserRequest`) or procedural names (`HandleRequest`).

Input DTO naming convention: `<CommandName>Input` (e.g., `CreateUserRequestInput`, `ApproveUserRequestInput`). The paired FluentValidation validator is `<CommandName>InputValidator`.

---

## Required fields

Every Command entry must include these bold-labeled fields:

- `**Node type:** Command`
- `**Name:** <PascalCase, verb-prefixed>`
- `**Actor:** <wiki link to Actor>`
- `**Target aggregate:** <wiki link to Entity>`
- `**Purpose:** <1–2 sentences, business-level>`
- `**Input DTO:** <DtoName>` with a fields table (Name, Type, Required, Validation, Notes) — all PascalCase
- `**Input DTO base:** <from abp-base-classes.md; typically plain or ExtensibleObject>`
- `**Validation:** <CommandName>InputValidator (<validation_library from CLAUDE.md>)`
- `**Output DTO:** <DtoName | Guid | void>` with fields table if a DTO
- `**Authorization:** <PermissionsClass>.<AggregateNamePlural>.<Verb>` — pattern uses CLAUDE.md `permissions_class`
- `**Preconditions:** <bullet list>`
- `**Postconditions:** <bullet list>`
- `**Domain events raised:** <bullet list: EventName + Required/Optional + consumer wiki link>`
- `**Source:** <bullet list of GitLab section-anchor deep links; see SKILL.md Clause Source Deep-Linking>`

**Required when CLAUDE.md declares Public/Private API split** (`api_routing_conventions`):

- `**Audience:** Public | Private` — inferred from the Actor: customer-facing Actors → Public; internal/backoffice Actors → Private.
- `**HTTP route:** <public_prefix OR private_prefix><aggregate-slug>/...` — uses the prefix matching Audience.

Optional:

- `**Idempotency:** <idempotency key field and strategy>` *(when FRS calls for it, or UI-API Integration Points requires it)*
- `**Transactional boundary:** <which aggregates are part of the transaction>`
- `**Side effects:** <bullet list of non-event side effects: background job queued, external API called>`

---

## Input DTO

Columns:

| Name | Type | Required | Validation | Notes |
|---|---|---|---|---|
| `<FieldName>` | `<C# type>` | yes/no | `<rule summary>` | Short note |

Guidelines:

- Field names are **PascalCase**.
- Input DTOs typically inherit from no audit base class (they don't need audit fields — the application service captures audit from the current user).
- If the DTO is extensible, inherit from `ExtensibleObject`.
- For commands that update an existing aggregate, include an `Id` field and note it as `route-bound` if the endpoint takes the ID in the URL.

**Validation column notation** (when `validation_library: FluentValidation`):

- Use brief rule summaries: `NotEmpty, max 256 chars`, `EmailAddress`, `InclusiveBetween(1, 100)`, `cross-field: EndDate > StartDate (RuleFor)`.
- Full validation rules live in the paired `<CommandName>InputValidator` class (an implicit companion in the Application project).
- **Do not use data-annotation notation** (`[Required]`, `[StringLength(256)]`, `[EmailAddress]`) in the table. Data annotations are not used when CLAUDE.md declares FluentValidation — conflating them misleads implementers.

**Validation column notation** (when `validation_library: DataAnnotations`):

- Use the annotation syntax: `[Required]`, `[StringLength(256)]`, `[EmailAddress]`, `IValidatableObject` for cross-field rules.

---

## Output DTO

- **`Task` (void)** — command succeeds or throws; nothing returned.
- **`Task<Guid>`** — command creates an aggregate; return its ID.
- **`Task<<Entity>Dto>`** — command returns the full aggregate state; the DTO's auditing level must match the aggregate's (see `references/abp-base-classes.md`).

If the output is a DTO, document its fields. Use the DTO tables in `abp-base-classes.md` to pick a base class.

---

## Preconditions and postconditions

**Preconditions** — what must be true before the command executes:

- Authorization: caller has the required permission.
- Aggregate state: e.g., "status must be `Pending`".
- Input validation: beyond DTO/validator rules, any domain-level validation.
- Existence of referenced entities: e.g., "reviewer must be an active user".

**Postconditions** — what is guaranteed to be true after the command succeeds:

- Aggregate state change: e.g., "status transitions from `Pending` to `Approved`".
- Persistence: e.g., "aggregate is persisted with new `LastModificationTime`".
- Events: e.g., "`UserRequestApprovedEto` is raised".
- Side effects: e.g., "email reminder job is queued".

One bullet per condition. Source each to a clause where possible — use the same deep-link format as the `**Source:**` field.

---

## Authorization

Permission string pattern follows CLAUDE.md `permissions_class`:

- Default: `<Module>Permissions.<AggregateNamePlural>.<Verb>`.
- For projects with a project-wide permissions class (e.g., `permissions_class: TradeFinancePermissions`), the pattern is `TradeFinancePermissions.<AggregateNamePlural>.<Verb>` with a nested-class structure per module.

Examples (for `permissions_class: TradeFinancePermissions`):

- `TradeFinancePermissions.UserRequests.Create`
- `TradeFinancePermissions.UserRequests.Approve`
- `TradeFinancePermissions.UserRequests.Reject`

Declared in `<permissions_class>.cs` as nested static classes per module, and registered in `<Module>PermissionDefinitionProvider`.

---

## Audience and HTTP route

When CLAUDE.md declares `api_routing_conventions.public_prefix` and `private_prefix`:

- **Public** — Commands invoked by customer-facing Actors (Customer, Applicant, Prospective Customer). Routed under `public_prefix`. Typically on a `PublicAppService` base class.
- **Private** — Commands invoked by internal/backoffice Actors (Triage Officer, Compliance Reviewer, Administrator). Routed under `private_prefix`. Typically on a `PrivateAppService` base class.

Route format: `<prefix><aggregate-slug>/<action>` — e.g., `POST /api/public/app/user-requests`, `POST /api/private/app/user-requests/{id}/approve`.

Actors that sit at the boundary (e.g., `System: BackgroundJob`) default to the Private surface unless the FRS explicitly scopes the action to a customer-callable endpoint.

---

## Domain events raised

One bullet per event:

- `<EventName>Eto` — `Required` | `Optional / future integration hook` — consumer: `<wiki link or "future">`.

Event names are PascalCase, past-tense, with `Eto` suffix for distributed events. Local (in-process) events can omit the suffix but should be named consistently with the distributed versions.

---

## Example entry (reference only — follow format)

> **Node type:** Command
> **Name:** ApproveUserRequest
> **Actor:** [Reviewer](http://localhost:8080/root/trade-finance/-/wikis/actors/Reviewer)
> **Target aggregate:** [UserRequest](http://localhost:8080/root/trade-finance/-/wikis/entities/UserRequest)
> **Purpose:** Transition a pending user request to approved, capturing the reviewer's identity and decision time.
> **Audience:** Private
> **HTTP route:** POST /api/private/app/user-requests/{id}/approve
>
> **Input DTO:** `ApproveUserRequestInput`
>
> | Name | Type | Required | Validation | Notes |
> |---|---|---|---|---|
> | `Id` | `Guid` | yes | NotEmpty | Route-bound |
> | `ApprovalNote` | `string?` | no | MaximumLength(512) | Optional reviewer comment |
>
> **Input DTO base:** plain (no audit inheritance)
> **Validation:** `ApproveUserRequestInputValidator` (FluentValidation)
> **Output DTO:** `UserRequestDto` (`FullAuditedEntityDto<Guid>`) — mirrors aggregate's auditing level
> **Authorization:** `TradeFinancePermissions.UserRequests.Approve`
>
> **Preconditions:**
> - Caller has permission `TradeFinancePermissions.UserRequests.Approve`. — [FRS #123 — Authorization rules](http://localhost:8080/root/trade-finance/-/issues/123#8-authorization-rules)
> - Target aggregate exists and is not soft-deleted. — [FRS #123 — Success outcomes](http://localhost:8080/root/trade-finance/-/issues/123#4-success-outcomes)
> - `Status == Pending`. — [FRS #123 — State transitions](http://localhost:8080/root/trade-finance/-/issues/123#5-state-transitions)
> - `EmailVerified == true`. — [FRS #123 — Preconditions](http://localhost:8080/root/trade-finance/-/issues/123#2-preconditions)
> - Caller is not the submitter (`SubmitterUserId ≠ CurrentUser.Id`). — [FRS #123 — Segregation of duties](http://localhost:8080/root/trade-finance/-/issues/123#9-segregation-of-duties)
>
> **Postconditions:**
> - `Status` set to `Approved`.
> - `ReviewerId` set to `CurrentUser.Id`.
> - `LastModificationTime` and `LastModifierId` updated by base class.
> - `UserRequestApprovedEto` raised.
>
> **Domain events raised:**
> - `UserRequestApprovedEto` — Required — consumer: [PartnerNotification](http://localhost:8080/root/trade-finance/-/wikis/integrations/PartnerNotification)
>
> **Side effects:**
> - Queues welcome-email background job via `IBackgroundJobManager`.
>
> **Source:**
> - [FRS #123 — Preconditions](http://localhost:8080/root/trade-finance/-/issues/123#2-preconditions)
> - [FRS #123 — State transitions](http://localhost:8080/root/trade-finance/-/issues/123#5-state-transitions)
> - [FRS #123 — Authorization rules](http://localhost:8080/root/trade-finance/-/issues/123#8-authorization-rules)
> - [FRS #123 — Segregation of duties](http://localhost:8080/root/trade-finance/-/issues/123#9-segregation-of-duties)

---

## Common defects

| Defect | Fix |
|---|---|
| Command with a noun name (e.g., `UserRequest`) | Rename with a verb prefix |
| Command with no preconditions listed | Extract at minimum: authorization, aggregate state, input validity |
| Command with no postconditions listed | At minimum: describe the state change that occurred |
| Command with no `**Authorization:**` | Add the permission string; if truly public, note "anonymous" and justify |
| Command that retrieves data and returns a list | That's a Query — move to `references/queries.md` |
| Output DTO auditing level doesn't match aggregate | Mirror the aggregate's base class — `FullAuditedAggregateRoot` → `FullAuditedEntityDto` |
| Command with code fences or `public class` syntax | Rewrite as bold-labeled field values only |
| `**Domain events raised:**` omitted (not even "none") | Include the field; write "none" if no events |
| `**Validation:**` field missing when CLAUDE.md declares `validation_library` | Add `<CommandName>InputValidator (<library>)` reference |
| Input DTO uses `[Required]` / `[StringLength]` when `validation_library: FluentValidation` | Rewrite Validation column as FluentValidation rule summaries; validator lives in its own file |
| `**Audience:**` missing when CLAUDE.md declares Public/Private split | Infer from Actor and add; update `**HTTP route:**` prefix accordingly |
| `**HTTP route:**` uses wrong prefix for Audience | Public → `public_prefix`; Private → `private_prefix` |
| Permission string uses wrong class (e.g., `<Module>Permissions` when CLAUDE.md declares `permissions_class: TradeFinancePermissions`) | Use the declared class |
| `**Source:**` lists opaque IDs like `FRS-123#c7` | Rewrite as GitLab section-anchor deep links |
