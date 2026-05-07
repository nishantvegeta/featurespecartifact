# GitLab Sync — Mechanics

The orchestrator and `skill:review-frs` never talk to GitLab MCP directly. All GitLab calls go through the `gitlab-frs-syncer` subagent. This file is the operational contract.

**Conventions are passed in, not loaded.** The syncer used to load `.claude/shared/gitlab-frs-conventions.md` on every dispatch (~213 lines × every dispatch). It no longer does. The orchestrator (`skill:generate-frs`) reads that file ONCE at Phase 0e, builds a `policy` object (approved labels, default labels, FRS-ID pattern, milestone description template), and includes the `policy` field in every issue-write dispatch payload (`create-issue`, `update-issue`). The syncer trusts the policy as authoritative for that run, performs cheap set-membership checks for defense-in-depth, and skips the file load entirely. `create-milestone` receives a pre-rendered description and no `policy`; `fetch-issue` mode does not need policy because it reads only.

This is the single largest per-dispatch token saving. It does mean: if `gitlab-frs-conventions.md` changes during a run, the run uses the snapshot taken at Phase 0e. Restart the run to pick up changes.

---

## When the syncer is dispatched

| Caller | Phase | Mode | Purpose |
|---|---|---|---|
| `skill:generate-frs` | Phase 3c.1 | `scan-frs-ids` | Once per run — project-wide read for FRS-ID collisions across prior sessions |
| `skill:generate-frs` | Phase 3d | `create-milestone` | Once per confirmed module — idempotent milestone creation |
| `skill:generate-frs` | Phase 4c.iv | `create-issue` | Once per FRS after inline drafting + validation — idempotent issue creation |
| `skill:generate-frs` | Phase 4e | `update-issue` | Once per flagged FRS during the revision sub-loop |
| `skill:review-frs` | Phase 1 | `fetch-issue` | Once per audit when input is an FRS-ID, issue number, or URL |

Each dispatch is a distinct mode; never combined.

---

## Retry policy

- **Scope:** per-call. Each milestone creation, each issue creation/update/fetch, each read query gets its own 2-retry budget (3 attempts total).
- **On exhaustion:** halt the calling skill's session. Emit Resume Block (below). Do NOT continue the loop.
- **Between attempts:** brief pause is fine; no exponential backoff required.

---

## Idempotency contract — `create-milestone` mode

The syncer follows a three-branch decision per module. The orchestrator just receives the result.

1. Query milestones in `gitlab_project_id` with `state: active`. Match by exact `title == <Module Name>` → **reuse**. Return `(milestone_id, reused-active)`.
2. No active match → query milestones with `state: closed`. Match by exact `title == <Module Name>` → **HALT and ask the orchestrator to call `AskUserQuestion`** with options "Create new with disambiguated title (e.g. '{Module Name} v2')", "Cancel this module — reopen manually in GitLab, then re-run". Act on the choice. (`update_milestone` is not exposed by this project's GitLab MCP, so automated reopen is not available; manual reopen via GitLab UI followed by a re-run hits branch 1 cleanly.)
3. No match in either state → create. Return `(milestone_id, created)`.

**Why the closed-state branch matters.** GitLab enforces title uniqueness across active AND closed states.

---

## Idempotency contract — `create-issue` mode

1. Query issues under `milestone_id`.
2. Match by exact title `FRS-[INITIALS]-{ID}: {Business Operation Title}` → **reuse**. Return `(issue_id, reused)`.
3. No match → create. Title, description, milestone_id, labels per the `policy` field in the dispatch payload (orchestrator-built from conventions at Phase 0e). Return `(issue_id, created)`.

The syncer NEVER updates an existing issue's body in `create-issue` mode — reuse means "the issue already exists; no write happens".

---

## `update-issue` mode

When the user flags an FRS at the module disposition gate (Phase 4d.1) and supplies a change request, the orchestrator redrafts inline and dispatches the syncer in `update-issue` mode.

1. The orchestrator already has `issue_id` from the prior `create-issue` dispatch in the same run.
2. The syncer calls the GitLab MCP "update issue" operation with `issue_id`, new `description`, and any updated `labels`.
3. The title is NOT changed. Title changes return BLOCKED.
4. The syncer returns `(issue_id, status: "updated")`.

`update-issue` is only for in-session revisions before final approval. For post-session edits, the user invokes `skill:review-frs` separately (or modifies in GitLab directly).

---

## `fetch-issue` mode (read-only — used by `skill:review-frs`)

`skill:review-frs` accepts FRS-IDs, GitLab issue numbers, or URLs as input. To audit a synced FRS, the syncer fetches its body. This mode is read-only.

The dispatch payload accepts EITHER:

```
{ "issue_id": <int> }
```

OR

```
{
  "frs_id": "FRS-[INITIALS]-NN",
  "milestone_id": <int, optional — narrows search>
}
```

OR (URL form, parsed by the syncer):

```
{ "issue_url": "https://gitlab.example.com/group/project/-/issues/42" }
```

### Branches

1. **`issue_id` provided** → `get_issue` directly. If 404 → return `{ status: "not-found" }`. Else → return body.
2. **`issue_url` provided** → parse `issue_id` from the URL path (`.../-/issues/<N>`); proceed as branch 1.
3. **`frs_id` provided** → `list_issues` filtered by `milestone_id` (if given) or project-wide. Match by title prefix `FRS-{INITIALS}-{NN}: `. If exactly one match → return body. If zero matches → return `{ status: "not-found" }`. If >1 matches → return `{ status: "ambiguous", matches: [{id, title, state}, ...] }` — the caller decides.

### Return shape

```
{
  "mode": "fetch-issue",
  "status": "found" | "not-found" | "ambiguous",
  "issue_id": <int>,            // present on found
  "title": <string>,            // present on found
  "body": <markdown>,           // present on found — the FRS content
  "labels": [<string>],         // present on found
  "milestone_id": <int or null>, // present on found
  "milestone_title": <string>,  // present on found
  "state": "opened" | "closed", // present on found
  "url": <string>,              // present on found — for the auditor's reference
  "matches": [{...}]            // present on ambiguous
}
```

Never modify, comment on, or label-update an issue in `fetch-issue` mode. Read-only, full stop.

---

## Halt — Resume Block format

When the syncer exhausts retries (or any other halt condition fires), the calling skill emits this block and stops:

```
=== SKILL HALT — generate-frs (or review-frs) ===

Halt reason   : <e.g., "Issue creation for FRS-UM-02 failed after 3 attempts: <e>">
Halt point    : <Phase name>
GitLab project: #{gitlab_project_id}

[For generate-frs only:]
Confirmed modules:
  - <Module A>  (initials: UM)
Milestones:
  <Module A>  →  #M1   (reused)
Module dispositions so far:
  <Module A>  approved  (all FRS synced)
FRS dispositions so far:
  FRS-UM-01  <operation>  synced     issue #42
  FRS-UM-02  <operation>  drafted    SYNC FAILED (halt point)

Last action: <specific MCP call that failed>
Last error : <error surface from MCP server>

Resume instructions:
  1. Reconnect the GitLab MCP server (or verify it is reachable).
  2. Start a new Claude session and paste this entire block as context.
  3. Re-invoke the skill — idempotency checks skip any milestones/issues
     that already exist, continuing from FRS-UM-02.
```

---

## What lives in `.claude/shared/gitlab-frs-conventions.md` (and not here)

- The approved project label list
- The default label set per FRS issue
- The FRS-ID title pattern: `FRS-[INITIALS]-{NN}: {Title}`
- The milestone description format
- Conditional labels

Never invent labels.

---

## Errors that should NOT trigger retry

The syncer should fail-fast (no retry) on:

- **400-class errors with structured error bodies** indicating client mistake (invalid label, malformed milestone reference, title-change in update-issue mode) — fix the input, don't retry.
- **403 / 401** — auth issue, retry won't help; halt with Resume Block immediately.
- **404 in fetch-issue mode** — not a failure; return `not-found` status. Caller handles.
- **Idempotency hit** — already a "success", just record the existing ID.

The syncer SHOULD retry on:

- **5xx server errors**
- **Network timeouts**
- **429 rate limits** (with the brief pause)
