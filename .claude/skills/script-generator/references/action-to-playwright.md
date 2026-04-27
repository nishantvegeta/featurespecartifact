# Action to Playwright Code Mapping

Converts each FRS Section 13 step into executable Playwright TypeScript.
Steps come directly from the FRS — no TC file needed.

---

## FRS Step Format

Every FRS step follows:
```
N. <step text> -> selector: <selector or n/a>
```

Split on ` -> selector: ` to get `text` and `selector`.

---

## Selector Types

| Selector value | How to use |
|---|---|
| `n/a` | Navigation — extract URL from step text → `page.goto('/route')` |
| `#element-id` | CSS ID — `page.locator()` / `page.click()` / `page.fill()` |
| `getByLabel("Text")` | Label-based — `page.getByLabel('Text')` |
| `null` / missing | Emit TODO — do not generate broken code |

---

## Action inference — step verb → Playwright action

| Step verb / pattern | Action |
|---|---|
| `Navigate to /route` | `navigate` |
| `Fill in the ...` | `fill` |
| `Enter ... in ...` | `fill` |
| `Click "..." button` | `click` |
| `Click "..." link` | `click` |
| `Select ...` | `click` |
| `Submit the form` | `click` |
| `Toggle ...` | `click` |
| `Verify ... visible` | `assert_visible` |
| `Verify ... displays` | `assert_visible` |
| `Verify ... loads` | `assert_visible` |
| `Verify ... appears` | `assert_visible` |
| `Verify ... not visible` | `assert_hidden` |
| `Verify ... message` | `assert_text` |
| `Verify ... contains` | `assert_text` |
| `Observe ...` | `assert_visible` |
| `Leave ... empty` | `skip` |
| Unrecognised verb | `unknown` |

---

## Code mapping table

| Action | Selector type | Playwright code |
|---|---|---|
| `navigate` | `n/a` | `await page.goto('{url}');` |
| `fill` | `#id` | `await page.fill('{selector}', '{value}');` |
| `fill` | `getByLabel` | `await page.getByLabel('{label}').fill('{value}');` |
| `click` | `#id` | `await page.click('{selector}');` |
| `click` | `getByLabel` | `await page.getByLabel('{label}').click();` |
| `assert_visible` | `#id` | `await expect(page.locator('{selector}')).toBeVisible();` |
| `assert_visible` | `getByLabel` | `await expect(page.getByLabel('{label}')).toBeVisible();` |
| `assert_hidden` | `#id` | `await expect(page.locator('{selector}')).toBeHidden();` |
| `assert_text` | `#id` | `await expect(page.locator('{selector}')).toContainText('{value}');` |
| `assert_url` | `n/a` | `await expect(page).toHaveURL('{url}');` |
| `skip` | any | `// Intentionally leaving field empty — no action` |
| `unknown` | any | `// TODO: Manual step — "{original step text}"` |

---

## URL resolution for navigate steps

Extract URL from step text after `Navigate to `:

```
"Navigate to /service-types"          →  await page.goto('/service-types');
"Navigate to /account-unblocker/create" →  await page.goto('/account-unblocker/create');
```

Starts with `/` → relative path (Playwright baseURL handles it).
Starts with `https://` → use as-is.

---

## getByLabel syntax

Selector `getByLabel("Label Text")` — extract label from between quotes:

```typescript
// click
await page.getByLabel('Emergency Bypass').click();

// fill
await page.getByLabel('Description').fill('some value');

// assert visible
await expect(page.getByLabel('Emergency Bypass')).toBeVisible();
```

Never use `page.locator()` with a getByLabel selector — always use `page.getByLabel()`.

---

## Value substitution for fill steps

Match test data to fill steps by field name in step text:

| Test data value | Playwright value |
|---|---|
| Contains `{timestamp}` | Replace with `${Date.now()}` — use template literal |
| Email field / `valid_email` | `process.env.TEST_EMAIL!` |
| Password field / `valid_password` | `process.env.TEST_PASSWORD!` |
| `invalid_email` | `'invalid@test.com'` |
| `invalid_password` | `'wrongpassword123'` |
| Any concrete string | Use literally |
| No matching test data | Use `''` and add TODO comment |

### Example

```
Test Data:
  - Account Number: 8888888888
  - Customer Name: TC001 Customer {timestamp}

Step: "Fill in the Account Number field" → '8888888888'
Step: "Fill in the Customer Name field" → `TC001 Customer ${Date.now()}`
```

---

## Null / unknown handling

```typescript
// Missing selector
// TODO: selector not found for 'element-name' — add ID to component before re-running

// Unrecognised action verb
// TODO: Manual step — "original step text here"
// Action verb could not be inferred. Implement this step manually.

// Concurrent user / multi-session step
// TODO: Manual step — "Second user performs action in separate session"
// Requires second browser context or API call — implement manually.

// Leave field empty (intentional)
// Intentionally leaving field empty — no Playwright action
```

---

## Role-based selector syntax

| Selector value | Generated code |
|---|---|
| `role=button[name='Sign In']` | `await page.getByRole('button', { name: 'Sign In' }).click();` |
| `role=textbox[name='Username']` | `await page.getByRole('textbox', { name: 'Username' }).fill(value);` |
| `#id` | `page.locator('#id')` / `page.click('#id')` / `page.fill('#id', value)` |
| `getByLabel("text")` | `page.getByLabel('text')` |

Default to `#id`. Use `getByLabel()` only when selector field explicitly contains `getByLabel(...)`.

---

## Auth override for login tests

Any test navigating to a login page AND filling credentials MUST include:

```typescript
test.use({ storageState: { cookies: [], origins: [] } });
```

Place inside `test.describe()` before `test()`. Without this, global `storageState` in `playwright.config.ts` pre-authenticates and login form is never shown.

---

## Wait strategy for SSO / OAuth redirects

After clicking a login button that triggers OAuth/SSO:

```typescript
await page.waitForURL(url => !url.href.includes('/sso/'), { timeout: 15000 });
await page.waitForLoadState('networkidle');
```

Do NOT use `toHaveURL` immediately after click — OAuth redirect lands on intermediate URLs.

---

## afterEach cleanup rules

- Always emit `createdRecords` array and `afterEach` block in every file.
- After any step creating a record (Save / Submit on a create form): `createdRecords.push(createdName);`
- Unique names: `` `TC001 ${Date.now()}` ``
- `afterEach` cleanup body is `// TODO` — implement delete steps using component selectors.
- No create/delete operations → keep `afterEach` block with comment body only.

---

## Full file template

```typescript
import { test, expect } from '@playwright/test';

// Feature: {feature_name}
// FRS: {frs_id}
// Source: FRS Section 13 Scenarios

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

  // Scenario 1 — Success (@smoke)
  test('{scenario_name} @smoke @{feature} @{feature}-TC-001', async ({ page }) => {
    // steps...
  });

  // Scenario 2 — Edge/Variation (@regression)
  test('{scenario_name} @regression @{feature} @{feature}-TC-002', async ({ page }) => {
    // steps...
  });

  // Scenario 3 — Failure/Exception (@regression)
  test('{scenario_name} @regression @{feature} @{feature}-TC-003', async ({ page }) => {
    // steps...
  });

});
```

---

## Complete example — FRS → Playwright

### FRS Section 13 input (Scenario 1)

```markdown
1. Navigate to /account-unblocker/create -> selector: n/a
2. Fill in the Account Number field -> selector: #form-account-number-input
3. Fill in the Customer Name field -> selector: #form-customer-name-input
4. Fill in the Registered Phone Number field -> selector: #form-registered-phone-input
5. Select Services to Unblock -> selector: #form-service-checkbox-CLIENT_ACCOUNT
6. Select Verification Method -> selector: getByLabel("Emergency Bypass")
7. Fill in the Emergency Reason field -> selector: #form-emergency-reason-input
8. Submit the form -> selector: #form-submit-btn
9. Verify request appears in the list -> selector: #unblock-request-table

Test Data:
- Account Number: 8888888888
- Customer Name: TC001 Customer {timestamp}
- Registered Phone Number: TC001 Phone {timestamp}
- Emergency Reason: TC001 Reason {timestamp}
```

### Generated test() block

```typescript
test('Submit Unblock Request (Successful Flow) @smoke @account-unblocker @account-unblocker-TC-001', async ({ page }) => {
  // 1. Navigate to /account-unblocker/create -> selector: n/a
  await page.goto('/account-unblocker/create');

  // 2. Fill in the Account Number field -> selector: #form-account-number-input
  await page.fill('#form-account-number-input', '8888888888');

  // 3. Fill in the Customer Name field -> selector: #form-customer-name-input
  const customerName = `TC001 Customer ${Date.now()}`;
  await page.fill('#form-customer-name-input', customerName);
  createdRecords.push(customerName);

  // 4. Fill in the Registered Phone Number field -> selector: #form-registered-phone-input
  await page.fill('#form-registered-phone-input', `TC001 Phone ${Date.now()}`);

  // 5. Select Services to Unblock -> selector: #form-service-checkbox-CLIENT_ACCOUNT
  await page.click('#form-service-checkbox-CLIENT_ACCOUNT');

  // 6. Select Verification Method -> selector: getByLabel("Emergency Bypass")
  await page.getByLabel('Emergency Bypass').click();

  // 7. Fill in the Emergency Reason field -> selector: #form-emergency-reason-input
  await page.fill('#form-emergency-reason-input', `TC001 Reason ${Date.now()}`);

  // 8. Submit the form -> selector: #form-submit-btn
  await page.click('#form-submit-btn');

  // 9. Verify request appears in the list -> selector: #unblock-request-table
  await expect(page.locator('#unblock-request-table')).toBeVisible();
});
```