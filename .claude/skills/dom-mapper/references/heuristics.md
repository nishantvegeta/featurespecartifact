# Selector Heuristics

How the mapper produces a *suggested* element from a step's text. Heuristics are suggestions only — every cache entry must be confirmed by the user. This file documents the rules so the skill, the script, and human reviewers stay aligned.

## Locator preference order

When the mapper captures the click target (or accepts a heuristic suggestion), it selects the most stable form available on that element. The order:

1. **`[data-testid="..."]`** — purpose-built for testing. Most stable. Survives class renames, structural changes, even text changes. Always preferred when present.
2. **`#id`** — stable if the ID is unique and follows the convention. Falls back to `[id="..."]` when the ID has characters that would break a CSS `#` selector.
3. **`[aria-label="..."]`** — accessible name. Stable as long as the label doesn't change. Better than role+name because it's directly addressable.
4. **`role=button[name="Save"]`** — Playwright role-based selector. Computed from the element's tag/role and visible text. Stable across class renames, but breaks when the visible label changes (e.g. localisation).
5. **CSS path** (`div.modal > button:nth-of-type(2)`) — last resort. Brittle. The mapper warns whenever it has to use one and suggests asking the UI team to add a `data-testid`.

The script's `bestLocatorFor()` walks this order and returns the first form that applies.

## Keyword extraction from step text

The heuristic suggester looks at the step text and extracts hint words to score elements against. Two extraction passes:

**Action keywords.** A fixed vocabulary of verbs that map to common UI actions:

```
save, cancel, close, search, reset, new, create, edit, delete,
export, preview, view, history, attachment
```

A step containing one of these words gets that word added as a hint, with a strong score boost when the same word appears in an element's `data-testid`, `id`, or class.

**Field nouns.** A regex pulls noun phrases that precede a UI-element word:

```
\b([a-z]+(?:\s+[a-z]+){0,3})\s+(?:field|input|button|icon|slot|placeholder|label|column|row|tab|section|message|toast|modal|dialog)
```

So *"Verify the capture image slot displays a placeholder"* yields the hints `capture image` (preceding "slot") and `placeholder`.

The hints are matched against element attributes in three forms — kebab-case, no-space, and substring of `innerText`. Kebab-case match scores highest because it's the convention's preferred form.

## Scoring

For each candidate element on the page:

- `+5` if any kebab-case hint matches `data-testid` / `id` / `aria-label` / `class` / `name`.
- `+4` if the no-space variant matches.
- `+2` if the hint appears in `innerText`.
- `+1` if the element is a tagname Playwright treats as interactive (`button`, `a`, `input`, `select`, `textarea`).
- `-10` if the element has zero width or height (off-screen, hidden).

The top-scoring candidate is the suggestion. If nothing scores positively, no suggestion is offered and the mapper goes straight to "click the element."

## When heuristics fail

The mapper's heuristic is deliberately simple — text/attribute matching, no machine learning, no LLM calls. It works well when:

- The DOM has `data-testid` attributes that contain the step text's keywords.
- Element classes or IDs include semantically-meaningful tokens (`btn-preview-trigger`, `capture-slot-placeholder`).
- Step text uses the same vocabulary as the UI labels.

It works poorly when:

- Class names are framework-generated (`ng-tns-c97-3 _ngcontent-abc-1`).
- The DOM has no `data-testid`, no semantic IDs, and labels are far from the interactive element.
- Step text describes behaviour rather than an element (*"Verify the modal animates open"* — there's no "animation" element).

When heuristics fail, the mapper falls through to user-click and the cache fills with whatever locator the user selects. Over time, the cache becomes a record of where heuristics succeed and where they don't — useful signal for the UI team about where convention compliance is paying off.

## What heuristics do NOT try to do

- **Disambiguate between similar elements.** If a page has three `Cancel` buttons, the heuristic picks one based on score and the user accepts or clicks a different one. The mapper doesn't try to figure out "the *right* Cancel" — that's the user's job.
- **Generalise across DOMs.** The heuristic operates on whatever DOM is currently rendered. It doesn't infer "this button probably appears as `#btn-cancel` everywhere" — each step is mapped independently.
- **Learn from past mappings.** No model training, no scoring updates from user choices. The heuristic is stateless. The cache is the only learning, and it's per-step-text.

## Extending the heuristic vocabulary

When new common actions or element words appear across the team's UIs, extend `HINT_WORDS` in `scripts/run-mapper.mjs` and document them here. Two rules:

1. **Add to action keywords only verbs that appear in `id-conventions.md`'s recognized-action list.** Keeping the two in sync means the heuristic score-boosts for the same words the convention recognises.
2. **Add to field nouns only words that name a *UI region or element type*** (`tab`, `modal`, `slot`) — not feature-specific words (`appointment`, `verification`). The heuristic stays generic that way.
