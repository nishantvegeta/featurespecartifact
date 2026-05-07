# generate-frs — Phase Runbook

The orchestrator's full operating manual. Loaded on demand; not preloaded into the SKILL.md body. Read this when executing a phase, then drop it from working memory.

This runbook embeds the drafter and validator guidance that previously lived in dedicated subagent prompts. That work now runs inline in the orchestrator — see *Phase 4c* below.

**Critical:** every user gate in this runbook is shown as an explicit `AskUserQuestion(...)` call template. Use the tool — do not paraphrase the question into prose. The SKILL.md HARD-GATE forbids prose questions.

> **Schema note:** templates below use the verified `AskUserQuestion` schema — every question has `question`, `header` (≤12 chars), `multiSelect`, and `options[2-4]` of `{label, description}` objects. The harness adds an "Other" choice automatically; do NOT include it. Gate logic in this runbook describes the *first-class* options only — when "Other" is the right path for a user, they pick it and supply free text in the next message.

---

## User Gate Index (canonical)

Every gate the orchestrator may surface, indexed by the phase that defines it. SKILL.md points at this index; do not duplicate the templates anywhere else. The full template lives at the listed phase.

| Gate | Phase | Triggered when |
|---|---|---|
| GitLab project ID prompt | 0a | `CLAUDE.md` is missing `gitlab_project_id` |
| Existing-FRS redirect | 1a | Classifier flags FRS structural match (canonical section list) in any source |
| Scope-too-large gate | 2 | >3 modules or >12 FRS detected |
| Module confirmation | 2 | Always — after classifier returns module candidates |
| Initials collision | 3b | Two modules share computed initials |
| Cross-session FRS-ID collision | 3c.1 | `scan-frs-ids` returned a planned `FRS-XX-NN` already in the project |
| Closed-milestone disposition | 3d | Syncer returns `closed-conflict` |
| OQ batch (per module) | 4b | Module entry — up to 3 OQs per `AskUserQuestion` call |
| Refinement-cap gate | 4c.iii | Critique loop hits 2 passes without converging |
| Spot-check sub-gate | 4d.0 | Always — before module disposition |
| Module disposition | 4d.1 | Always — after spot-check |
| Per-FRS revision intent | 4e | User picked "Revise specific FRS" |
| Inter-module checkpoint | 5 | Always — between modules |

If a phase below shows a gate not in this index, that's a bug — the index is authoritative. Add it.

---

## Phase 0 — Preflight

Five checks, all must pass:

**0a. GitLab project ID from `CLAUDE.md`.** Read `CLAUDE.md`. Extract the project ID (formats: `gitlab_project_id: 12345` or `Project ID: 12345`). If absent →

```
AskUserQuestion(questions=[{
  question: "I couldn't find a GitLab project ID in CLAUDE.md. How would you like to proceed?",
  header: "Project ID",
  multiSelect: false,
  options: [
    { label: "Provide now",       description: "I'll paste the ID in my next message; this run continues." },
    { label: "Add to CLAUDE.md",  description: "Cancel this run; I'll add gitlab_project_id to CLAUDE.md and re-invoke." }
  ]
}])
```

Store as `gitlab_project_id`.

**0b. GitLab MCP connectivity.** Verify a GitLab MCP tool is available. If not → halt: *"No GitLab MCP connection is available. Please connect a GitLab MCP server, then re-run."* This skill does NOT generate FRS offline. (No user input — environment problem; halt.)

**0c. Plugin shared references present.** Verify the four plugin-owned files in `.claude/shared/` exist:

- `.claude/shared/frs-template.md`
- `.claude/shared/frs-validation-rules.md`
- `.claude/shared/frs-code-extraction-rules.md`
- `.claude/shared/gitlab-frs-conventions.md`

Missing any → halt with the specific path: *"Shared reference `<path>` is not present. Install it before re-running."*

The project-owned glossary and cross-cutting-concerns files are resolved at Phase 0e from `CLAUDE.md`; their existence is verified there, not here.

**0d. Subagents present.** Verify `.claude/agents/gitlab-frs-syncer.md` and `.claude/agents/frs-source-classifier.md` exist. Missing either → halt with the specific path. (Note: previous architecture had `frs-drafter` and `frs-validator` subagents and a separate `frs-template` / `frs-validation-rules` etc. as skills. All five are removed in the current architecture. The classifier was previously a forked skill at `.claude/skills/frs-source-classifier/`; it is now a subagent.)

**0e. Build the syncer policy payload AND snapshot the project references.** Resolve the project-owned reference paths from `CLAUDE.md`:

- `glossary_path` (default: `docs/glossary.md`)
- `cross_cutting_path` (default: `docs/cross-cutting-concerns.md`)

If `CLAUDE.md` does not declare either key, fall back to the defaults above. Verify both resolved files exist; if either is missing, halt with the path-specific directed message:

- For a missing glossary file: *"Project reference `<resolved glossary path>` is not present. Run `agent:glossary-curator` with operation `Initialize` to seed it from the plugin template, or update `CLAUDE.md`'s `glossary_path` key to point at an existing file. Then re-run."*
- For a missing cross-cutting-concerns file: *"Project reference `<resolved cross-cutting path>` is not present. Run `agent:cross-cutting-curator` with operation `Initialize` to seed it from the plugin template, or update `CLAUDE.md`'s `cross_cutting_path` key to point at an existing file. Then re-run."*

The orchestrator does NOT auto-seed mid-run. Seeding is a deliberate, audit-logged operation done by the curator before the run. This preserves Phase 0e's "the run uses what existed at start" snapshot guarantee.

Then read these three files ONCE:

- `.claude/shared/gitlab-frs-conventions.md` — to build the `policy` payload
- `<glossary_path>` — to snapshot the project glossary
- `<cross_cutting_path>` — to snapshot the cross-cutting concerns

From `gitlab-frs-conventions.md`, extract five constants:

- `approved_labels`: the full approved-label list (array of strings)
- `default_labels`: the labels every FRS issue receives (currently `["Documentation", "TO DO"]`)
- `frs_id_pattern`: the regex `^FRS-[A-Z]{2,4}-\d{2}: .+$` (or whatever the conventions specify)
- `milestone_description_template`: the single-line template (currently `"FRS milestone for <Module Name> module. Initials: [MODULE-INITIALS]"`)
- `conditional_label_rules`: the list of `{condition, label}` pairs (e.g., `any_oq_blocking → Discussion`, `any_oq_deferred → Discussion`, `user_deferred_frs → Deferred`)

> **Substitution rule.** When dispatching the milestone-create syncer call (Phase 3d), substitute the placeholders in `policy.milestone_description_template` with the module's actual values: replace `<Module Name>` with the confirmed module name and `[MODULE-INITIALS]` with the assigned uppercase initials (Phase 3a). The orchestrator performs this substitution before passing the rendered string in the syncer payload's `description` field — the syncer never sees a templated string.

Store these as the `policy` object. From this point forward, every issue-write syncer dispatch (`create-issue`, `update-issue`) carries the `policy` field in its payload. The syncer applies it (cheap) instead of loading the full conventions file (expensive).

From the resolved glossary and cross-cutting-concerns files, capture the version numbers (from each file's Revision History). Store as `glossary_version` and `baseline_version` — the variable names are preserved for backward compatibility with prior validation logs. These are written into every Validation Log's audit reproducibility set (Phase 4c.ii) so a later auditor can reconstruct exactly which contracts the FRS was generated against.

Both files stay accessible in working memory through the run — the drafter consults the glossary when populating Section 4 of each FRS, and the cross-cutting-concerns file when writing Section 7 / 18 / 19 forward references. The validator's `glossary-resolves` and `baseline-not-duplicated` Self-Review checks consult them too.

This is the **single point of conventions enforcement per run**. If any of these three files change mid-run, the run uses the snapshot taken here. To pick up a change, restart the run.

Also initialize `validation_logs = {}` in session state. This dict is populated by Phase 4c.ii (one compact log per FRS) and replaced on revision at Phase 4e. It is carried forward across inter-module checkpoints (Phase 5 Resume Block) so a halted run resumes with prior modules' validation history intact.

**Verify:** all five preflight checks pass; `gitlab_project_id` is set; `policy` object is built; both project-reference paths resolved (from `CLAUDE.md` or defaults) and the files exist; `glossary_version` and `baseline_version` captured; `validation_logs = {}` initialized.

---

## Phase 1 — Source Classification

Dispatch the `frs-source-classifier` subagent. The orchestrator does NOT inspect raw source files itself — that work runs in the subagent's separate context window to keep main context clean.

**Dispatch input:** the user's paste plus any paths under `/mnt/user-data/uploads/`.

**Dispatch returns:** a `source_manifest` document with:

- `sources[]` — each tagged `prose | react_ts | jsx_paste | docx | pdf | md_txt | existing_frs`
- `candidates[]` — operation candidates, each with source location and pre-populated Form Fields / Business Rules / Exception Flow drafts
- `traversed_imports[]` — every one-hop relative import scanned, with logical names (used for Section 23 provenance)
- `existing_frs_detected` — boolean

**1a. Existing-FRS redirect.** If `existing_frs_detected == true`:

```
AskUserQuestion(questions=[{
  question: "This input looks like an existing FRS (matches the canonical section structure). What should I do?",
  header: "Existing FRS",
  multiSelect: false,
  options: [
    { label: "Switch to review-frs",      description: "Stop here; you'll invoke skill:review-frs to audit this FRS." },
    { label: "Use as reference",          description: "Keep this FRS as context and generate a NEW FRS that builds on it." },
    { label: "Cancel",                    description: "Stop the run cleanly; no FRS generated, no GitLab writes." }
  ]
}])
```

Only proceed on "Use as reference". On "Switch to review-frs", stop and instruct the user to invoke `review-frs`. On "Cancel", stop cleanly.

**1b. Traversal guardrail (regression check).** Inspect the classifier's return. If any source is a code file (react_ts, jsx_paste, ts, js) AND `traversed_imports` is empty AND the file contains relative imports (`./...` or `../...` referring to local files), this is the regression mode. Re-dispatch the classifier with the explicit note:

> *"Previous classification returned empty `traversed_imports` while sources contain relative imports. This is a hard rule violation. Re-classify and Read every relative import in every code source. Empty `traversed_imports` is only valid when no relative imports exist anywhere. Do not return a one-paragraph 'parent has the logic' rationalisation — read the imports."*

Cap re-dispatch at 1 retry. If the second pass also fails, halt with: *"Classifier is not traversing imports despite explicit instructions. Manual review required — please paste the imported file contents into the next session along with the entry source."*

**Verify:** `source_manifest` non-empty; every code source has either ≥1 candidate or is explicitly marked `no_candidates_found` with reason; `traversed_imports` is non-empty when relative imports exist.

---

## Phase 2 — Parse & Module Resolution

Using `source_manifest`, scan all prose and code candidates for distinct business domains — these become modules (= GitLab milestones).

**Scope gate.** If the total implies >3 modules or >12 FRS:

```
AskUserQuestion(questions=[{
  question: "Input spans roughly {N} modules and {M} operations. Single-session capacity is ~20 FRS. How to proceed?",
  header: "Scope",
  multiSelect: false,
  options: [
    { label: "Proceed with all",      description: "Generate all {M} FRS in this session; risks context exhaustion if M > 20." },
    { label: "Scope down",             description: "Drop to highest-priority module(s); you'll list which in the next message." },
    { label: "Split into sessions",   description: "Process first 2 modules now; resume the rest in a fresh session via Resume Block." }
  ]
}])
```

**Module ambiguity gate.** If a single module is detected, auto-select. If multiple:

```
AskUserQuestion(questions=[{
  question: "I detected {N} modules: {Module A}, {Module B}, .... Confirm or adjust?",
  header: "Modules",
  multiSelect: false,
  options: [
    { label: "Confirm all",    description: "Lock this exact list as confirmed_module_list and proceed to Phase 3." },
    { label: "Adjust list",    description: "I'll describe what to change in the next message; another gate will confirm the change." },
    { label: "Cancel",         description: "Stop the run cleanly; no GitLab writes." }
  ]
}])
```

If "Adjust list" → ask follow-up:

```
AskUserQuestion(questions=[{
  question: "How would you like to adjust the module list?",
  header: "Adjust",
  multiSelect: false,
  options: [
    { label: "Remove some",     description: "Drop one or more modules from the list; you'll name them next." },
    { label: "Merge two",        description: "Combine two modules into one; you'll name them and the merged title next." },
    { label: "Rename one",       description: "Change a module name; you'll name old and new titles next." },
    { label: "Add a missing one",description: "Add a module that the classifier missed; you'll provide its name next." }
  ]
}])
```

Then act on the answer, possibly with one more clarifying question. Do not free-form prompt.

**Verify:** `confirmed_module_list` is non-empty.

---

## Phase 3 — Manifest, Initials, Milestones

**3a. Assign module initials.** Uppercase first letter of each word (`User Management` → `UM`, `Trade Finance` → `TF`).

**3b. Initials collision gate.** If two modules share initials:

```
AskUserQuestion(questions=[{
  question: "Modules {A} and {B} both abbreviate to '{XX}'. How to disambiguate?",
  header: "Initials",
  multiSelect: false,
  options: [
    { label: "Use proposed",     description: "Apply the auto-disambiguated pair: {A}→{USX}, {B}→{UNX}." },
    { label: "Custom initials",  description: "I'll provide my own pair (e.g., 'UM, UMG') in the next message." },
    { label: "Cancel run",       description: "Stop the run cleanly; no GitLab writes." }
  ]
}])
```

**3c. Build manifest.** Expand modules into operations. IDs reset per module: `FRS-[INITIALS]-01`, `FRS-[INITIALS]-02`, …. Set all statuses to `pending-draft`. Present non-blocking for visibility (no gate; informational only).

**3c.1. Cross-session FRS-ID collision check.** Dispatch `gitlab-frs-syncer` with mode `scan-frs-ids`, payload `{ initials_planned: [<every initial in confirmed_module_list>] }`. The syncer returns `existing[]` — every `FRS-XX-NN: ...` issue already in the project for any planned initial. Intersect `existing[].frs_id` with this run's planned IDs. For each collision, fire the gate below (one `AskUserQuestion` call per colliding ID; collisions are usually rare):

```
AskUserQuestion(questions=[{
  question: "FRS-{XX}-NN already exists from a previous run as issue #{N} (state: {state}, title: '{old_title}'). This run plans to create FRS-{XX}-NN with title '{new_title}'. How to proceed?",
  header: "FRS-ID",
  multiSelect: false,
  options: [
    { label: "Same numbering",      description: "Create the new issue anyway; two issues will share the FRS-ID. You'll reconcile in GitLab." },
    { label: "Shift numbering",     description: "Start this run at FRS-{XX}-{next_free_NN} and renumber the rest of the module's IDs upward." },
    { label: "Cancel and reconcile",description: "Stop the run; you'll close or rename the previous issue manually before re-running." }
  ]
}])
```

**3d. Create milestones.** Dispatch `gitlab-frs-syncer` once per module with mode `create-milestone`. The milestone dispatch does NOT carry `policy` (the syncer milestone branch does not consume it; only the issue write modes do). The dispatch payload shape is:

```
{
  module_name: <string>,
  initials: <string>,
  description: <built from policy.milestone_description_template>
}
```

The syncer applies the three-branch decision. If the syncer returns `closed-conflict`:

```
AskUserQuestion(questions=[{
  question: "Milestone '{name}' exists but is closed (#{id}, from previous session). How to proceed?",
  header: "Milestone",
  multiSelect: false,
  options: [
    { label: "Create v2",          description: "Create a new milestone with disambiguated title (e.g., '{name} v2')." },
    { label: "Cancel this module", description: "Skip this module; reopen the closed milestone manually in GitLab, then re-run." }
  ]
}])
```

Act on the choice. (Reopening a closed milestone is not automatable — the GitLab MCP server in this project does not expose `update_milestone`. Users who want to reuse the closed milestone must reopen it via the GitLab UI and re-run; the next run's `create-milestone` dispatch will then match the now-active milestone in branch 1.)

**Verify:** every confirmed module has exactly one `milestone_id`. No duplicates.

---

## Phase 4 — Module Loop (per module)

This is the heart of the architecture. Per module — not per FRS — the orchestrator runs a four-step batch.

**Module entry — shared references in working memory.** At the start of each module loop, ensure these four files are loaded:

```
Read('.claude/shared/frs-template.md')           # canonical section list + body skeleton
Read('.claude/shared/frs-validation-rules.md')   # Self-Review checklist + log format
Read(<glossary_path>)                        # already snapshotted at Phase 0e — re-Read only if dropped
Read(<cross_cutting_path>)                   # already snapshotted at Phase 0e — re-Read only if dropped
```

The template and validation rules MUST be in working memory for every FRS in this module — Read them at module entry and do NOT re-read per FRS. The glossary and cross-cutting-concerns files were captured at Phase 0e; re-Read only if they've been actively dropped from context.

These four files together are the contract the drafter and inline validator apply across the whole module loop. Reload only on module change if you've actively dropped them.

### 4a. Outline pass

For each FRS in the module, sketch a one-paragraph outline:

```
FRS-LIC-01: Branch Maker Verification of Import LC Issuance Checklist
  Actor: Branch Maker
  Trigger: Branch Maker opens checklist for an LC application
  Key behaviours: presents active items, records Yes/No/NA, prevents advance on No-marked
  Inferred OQs: 4
    - Role title: comment says "CTO Maker" but mode value is "ctf" — confirm
    - All-required-before-advance policy?
    - No-marked items: block advance, or escalate?
    - NA permitted for all items, or only conditional?
  Inferred [from-code] rules: 3 (active-only filter, mode-gating, read-only column)
```

Do this for every FRS in the module. Total work: ~20 lines per FRS, all in one pass. The point is to surface every Open Question across the entire module before drafting starts. Do NOT write any full FRS body yet.

### 4b. Batch all OQs at once

Concatenate every OQ from every FRS outline. **Include every `[inferred from code — confirm with stakeholder]` item from the classifier's manifest** — these propagate across Business Rules, Edge Cases, Exception Flows, Actors, and Form Field validations per `frs-code-extraction-rules.md` § `[inferred from code]` Propagation. Surfacing them here is the user's chance to confirm, revise, or defer.

Group similar OQs across FRS where possible. Batch into `AskUserQuestion` calls with up to 4 questions each. Each question gets 2–4 mutually exclusive options including a "Defer" choice (a real first-class option here, not the harness's "Other"). When the user picks "Defer", record the OQ with the appropriate tag from `frs-validation-rules.md` § Open Questions Tag Taxonomy — `[blocking]`, `[post-approval]`, or `[deferred]`. The default for an unresolved code-inferred item is `[post-approval]`; ask if uncertain.

**Pattern (for a 7-OQ batch across the module's 3 FRS):**

```
# First call — up to 4 questions
AskUserQuestion(questions=[
  {
    question: "FRS-LIC-01, FRS-LIC-02: Source comments verifier as 'CTO Maker' but mode value is 'ctf'. What is the correct role title?",
    header: "Role title",
    multiSelect: false,
    options: [
      { label: "CTF Maker",       description: "Use 'CTF Maker' (mode value is canonical; comment was wrong)." },
      { label: "CTO Maker",       description: "Use 'CTO Maker' (comment is canonical; mode value is wrong)." },
      { label: "Both, alias",     description: "Document both names; treat as aliases for the same role." },
      { label: "Defer",           description: "Park as Open Question in Section 22 of every affected FRS — pending wiki resolution." }
    ]
  },
  {
    question: "FRS-LIC-01: If Branch Maker marks one or more items as 'No', can they submit, or must failing items be resolved first?",
    header: "No-marked",
    multiSelect: false,
    options: [
      { label: "Must resolve",      description: "Block submission until every No-marked item is corrected to Yes/NA." },
      { label: "Submit + warning",  description: "Allow submission with a warning banner listing No-marked items." },
      { label: "Escalate",          description: "Submission requires supervisor approval when any No exists." },
      { label: "Defer",             description: "Park as Open Question; do not bake a rule into the FRS." }
    ]
  },
  {
    question: "FRS-LIC-02: When CTF Maker's response differs from Branch Maker's on the same item, what should happen?",
    header: "Disagreement",
    multiSelect: false,
    options: [
      { label: "Record only",       description: "Both responses recorded; no flag, no block — auditable only." },
      { label: "Flag supervisor",   description: "Disagreement raises a flag to the supervisor's queue." },
      { label: "Block submit",      description: "Submission blocked until both responses match." },
      { label: "Defer",             description: "Park as Open Question; no rule yet." }
    ]
  }
])

# Second call — remaining 4 OQs (up to 4 per call)
```

Record answers as `module_oq_resolutions: { Q1: "CTF Maker", Q2: "Must resolve", ... }`. Apply during 4c drafting. Items the user explicitly defers stay in Section 22 of the relevant FRS marked with the appropriate tag (`[blocking]` / `[post-approval]` / `[deferred]`) per `frs-validation-rules.md` § Open Questions Tag Taxonomy.

### 4c. Per-FRS draft + inline validate + sync

For each FRS in the module, run this sequence inline (no subagent dispatches except syncer at 4c.iv):

#### 4c.i — Draft the body

Produce every section in the Canonical Section List from `frs-template.md`, in the order listed there, in business language, scoped to the module's locked actor list. No cross-module rules. No technical detail (DB names, API verbs, frameworks, languages, infra) and no interaction mechanisms (drag-and-drop, double-click, hover, keyboard shortcut, swipe — describe outcomes, not gestures).

Integrate:
- The candidate's pre-populated Form Fields → Section 15
- Code-inferred rules → Section 20 (Business Rules)
- Code-inferred edge cases → Section 21
- Code-inferred exceptions → Section 12
- Code-inferred actors → Section 5 (with `[inferred from code]` tag if not corroborated by prose)
- Code-inferred notifications → Section 14
- Module enrichment_map items → Section 20
- Module OQ resolutions from 4b → embedded in relevant sections; the resolution either confirms (strip `[inferred from code]` tag), revises (strip and rewrite), or defers (retain tag, log as Section 22 OQ with `[blocking]` / `[post-approval]` taxonomy tag)
- Skill Constraint floor: ≥2 business rules, ≥2 edge cases, ≥1 exception flow. Simple operations have unstated policy rules — infer them.

**Glossary references (Section 4):** list every project-glossary term used in the body. Do not redefine them — `docs/glossary.md` is the single source. Self-Review item *glossary-resolves* checks both directions (terms used in body must be in Section 4; terms in Section 4 must resolve to a glossary entry).

**Cross-cutting-concerns references (Section 7 system half, Section 18 NFR, Section 19 Auditability):** state the forward reference to `docs/cross-cutting-concerns.md` and cite the categories invoked. Do NOT restate cross-cutting content. Section 18 contains operation-specific NFRs only; Section 19 contains operation-specific audit obligations only. Self-Review item *baseline-not-duplicated* enforces (the mnemonic name is preserved for backward compatibility with prior logs).

**AC ↔ FR traceability (Sections 16, 17):** every Must-priority FR must be cited by ≥1 AC; every AC must trace to ≥1 FR via the `Traces to` column. Self-Review item *ac-fr-traceable* enforces.

**Inter-FRS dependency direction (Section 7):** list FRS-YY only when FRS-YY must complete BEFORE this FRS begins (Upstream). A downstream consumer is NOT a dependency of this FRS — record it in Section 13 (Postconditions) as "triggers FRS-YY on success".

**Source provenance (Section 23 v1.0 row):** cite both the file path AND the logical name for the candidate's source location, plus every traversed import the classifier tagged as `signal-bearing`. Drop `infra-helper` entries from the provenance — they were Read to satisfy the traversal guardrail but contribute no business signal, so they would only pollute the audit trail. Format per `frs-template.md` § 23. Without this provenance, the draft is incomplete.

#### 4c.ii — Self-Review (compact validation log)

Run the Self-Review checklist from `.claude/shared/frs-validation-rules.md` (currently 14 items; the legend in the rules file is authoritative — do not hardcode the count). Produce the **Validation Log** in the format defined there (Self-Review Checklist → Output Requirement section).

The log lives in session state as `validation_logs[<FRS-ID>]`. It is NEVER rendered inline — that violates Move 1. The user accesses it on demand at the spot-check gate (Phase 4d.0).

Populate the audit reproducibility set on every log:
- Sources traversed: from Section 23 of the FRS body
- Commit: from the source manifest
- Validation rules version: from the rules file's revision history
- Glossary version: from `glossary_version` (Phase 0e)
- Cross-cutting concerns version: from `baseline_version` (Phase 0e — variable name preserved for backward compatibility)

Two operating rules:

- **Items 3 (no-tech, including interaction mechanisms), 9 (NFR rubric), 13 (baseline-not-duplicated), and 14 (AC-FR traceability) are the most commonly rubber-stamped.** Re-read every step in Section 10 and every entry in Section 18 before marking 3 or 9 as `P`. For 13, re-read Sections 18 and 19 — any restatement of cross-cutting content must be replaced with a forward reference. For 14, cross-check every Must-priority FR has an AC that cites it AND every AC's `Traces to` column references a real FR.
- **A `P` is a claim, not a wish.** If the rule technically passes but the drafter had to fix something to get there, the entry is `R` (revised), not `P`. The verbatim original quote on the `R` line is the audit trail.

The log emission cost is small (typically 8–10 lines for clean, 14–25 with one revision) and the orchestrator carries it forward to Phase 4d.0.

#### 4c.iii — Independent Reviewer pass

This is the inline replacement for the previous `frs-validator` subagent. Re-frame:

> *"Now adopt the role of an independent reviewer who has not seen the drafter's reasoning. Re-read the FRS as if encountering it for the first time. Apply each rule in `.claude/shared/frs-validation-rules.md` deliberately — Self-Review checklist, Skill Constraint count (count the items, don't trust the prior number), Domain-Expert Enforcement table, NFR Rubric, Common Language Traps, Bundling Detection. List every Blocker, Major, and Minor with verbatim violating phrase and concrete rewrite."*

Output the findings in the validator format from `frs-validation-rules.md` (Severity Guide). Anything found here is appended to `validation_logs[<FRS-ID>]` as additional `R` entries (if drafter resolves) or remains as `F` if unresolved. If findings:
- **Only Minor** → apply inline, log entries marked `R` for revised, proceed.
- **Major** → apply inline, mark `R`, re-run 4c.ii.
- **Blocker** → apply inline, mark `R`, re-run 4c.ii.

Cap: **2 critique-and-refine passes per FRS**. After 2:

```
AskUserQuestion(questions=[{
  question: "FRS-{ID} cannot cleanly satisfy the validation contract after 2 refinement passes. How to proceed?",
  header: "Refinement",
  multiSelect: false,
  options: [
    { label: "Move module",       description: "Move this operation to a different module; you'll name the target next." },
    { label: "Split FRS",          description: "Split into multiple FRS; you'll describe the split next." },
    { label: "Skip this FRS",      description: "Skip in this run; no GitLab issue is created for it." },
    { label: "Halt + Resume",      description: "Halt the run and emit a Resume Block with the unresolved validation findings." }
  ]
}])
```

An FRS with unresolved `F` validation entries MUST NOT enter `create-issue` or `update-issue`. After the refinement cap, the only allowed outcomes are moving the operation to a different module, splitting it into multiple FRS, skipping it for this run, or halting with a Resume Block that includes the validation blockers and next action.

Act on the choice before 4c.iv:

- **Move module** → ask for the target module using `AskUserQuestion`. Offer unprocessed confirmed modules first. If the target is a new module, run the required Phase 3 initials/collision and milestone steps before it enters Phase 4. Remove the failed FRS from the current module queue, allocate a fresh non-colliding FRS ID under the target module initials, append the operation to the target module's pending queue, update the manifest/module assignment, and continue with the current module's next FRS. If the user selects an already-processed module, halt with a Resume Block unless the run explicitly re-enters that module's Phase 4 loop. The failed body is not synced.
- **Split FRS** → ask for the split boundary using `AskUserQuestion` with 2-3 plausible split options plus the harness-provided "Other" path. Replace the failed FRS with multiple queued FRS outlines in the current module, allocate fresh non-colliding FRS IDs, update the manifest, and return to 4c.i for the first split FRS. The failed body is not synced.
- **Skip this FRS** → mark the FRS as skipped in the compact module summary and continue with the next FRS. No GitLab issue is created.
- **Halt + Resume** → halt immediately and emit a Resume Block that includes the unresolved validation findings, current module, current FRS ID, and the selected next action.

#### 4c.iv — Sync to GitLab

**Precondition:** `validation_logs[<FRS-ID>]` contains no unresolved `F` entries. If the 4c.iii cap gate redirected this FRS (move / split / skip / halt), 4c.iv is never entered for it.

Dispatch `gitlab-frs-syncer` with mode `create-issue`. Payload shape:

```
{
  frs_id: "FRS-[INITIALS]-NN",
  title: <operation title only>,
  body: <full FRS markdown>,
  milestone_id: <int>,
  labels: <subset of policy.approved_labels — apply policy.default_labels plus any conditional labels>,
  policy: <the Phase 0e object — milestone creation used only its rendered milestone_description_template>
}
```

The orchestrator constructs `labels` from `policy.default_labels` (always applied) plus conditional labels per `policy.conditional_label_rules`:
- If Section 22 contains any `[blocking]` OQ → add `Discussion`
- If Section 22 contains any `[deferred]` OQ → add `Discussion`
- If the user explicitly deferred this FRS to a later sprint → add `Deferred`

Because the orchestrator built the labels *from* the policy, the syncer's policy check is fast — set membership against an in-memory list, no file load.

The syncer applies its idempotency contract and returns `(issue_id, created|reused)`.

**Critical (Move 1):** the FRS body NEVER renders to the user. The body lives in main context only long enough to construct the syncer payload. After sync, the orchestrator records `(FRS-ID → issue_id, issue_url, summary metadata)` and the body should not be re-quoted in subsequent turns.

#### 4c.v — Compact summary record

After sync, store this and only this for the FRS:

```
FRS-LIC-01 → issue #39
  Title: Branch Maker Verification of Import LC Issuance Checklist
  Counts: 4 BR / 4 EC / 3 exception flows / 0 OQ remaining
  Status: drafted, validated, synced
  Validation: <derived from validation_logs[FRS-LIC-01]>
              clean    — log is all P
              revised  — log contains ≥1 R, no F
              concerns — log contains ≥1 F (should not reach 4c.v; 4c.iii halts)
  Validation log: <opaque handle into session state — not rendered here>
```

This is what the user sees aggregated at 4d. Not the body. The Validation field collapses the full Self-Review status string into a single signal so the summary table has a useful column. The status string length itself is whatever the current Self-Review legend dictates (today: 14 items). The log itself stays in session state until the user requests it at 4d.0.

### 4d. Module summary gate

When all FRS in the module are drafted, validated, and synced, present the module summary as a compact table (NOT a tool call — this is informational). The table has these columns:

```
| FRS-ID | Title | Issue | Status | Validation | BR/EC/EX | OQs |
```

The Validation column reads `clean`, `revised`, or `concerns` per the rule in 4c.v. Then run the spot-check gate (4d.0), then the disposition gate (4d.1).

#### 4d.0 — Spot-check sub-gate

Move 1 keeps FRS bodies out of the main thread. That is the right default, but it means a quality regression in any single FRS isn't visible at this point. Offer the user a one-click way to recover visibility before they approve the module:

```
AskUserQuestion(questions=[{
  question: "Spot-check before approving the {Module} module?",
  header: "Spot-check",
  multiSelect: false,
  options: [
    { label: "No — proceed",       description: "Skip spot-check; go straight to the disposition gate (4d.1)." },
    { label: "Show body inline",   description: "Render one FRS body inline; you'll pick which next. Bounded at 3 per module-cycle." },
    { label: "Show validation logs",description: "Render every FRS's compact validation log in one block (typically 6-20 lines per FRS)." }
  ]
}])
```

Behaviour per option:

- **No** → proceed to 4d.1.
- **Show one FRS body inline** → second `AskUserQuestion` with up to 4 FRS-ID options. If the module has more than 4 FRS, choose the 4 most relevant candidates from the module summary; the harness-provided "Other" path lets the user name any remaining FRS-ID in the next message. Render the chosen FRS body inline by reading from the orchestrator's per-FRS draft cache (it's still in working memory at this phase). After rendering, re-present 4d.0 — the user can spot-check another, view logs, or proceed.
- **Show validation logs** → render `validation_logs[<every FRS-ID in module>]` as one consolidated block. These are compact (typically 6-20 lines per FRS) and stay well within Move 1 boundaries. After rendering, re-present 4d.0.

**Cap on inline body renderings:** at most **3 inline FRS body renderings per module-cycle** (counter resets if 4e revisions trigger a new 4d cycle). Once the cap is hit, the **Show one FRS body inline** option is removed from the gate; the user sees only "No" and "Show validation logs". This keeps the loop bounded and protects Move 1 from drift.

**Single-FRS-module shortcut.** When the module contains exactly one FRS, the spot-check gate and the disposition gate collapse — body/log inspection and "approve THE FRS" all apply to the same FRS. Compress to one disposition `AskUserQuestion` call, using a follow-up inspect gate only when the user asks for visibility:

```
AskUserQuestion(questions=[{
  question: "Disposition for the {Module} module (1 FRS, FRS-{ID})?",
  header: "Disposition",
  multiSelect: false,
  options: [
    { label: "Approve",            description: "Approve the module; proceed to inter-module checkpoint." },
    { label: "Inspect FRS",        description: "Choose body or validation log visibility before deciding disposition." },
    { label: "Revise FRS",         description: "Revise FRS-{ID}; you'll choose the required change next." },
    { label: "Halt + Resume",      description: "Halt the run and emit a Resume Block so a fresh session can continue." }
  ]
}])
```

If the user picks "Inspect FRS", call:

```
AskUserQuestion(questions=[{
  question: "What would you like to inspect for FRS-{ID}?",
  header: "Inspect",
  multiSelect: false,
  options: [
    { label: "Show body",           description: "Render the FRS body inline; counts toward the 3-per-module-cycle cap." },
    { label: "Show log",            description: "Render the FRS's compact validation log." },
    { label: "Back",                description: "Return to the disposition gate without rendering anything." }
  ]
}])
```

If the user picks "Show body" or "Show log", render the requested content and re-present the disposition gate (counting body renderings against the per-module cap above). If the user picks "Revise FRS", route directly to Phase 4e with FRS-{ID} preselected; do not ask which FRS to revise. After Phase 4e completes without halt, re-present this combined disposition gate. The 4d.1 disposition gate is skipped for this module — the combined gate already disposed it. For modules with ≥2 FRS, run 4d.0 and 4d.1 separately as defined above.

Bias: **bodies render only when explicitly requested**. Logs are a much cheaper substitute for "did the validator do its job?" — promote them.

A spot-check that reveals a problem doesn't auto-revise. The user proceeds to 4d.1 with the problem in mind and selects "Revise specific FRS" if they want to act on it. Spot-check is for visibility, not for fixing.

#### 4d.1 — Disposition gate

```
AskUserQuestion(questions=[{
  question: "Disposition for the {Module} module ({N} FRS synced)?",
  header: "Disposition",
  multiSelect: false,
  options: [
    { label: "Approve module",   description: "Approve all {N} FRS in this module; proceed to inter-module checkpoint." },
    { label: "Revise specific",  description: "Flag specific FRS for revision; you'll list which in the next message." },
    { label: "Halt + Resume",    description: "Halt the run and emit a Resume Block so a fresh session can continue." }
  ]
}])
```

This single gate replaces N per-FRS dispositions. Move 3.

### 4e. Revision sub-loop (only on "Revise")

If the user picks "Revise" and names FRS to revise:

For each named FRS:

```
AskUserQuestion(questions=[{
  question: "What change is needed for FRS-{ID}?",
  header: "Revise FRS",
  multiSelect: false,
  options: [
    { label: "<plausible 1>",  description: "<one-sentence consequence of choosing option 1, derived from likely revision intents>" },
    { label: "<plausible 2>",  description: "<consequence of option 2>" },
    { label: "<plausible 3>",  description: "<consequence of option 3>" }
  ]
}])
```

(The harness automatically adds an "Other" choice — when the user picks it, prompt for free-text in the next message and apply that change.)

Apply the change inline (the body is in context from 4c). Re-run 4c.ii and 4c.iii on the modified body — this REPLACES the prior `validation_logs[<FRS-ID>]` entry; the audit trail for revisions lives in Section 23 of the FRS body, not in the log.

Only dispatch `gitlab-frs-syncer` with mode `update-issue` once the freshly produced validation log (from re-running 4c.ii and 4c.iii on the revised body) has no unresolved `F` entries. Payload = `{ issue_id, body, labels?, policy }` — `policy` carried forward from Phase 0e exactly as in the create-issue dispatch. Update the compact summary record after the syncer returns.

If unresolved `F` entries remain after the revision attempt, do NOT dispatch `update-issue`. If revision-round budget remains, keep the revised draft in working memory and re-present the revision change gate for the same FRS. If the cap below has been reached, present the cap gate; any Resume Block must identify the last successfully synced issue body separately from the unsynced draft and its validation blockers.

After all flagged revisions, re-present 4d's summary gate (4d.0 spot-check sub-gate is offered again — the user may want to spot-check the revisions).

**Cap: 2 full revision rounds.** After that:

```
AskUserQuestion(questions=[{
  question: "Module has been revised twice. Further changes may indicate scope or contract issues. How to proceed?",
  header: "Cap",
  multiSelect: false,
  options: [
    { label: "Accept current",   description: "Approve the latest successfully synced valid state; discard any unsynced invalid draft; proceed to Phase 5." },
    { label: "Skip the module",  description: "Drop this module from this run; Resume Block records what was synced." },
    { label: "Halt for review",  description: "Halt the run and emit a Resume Block so you can investigate offline." }
  ]
}])
```

---

## Phase 5 — Inter-module checkpoint

When a module is approved and at least one further module remains:

```
AskUserQuestion(questions=[{
  question: "Module {N}/{M} complete. {X} FRS synced to GitLab so far. Continue with module {N+1} ({Module Name})?",
  header: "Continue?",
  multiSelect: false,
  options: [
    { label: "Continue",         description: "Proceed to module {N+1}; load shared references and re-enter the module loop." },
    { label: "Halt + Resume",    description: "Halt the run and emit a Resume Block so a fresh session can continue with module {N+1}." }
  ]
}])
```

This is the last safety gate.

---

## Phase 6 — Final Output

```
Milestones (GitLab project #{gitlab_project_id}):
  <Module A>  →  #M1  (reused)
  <Module B>  →  #M2  (created)

FRS Issues:
  <Module A>:
    FRS-UM-01  <operation>  →  #<issue_id>  (created, validation: clean)
    FRS-UM-02  <operation>  →  #<issue_id>  (created, validation: revised)
    FRS-UM-03  <operation>  →  #<issue_id>  (created, validation: clean, 1 revision round)

  <Module B>:
    FRS-IC-01  <operation>  →  #<issue_id>  (created, validation: clean)

Total FRS generated : {N} across {M} modules
Issues created      : {N}
Issues updated      : {N}   (revision rounds applied)
Issues reused       : {N}   (idempotency matches on first sync)
Skipped             : {N}
Open Questions      : {N}   (deferred — pending wiki resolution)
Sources consumed    : {N prose, N code, N files}
Sources traversed   : {N imports}
```

**Verify before declaring done:**
- Every FRS has exactly one GitLab issue — no duplicates, no orphans
- Every FRS meets Skill Constraint minimums
- No FRS contains technical implementation detail (validated inline at 4c.iii)
- Every FRS is locked to exactly one module
- Skipped FRS have no issue
- Updated issues correctly reflect the user's revisions

---

## Bundling Detection Rule

The full rule lives in `.claude/shared/frs-validation-rules.md` (Bundling Detection section) — both `generate-frs` and `review-frs` reference it. The drafter (4c.i) catches bundled FRS in Self-Review item 1. The Independent Reviewer pass (4c.iii) catches it as a Blocker if the drafter misses.

The validation-rules file is loaded once at module entry (Phase 4) and stays in working memory through the loop, so the inline drafter and validator already have the rule in context — no extra Read needed.

---

## Phase Handoff Summary

| From → To | Artifact |
|---|---|
| Phase 0 → all later | `gitlab_project_id`, `policy` (approved_labels, default_labels, frs_id_pattern, milestone_description_template, conditional_label_rules), `glossary_path`, `cross_cutting_path`, `glossary_version`, `baseline_version` |
| Phase 1 → 2 | `source_manifest` (sources, candidates with logical names, traversed_imports with logical names, existing_frs flag) |
| Phase 2 → 3 | `confirmed_module_list` |
| Phase 3 → 4 | manifest with `(module → milestone_id)` mappings |
| Phase 4 entry | references `frs-template.md`, `frs-validation-rules.md` (plugin-owned), plus `<glossary_path>` and `<cross_cutting_path>` (project-owned) Read |
| Phase 4a → 4b | per-module OQ list (including all `[inferred from code]` items across BR/EC/Exception/Actors/Form Fields) |
| Phase 4b → 4c | `module_oq_resolutions` |
| Phase 4c.i → 4c.ii | full FRS body in working memory |
| Phase 4c.ii → 4c.iii | `validation_logs[<FRS-ID>]` populated (with audit reproducibility set) |
| Phase 4c (inline) | full FRS body + `policy` → syncer payload, never to user |
| Phase 4c → 4d | compact summary records (FRS-ID → issue link + counts + Validation status) |
| Phase 4d.0 → 4d.1 | (optional) spot-check renderings; `validation_logs` already populated |
| Phase 4d.1 → 4e (if revisions) | flagged FRS list + user's change requests |
| Phase 4e → 4d.0 | revised body + replaced `validation_logs[<FRS-ID>]` |
| Phase 4 → 5 | per-module disposition + (FRS-ID → issue_id) mappings + `validation_logs` (carried into Resume Block on halt) |
| Phase 5 → 6 | full session map of milestones, FRS, dispositions |

The orchestrator owns every handoff. Subagents do not call each other directly.

---

## Handling Subagent Status (per-phase)

**DONE** → proceed to next step.
**DONE_WITH_CONCERNS** → read concerns. If they affect the next step's input, escalate via `AskUserQuestion`. Informational concerns: note in Section 23 and proceed.
**NEEDS_CONTEXT** → provide missing input (usually from the previous step's artifact), re-dispatch.
**BLOCKED** → does not auto-cascade. Per-step BLOCKED handling is explicit above. Never retry without changing a variable.

For the syncer specifically: see retry policy in `gitlab-sync.md`.