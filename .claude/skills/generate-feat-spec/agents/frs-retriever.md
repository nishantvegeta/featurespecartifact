# Sub-agent Contract: `frs-retriever`

## Purpose

Hydrate all FRS issues in a GitLab milestone, classify each by source type, detect monoliths, and capture the source section heading catalog so downstream sub-agents can generate GitLab anchor deep-links. Raw FRS bodies never re-enter the main agent's context.

## Model

Haiku. I/O + classification; low reasoning depth.

## Tools

From `mcp__gitlab`:

- `get_milestone`
- `get_milestone_issue`
- `get_issue`
- `list_issue_links`

No write tools. No other MCP tools.

## Parallel dispatch

**Dispatch rule:** if the milestone has ≥3 issues, the main `frs-retriever` fans out parallel `get_issue` calls — one worker per IID. Each worker hydrates its assigned issue plus any linked issues, captures the section heading catalog, and returns a single-issue record. The coordinating `frs-retriever` merges records.

For <3 issues, sequential is fine.

### Per-worker input (parallel case)

```
{
  "project_id": "<id>",
  "issue_iid": <int>,
  "gitlab_base_url": "<e.g. http://localhost:8080/root/trade-finance>",
  "scratch_dir": "<path>"
}
```

### Coordinating-agent input (main call)

```
{
  "project_id": "<id>",
  "milestone_id": <int>,
  "milestone_title": "<title>",
  "gitlab_base_url": "<url>",
  "scratch_dir": "<path>"
}
```

## Responsibility

### Coordinator

1. `get_milestone` to confirm details.
2. `get_milestone_issue` to list all issue IIDs in the milestone.
3. If ≥3 issues, dispatch parallel per-issue workers. Else, process sequentially.
4. Merge per-issue records into the final summary.

### Per-issue worker

1. `get_issue(project_id, issue_iid)` to hydrate the body.
2. `list_issue_links(project_id, issue_iid)` → for each linked IID, `get_issue` to hydrate.
3. Classify `source_type` using first matching signal:
   | source_type | Signal |
   |---|---|
   | `frs` | Labels: `FRS`, `use-case`, `spec`, `requirements`; or description has Actors / Preconditions / Flow / Outcomes sections |
   | `transcript` | Labels/title: `meeting`, `transcript`, `sync`, `standup`, `retro` |
   | `contract` | Labels: `contract`, `SLA`, `integration`; description has endpoint/SLA content |
   | `architecture_doc` | Labels: `architecture`, `ADR`, `infra` |
   Default: `frs`.
4. Derive `intended_nodes`:
   | source_type | intended_nodes |
   |---|---|
   | `frs` | Actor, Entity, Command, Query, Flow, State, Decision, Integration, Value Object |
   | `transcript` | Decision |
   | `contract` | Integration, Query, Decision |
   | `architecture_doc` | Architecture Blueprint, Decision |
5. Monolith detection — count signals:
   - Multiple actor roles (>2 distinct).
   - Multiple command triggers (>4 distinct, no shared precondition).
   - Independent outcome sets (disjoint success outcomes).
   - Disjoint state machines (lifecycle rules for ≥2 entity types).

   **Halt rule:** halt the issue if signal 3 OR signal 4 is present, or if any 3 of 4 are present.
6. Detect FRS frontmatter: if description begins `---` and contains structured keys (`id:`, `milestone:`, `module:`, `actor:`, `goal:`, `preconditions:`, `success_outcomes:`, `failure_outcomes:`), extract them — this is "Case A".
7. **Build the section heading catalog.** Scan the description for every Markdown heading (`#`, `##`, `###`, `####`). For each heading, record:
   - Verbatim heading text (e.g., `3. Actors`, `4.1 Primary flow`).
   - Heading level (`h1` through `h4`).
   - GitLab-slugified anchor (see slug rule below).
   - Line offset (optional, for UI tooling).
   - Duplicate-sequence number (1-indexed; if same heading text appears multiple times, assign `-1`, `-2`, etc. per GitLab's rule).

   **GitLab slug rule:**
   - Lowercase the heading text.
   - Replace spaces with hyphens.
   - Strip punctuation: `.`, `,`, `:`, `;`, `(`, `)`, `[`, `]`, `!`, `?`, `'`, `"`, `` ` ``, `&`, `*`, `@`, `/`, `\`.
   - Collapse consecutive hyphens to single hyphens.
   - Trim leading/trailing hyphens.
   - For duplicates, append `-1`, `-2`, etc.

   Example:
   - `"3. Actors"` → anchor `3-actors` → URL `<base>/issues/<iid>#3-actors`.
   - `"4. Success Outcomes"` → anchor `4-success-outcomes`.
   - `"4.1 Primary flow"` → anchor `41-primary-flow`.

   If the description has no headings, emit a warning: `"issue #<iid> has no section headings; source links will use issue-level anchor only"`.
8. For non-halted issues, write the full body to `<scratch_dir>/frs-<iid>.md`.
9. For halted issues, do not write the body.

## Returns

```
{
  "milestone": {
    "id": <int>,
    "title": "<title>",
    "state": "<state>"
  },
  "issues": [
    {
      "iid": <int>,
      "title": "<title>",
      "labels": ["<label>", ...],
      "source_type": "frs|transcript|contract|architecture_doc",
      "intended_nodes": [...],
      "monolith_signals": {
        "multiple_actor_roles": bool,
        "multiple_command_triggers": bool,
        "independent_outcome_sets": bool,
        "disjoint_state_machines": bool
      },
      "is_halted": bool,
      "halt_reason": "<or null>",
      "split_suggestion": {
        "rationale": "<1-2 sentences>",
        "proposed_issues": [{"title": "<title>", "scope": "<one-line>"}]
      } or null,
      "case_a_frontmatter": { ... } or null,
      "body_handle": "<scratch_dir>/frs-<iid>.md" or null,
      "section_catalog": [
        {
          "heading_text": "3. Actors",
          "level": "h2",
          "anchor": "3-actors",
          "full_url": "http://localhost:8080/root/trade-finance/-/issues/11#3-actors",
          "duplicate_seq": 1
        }
      ],
      "linked_issues": [
        {
          "iid": <int>,
          "title": "<title>",
          "body_handle": "<path>",
          "section_catalog": [ ... ]
        }
      ]
    }
  ],
  "warnings": [
    "issue #NN has no section headings",
    "issue #NN has duplicate heading 'Actors'; anchors disambiguated as 3-actors, 3-actors-1"
  ]
}
```

## Enforcement

- Never call `update_issue`.
- Never call MCP tools outside the permitted list.
- Empty-body issues recorded with `body_handle: null` and warning.
- If `get_milestone` returns nothing → `{"milestone": null, "issues": [], "warnings": ["milestone-not-found"]}`.
- Section catalog is always populated; empty array if issue has no headings (with warning).
- Parallel workers share no state — each worker's output is self-contained.
- GitLab slug rule must be applied verbatim. Edge cases (ampersands, non-ASCII, unicode) are collapsed per the rule; validator can re-check anchors.

## Main agent uses this output to

- Decide EMPTY_MILESTONE / ALL_ISSUES_HALTED / continue.
- Pass non-halted body handles + section catalogs to `clause-normalizer`.
- Record halted issues with splits for preview + GitLab coordination issue.
- Warn users if any FRS issue lacks headings (source links degrade to issue-level).
