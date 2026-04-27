import { test, expect } from '@playwright/test';

// Feature: Checklist
// Use case: reorder
// Source: docs/wiki/test-plans/checklist/reorder/

test.describe('Checklist — Reorder', () => {
  let createdRecords: string[] = [];

  test.afterEach(async ({ page }) => {
    for (const record of createdRecords) {
      try {
        // TODO: implement cleanup for this feature's record type
      } catch {
        // record already gone or cleanup failed — safe to ignore
      }
    }
    createdRecords = [];
  });

  test('Reorder Items — Move Up (Happy Path) @smoke @checklist @checklist-TC-009', async ({ page }) => {
    // Step 1: Locate second item in table
    await expect(page.locator('[data-testid="checklist-row-{item.id}"]')).toBeVisible();
    // Expected: Row visible with S.N = 2
    // NOTE: {item.id} is dynamic — resolve at runtime

    // Step 2: Click "Move Up" button
    await page.locator('[data-testid="checklist-move-up-{item.id}"]').click();
    // Expected: Button is enabled (not at top)

    // Step 3: Verify item moved up
    await expect(page.locator('[data-testid="checklist-sn-{item.id}"]')).toContainText('1');
    // Expected: Item S.N changes to 1

    // Step 4: Verify previous first item moved down
    // TODO: selector not found for step 4 — (discovered by explorer)
    // Expected: Original first item now shows S.N = 2

    // Step 5: Verify up button now disabled
    await expect(page.locator('[data-testid="checklist-move-up-{item.id}"]')).toBeDisabled();
    // Expected: Up button disabled on newly-first item

    // Step 6: Verify down button enabled
    await expect(page.locator('[data-testid="checklist-move-down-{item.id}"]')).not.toBeDisabled();
    // Expected: Down button now enabled for reordering back
  });

  test('Reorder Items — Move Down (Happy Path) @smoke @checklist @checklist-TC-010', async ({ page }) => {
    // Step 1: Locate item before last in table
    await expect(page.locator('[data-testid="checklist-row-{item.id}"]')).toBeVisible();
    // Expected: Row visible with S.N = (N-1) where N = total items
    // NOTE: {item.id} is dynamic — resolve at runtime

    // Step 2: Click "Move Down" button
    await page.locator('[data-testid="checklist-move-down-{item.id}"]').click();
    // Expected: Button is enabled (not at bottom)

    // Step 3: Verify item moved down
    const snBefore = await page.locator('[data-testid="checklist-sn-{item.id}"]').innerText();
    const snAfter = parseInt(snBefore, 10) + 1;
    await expect(page.locator('[data-testid="checklist-sn-{item.id}"]')).toContainText(snAfter.toString());
    // Expected: Item S.N increases by 1

    // Step 4: Verify previous next item moved up
    // TODO: selector not found for step 4 — (discovered by explorer)
    // Expected: Original next item S.N decreases by 1

    // Step 5: Verify down button now disabled
    await expect(page.locator('[data-testid="checklist-move-down-{item.id}"]')).toBeDisabled();
    // Expected: Down button disabled on newly-last item

    // Step 6: Verify up button enabled
    await expect(page.locator('[data-testid="checklist-move-up-{item.id}"]')).not.toBeDisabled();
    // Expected: Up button now enabled for reordering back
  });
});
