# Sub-agent Contract: `ddd-synthesizer`

## Purpose

Produce fully-expanded Markdown entries for every DDD node type, the Permissions Map, and the ABP Artifact Map. Consistently apply the CLAUDE.md convention contract (validation library, object mapping library, permissions class, table prefix, sorting strategy, enum serialization, API routing) to every entry.

When dispatched in parallel (one worker per module), each worker handles its module independently. The main agent rejoins envelopes.

## Model

Opus (preferred) or Sonnet. High-quality reasoning step that produces the bulk of the spec content.

## Tools

None. Pure synthesis.

## Parallel dispatch

**Dispatch rule:** if Phase 5 produced ≥2 modules, dispatch one `ddd-synthesizer` per module in parallel. If 1 module, run as a single pass.

**Why parallel-safe:** aggregate boundaries don't cross module boundaries. Within-module naming consistency is preserved by each worker's single pass. Cross-module references are rare and resolve at assembly time via the combined naming index. Collisions across modules are caught in the rejoin step and trigger targeted repair.

## Input

```
{
  "mode": "full" | "repair",
  "module_scope": "<module name>" | null,    // null for single-pass mode
  "mappings": [
    {
      "clause_key": "<key>",
      "primary_category": "<category>",
      "secondary_categories": [...],
      "proposed_node_name": "<PascalCase>",
      "module": "<module>",
      "sub_module": "<sub-module>",
      "clause_text": "<verbatim>",
      "source_iid": <int>,
      "source_url": "<deep link to FRS section>",
      "source_label": "<FRS #N — Section>",
      "tenancy_signals": [...]
    }
  ],
  "conflicts": [
    {
      "conflict_id": "Conflict-NN",
      "blocking_severity": "<severity>",
      "description": "<text>",
      "resolution_question": "<text>",
      "affected_categories": [...],
      "source_url": "<deep link>",
      "source_label": "<label>"
    }
  ],
  "tenancy_model": "<resolved model>",
  "claude_md_conventions": {
    "project_root_namespace": "Amnil.TradeFinance",
    "module_project_layout": {
      "domain": "src/Amnil.TradeFinance.Domain",
      "application": "src/Amnil.TradeFinance.Application",
      "contracts": "src/Amnil.TradeFinance.Application.Contracts",
      "domain_shared": "src/Amnil.TradeFinance.Domain.Shared",
      "ef_core": "src/Amnil.TradeFinance.EntityFrameworkCore",
      "http_api": "src/Amnil.TradeFinance.HttpApi"
    },
    "api_routing_conventions": {
      "public_prefix": "/api/public/app/",
      "private_prefix": "/api/private/app/"
    },
    "validation_library": "FluentValidation",
    "object_mapping_library": "Mapperly",
    "permissions_class": "TradeFinancePermissions",
    "db_table_prefix": "App",
    "sorting_strategy": "explicit-switch",
    "enum_serialization": "camelCase strings, global",
    "notable_gotchas": "<verbatim prose from CLAUDE.md>"
  },
  "wiki_url": "<base wiki URL for link rendering>",
  "reference_files": {
    "actors": "<content>",
    "entities": "<content>",
    "value_objects": "<content>",
    "commands": "<content>",
    "queries": "<content>",
    "flows": "<content>",
    "states": "<content>",
    "decisions": "<content>",
    "integrations": "<content>",
    "architecture_blueprints": "<content>",
    "conflicts": "<content>",
    "abp_base_classes": "<content>",
    "abp_built_in_entities": "<content>"
  }
}
```

### Repair mode input (additional fields)

```
{
  "mode": "repair",
  "repair_targets": [
    {"filepath": "<wiki_local_path>/entities/Foo.md", "defect": "missing **Base class:**", "severity": "high"}
  ],
  "previous_envelope": { ... }
}
```

## Responsibility

1. **Pre-synthesis ABP built-in check.** For every clause mapped to `Entity`, scan `abp_built_in_entities` to see if it duplicates a built-in. If yes: route to Actor / Integration / relationship — do NOT synthesize an Entity.
2. **Base class assignment** per `abp_base_classes` decision tree.
3. **Interface assignment** per tenancy + `ISoftDelete` + `IHasConcurrencyStamp` rules.
4. **Single-pass synthesis within the worker's scope** (full module, or full milestone if single-pass).
5. **Build naming index** used for cross-reference resolution within the worker.
6. **Build Permissions Map** (partial — one row per Actor + Command/Query within this module). Pattern uses `claude_md_conventions.permissions_class`:
   - Default pattern: `<PermissionsClass>.<AggregateNamePlural>.<Verb>` → `TradeFinancePermissions.UserRequests.Create`.
   - When CLAUDE.md declares a nested-class convention (inferred from the `permissions_class` name), the rendered form in the Permissions Map uses `TradeFinancePermissions.UserRequests.Create` — the Permissions Map table's `Permission string` column always shows this fully-qualified form.
7. **Build ABP Artifact Map** (partial — layers populated with this module's artifacts):
   - **Domain** layer entries use namespace `<project_root_namespace>.<Module>`.
   - **Application** layer entries include a Validators sub-list (one `<CommandName>InputValidator` per Command, per `validation_library`).
   - **Application** layer also includes a Mappers sub-list (Mapperly mappers per `object_mapping_library`).
   - **Contracts** layer DTOs in `<project_root_namespace>.<Module>.Application.Contracts` or per `claude_md_conventions.module_project_layout.contracts` path.
   - **Infrastructure / EF Core** tables named `<db_table_prefix><EntityName>` (e.g., `AppUserRequests`).
   - **Permissions** section uses `<permissions_class>`.

## Per-node-type output requirements

All entries are Markdown body. No YAML. No code fences (except Mermaid in Architecture Blueprints). No `public class`, no method bodies, no colon-inheritance syntax.

Every entry MUST include the `**Source:**` field as a bullet list of GitLab section-anchor deep links. Use the `source_url` and `source_label` carried through from `clause-mapper`. Multiple source clauses → multiple bullets.

Example:
```
**Source:**
- [FRS #11 — Actors](http://localhost:8080/root/trade-finance/-/issues/11#3-actors)
- [FRS #11 — Success Outcomes](http://localhost:8080/root/trade-finance/-/issues/11#4-success-outcomes)
```

### Entity entry (required fields)

- `**Node type:** Entity`
- `**Name:** <PascalCase>`
- `**Module:** <module>` / `**Sub-module:** <sub-module>`
- `**Aggregate role:** Aggregate root | Child entity`
- `**Parent aggregate:** <wiki link>` *(only if child)*
- `**Purpose:** <1-2 sentences>`
- `**Lifecycle:** <1 sentence; link to State page if applicable>`
- `**Base class:** <from catalog>`
- `**Base class rationale:** <which source section drove the choice>`
- `**Interfaces:** <comma-separated>`
- `**Multi-tenancy:** <resolved scoping or "blocked by Conflict-NN">`
- `**ABP built-in referenced:** <if applicable>`
- `**Attributes table:** columns: Name, Type, Required, Owned by, Notes`
- `**Invariants:** bullet list`
- `**Domain events raised:** table: Event name, Required/Optional, Consumer`
- `**Related commands:** bullet list of wiki links (using `wiki_url`, no `.md`, no path prefix)`
- `**Related queries:** bullet list`
- `**Related states:** <wiki link or "none">`
- `**Relationships:** bullet list`
- `**Source:** bullet list of deep-linked FRS references`

### Command entry

- `**Node type:** Command`
- `**Name:** <verb-prefixed PascalCase>`
- `**Actor:** <wiki link>`
- `**Target aggregate:** <wiki link>`
- `**Purpose:** <1-2 sentences>`
- `**Audience:** Public | Private` *(when CLAUDE.md declares the split)*
- `**Input DTO:** <DtoName>` with fields table (Name, Type, Required, Validation, Notes — all PascalCase)
- `**Input DTO base:** <from catalog; typically plain or ExtensibleObject>`
- `**Validation:** <CommandName>InputValidator (FluentValidation)` *(or the library named in CLAUDE.md)*
- `**Output DTO:** <DtoName | Guid | void>`
- `**Authorization:** <PermissionsClass>.<AggregateNamePlural>.<Verb>` *(e.g., `TradeFinancePermissions.UserRequests.Create`)*
- `**HTTP route:** <public_prefix OR private_prefix><aggregate-slug>/...` *(when routing is declared in CLAUDE.md)*
- `**Preconditions:** bullet list`
- `**Postconditions:** bullet list`
- `**Domain events raised:** bullet list (name + Required/Optional + consumer)`
- `**Side effects:** bullet list` *(optional)*
- `**Source:** bullet list of deep-linked FRS references`

### Query entry

- `**Node type:** Query`
- `**Name:** <Get/List-prefixed PascalCase>`
- `**Actor:** <wiki link>`
- `**Target aggregate:** <wiki link>`
- `**Purpose:** <1-2 sentences>`
- `**Audience:** Public | Private` *(when CLAUDE.md declares the split)*
- `**Input DTO:** <DtoName>` with fields table
- `**Input DTO base:** PagedAndSortedResultRequestDto` (default) or deviation
- `**Default sort:** <field> <asc|desc>`
- `**Sort strategy:** explicit switch on input.Sorting` *(when CLAUDE.md declares `explicit-switch`)*
- `**Output DTO:** <DtoName>` with fields table
- `**Output wrapper:** PagedResultDto<<DtoName>>` (default) or deviation
- `**Authorization:** <PermissionsClass>.<AggregateNamePlural>.<Verb>`
- `**HTTP route:** <public_prefix OR private_prefix><aggregate-slug>/...`
- `**Tenant/entity scoping:** <resolved scoping>`
- `**Filters supported:** bullet list (filter field, operator, tenant-filter ordering)`
- `**Total count returned:** yes | no`
- `**Source:** bullet list of deep-linked FRS references`

### Actor entry

- `**Node type:** Actor`
- `**Name:** <PascalCase or "System: BackgroundJob: <JobName>">`
- `**Kind:** Human | External system | System: BackgroundJob | System: ScheduledTask | System: EventHandler`
- `**ABP identity binding:** IdentityUser + role <RoleName>` (human) or `<JobClassName>` (system)
- `**Goals:** bullet list`
- `**Commands initiated:** wiki links`
- `**Queries initiated:** wiki links`
- `**Source:** bullet list`

### Value Object entry

- `**Node type:** Value Object`
- `**Name:** <PascalCase>`
- `**Module:** <module>`
- `**Purpose:** <1 sentence>`
- `**Base class:** ValueObject | C# record`
- `**Attributes table:** Name, Type, Required, Validation, Notes (PascalCase)`
- `**Equality rule:** <by all fields | subset | custom>`
- `**Invariants:** bullet list`
- `**Used by:** wiki links`
- `**Source:** bullet list`

### Flow entry

- `**Node type:** Flow`
- `**Name:** <PascalCase>`
- `**Actor(s):** wiki links`
- `**Purpose:** <1-2 sentences>`
- `**Preconditions:** bullet list`
- `**Numbered steps:** ordered list with wiki links to Commands/Queries/Integrations`
- `**Decision branches:** labeled branches (happy, alternate, error)`
- `**Postconditions:** bullet list`
- `**Source:** bullet list`

### State entry

- `**Node type:** State`
- `**Entity:** <wiki link>`
- `**Storage:** enum <EnumName> stored as <serialization strategy from CLAUDE.md>`
- `**States table:** State name, Description, Is initial, Is terminal`
- `**Transitions table:** From, To, Triggered by (Command wiki link), Guard, Domain event`
- `**Illegal transitions:** bullet list` *(optional)*
- `**Terminal handling:** bullet list`
- `**Source:** bullet list`

### Decision entry

- `**Node type:** Decision`
- `**Title:** <sentence case>`
- `**Status:** Accepted | Proposed | Deprecated | Superseded by <link>`
- `**Context:** <1-3 sentences>`
- `**Decision:** <chosen approach>`
- `**Rationale:** bullet list`
- `**Rejected alternatives:** bullet list`
- `**Consequences:** bullet list (positive and negative)`
- `**Source:** bullet list`

### Integration entry

- `**Node type:** Integration`
- `**Name:** <PascalCase>`
- `**External party:** <name>`
- `**Direction:** outbound | inbound | bidirectional`
- `**Trigger:** <Command wiki link | event name | schedule | inbound endpoint>`
- `**Contract summary:** <prose; NO payload specs>`
- `**Failure impact boundary:** bullet list (hard/soft/eventual)`
- `**Retry strategy:** <sync | background job | circuit breaker | DLQ>`
- `**Idempotency:** <strategy>` *(optional)*
- `**Source:** bullet list`

### Architecture Blueprint entry

- `**Node type:** Architecture Blueprint`
- `**Title:** <short title>`
- `**Purpose:** <1-2 sentences>`
- `**Diagram:** Mermaid block permitted here only`
- `**Discussion:** prose`
- `**Source:** bullet list`

### Conflict entry

Follow `references/conflicts.md` verbatim, with the `**Source:**` field using the same deep-link format.

## ABP Artifact Map structure (per worker, partial)

All namespaces use `claude_md_conventions.project_root_namespace`. All table names use `db_table_prefix`.

### Domain layer
- Aggregates, child entities, value objects — with wiki links.
- Enums (with stored-as strategy per `enum_serialization`).
- Domain events: Event, Raised by, Required/Optional, Consumer.
- Repository interfaces (custom only).
- Domain services.

### Application layer
- App services.
- Methods: one row per Command + one per Query (Method, Kind, Audience if Public/Private declared, Maps to wiki link).
- **Validators** sub-list: one `<CommandName>InputValidator` per Command (using `validation_library`). Omit sub-list if `validation_library: none`.
- **Mappers** sub-list: one Mapperly mapper per aggregate DTO pair (using `object_mapping_library`). Omit if `object_mapping_library: none`.

### Contracts layer
- Input DTOs (PascalCase).
- Output DTOs.
- Paging DTOs.
- Permission class: `<permissions_class>` — e.g., `TradeFinancePermissions`.

### Permissions
- Full Permissions Map partial — merged at assembly.

### Infrastructure / EF Core
- DbContext: `<project_root_namespace>.DbContext` or module-specific.
- DbSets to add.
- Table names: `<db_table_prefix><EntityName>` (e.g., `AppUserRequests`).
- Index hints: Entity, Fields, Direction, Purpose.
- Enum conversion: per `enum_serialization`.
- Unique constraints.
- Repository implementations (custom only).

### Tests
- Permission tests per Actor + Command/Query pair.
- Tenant/entity isolation tests per `IMultiTenant` aggregate.
- Validation tests per Command input DTO (FluentValidation test pattern).
- List sorting/paging tests per Query (verifies `explicit-switch` coverage).
- Domain rule tests per invariant.
- State transition tests (legal + illegal).

## Returns

```
{
  "module_scope": "<module name>" | null,
  "node_entries": {
    "actors": [{"name": "<n>", "markdown": "...", "filepath": "<wiki_local_path>/actors/<n>.md"}, ...],
    "entities": [{"name": "<n>", "markdown": "...", "filepath": "...", "attribute_count": <int>, "is_aggregate_root": bool, "base_class": "<class>"}, ...],
    "value_objects": [...],
    "commands": [{"name": "<n>", "markdown": "...", "filepath": "...", "dto_field_count": <int>, "permission_string": "...", "audience": "Public|Private|null"}, ...],
    "queries": [{"name": "<n>", "markdown": "...", "filepath": "...", "filter_field_count": <int>, "output_wrapper": "...", "audience": "Public|Private|null"}, ...],
    "flows": [...],
    "states": [...],
    "decisions": [...],
    "integrations": [...],
    "architecture_blueprints": [...],
    "conflicts": [...]
  },
  "permissions_map_partial": [
    {"actor": "<wiki link>", "use_case": "<wiki link>", "kind": "Command|Query", "audience": "Public|Private|null", "permission_string": "TradeFinancePermissions.X.Y"}
  ],
  "abp_artifact_map_partial": {
    "domain": {"markdown": "..."},
    "application": {"markdown": "..."},
    "contracts": {"markdown": "..."},
    "permissions": {"markdown": "..."},
    "infrastructure_ef_core": {"markdown": "..."},
    "tests": {"markdown": "..."}
  },
  "naming_index": {
    "<n>": {"kind": "Entity|Command|Query|...", "filepath": "...", "module": "<module>"}
  },
  "builtin_references": [
    {"source_url": "<deep link>", "built_in": "IdentityUser", "routed_to": "Actor|Integration|Relationship"}
  ],
  "convention_usage": {
    "validation_library_used": "FluentValidation",
    "object_mapping_library_used": "Mapperly",
    "permissions_class_used": "TradeFinancePermissions",
    "db_table_prefix_used": "App",
    "sorting_strategy_used": "explicit-switch",
    "enum_serialization_used": "camelCase strings, global",
    "audience_split_applied": bool
  }
}
```

## Enforcement

- **No code fences** anywhere except Mermaid in Architecture Blueprints.
- **No `public class`** or colon-inheritance syntax.
- **No ABP built-in duplication.**
- **No opaque clause IDs.** `**Source:**` uses deep-link format only.
- **Wiki links use `wiki_url` base with no `.md` extension, no `wiki_local_path` prefix.** Example: `[UserRequest](<wiki_url>/entities/UserRequest)`.
- **Single consistent naming within the worker.** `naming_index` is built during synthesis.
- **CLAUDE.md convention adherence:**
  - `validation_library: FluentValidation` → every Command has `**Validation:** <CommandName>InputValidator (FluentValidation)`. No `[Required]`, `[StringLength]`, or `IValidatableObject` references unless a Decision explains the deviation.
  - `object_mapping_library: Mapperly` → ABP Artifact Map Application section Mappers sub-list references Mapperly. No AutoMapper references.
  - `permissions_class: TradeFinancePermissions` → every permission string uses that class.
  - `db_table_prefix: App` → every Infrastructure section table name has the prefix.
  - `sorting_strategy: explicit-switch` → every Query has `**Sort strategy:** explicit switch on input.Sorting`. No `System.Linq.Dynamic.Core`.
  - `enum_serialization: camelCase strings, global` → every State entry's Storage field references the global `JsonStringEnumConverter`.
  - `api_routing_conventions` declared → every Command/Query has `**Audience:**` and `**HTTP route:**` fields with the correct prefix.
- **Minimum byte-length floors:**
  - Entity: ≥ 600 bytes.
  - Command: ≥ 400 bytes.
  - Query: ≥ 400 bytes.
  - Flow: ≥ 300 bytes.
  - State: ≥ 200 bytes.
  - Value Object: ≥ 250 bytes.
  - Decision / Integration / Architecture Blueprint: ≥ 300 bytes.
  - Actor: ≥ 150 bytes.
- **DTO audit level mirrors entity audit level.**
- **Every Query's Input DTO base** is `PagedAndSortedResultRequestDto` (or explicit deviation noted).
- **Every Query's Output wrapper** is `PagedResultDto<TDto>` or `ListResultDto<TDto>` (deviation noted).
- **Permissions Map partial** covers every `Actor + Command` and `Actor + Query` pair in the worker's scope.
- **Audience tagging** consistent: Customer → Public; named internal roles → Private. `IdentityUser` with no role context defaults based on the most-invoking role.

## Targeted repair mode

Receive `repair_targets` + `previous_envelope`. Only regenerate the listed entries. Preserve all other entries verbatim. Return the same envelope shape with updated entries slotted in.

## Main agent uses this output to

- Merge worker envelopes (by node type, permissions map, ABP artifact map).
- Detect cross-module naming collisions in the combined naming index → trigger targeted repair.
- Assemble the Feat Spec (Phase 8).
- Write individual node files (Phase 11).
- Pass full envelope to `feat-spec-validator` (Phase 9).
