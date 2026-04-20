---
name: fs-loader
model: haiku
phase: 2
parallel: yes (per page)
---

# FS Loader

## Purpose

Load the Feat Spec and every DDD node page it references from the on-disk wiki. Validate the Feat Spec is locked (no placeholders, no blocking Conflicts). Extract a structured FS element catalog that downstream sub-agents can consume without re-reading any page.

This sub-agent is the only one permitted to read wiki content. Every later sub-agent operates on the catalog this sub-agent produces.

## Input envelope

```
{
  wiki_local_path: string,         // e.g. "docs"
  wiki_url: string,                // e.g. "http://gitlab/.../wikis" — used only to decode Source links
  gitlab_base_url: string,         // used only to decode Source links on DDD pages
  feature_slug: string             // e.g. "user-request-management"
}
```

## Tools

- Filesystem read only. No network. No writes. No `AskUserQuestion`.

## Procedure

1. **Resolve Feat Spec path.** `<wiki_local_path>/feat-specs/<feature_slug>/feat-spec.md`. Missing → return `{halt: "FS_NOT_FOUND"}`.

2. **Placeholder scan.** Regex `\[(TODO|PENDING|TBD|PLACEHOLDER)\]` case-insensitive. Any hit → return `{halt: "FS_NOT_LOCKED", line_numbers: [...]}`.

3. **Parse section headers.** Identify:
   - `## Feature Overview`
   - `## Open Blockers` (optional — skip section if absent)
   - `## Related FRS`
   - `## Bounded Context and Affected Layers`
   - `## Domain Layer Design`
   - `## Application Layer Design`
   - `## Infrastructure and Persistence Design`
   - `## HTTP API Design`
   - `## Permissions, Security, and Multi-Tenancy`
   - `## Integration, Background Jobs, and Distributed Events`
   - `## UI-API Integration Points` (optional)
   - `## Error Handling, Auditing, and Logging`

4. **Open Blockers scan.** If the section exists, parse every bullet for a Conflict wiki link + severity label. Any `critical` or `high` → return `{halt: "FS_HAS_BLOCKING_CONFLICT", conflicts: [{name, severity, link}]}`.

5. **Collect wiki links.** Regex every Markdown link whose target starts with `<wiki_url>/`. Decode node-type and node-name from the URL path: `<wiki_url>/<node-type>/<NodeName>` → `{node_type, node_name, on_disk_path: "<wiki_local_path>/<node-type>/<NodeName>.md"}`.

6. **Dispatch parallel page reads.** If ≥3 distinct node pages, spawn parallel workers, one batch per 5 pages. Each worker reads files and returns raw content + line-number index for section headings. If <3, read sequentially.

7. **Per-page extraction.** For each page, extract by node type:

   | Node type | Extract |
   |---|---|
   | Actor | Name, description, system-vs-human, tenant-scoped |
   | Entity | Name, base class, interfaces, attribute table (name, type, constraint, source), relationships, load strategy |
   | Value Object | Name, fields, equality rule |
   | Command | Name, audience (Public/Private), actor, input DTO fields, preconditions, postconditions, validator reference, domain method it calls, emitted events (noted but not generated) |
   | Query | Name, audience, input filter fields, default sort, paged yes/no, output DTO shape, scoping (tenant/user) |
   | State | Enum name, values + transitions, which entity owns it |
   | Permission | Group, entity, operation, actor allowed-list |
   | Integration | Name, direction, failure impact boundary, port interface name |
   | Decision | Name, adopted option, constraint it places on synthesis |
   | Conflict | Name, severity, open-or-resolved, description |
   | Flow | Sequence of steps mapping to Commands/Queries already catalogued |

8. **Cross-link.** For each Command, resolve its target Entity by name. Unresolved Command target Entity → emit warning `ORPHAN_COMMAND`. For each Query, same.

9. **Actor-to-permission map.** Build the permissions matrix from Permission node entries.

10. **Source anchor capture.** Every extracted element records the heading path back to its wiki page and the anchor (GitLab-style: lowercase, hyphens, punctuation stripped) for Source field rendering.

## Output schema

```
{
  halt: null | "FS_NOT_FOUND" | "FS_NOT_LOCKED" | "FS_HAS_BLOCKING_CONFLICT" | "BROKEN_LINK",
  halt_details: {...} | null,
  feature: {
    slug: string,
    title: string,
    summary_paragraph: string,
    module_count: integer         // from Bounded Context section
  },
  conflicts_resolved: [{name, severity, link, resolution_note}],
  actors: [{name, description, system: bool, source_link}],
  entities: [{
    name, base_class, interfaces: [],
    attributes: [{name, type, constraint, source_link}],
    relationships: [{kind, target, cardinality}],
    load_strategy: string,
    state_machine: string | null,
    source_link
  }],
  value_objects: [{name, fields: [...], equality_rule, source_link}],
  commands: [{
    name, audience: "Public"|"Private"|null,
    actors: [string], entity: string,
    input_fields: [{name, type, constraint}],
    preconditions: [string], postconditions: [string],
    validator_name: string,
    domain_method: string,
    emits_events: [string],
    source_link
  }],
  queries: [{
    name, audience: "Public"|"Private"|null,
    actors: [string], entity: string,
    filter_fields: [{name, type, optional: bool}],
    default_sort: string, paged: bool,
    output_shape: string,
    scoping: "tenant"|"user"|"none",
    source_link
  }],
  states: [{enum_name, entity: string, values: [{name, int_value}], transitions: [{from, to, trigger}], source_link}],
  permissions: [{group, entity, operation, actors: [string], source_link}],
  integrations: [{name, direction, port_interface, failure_impact, source_link}],
  decisions: [{name, adopted, constraint, source_link}],
  error_messages: [{key, text_en, source_link}],
  warnings: [{code, message, node_link}],
  section_catalog: {feat_spec_sections: [...], page_sections_by_link: {...}}
}
```

## Halt conditions (fast fail)

- Feat Spec file missing on disk.
- Any placeholder token in the Feat Spec.
- Any critical/high Conflict referenced from Open Blockers.
- Any wiki-linked page missing on disk (`BROKEN_LINK`).
- Feat Spec missing any required section header listed in step 3 (`STRUCTURAL_DEFECT`).

## What this sub-agent never does

- Never reads pages not referenced from the Feat Spec.
- Never fetches over HTTP.
- Never modifies any file.
- Never calls `AskUserQuestion` — halt and surface to main agent.
- Never invents a missing field — it records an extraction gap as a warning and lets the main agent decide.
