# Action to Playwright Code Mapping

Converts each step `action` type into executable Playwright TypeScript.

## Code mapping table

| Action | Playwright code |
|---|---|
| `navigate` | `await page.goto('{url}');` |
| `fill` | `await page.fill('{selector}', '{value}');` |
| `click` | `await page.click('{selector}');` |
| `assert_url` | `await expect(page).toHaveURL('{url}');` |
| `assert_visible` | `await expect(page.locator('{selector}')).toBeVisible();` |
| `assert_text` | `await expect(page.locator('{selector}')).toContainText('{value}');` |
| `unknown` | `// TODO: Manual step required — "{original step text}"` |

## Value substitution for `fill`

| Step value | Playwright value |
|---|---|
| `"valid_email"` | `process.env.TEST_EMAIL!` |
| `"valid_password"` | `process.env.TEST_PASSWORD!` |
| `"invalid_email"` | `'invalid@test.com'` |
| `"invalid_password"` | `'wrongpassword123'` |
| Any other string | Use the string literally |
| `null` | Omit value argument |

## URL resolution for `navigate` and `assert_url`

Look up the target in `selector_map`:
- `selector_map[target].url` → use as the URL
- If the URL starts with `/`, use as a relative path (Playwright baseURL handles it)
- If the URL is absolute (`https://...`), use as-is

## Selector resolution for element actions

Look up the target in `selector_map`:
- `selector_map[target].selector` → use as the CSS selector
- If `selector` is `null` → emit a TODO comment, do not generate broken code

## Null/unknown handling

```typescript
// selector: null
// TODO: selector not found for 'targetName' — map this element before re-running

// action: unknown
// TODO: Manual step required — "original Gherkin step text here"
// Action type could not be inferred. Implement this step manually.
```

## Role-based selector syntax

When the selector_map contains a role-based selector (e.g. from dom-mapper),
use `page.getByRole()` instead of `page.locator()`:

| Selector map value | Generated code |
|---|---|
| `role=button[name='Sign In']` | `await page.getByRole('button', { name: 'Sign In' }).click();` |
| `role=textbox[name='Username']` | `await page.fill` → use `page.getByRole('textbox', { name: 'Username' }).fill(...)` |
| CSS selector (starts with `#`, `.`, `[`, tag) | `page.locator('{selector}')` or `page.fill('{selector}', ...)` |

## Auth override for login tests

Any test that navigates to a login page AND fills credentials MUST include:

```typescript
test.use({ storageState: { cookies: [], origins: [] } });
```

Place this inside the `test.describe()` block, before the `test()` call.
Without this, the global `storageState` in `playwright.config.ts` will
pre-authenticate the session and the login form will never be shown.

## Wait strategy for SSO / OAuth redirects

After clicking a login button that triggers an OAuth/SSO flow, use:

```typescript
await page.waitForURL(url => !url.href.includes('/sso/'), { timeout: 15000 });
await page.waitForLoadState('networkidle');
```

Do NOT use `toHaveURL` immediately after the click — the OAuth redirect
chain may land on intermediate URLs before the final destination.

## Full file template

```typescript
import { test, expect } from '@playwright/test';

// Feature: {feature_name}
// Source: {source_file}

test.describe('{feature_name}', () => {
  // Include only for login/auth tests:
  // test.use({ storageState: { cookies: [], origins: [] } });

  // Track records created during each test for cleanup
  let createdRecords: string[] = [];

  test.afterEach(async ({ page }) => {
    // Clean up any records created during this test
    // Swallow errors gracefully — do not fail the test if cleanup fails
    for (const record of createdRecords) {
      try {
        // TODO: implement cleanup for this feature's record type
        // Example: search for `record`, click Delete, confirm
      } catch {
        // record already gone or cleanup failed — safe to ignore
      }
    }
    createdRecords = [];
  });

  test('{scenario_name} @{feature_tag} @smoke @{feature}-TC-001', async ({ page }) => {
    // {keyword} {step text}
    // ... generated steps
    // After creating a record: createdRecords.push(createdName);
  });

});
```

## afterEach cleanup rules

- Always emit the `createdRecords` array and `afterEach` block in every generated file.
- After any step that creates a record (e.g. clicking Save on a create form), add: `createdRecords.push(createdName);`
- Use a timestamped unique name for all test-created records: `` `TC001 ${Date.now()}` ``
- The `afterEach` cleanup body is a `// TODO` — the script-writer agent fills in the real delete steps using the selector map.
- If the feature has no create/delete operations, keep the `afterEach` block but leave the body as a comment.
