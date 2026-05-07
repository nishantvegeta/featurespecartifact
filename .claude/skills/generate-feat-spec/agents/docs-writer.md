# Sub-agent Contract: `docs-writer`

## Purpose

Write all wiki files (DDD node pages + Feat Spec) to disk under `wiki_local_path` in Phase 11. Supports parallel dispatch when the file count is large. Never called before user approval.

## Model

Sonnet. Although the per-batch worker is mostly file I/O, step 0 (PATH CONTRACT pre-write check) requires reliable regex matching against `references/path-contract.md` § 2 (F1–F5) plus the structured rejection-manifest construction. Haiku exhibited intermittent regex compliance drift in captured runs; Sonnet matches the rule complexity introduced when `docs-writer` became the sole writer.

## Tools

File system write tools.

## Parallel dispatch

**Dispatch rule:** if the total file count exceeds 5, the main agent fans out parallel workers — one per batch. If 5 or fewer, the main agent writes directly without invoking this sub-agent.

**Batch sizing:** target 5–10 files per batch. For 12 files, 2 batches of 6; for 30 files, 3 batches of 10.

### Per-worker input (parallel case)

```
{
  "phase_id": "phase-11",
  "consumes_phase_id": "phase-10.5",
  "consumes_secondary_phase_ids": [],
  "batch_id": "<string>",
  "wiki_local_path": "<disk path root>",
  "feat_spec_slug": "<kebab-slug of the milestone feat spec>",
  "files": [
    {
      "filepath": "<relative path under wiki_local_path>",
      "content": "<full Markdown>",
      "node_name": "<PascalCase node name>",
      "node_type": "<actor|entity|command|query|flow|state|decision|integration|architecture-blueprint|conflict|value-object>"
    }
  ]
}
```

### Coordinator input (main call)

```
{
  "phase_id": "phase-11",
  "consumes_phase_id": "phase-10.5",
  "consumes_secondary_phase_ids": [],
  "wiki_local_path": "<disk path root>",
  "feat_spec_slug": "<kebab-slug of the milestone feat spec>",
  "files": [
    {
      "filepath": "<relative path>",
      "content": "<full Markdown>",
      "node_name": "<PascalCase node name>",
      "node_type": "<actor|entity|...>"
    }
  ]
}
```

If `consumes_phase_id != "phase-10.5"`, halt per the Phase Envelope Contract — `docs-writer` MUST NOT be called before the Path Manifest gate has run.

## Responsibility

### Coordinator

1. Split `files` into batches of 5–10 files each.
2. Dispatch parallel workers, one per batch.
3. Collect manifests; merge; verify zero failures.
4. Return combined manifest.

### Per-batch worker

0. **PATH CONTRACT pre-write check.** Before any directory is created or any byte is written, validate every `filepath` in the batch against `references/path-contract.md` § 2 (regex F1–F5). If any path matches a Forbidden rule:
   - Mark that file `status: "rejected_by_path_contract"` with `error_message: "filepath <path> matches Forbidden rule F<n>; see path-contract.md"`.
   - Skip the write for that file (do not mkdir, do not write).
   - Continue checking remaining files in the batch.
   - Set `all_succeeded: false` in the worker manifest.

   This is non-negotiable: even if the dispatcher passed a Forbidden path, `docs-writer` REFUSES to materialize it. The Path Manifest gate (Phase 10.5) is the user-visible halt; this check is defense-in-depth.

1. For each file that passed step 0:
   - Ensure the parent directory exists (mkdir -p).
   - **Prepend YAML frontmatter** to every DDD node file (i.e., any file under `actors/`, `entities/`, `value-objects/`, `commands/`, `queries/`, `flows/`, `states/`, `decisions/`, `integrations/`, `architecture-blueprints/`, `conflicts/`). Derive the fields as follows:
     - `id`: kebab-case of the node name (e.g., `reviewer`, `user-request`, `create-registration-request`).
     - `name`: PascalCase node name as provided in the content (e.g., `Reviewer`, `UserRequest`).
     - `type`: the node type in lowercase (e.g., `actor`, `entity`, `command`).
     - `version`: `1.0.0`
     - `created`: today's date in ISO 8601 format (`YYYY-MM-DD`).
     - `last_modified`: same as `created` on first write.

     The frontmatter block is inserted **before** the first line of the content:
     ```
     ---
     id: <id>
     name: <name>
     type: <type>
     version: 1.0.0
     created: <YYYY-MM-DD>
     last_modified: <YYYY-MM-DD>
     ---
     ```
   - **Append a `## Change History` section** at the very end of every DDD node file, after all other content:
     ```
     ## Change History

     - v1.0.0 (<YYYY-MM-DD>): Created from feat spec <feat-spec-slug>.
     ```
     The `<feat-spec-slug>` is derived from the `batch_id` or passed via the file descriptor's `feat_spec_slug` field (see input schema).
   - The Feat Spec file (`feat-specs/<slug>/feat-spec.md`) does **not** receive frontmatter or a Change History section.
   - Write the augmented content to disk.
   - Record `{filepath, bytes_written, status}` in the worker manifest.
2. On any write failure, record `status: failed` with `error_message`; continue remaining files in the batch.
3. Return the worker manifest.

## Returns

```
{
  "phase_id": "phase-11",
  "produced_by": "docs-writer",
  "manifest": [
    {
      "filepath": "<wiki_local_path>/entities/UserRequest.md",
      "bytes_written": <int>,
      "status": "success|failed|rejected_by_path_contract",
      "rejected_by_rule": "F1|F2|F3|F4|F5|null",
      "error_message": "<if failed or rejected>"
    }
  ],
  "stats": {
    "attempted": <int>,
    "succeeded": <int>,
    "failed": <int>,
    "rejected_by_path_contract": <int>
  },
  "all_succeeded": bool
}
```

## Enforcement

- **PATH CONTRACT compliance is non-negotiable.** Step 0 of the per-batch worker validates every `filepath` against `references/path-contract.md` § 2 (F1–F5) before any I/O. Forbidden paths are rejected with `status: "rejected_by_path_contract"` and `rejected_by_rule` set to the offending rule name. Even when the dispatcher passes a Forbidden path, `docs-writer` REFUSES to write it.
- Writes only to paths under `wiki_local_path`. Any request for a path outside that root is rejected with `status: failed`.
- No content transformation. The content passed in is the content written out.
- No deletes. No overwrites with empty content.
- Never creates or modifies files outside the DDD node folders and `feat-specs/<slug>/`.
- Never calls any GitLab tool.
- Parallel workers share no state; each returns its own manifest and the coordinator merges.
- On any failure or `rejected_by_path_contract` in any batch, `all_succeeded: false`. Main agent MUST abort Phase 11 before creating the GitLab coordination issue.

## Main agent uses this output to

- Verify all expected files exist on disk before calling `create_issue`.
- Abort Phase 11 if `all_succeeded: false`.
- Report per-file status to the user in the final summary.
