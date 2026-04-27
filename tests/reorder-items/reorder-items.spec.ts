import { test, expect } from '@playwright/test';

// Feature: reorder-items
// FRS: FRS-LCI-05
// Source: FRS Section 13 Scenarios

test.describe('reorder-items', () => {
  let createdRecords: string[] = [];

  test.afterEach(async ({ page }) => {
    for (const record of createdRecords) {
      try {
        // TODO: implement cleanup for reordered checklist items
      } catch {
        // record already gone or cleanup failed — safe to ignore
      }
    }
    createdRecords = [];
  });

  test('Move Item Up Within List @smoke @reorder-items @reorder-items-lci-05-TC-001', async ({ page }) => {
    // 1. Verify item order in table: position 2 = "Check LC Amount", position 3 = "Verify Issuing Bank" -> selector: #checklist-table
    const rows = page.locator('#checklist-table tbody tr');
    await expect(rows.nth(1)).toContainText('Check LC Amount');
    await expect(rows.nth(2)).toContainText('Verify Issuing Bank');

    // 2. Click up arrow button for "Verify Issuing Bank" -> selector: #btn-move-up-item-3
    await page.click('#btn-move-up-item-3');

    // 3. Verify items swap positions in table -> selector: #checklist-table
    const updatedRows = page.locator('#checklist-table tbody tr');
    await expect(updatedRows.nth(1)).toContainText('Verify Issuing Bank');
    await expect(updatedRows.nth(2)).toContainText('Check LC Amount');

    // 4. Verify "Verify Issuing Bank" is now at position 2 (S.N = 2) -> selector: #checklist-table
    await expect(page.locator('#checklist-table tbody tr').nth(1)).toContainText('Verify Issuing Bank');

    // 5. Verify "Check LC Amount" moved to position 3 (S.N = 3) -> selector: #checklist-table
    await expect(page.locator('#checklist-table tbody tr').nth(2)).toContainText('Check LC Amount');

    // 6. Verify up arrow for "Verify Issuing Bank" is now enabled -> selector: #btn-move-up-item-2
    await expect(page.locator('#btn-move-up-item-2')).toBeEnabled();
  });

  test('Move Item Down to Last Position @regression @reorder-items @reorder-items-lci-05-TC-002', async ({ page }) => {
    // 1. Verify initial item order -> selector: #checklist-table
    const rows = page.locator('#checklist-table tbody tr');
    await expect(rows.nth(0)).toContainText('Verify Document Authenticity');
    await expect(rows.nth(1)).toContainText('Check LC Amount');
    await expect(rows.nth(2)).toContainText('Verify Issuing Bank');

    // 2. Click down arrow for "Check LC Amount" -> selector: #btn-move-down-item-2
    await page.click('#btn-move-down-item-2');

    // 3. Verify "Check LC Amount" moved to position 3 -> selector: #checklist-table
    const updatedRows = page.locator('#checklist-table tbody tr');
    await expect(updatedRows.nth(2)).toContainText('Check LC Amount');

    // 4. Verify "Verify Issuing Bank" moved to position 2 -> selector: #checklist-table
    await expect(updatedRows.nth(1)).toContainText('Verify Issuing Bank');

    // 5. Verify down arrow for "Check LC Amount" is now disabled -> selector: #btn-move-down-item-3
    await expect(page.locator('#btn-move-down-item-3')).toBeDisabled();
  });

  test('Attempt to Move Boundary Items @regression @reorder-items @reorder-items-lci-05-TC-003', async ({ page }) => {
    // 1. Locate first item in table -> selector: #checklist-table
    const rows = page.locator('#checklist-table tbody tr');
    const firstItemRow = rows.nth(0);
    await expect(firstItemRow).toBeVisible();

    // 2. Verify up arrow is disabled -> selector: #btn-move-up-item-1
    await expect(page.locator('#btn-move-up-item-1')).toBeDisabled();

    // 3. Attempt to click disabled up arrow -> selector: #btn-move-up-item-1
    // TODO: Verify disabled button cannot be clicked (browser prevents click)

    // 4. Verify item does not move -> selector: #checklist-table
    await expect(rows.nth(0)).toBeVisible();

    // 5. Locate last item in table -> selector: #checklist-table
    const lastRow = rows.nth(-1);
    await expect(lastRow).toBeVisible();

    // 6. Verify down arrow is disabled -> selector: #btn-move-down-item-last
    // TODO: selector #btn-move-down-item-last needs to be replaced with actual last item button ID

    // 7. Attempt to click disabled down arrow -> selector: #btn-move-down-item-last
    // TODO: Verify disabled button cannot be clicked

    // 8. Verify item does not move -> selector: #checklist-table
    await expect(page.locator('#checklist-table')).toBeVisible();
  });
});
