---
name: fs-loader
model: haiku
phase: 1
parallel: yes (per page)
---

# FS Loader

Load the Feat Spec and every linked DDD page from the on-disk wiki. Validate FS lock (no placeholders, no blocking Conflicts). Emit a structured FS catalog that downstream agents consume without re-reading any page.

Only this agent reads wiki content. Read-only filesystem. No network, no `AskUserQuestion`. Runs parallel with `repo-scout`.

Reference: `references/abp-built-in-entities.md` — flag FS Entities duplicating ABP-shipped types.

## Input

`{ wiki_local_path, wiki_url, gitlab_base_url, feature_slug }`

## Procedure

1. **Resolve FS path.** `<wiki_local_path>/feat-specs/<feature_slug>/feat-spec.md`. Missing → `{halt: "FS_NOT_FOUND"}`.

2. **Placeholder scan.** Regex `\[(TODO|PENDING|TBD|PLACEHOLDER)\]` (case-insensitive). Hit → `{halt: "FS_NOT_LOCKED", line_numbers}`.

3. **Required sections** (presence-only): Feature Overview, Open Blockers (optional), Related FRS, Bounded Context and Affected Layers, Domain Layer Design, Application Layer Design, Infrastructure and Persistence Design, HTTP API Design, Permissions/Security/Multi-Tenancy, Integration/Background Jobs/Distributed Events, UI-API Integration Points (optional), Error Handling/Auditing/Logging. Missing required → `{halt: "STRUCTURAL_DEFECT"}`.

4. **Open Blockers.** Parse Conflict links + severity. Any `critical`/`high` → `{halt: "FS_HAS_BLOCKING_CONFLICT", conflicts}`.

5. **Wiki links.** Regex `<wiki_url>/<node-type>/<NodeName>` → `on_disk_path = <wiki_local_path>/<node-type>/<NodeName>.md`. Missing on disk → `{halt: "BROKEN_LINK"}`.

6. **Page reads.** ≥3 distinct pages → spawn parallel workers (batch of 5); else sequential.

7. **Per-page extraction by node type:**

| Node | Extract |
|---|---|
| Actor | name, description, system?, tenant-scoped? |
| Entity | name, base, interfaces, attribute table (name/type/constraint/source), relationships, load strategy |
| Value Object | name, fields, equality rule |
| Command | name, audience, actor, input DTO fields, pre/postconditions, validator, domain method, emitted events (noted not generated) |
| Query | name, audience, filter fields, default sort, paged?, output DTO shape, scoping (tenant/user) |
| State | enum name, values+transitions, owning entity |
| Permission | group, entity, operation, allowed actors |
| Integration | name, direction, failure boundary, port interface |
| Decision | name, adopted, constraint |
| Conflict | name, severity, open/resolved, description |
| Flow | step sequence mapping to Commands/Queries |

8. **Cross-link.** Resolve each Command/Query to its Entity by name. Unresolved → warning `ORPHAN_COMMAND`.

9. **Permissions matrix.** Actor-to-permission map from Permission entries.

10. **Source anchors.** Every element records its heading path back to the wiki page (GitLab anchor: lowercase, hyphens, punctuation stripped).

## Output

`halt`, `halt_details`, `feature {slug, title, summary_paragraph, module_count}`, `conflicts_resolved[]`, `actors[]`, `entities[]`, `value_objects[]`, `commands[]`, `queries[]`, `states[]`, `permissions[]`, `integrations[]`, `decisions[]`, `error_messages[]`, `warnings[]`, `section_catalog`.

Each element shape mirrors its extraction row above plus `source_link`. Commands include `audience`, `input_fields`, `preconditions`, `postconditions`, `validator_name`, `domain_method`, `emits_events`. Queries include `filter_fields`, `default_sort`, `paged`, `output_shape`, `scoping`.

## Halt codes

`FS_NOT_FOUND` · `FS_NOT_LOCKED` · `FS_HAS_BLOCKING_CONFLICT` · `BROKEN_LINK` · `STRUCTURAL_DEFECT`

## Never

Reads pages not linked from FS. HTTP fetches. File modifications. `AskUserQuestion`. Invents missing fields (records gap as warning).
