# PATH CONTRACT (canonical)

This file is the **single source of truth** for every wiki path computed by the `generate-feat-spec` skill. SKILL.md, `feat-spec-validator`, and `docs-writer` all reference this file by name. If any rule in any other file conflicts with this file, **this file wins**.

When a sub-agent needs to validate a path or compute a path, it consults the rules here. No other file restates them.

---

## 1. Canonical path grammar

**Regex flavor.** Every regex in this file is written for Python `re` / PCRE-style engines. `\d` means `[0-9]`. Backslashes are literal regex metacharacters, not shell escapes. Implementations in another flavor (JavaScript, Go, etc.) MUST translate without changing semantics.

**Path normalization.** Before any path is matched against this file's regexes, the implementation MUST normalize:
- Convert backslash separators (`\`) to forward slashes (`/`).
- Reject UNC paths (`\\server\share\...`) and home-relative paths (`~/...`) with the same error class as F5.
- Strip trailing whitespace.
- For `wiki_local_path`: strip leading and trailing slashes (per SKILL.md § CLAUDE.md Convention Contract). The contract assumes the normalized form.

Let:
- `<wiki_local_path>` = the on-disk root for wiki writes (default: `docs`; declared in CLAUDE.md, normalized per above).
- `<node-type>` ∈ `{ actors, entities, value-objects, commands, queries, flows, states, decisions, integrations, architecture-blueprints, conflicts }`.
- `<PascalName>` = PascalCase node name (e.g., `ChecklistItem`, `CreateChecklistItem`).
- `<title-slug>` = lowercased title → replace whitespace runs with single hyphen → strip punctuation → collapse consecutive hyphens → truncate to ≤ 48 characters at the **last hyphen boundary at or before character 48** (never mid-word) → strip trailing hyphen if the truncation produced one. **Edge case:** if no hyphen exists at or before character 48 (e.g., a single very long word), hard-truncate at exactly character 48. Conflict files only.
- `<slug>` = kebab-case milestone slug (e.g., `bank-settings-checklist-management`); same truncation rule as `<title-slug>`.

### Allowed paths

| Artifact | On-disk path | Rendered URL (uses `wiki_url`) |
|---|---|---|
| DDD node (Actor / Entity / VO / Command / Query / Flow / State / Decision / Integration / Architecture Blueprint) | `<wiki_local_path>/<node-type>/<PascalName>.md` | `<wiki_url>/<node-type>/<PascalName>` |
| Conflict node | `<wiki_local_path>/conflicts/<title-slug>.md` | `<wiki_url>/conflicts/<title-slug>` |
| Feat Spec | `<wiki_local_path>/feat-specs/<slug>/feat-spec.md` | `<wiki_url>/feat-specs/<slug>/feat-spec` |

**Rendered URL rules:**
- No `.md` extension.
- No `<wiki_local_path>` prefix (e.g., never `/docs/` in the URL path).
- Label is the human-readable node name or title — never the URL itself, never a `docs/...` path.

---

## 2. Forbidden patterns (regex)

Any computed path matching **any** of these regexes is REJECTED. `docs-writer` refuses the write; `feat-spec-validator` returns `passed: false`.

```
# F1. DDD node nested under a "feats" or "feat-specs" feature folder
^.*/feats?/[^/]+/(actors|entities|value-objects|commands|queries|flows|states|decisions|integrations|architecture-blueprints|conflicts)/.*$

# F2. DDD node nested under feat-specs/<slug>/
^.*/feat-specs/[^/]+/(actors|entities|value-objects|commands|queries|flows|states|decisions|integrations|architecture-blueprints|conflicts)/.*$

# F3. Feat Spec written outside feat-specs/<slug>/
^(?!.*/feat-specs/[^/]+/feat-spec\.md$).*feat-spec\.md$

# F4. Conflict file named by internal ID instead of title slug
# Catches any basename whose first run of letters is "conflict" (any case)
# followed by an optional separator and a digit, regardless of suffix.
# Hits: conflict-01.md, CONFLICT-01.md, Conflict_01.md, CONFLICT01.md,
#       CONFLICT-12-tenant-scoping.md, conflict-3-foo.md
^.*/conflicts/(CONFLICT|Conflict|conflict)[-_]?[0-9].*\.md$

# F5. Absolute paths (must be relative to project root)
# Note: normalization (§ 1) already rejects UNC \\server\share and ~/-relative
# paths with the same error class as F5; this regex catches POSIX-rooted
# (`/foo`) and Windows-drive (`C:\foo`, `c:/foo`) forms post-normalization.
^(/|[A-Za-z]:[\\/]).*$
```

**Rendered link forbidden patterns** (apply to Markdown link URLs, not file paths):

```
# L1. Rendered link includes .md extension
^https?://.*\.md(#.*)?$

# L2. Rendered link includes wiki_local_path prefix
#   PLACEHOLDER: <wiki_local_path> below is a runtime-substituted token, NOT a literal regex group.
#   Substitution and escaping rules:
#     1. Use the normalized wiki_local_path (slashes already stripped per § 1).
#     2. Apply re.escape (or the flavor's equivalent) to the value before splicing.
#     3. Splice into the pattern with surrounding `/` literals: f"^https?://.*/{re.escape(wlp)}/.*$".
#     4. Compile and match with re.fullmatch (or anchored equivalent).
#   Owner: feat-spec-validator (Phase 9) compiles the canonical regex set ONCE per run
#   and exposes it as the `link_regex_set` field on its output envelope. The Phase 10.5
#   gate and any later checker MUST consume that set verbatim — no independent re-compile.
#   Example after substitution for wiki_local_path="docs":  ^https?://.*/docs/.*$
# DO NOT compile this pattern literally — <wiki_local_path> is a runtime token, not a regex group. See substitution rules above.
^https?://.*/<wiki_local_path>/.*$

# L3. Rendered DDD-node link uses the nested form (under feat / feats / feat-specs)
# Mirrors F1 + F2 on the URL side.
^https?://.*/(feats?|feat-specs)/[^/]+/(actors|entities|value-objects|commands|queries|flows|states|decisions|integrations|architecture-blueprints|conflicts)/.*$
```

---

## 3. Examples

### Correct

| Artifact | Path / URL |
|---|---|
| Entity on disk | `docs/entities/ChecklistItem.md` |
| Entity rendered link | `[ChecklistItem](http://localhost:8080/root/trade-finance/-/wikis/entities/ChecklistItem)` |
| Command on disk | `docs/commands/CreateChecklistItem.md` |
| Conflict on disk | `docs/conflicts/tenant-vs-entity-scoping-ambiguity.md` |
| Conflict rendered link | `[Tenant vs Entity Scoping Ambiguity](http://localhost:8080/root/trade-finance/-/wikis/conflicts/tenant-vs-entity-scoping-ambiguity)` |
| Feat Spec on disk | `docs/feat-specs/bank-settings-checklist-management/feat-spec.md` |
| Feat Spec rendered link | `[feat-spec](http://localhost:8080/root/trade-finance/-/wikis/feat-specs/bank-settings-checklist-management/feat-spec)` |

### Forbidden (all rejected)

| Wrong path | Which rule fires |
|---|---|
| `docs/feats/bank-settings/entities/ChecklistItem.md` | F1 — node nested under `feats/<slug>/` |
| `docs/feat-specs/bank-settings/entities/ChecklistItem.md` | F2 — node nested under `feat-specs/<slug>/` |
| `docs/feats/bank-settings/feat-spec.md` | F3 — Feat Spec must live under `feat-specs/<slug>/`, not `feats/<slug>/` |
| `docs/conflicts/CONFLICT-01.md` | F4 — internal-ID filename (uppercase) |
| `docs/conflicts/conflict-01.md` | F4 — internal-ID filename (lowercase) |
| `docs/conflicts/Conflict_01.md` | F4 — internal-ID filename (underscore separator) |
| `docs/conflicts/CONFLICT-12-tenant-scoping.md` | F4 — internal-ID prefix even with title fragment |
| `/docs/entities/ChecklistItem.md` | F5 — absolute path forbidden |
| `\\server\share\docs\entities\ChecklistItem.md` | F5 (via § 1 normalization) — UNC path rejected |
| `~/docs/entities/ChecklistItem.md` | F5 (via § 1 normalization) — home-relative path rejected |
| `docs/entities/ChecklistItem.md` rendered as `<wiki_url>/feats/bank-settings/entities/ChecklistItem` | L3 — nested under `feats/` |
| `docs/entities/ChecklistItem.md` rendered as `<wiki_url>/feat-specs/bank-settings/entities/ChecklistItem` | L3 — nested under `feat-specs/` |

---

## 4. Reusability rationale

DDD node folders are **siblings** of `feat-specs/`, never nested inside any feature slug, because:

1. **Nodes are reusable across features.** A single `Entity` (e.g., `Customer`) may be referenced by multiple Feat Specs. Nesting would force duplication.
2. **Cross-feature wiki links resolve unambiguously.** `<wiki_url>/entities/Customer` is stable; `<wiki_url>/feats/<slug>/entities/Customer` is not.
3. **Rendered links break on rename.** If a feature slug changes, every nested node link breaks. Sibling layout is rename-stable.

If a node *must* be feature-scoped (rare), encode the scope in the PascalName itself (e.g., `BankSettingsChecklistItem`), not in the folder hierarchy.

---

## 5. Wiki folder structure

```
<wiki_local_path>/
  actors/
  entities/
  value-objects/
  commands/
  queries/
  flows/
  states/
  decisions/
  integrations/
  architecture-blueprints/
  conflicts/
    <title-slug>.md          # NEVER conflict-NN.md
  feat-specs/
    <slug>/
      feat-spec.md
```

No other layout is permitted under `<wiki_local_path>`.

---

## 6. Enforcement points

| Phase | Enforcer | What it does |
|---|---|---|
| 9 | `feat-spec-validator` | Runs every path in `expected_file_paths` against F1–F5; checks every rendered link in the assembled spec against L1–L3; publishes `path_regex_set` and `link_regex_set` on the output envelope for downstream reuse |
| 10.5 | main agent | Validates the Path Manifest using the validator's published regex sets; renders each computed path's PASS/REJECT status in the preview |
| 11 | `docs-writer` (step 0) | Pre-write: refuses to write any file whose `filepath` matches F1–F5 |
| 11 (post-write) | main agent | Walks the on-disk tree under `<wiki_local_path>` using the validator's `path_regex_set` and asserts no file exists at a forbidden location |

A path violation at any of these points halts the pipeline.
