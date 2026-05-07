---
name: dom-mapper
description: "Resolves UI selectors that the convention reference can't cover, by opening Playwright against the live UI and prompting the user to click on the element. Reads dev URL and credentials from {tests_repo}/.env. Writes resolved selectors to a per-feature cache at {docs_repo}/test-plans/{feature}/dom-map.yml so subsequent test-suite runs hit the cache instead of re-prompting. Invoked inline by generate-test-suite when its resolution chain hits an unresolvable element. Use when a TC step references feature-specific UI that has no convention pattern (image slots, custom badges, modal-specific containers) and the test-suite skill needs a real selector instead of a TODO."
---

# DOM Mapper — Interactive Selector Resolution

Bridges the gap between the convention reference (`id-conventions.md`) and the real DOM. When `generate-test-suite` hits a step it can't resolve via TC selector or convention, this skill opens Playwright against the live UI, prompts the user to click on the element described by the step text, captures the resulting locator, and writes it to a per-feature cache so future runs are non-interactive.

**The flow is interactive-primary, cache-second, heuristic-as-suggestion.** The user is always the source of truth for "which element is this." Heuristics suggest a likely click target to make confirmation one-keystroke; the user can override. The cache is the durable artifact — committed alongside the test plan, reviewable in PRs.

<HARD-GATE>
The mapper NEVER auto-resolves a selector from heuristic alone. Every selector in the cache must be either (a) explicitly clicked by the user during an interactive session, or (b) confirmed by the user against a heuristic suggestion. A heuristic match without user confirmation is a guess, and guessed selectors produce silent test failures. If the mapper runs in an environment where interactive confirmation is impossible (CI, no TTY), it MUST fail and surface the unresolved selectors for manual addition to the cache file.
</HARD-GATE>

<HARD-GATE>
The mapper NEVER navigates the UI on the user's behalf. It opens a Playwright browser pointed at the resolved URL and assumes the user has already navigated to the correct screen state (correct tenant, correct role, correct fixture row, correct modal open). The mapper's job is DOM introspection on whatever screen the user has prepared, NOT setup automation. If the screen is wrong, the user closes the browser, navigates manually, and re-runs.
</HARD-GATE>

<HARD-GATE>
The mapper NEVER writes to the cache file outside `{docs_repo}/test-plans/{feature}/dom-map.yml`. The cache lives next to the test plan it serves, not inside the tests repo, not inside the UI repo, not in CWD. Resolve `{docs_repo}` and `{feature}` from the invoking skill's context — never accept them from environment variables or CLI args alone, since those can drift from the actual test-plan location.
</HARD-GATE>

<HARD-GATE>
The mapper NEVER reads or stores credentials beyond what's needed for the immediate Playwright session. the resolved email and the resolved password are loaded from `{tests_repo}/.env` at session start and live only in the running process. They are NEVER written to the cache file, log output, the generation report, or anywhere else. The cache contains selectors only — never auth state, never URLs that include tokens, never values typed into form fields.
</HARD-GATE>

---

## When This Skill Runs

This skill is invoked **inline by `generate-test-suite`** when its resolution chain hits an unresolved selector. It is not typically run by the user directly.

**Trigger in `generate-test-suite`:** for each TC step, after applying the resolution chain (TC selector → convention → cache lookup), if the selector is still unresolved → invoke `dom-mapper` with the list of unresolved step descriptions for the current use-case folder.

**Direct invocation** is also supported when:
- The user wants to refresh the cache for a feature whose UI has changed.
- The user wants to pre-populate the cache before running `generate-test-suite` (avoids the inline interactive pause).
- A specific cache entry is wrong and needs to be re-mapped.

---

## Inputs

The skill expects, from its invoking skill or from the user:

| Input | Source | Notes |
|---|---|---|
| `feature` | TC file path (kebab-case) | e.g. `verification-preview` |
| `unresolved_steps` | List of step descriptions | Each entry: `{ tc_number, step_number, step_text, expected_result }` |
| `{docs_repo}` | Invoking skill's resolved value | Cache lives at `{docs_repo}/test-plans/{feature}/dom-map.yml` |
| `{tests_repo}` | Invoking skill's resolved value | `.env` file lives here |

When invoked directly without these, the skill runs the same discovery cascade as `generate-test-suite` (sibling → grandparent → ask) to locate `{docs_repo}` and `{tests_repo}`.

---

## Cache File Format

`{docs_repo}/test-plans/{feature}/dom-map.yml`

```yaml
# DOM map for verification-preview
# Generated by dom-mapper. Reviewed selectors only.
# Hand-edits welcome — convention compliance is not enforced here.
# When the UI changes, delete the relevant entry and re-run dom-mapper to refresh.

version: 1
feature: verification-preview
last_updated: 2026-05-07T08:30:00Z
ui_url_at_capture: https://kyc-dev.example.com
feature_path: /verification/sessions/active

entries:
  - step_text: "Click the preview icon on a face verification row"
    selector: "[data-testid='row-preview-trigger']"
    resolution: interactive
    captured_at: 2026-05-07T08:30:12Z

  - step_text: "Verify the capture image slot displays a placeholder"
    selector: "#capture-image-slot .placeholder-message"
    resolution: heuristic-confirmed
    captured_at: 2026-05-07T08:30:45Z

  - step_text: "Verify the reference photo slot displays the customer's stored reference photo normally"
    selector: "#reference-image-slot img"
    resolution: interactive
    captured_at: 2026-05-07T08:31:08Z
```

**Field semantics:**
- `step_text` — verbatim text from the TC step (used for cache lookup; matched case-insensitively with whitespace normalised).
- `selector` — the Playwright locator string. Prefer `[data-testid="..."]` > `#id` > `[aria-label="..."]` > role + name > CSS path. The mapper records what the user clicked; it doesn't rewrite to a "better" selector.
- `resolution` — `interactive` (user clicked), `heuristic-confirmed` (heuristic suggested, user accepted with Enter), `manual` (hand-edited), `placeholder` (cache miss never resolved — flagged for review).
- `captured_at` — ISO 8601 timestamp.
- `ui_url_at_capture` — the URL the browser was on when the entry was captured. Used for drift detection: if the dev URL changes, all entries are flagged stale.
- `feature_path` — the path within the resolved URL where this feature's UI lives, captured on first run. The mapper navigates here automatically after login on subsequent runs so the user lands on the right screen instead of the home page. Three accepted forms:
  - **Relative path** (`/verification/sessions/active`): joined with the resolved URL to produce the full URL.
  - **Absolute URL** (`https://other-host.example.com/path`): used as-is, useful when a feature lives on a different subdomain or environment.
  - **`null` or omitted**: mapper does NOT auto-navigate after login; user is responsible for navigating manually before each step. Use this for features whose entry point varies per TC, or when the path is genuinely unknown.

**Cache lookup** for selectors is by `step_text`, normalised: lowercase, collapse whitespace, strip trailing punctuation. So *"Click the preview icon on a face verification row"* and *"click the preview icon on a face verification row."* hit the same cache entry.

**`feature_path` lifecycle:**
- First run for a feature: mapper prompts for the path, records it.
- Subsequent runs: mapper reads from cache, navigates automatically.
- UI router changes: hand-edit `feature_path` in the YAML, or delete it to be re-prompted on next run.
- Multi-environment: `feature_path` is dev-environment-specific. Different cache files for staging/prod if needed; the cache file lives in the docs repo and is environment-coupled by design.

---

## The Process

### Step 1: Resolve `{docs_repo}` and `{tests_repo}`

If invoked from `generate-test-suite`, both are passed in. If invoked directly, run the discovery cascade per `generate-test-suite`'s Step 1.

**Cache file path:** `{docs_repo}/test-plans/{feature}/dom-map.yml` — create the file if missing, never overwrite without merging.

### Step 2: Resolve `.env` Variable Names, Then Load

Different teams use different `.env` conventions — `DEV_URL` vs `APP_URL` vs `BASE_URL`; `USER_EMAIL` vs `TEST_USERNAME` vs `ADMIN_EMAIL`; `USER_PASS` vs `TEST_PASSWORD` vs `USER_PWD`. The mapper does NOT assume specific variable names. Instead it resolves them in this order — stop at the first hit:

**2a. Read the mapping file (if present).**

`{docs_repo}/test-plans/.env-mapping.yml`

```yaml
# Maps the abstract names the mapper needs (url/email/pass) to the actual
# variable names used in {tests_repo}/.env. Set once, used by every run.
# Hand-edit when your .env conventions change.
url:   APP_URL
email: TEST_USERNAME
pass:  TEST_PASSWORD
```

If this file exists, use the mapped names directly. Skip to Step 2c (load values).

**2b. Detect from `.env` if no mapping file.**

Read `{tests_repo}/.env`. Parse it as a flat key=value list (ignore comments, quoted values, and inline trailing comments after `#` outside of quotes — the value `https://example.com#` is a valid value, but `KEY=value # comment` should treat the trailing fragment as a comment).

**Note: Some teams do use trailing `#` legitimately in URL values** (anchor placeholders). When ambiguous, prefer the simpler "everything after the first `=` is the value" interpretation and let the user fix in 2d if needed.

For each abstract name, score candidate variables by name and value heuristics:

| Abstract | Variable-name hints (case-insensitive) | Value-shape hints |
|---|---|---|
| `url` | `url`, `host`, `endpoint`, `app`, `dev`, `base`, `site` | starts with `http://` or `https://` |
| `email` | `email`, `user`, `username`, `login`, `account`, `admin` | (any non-empty string) |
| `pass` | `pass`, `password`, `pwd`, `secret`, `token` (when paired with email) | (any non-empty string, usually short) |

A candidate gets +3 for a name hint, +2 for a value-shape match. Top score wins per abstract name. Ties or no clear winner → fall through to 2d.

For your example `.env`:
```
APP_URL=https://amnilvideokyc.server247.info#
TEST_USERNAME=admin
TEST_PASSWORD=1q2w3E*
```

`APP_URL` scores +3 (`app`, `url` both hint) +2 (https value) = +5 → wins for `url`.
`TEST_USERNAME` scores +3 (`user`, `username`) → wins for `email`.
`TEST_PASSWORD` scores +3 (`pass`, `password`) → wins for `pass`.

**2c. Confirm with the user (always, even when detection is unambiguous).**

```
═══════════════════════════════════════════════════════════
.env variable mapping
═══════════════════════════════════════════════════════════
Tests repo:        {tests_repo}
.env file:         {tests_repo}/.env

Detected mapping:
  url   →  APP_URL          = https://amnilvideokyc.server247.info#
  email →  TEST_USERNAME    = admin
  pass  →  TEST_PASSWORD    = (redacted)

Press Enter to confirm, or type a correction in the form
`abstract=VARIABLE_NAME` (one per line, then a blank line):

  e.g.  url=BASE_URL
        email=ADMIN_USER

Reply:
```

The user confirms with Enter, or replaces one or more mappings with explicit names. Re-prompt until all three are confirmed.

**Always show the URL value openly; always redact the password value as `(redacted)` in the prompt.** The email value can be shown openly — usernames/emails are typically not secrets, but if your env conventions treat them as such, edit the mapping prompt locally to redact them too.

**2d. Ask outright if detection failed.**

If 2b couldn't pick a winner (no name hints, multiple top scorers, etc.), drop the auto-detection and ask:

```
.env file at {tests_repo}/.env has these variables:
  APP_URL, TEST_USERNAME, TEST_PASSWORD, OTHER_VAR_1, OTHER_VAR_2

Which variable holds the dev URL? (e.g. APP_URL)
Which variable holds the login email/username? (e.g. TEST_USERNAME)
Which variable holds the login password? (e.g. TEST_PASSWORD)
```

Validate each answer is actually a key in the `.env` file before accepting.

**2e. Persist the mapping.**

Write `{docs_repo}/test-plans/.env-mapping.yml` with the confirmed mapping. This file:
- Lives in the docs repo (committed alongside test plans, reviewable in PRs).
- Stores variable *names only*, never values.
- Is used by every subsequent run (skipping 2b–2d).

If the user wants to change the mapping later, they hand-edit the file or delete it to be re-prompted.

**2f. Load values into the running process.**

Read the three values from `.env` using the resolved variable names. Validate:
- url value: starts with `http://` or `https://`. Strip any trailing `#` or whitespace.
- email value: non-empty.
- pass value: non-empty.

Empty or missing → stop and report which one is missing. The mapping resolved the variable names correctly but the `.env` itself is incomplete.

**Security:** values live only in the running process. Never logged, never written to the cache, never shown in tool-call output. The mapping file contains names only, never values.

If `.env` is missing entirely, prompt the user:
> "I couldn't find a `.env` file at `{tests_repo}/.env`. The mapper needs three values (dev URL, login email/username, login password). Create the file and re-run, or paste values inline (paste-only — values won't be persisted)."

Never silently default URLs. Never fall back to placeholder credentials.

### Step 3: Load Existing Cache (if present)

Read `{docs_repo}/test-plans/{feature}/dom-map.yml` if it exists.

For each entry in `unresolved_steps`:
- Normalise the step text (lowercase, collapse whitespace, strip trailing punctuation).
- Look up in the cache.
- **Hit** → mark as resolved, return the selector to the invoking skill.
- **Miss** → add to the `to_map` list for interactive resolution.

If the entire `unresolved_steps` list resolves from cache, return immediately without launching Playwright. Print:
> ✅ All {N} unresolved selectors resolved from cache. No interactive session needed.

### Step 4: Pre-Flight Check Before Launching Playwright

If any entries are in `to_map`, the pre-flight has two parts: prompt for `feature_path` (if missing from the cache), then show the resolution summary and wait for "go".

**Part A: Resolve `feature_path`.**

Read the existing cache (if present) for a `feature_path` value:

- **Cache has a value** (e.g. `/verification/sessions/active`): keep it. Show it in Part B.
- **Cache has explicit `null`**: keep it. The user previously chose to navigate manually; respect that.
- **Cache has no `feature_path` key, OR cache file doesn't exist**: prompt the user.

The first-run prompt:

```
The mapper will log in and land on the home page by default.
For features that live behind a sub-route, you can have the mapper
navigate to the right URL after login so you don't have to click
through the app every time.

What URL or path is `{feature}` reachable at? Examples:

  /verification/sessions/active     ← relative path (joined to the resolved URL)
  https://other-host.example/path   ← absolute URL (used as-is)
  (blank, just press Enter)         ← skip auto-navigation; navigate manually each run

This is saved to dom-map.yml and used on every subsequent run.
You can hand-edit or delete it later.

Path:
```

Validate the input:
- Empty → store as `null` in cache. Mapper won't auto-navigate; user navigates manually before each step. This is the previous behaviour.
- Starts with `http://` or `https://` → store as absolute URL. Mapper uses it as-is.
- Anything else → treat as a relative path. Prepend `/` if missing. Store as relative.

The chosen value gets written to the cache during Step 7 alongside the resolved selectors.

**Part B: Resolution summary, wait for "go".**

```
═══════════════════════════════════════════════════════════
DOM MAPPER — interactive session about to start
═══════════════════════════════════════════════════════════
Feature:           {feature}
Cache file:        {docs_repo}/test-plans/{feature}/dom-map.yml
Dev URL:           {resolved URL}
Feature path:      {feature_path or "(none — navigate manually)"}
Will land on:      {full URL after login, or "home page" if no feature_path}
Cache hits:        {N_hits} / {N_total}
To resolve:        {N_to_map} selector(s)

Steps to resolve interactively:
  1. {step_text_1}
  2. {step_text_2}
  ...

Before continuing, make sure:
  • The dev environment at {resolved URL} is running.
  • You're ready to navigate to the screen state each step describes.
  • For per-row elements, you have a row in the appropriate state.

A Playwright browser will open. After login, you'll land at {feature_path or "the home page"}.
For each step, navigate to the right screen state, then click the element the
step describes. The mapper captures the locator and moves to the next step.

Reply "go" to launch the browser, or "abort" to cancel.
═══════════════════════════════════════════════════════════
```

Wait for explicit "go" / "ok" / "yes" / "launch". Do not auto-launch.

### Step 5: Launch Playwright Session

The skill bridges the user's arbitrary `.env` variable names to the script's expected names by setting three generic env vars **on the script's process only**:

| Script env var | Source |
|---|---|
| `MAPPER_URL` | The value resolved in Step 2f (whatever `.env` variable held the URL) |
| `MAPPER_EMAIL` | The value resolved in Step 2f (whatever `.env` variable held the email/username) |
| `MAPPER_PASS` | The value resolved in Step 2f (whatever `.env` variable held the password) |

These are set when invoking `scripts/run-mapper.mjs` and exist only for that child process. They are NOT written to the user's `.env` file, NOT persisted in the mapping file, NOT logged. The user's original `.env` and original variable names are unchanged.

Stdin to the script is the same JSON object as before:
```json
{
  "feature_path": "/verification/sessions/active",
  "to_map": [ ... ]
}
```

The script:
1. Reads `MAPPER_URL`, `MAPPER_EMAIL`, `MAPPER_PASS` from its own env (errors if any are missing).
2. Launches a headed Chromium browser.
3. Navigates to `MAPPER_URL`.
4. Performs login if a login form is detected (looks for `#username`, `#email`, `input[type=email]`, `input[type=password]` — fills with the values from `MAPPER_EMAIL` / `MAPPER_PASS`, submits).
5. **If `feature_path` is set**, navigates to it after login:
   - Relative path → `${MAPPER_URL}${feature_path}`.
   - Absolute URL → used as-is.
   - `null` → stay on whatever page login landed on.
6. For each entry in `to_map`:
   a. Prints the step text and expected result to terminal.
   b. Asks the user to navigate to the right screen state (for per-row entries, ensure the right row is present).
   c. Computes a heuristic suggestion (see `references/heuristics.md`) and highlights the suggested element in the browser with a red outline.
   d. Prompts the user: *"Press Enter to accept the suggested element, or click a different element in the browser."*
   e. On Enter → record as `heuristic-confirmed` with the suggested locator.
   f. On click → record the click target's locator as `interactive`.
   g. The locator preference order is `[data-testid="..."]` → `#id` → `[aria-label="..."]` → role + name → CSS path. The script picks the most stable form available on the clicked element.
7. Returns the captured map as JSON to stdout.

The script handles all the Playwright mechanics. The skill's job is orchestration: resolving variable names, loading values, launching the script, parsing output, merging into the cache.

### Step 6: Merge Captured Entries into Cache

For each entry returned by the script:
- Append to the cache's `entries` list with `captured_at` timestamp.
- Update the cache's `last_updated` field.
- Set `ui_url_at_capture` to the resolved URL value (Step 2f).
- Persist `feature_path` from Step 4 Part A (whether it was newly entered, read from cache, or explicitly `null`).

**Never overwrite an existing selector entry without explicit user confirmation.** If an entry for the same `step_text` already exists, prompt:
> "Cache already has an entry for '{step_text}': `{old_selector}`. Overwrite with `{new_selector}`? (yes/no/keep-both)"

`keep-both` adds the new entry without removing the old one and flags both as `ambiguous` for review.

**`feature_path` updates without overwrite warning** when it changes between runs (the user re-typed it, or the script saw a redirect to a different path). The path is treated as configuration, not user-curated content like selectors are. Hand-edits to `feature_path` in the YAML are preserved unless the user re-enters a different value at the prompt.

### Step 7: Write Cache File

Write the YAML atomically (write to `dom-map.yml.tmp`, then rename) so partial writes don't corrupt the cache.

**Verify:**
- File is at `{docs_repo}/test-plans/{feature}/dom-map.yml`.
- File contains all merged entries.
- `last_updated` is current timestamp.

### Step 8: Return to Invoking Skill

Return a map keyed by `step_text` → selector for every entry in the original `unresolved_steps` list. The invoking skill (`generate-test-suite`) splices these into its spec output, classifying them as `(dom-map)` in the resolution report.

For any entry where the user aborted or the script couldn't resolve, return `null` for that key. The invoking skill emits a TODO for those, same as before.

### Step 9: Print Mapper Report

```markdown
## DOM Mapper Report: {feature}

**Cache file:** `{docs_repo}/test-plans/{feature}/dom-map.yml`
**Cache size before:** {N_before} entries
**Cache size after:** {N_after} entries
**Resolved this run:** {N_resolved}
  - From cache: {N_hits}
  - Interactive: {N_interactive}
  - Heuristic-confirmed: {N_heuristic}
  - Aborted / unresolved: {N_aborted}

**Next steps:**
1. Review the cache file changes: `git -C {docs_repo} diff test-plans/{feature}/dom-map.yml`
2. Commit when ready: `git -C {docs_repo} add test-plans/{feature}/dom-map.yml && git -C {docs_repo} commit -m "test({feature}): map dom selectors"`
3. Re-run `generate-test-suite` to regenerate specs with the resolved selectors.
```

---

## Anti-Patterns

**"I'll auto-resolve from heuristic alone if confidence is high."** No. Heuristics are *suggestions*, never authoritative. A high-confidence heuristic match with no user confirmation produces a cache entry that looks reviewed but isn't. The whole point of the cache is that every entry has been verified by a human; collapsing the confirmation step breaks the trust model.

**"I'll automate the navigation to save the user time."** No. The mapper does not know the right tenant, role, fixture data, or modal state for a given test. Auto-navigation produces brittle scripts that fail when the dev environment shape changes; user-driven navigation produces a mapper that adapts naturally to whatever state the user has prepared. The user navigates; the mapper records.

**"I'll write a 'best-guess' selector when the user aborts."** No. Aborted = unresolved. The cache stays empty for that entry, and the invoking skill emits a TODO. Better to be honest than to ship a guess.

**"I'll cache the selector for {tenant-A} and use it for {tenant-B}."** Selectors that depend on per-tenant content (text labels, dropdown options) shouldn't be in the cache at all — the cache is for *structural* selectors like `[data-testid]`, `#id`, role+name. If a selector turns out to depend on tenant content, surface that as a warning and ask the user to refine the locator (probably to a more structural form).

**"I'll skip the .env check if the variables look set in the shell."** No. The contract is `.env` lives in `{tests_repo}/.env`. Shell-set variables aren't reproducible across users and machines; `.env` is. If the user has shell-only variables, the answer is to write them to `.env`, not to bypass the check.

---

## Common Mistakes

**❌ Caching a CSS path like `body > app-root > div:nth-child(3) > app-modal > ...`** — breaks the moment any sibling element is added.
**✅ Prefer structural selectors. The script picks `[data-testid]` > `#id` > `[aria-label]` > role+name in that order. CSS path is the last resort and the mapper warns when it has to use one.**

**❌ Storing form values, URLs with tokens, or credentials in the cache** — the cache is committed to the docs repo.
**✅ Selectors only. Never values. Never URLs that include session tokens or auth headers.**

**❌ Auto-overwriting an existing cache entry on re-map**
**✅ Prompt before overwriting. The user might be re-mapping deliberately (UI changed) or accidentally (clicked the wrong element); confirmation distinguishes them.**

**❌ Running the mapper without a `.env` file by hardcoding `localhost:4200`**
**✅ Fail clearly when `.env` is missing. Hardcoded defaults rot the moment the dev URL changes.**

**❌ Returning a partial map silently when some entries failed**
**✅ Return `null` for unresolved entries; the invoking skill knows to emit TODOs. Partial success without surfacing what failed produces silent gaps.**

**❌ Mapping against a screen the user wasn't ready to map** — the mapper's heuristic suggests an element on the wrong screen, the user accepts it because they're not looking carefully, the cache fills with wrong selectors.
**✅ The pre-flight prompt (Step 4) exists for this. Always wait for "go". When the user is mid-task on something else, they'll abort and come back when ready.**

---

## Integration

**Invoked by:** `generate-test-suite` — when its resolution chain (TC selector → convention → cache → mapper) hits a cache miss on an element the convention can't resolve.

**Reads:**
- `{tests_repo}/.env` for credentials and dev URL (variable names resolved per Step 2)
- `{docs_repo}/test-plans/.env-mapping.yml` for the mapping between abstract names (`url`/`email`/`pass`) and the user's actual `.env` variable names
- `{docs_repo}/test-plans/{feature}/dom-map.yml` for cache lookup

**Writes:**
- `{docs_repo}/test-plans/.env-mapping.yml` (mapping file — created on first run if absent, never auto-overwritten thereafter)
- `{docs_repo}/test-plans/{feature}/dom-map.yml` (cache, append-only with overwrite confirmation)

**Returns to invoking skill:** a map of `step_text` → `selector | null` for every step in the input `unresolved_steps` list.

**Companion files:**
- `scripts/run-mapper.mjs` — the Playwright runner. Invoked by the skill; not run directly by the user.
- `references/heuristics.md` — selector-suggestion heuristics (text matching, class-name keywords, `data-testid` priority).

**Does NOT:**
- Navigate the UI on the user's behalf
- Auto-resolve selectors without user confirmation
- Modify TC files or spec files
- Commit, push, or merge the cache file (the user reviews and commits)
