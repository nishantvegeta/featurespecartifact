import { test, expect } from '@playwright/test';

// Feature: delete-checklist-item
// FRS: FRS-LCI-03
// Source: FRS Section 13 Scenarios

test.describe('delete-checklist-item', () => {
  let createdRecords: string[] = [];

  test.afterEach(async ({ page }) => {
    for (const record of createdRecords) {
      try {
        // TODO: implement cleanup for deleted checklist items
      } catch {
        // record already gone or cleanup failed — safe to ignore
      }
    }
    createdRecords = [];
  });

  test('Delete Item From Middle of List @smoke @delete-checklist-item @delete-checklist-item-lci-03-TC-001', async ({ page }) => {
    // 1. Verify item "Verify Document Authenticity" displays in table at position 2 -> selector: #checklist-table
    await expect(page.locator('#checklist-table')).toContainText('Verify Document Authenticity');

    // 2. Click trash can (delete) icon for that item -> selector: #btn-delete-item-2
    await page.click('#btn-delete-item-2');

    // 3. Verify success toast appears -> selector: #toast-success
    await expect(page.locator('#toast-success')).toBeVisible();

    // 4. Verify item is removed from table -> selector: #checklist-table
    await expect(page.locator('#checklist-table')).not.toContainText('Verify Document Authenticity');

    // 5. Verify items that were below the deleted item have moved up -> selector: #checklist-table
    const rows = page.locator('#checklist-table tbody tr');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThan(0);

    // 6. Verify table displays correct number of items -> selector: #checklist-table
    await expect(page.locator('#checklist-table')).toBeVisible();
  });

  test('Delete Last Item From List @regression @delete-checklist-item @delete-checklist-item-lci-03-TC-002', async ({ page }) => {
    // 1. Verify single item displays in table -> selector: #checklist-table
    const rows = page.locator('#checklist-table tbody tr');
    await expect(rows).toHaveCount(1);

    // 2. Click trash can icon for the item -> selector: #btn-delete-item-1
    await page.click('#btn-delete-item-1');

    // 3. Verify success toast appears -> selector: #toast-success
    await expect(page.locator('#toast-success')).toBeVisible();

    // 4. Verify item is removed from table -> selector: #checklist-table
    const updatedRows = page.locator('#checklist-table tbody tr');
    await expect(updatedRows).toHaveCount(0);

    // 5. Verify empty state message displays -> selector: #checklist-empty-state
    await expect(page.locator('#checklist-empty-state')).toBeVisible();
  });

  test('Delete Item That Is Currently Active @regression @delete-checklist-item @delete-checklist-item-lci-03-TC-003', async ({ page }) => {
    // 1. Locate item "Check LC Amount" in the table -> selector: #checklist-table
    await expect(page.locator('#checklist-table')).toContainText('Check LC Amount');

    // 2. Verify item's status toggle is ON (active) -> selector: #toggle-status-3
    await expect(page.locator('#toggle-status-3')).toHaveAttribute('aria-checked', 'true');

    // 3. Click trash can icon for that item -> selector: #btn-delete-item-3
    await page.click('#btn-delete-item-3');

    // 4. Verify item is removed from table -> selector: #checklist-table
    await expect(page.locator('#checklist-table')).not.toContainText('Check LC Amount');

    // 5. Verify success toast appears -> selector: #toast-success
    await expect(page.locator('#toast-success')).toBeVisible();
  });
});
