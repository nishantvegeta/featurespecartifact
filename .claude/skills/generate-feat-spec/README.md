# generate-feat-spec skill — file index

A Claude Code skill for producing high-level, ABP-layered Feature Specifications from GitLab milestone FRS issues. Writes wiki pages to disk first, then creates a short coordination issue in GitLab.

## Files

### Skill entrypoint
- `SKILL.md`

### Reference files (consulted during synthesis)
- `references/actors.md`
- `references/entities.md`
- `references/value-objects.md`
- `references/commands.md`
- `references/queries.md`
- `references/flows.md`
- `references/states.md`
- `references/decisions.md`
- `references/integrations.md`
- `references/architecture-blueprints.md`
- `references/conflicts.md`
- `references/abp-base-classes.md`
- `references/abp-built-in-entities.md`

### Templates
- `templates/feat-spec-template.md` — 16-section ABP-layered structure
- `templates/coord-issue-template.md` — short GitLab coordination issue

### Sub-agent contracts
- `agents/frs-retriever.md` — parallel per-issue GitLab fetches
- `agents/clause-normalizer.md`
- `agents/clause-mapper.md`
- `agents/ddd-synthesizer.md` — parallel per-module synthesis
- `agents/feat-spec-validator.md`
- `agents/docs-writer.md` — parallel per-batch file writes

---

## Changelog

### Round 4 (current)

Consolidation round focused on wiki URL handling, clause traceability, CLAUDE.md convention adherence, parallel dispatch, and UI-API contract capture.

**Wiki URL and link format**

- `wiki_url` (for rendered links) is now separate from `wiki_local_path` (for disk writes). CLAUDE.md declares both; file writes go to the local path while Markdown links use the URL.
- Rendered wiki links strip the `.md` extension and omit the `wiki_local_path` prefix. Link labels are human-readable (node name or title), not URL-as-label.
- Example: on-disk path `docs/entities/UserRequest.md` renders as `[UserRequest](http://localhost:8080/root/trade-finance/-/wikis/entities/UserRequest)`.

**Clause source deep-linking (replaces opaque clause IDs)**

- Opaque clause IDs (`FRS-11#c5`, etc.) are eliminated from all published output.
- Every DDD node entry now carries a `**Source:**` field with GitLab-rendered section-anchor deep links: `[FRS #11 — Actors](http://localhost:8080/root/trade-finance/-/issues/11#3-actors)`.
- `frs-retriever` captures a section heading catalog per issue and applies GitLab's slug rule (lowercase, spaces → hyphens, strip punctuation, collapse consecutive hyphens, `-N` suffix for duplicates).
- `clause-normalizer` attaches `source_section_heading`, `source_anchor`, `source_url`, and `source_label` to every clause. These carry forward through `clause-mapper` and `ddd-synthesizer` unchanged.
- Validator now enforces: every entry has `**Source:**`; every source URL uses the GitLab issue format; no opaque clause IDs anywhere.

**CLAUDE.md convention contract**

- New Phase 1 step: read a 15-field convention contract from CLAUDE.md.
- **Required fields:** `gitlab_project_id`, `gitlab_base_url`, `wiki_url`.
- **Optional fields with defaults:** `wiki_local_path` (docs), `tenancy_model`, `project_root_namespace`, `module_project_layout`, `api_routing_conventions`, `validation_library` (FluentValidation), `object_mapping_library` (Mapperly), `permissions_class`, `db_table_prefix` (App), `sorting_strategy` (explicit-switch), `enum_serialization`, `notable_gotchas`.
- Synthesis honors every declared convention. Deviations require a Decision node with rationale.
- Phase 1 emits a soft warning listing optional defaults being used so users can override explicitly.

**Parallel sub-agent dispatch**

- **Phase 2** (`frs-retriever`): parallel `get_issue` per IID when a milestone has ≥3 issues.
- **Phase 7** (`ddd-synthesizer`): parallel worker per module when Phase 5 produces ≥2 modules. Cross-module naming collisions detected at rejoin trigger targeted repair.
- **Phase 11** (`docs-writer`): parallel batches when >5 files to write.
- `clause-normalizer`, `clause-mapper`, and `feat-spec-validator` remain sequential by design — they share state that doesn't parallelize cleanly.

**UI-API Integration Points section (replaces UI Notes appendix)**

- UI clauses are now classified as `ui-integration` (goes to Section 12) or `excluded` (exclusion ledger, for pure visual detail).
- Section 12 has five sub-sections: screen-to-endpoint map, DTO field deviations, loading and error state backend requirements, gap analysis, prototype reference.
- Gap analysis produces `missing_command` and `missing_query` Conflicts for data the UI needs but no command/query provides.
- Section omitted entirely when no `ui-integration` clauses exist.

**FluentValidation + Public/Private AppService split + explicit-switch sorting**

- `commands.md` and `queries.md` rewritten to document FluentValidation as the default validation library.
- Every Command entry has `**Validation:** <CommandName>InputValidator (FluentValidation)`. No `[Required]` / `[StringLength]` / `IValidatableObject` references when FluentValidation is declared.
- Every Command and Query entry has `**Audience:** Public | Private` and `**HTTP route:** <prefix>...` when CLAUDE.md declares `api_routing_conventions.public_prefix` + `private_prefix`.
- Every Query entry has `**Sort strategy:** explicit switch on input.Sorting?.ToLowerInvariant()` with enumerated supported sort keys when CLAUDE.md declares `sorting_strategy: explicit-switch`. No `System.Linq.Dynamic.Core` references.
- `states.md` documents the Storage field per CLAUDE.md `enum_serialization` (e.g., `camelCase string via global JsonStringEnumConverter`).
- Permission strings follow `<permissions_class>.<AggregateNamePlural>.<Verb>` pattern, using the class name from CLAUDE.md.
- ABP Artifact Map Application section includes Validators sub-list and Mappers sub-list when those libraries are declared.

**New validator category: project convention compliance**

- 15 new checks enforcing CLAUDE.md adherence: FluentValidation presence, no data annotations, no AutoMapper when Mapperly is declared, permissions class pattern, table prefix, sorting strategy, enum serialization, Audience split, HTTP route prefix correctness, namespace root.
- New check categories: wiki link format (no `.md`, no path prefix), source field format (deep-link format, no opaque IDs), UI-API Integration Points validity.

**Template changes**

- `feat-spec-template.md`: new 16-section order. Section 5 (Bounded Context and Affected Layers) references CLAUDE.md for full ABP project layout rather than duplicating it — only the layers this milestone touches are enumerated. Section 12 (UI-API Integration Points) added, conditional on `ui-integration` clauses. All link examples use full wiki URLs.
- `coord-issue-template.md`: canonical spec link uses full `wiki_url` with no `.md` and no path prefix.

### Round 3 (prior)

- Wiki-first publishing — wiki files written and verified before the GitLab coordination issue is created.
- Thin coordination issue — short pointer, not a duplicate.
- ABP base class and built-in entity catalogs — no duplication of `AbpUsers`, `AbpTenants`, etc.
- ABP-layered Feat Spec structure — Domain / Application / Infrastructure / HttpApi / Permissions / Integrations layers with wiki links into node pages.
- Six sub-agents covering retrieval, normalization, mapping, synthesis, validation, and file writing.
- Byte-length floors and required-field presence in the validator.
- Monolith detection softened — halt on signal 3 OR 4, or any 3 of 4.

---

## Bundle is self-contained

Every file the skill needs at runtime: the entrypoint, all 13 reference files, both templates, and all six sub-agent contracts. Drop the folder into `.claude/skills/` and invoke with a milestone name or ID.
