---
name: script-generator
description: Converts FRS Section 13 scenarios directly into a Playwright TypeScript test() function. Use when generating or regenerating Playwright test code from an approved FRS document. No TC file or bridge skill required — parses steps and selectors straight from FRS Section 13 format.
---

# Script Generator

Converts one **FRS Section 13 scenario** into one Playwright `test()` block.
One scenario per invocation.

## How to invoke

Read `.claude/skills/script-generator/references/action-to-playwright.md` for the full code mapping
table, value substitution rules, URL resolution, selector handling, auth override, and the
complete file template. Apply all rules from that file exactly.

## Input

**Scenario data** parsed directly from FRS Section 13. Each FRS step follows this format:

```
N. <step text> -> selector: <selector or n/a>
```

Parse into JSON before passing to the prompt:
- Split each step on ` -> selector: ` → left = `text`, right = `selector`
- Strip leading `N. ` from text
- `selector: n/a` → `"selector": "n/a"`
- `selector: #element-id` → `"selector": "#element-id"`
- `selector: getByLabel("Label Text")` → `"selector": "getByLabel(\"Label Text\")"`

**Parsed JSON format:**
```json
{
  "tc_number": "service-type-TC-001",
  "scenario_name": "Create Service Type (Happy Path)",
  "feature": "service-type",
  "tags": ["@smoke", "@service-type"],
  "steps": [
    { "number": 1, "text": "Navigate to /service-types", "selector": "n/a" },
    { "number": 2, "text": "Click \"New Service Type\" button", "selector": "#btn-new-service-type" },
    { "number": 3, "text": "Enter name in name field", "selector": "#service-type-name" },
    { "number": 4, "text": "Click \"Save\" button", "selector": "#btn-save" },
    { "number": 5, "text": "Verify success notification appears", "selector": "#service-type-success-notification" }
  ],
  "expected_result": ["A success notification appears", "The modal closes"],
  "test_data": [{ "Name": "Wire Transfer" }]
}
```

**FRS step → JSON parse examples:**
```
FRS:  1. Navigate to /service-types -> selector: n/a
JSON: { "number": 1, "text": "Navigate to /service-types", "selector": "n/a" }

FRS:  2. Click "New Service Type" button -> selector: #btn-new-service-type
JSON: { "number": 2, "text": "Click \"New Service Type\" button", "selector": "#btn-new-service-type" }

FRS:  3. Select Verification Method -> selector: getByLabel("Emergency Bypass")
JSON: { "number": 3, "text": "Select Verification Method", "selector": "getByLabel(\"Emergency Bypass\")" }

FRS:  4. Verify success notification appears -> selector: #service-type-success-notification
JSON: { "number": 4, "text": "Verify success notification appears", "selector": "#service-type-success-notification" }
```

Steps with `"selector": "n/a"` are navigation-only — use `page.goto()`.
Steps with `"selector": "getByLabel(\"...\")"` use `page.getByLabel()`.
Steps with `"selector": "#id"` use `page.locator()`, `page.click()`, or `page.fill()`.

## Prompt to send

```
Convert this FRS scenario into a single Playwright test() function.
Use TypeScript. Use exact selectors already embedded in each step — do not modify them.
Infer the Playwright action from the step text verb using the mapping in action-to-playwright.md.
Handle selectors: n/a → page.goto(url from step text), #id → page.locator/click/fill, getByLabel("text") → page.getByLabel('text').
Substitute test data values into fill steps by matching field names in step text.
Replace {timestamp} with ${Date.now()} in all test data values — use template literals.
For email/password fields use process.env.TEST_EMAIL! / process.env.TEST_PASSWORD!.
Add a comment above each step with the original FRS step text.
For null/missing selectors output: // TODO: selector not found — add ID to component before re-running.
For unrecognised actions output: // TODO: Manual step — "{original step text}".
Output ONLY the test() function — no imports, no describe block.

See action-to-playwright.md for the full action-to-code mapping.

TC: {TC_JSON}
```

## Expected output shape

The output is a single `test()` function block with no imports and no `describe()` wrapper.
The calling agent wraps it in a `test.describe()`, adds the import line, and writes the full file.

See the **Full file template** section in `action-to-playwright.md` for the complete file structure,
including the `createdRecords` array (declared at `describe()` scope, not inside `test()`),
the `afterEach` cleanup block, and the auth override comment.

```typescript
test('Create Service Type (Happy Path) @smoke @service-type @service-type-TC-001', async ({ page }) => {
  // 1. Navigate to /service-types -> selector: n/a
  await page.goto('/service-types');

  // 2. Click "New Service Type" button -> selector: #btn-new-service-type
  await page.click('#btn-new-service-type');

  // 3. Enter name in name field -> selector: #service-type-name
  const serviceName = `Wire Transfer ${Date.now()}`;
  await page.fill('#service-type-name', serviceName);
  createdRecords.push(serviceName);

  // 4. Click "Save" button -> selector: #btn-save
  await page.click('#btn-save');

  // 5. Verify success notification appears -> selector: #service-type-success-notification
  await expect(page.locator('#service-type-success-notification')).toBeVisible();
});
```

## Tag rules

- Append all tags from `scenario.tags[]` to the end of the test title string, space-separated.
- Always include `@[feature_name]` (e.g. `@service-type`) — derive from `feature` field.
- Always append `@{feature}-TC-00N` as the final tag — derive N from scenario number in FRS.
- Tags come from the FRS scenario **Tags:** field: `@smoke` or `@regression` — do not override.
- If `@skip` is present, emit `test.skip(...)` instead of `test(...)`.
- If `@flaky` is present, emit a comment above: `// FLAKY: known intermittent — investigate before fixing`.

```typescript
// @skip example
test.skip('scenario name @skip @service-type @service-type-TC-007', async ({ page }) => {
  // TODO: Skipped — @skip tag present. Reason: requires pre-existing data or known blocker.
});
```

## After receiving output

The calling agent wraps the block in a `test.describe()`, adds the import line,
and writes the full file to `tests/{feature}/{feature}.spec.ts`.
All 3 FRS scenarios go into one `test.describe()` block in one `.spec.ts` file.

## Rules

- Never fabricate selectors — use exactly what is written in the FRS step.
- `selector: n/a` → always `page.goto(url)` where url is extracted from step text.
- `selector: null` or missing → `// TODO: selector not found — add ID to component before re-running`
- `getByLabel("text")` → always `page.getByLabel('text')` — never `page.locator()`
- `action: unknown` → `// TODO: Manual step — "{original step text}"`
- Each test must be fully self-contained. No shared state between tests.
- Do not run the code. Generation only.
- Do not write files — calling agent does that.