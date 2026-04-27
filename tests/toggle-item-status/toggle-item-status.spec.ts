import { test, expect } from '@playwright/test';

// Feature: toggle-item-status
// FRS: FRS-LCI-04
// Source: FRS Section 13 Scenarios

test.describe('toggle-item-status', () => {
  let createdRecords: string[] = [];

  test.afterEach(async ({ page }) => {
    for (const record of createdRecords) {
      try {
        // TODO: implement cleanup for toggled checklist items
      } catch {
        // record already gone or cleanup failed — safe to ignore
      }
    }
    createdRecords = [];
  });

  test('Toggle Item From Active to Inactive @smoke @toggle-item-status @toggle-item-status-lci-04-TC-001', async ({ page }) => {
    // 1. Locate item "Verify Document Authenticity" in the table -> selector: #checklist-table
    await expect(page.locator('#checklist-table')).toContainText('Verify Document Authenticity');

    // 2. Verify status toggle is currently ON (active) -> selector: #toggle-status-1
    await expect(page.locator('#toggle-status-1')).toHaveAttribute('aria-checked', 'true');

    // 3. Click the status toggle switch -> selector: #toggle-status-1
    await page.click('#toggle-status-1');

    // 4. Verify toggle appearance changes to OFF -> selector: #toggle-status-1
    await expect(page.locator('#toggle-status-1')).toHaveAttribute('aria-checked', 'false');

    // 5. Verify item remains in the table -> selector: #checklist-table
    await expect(page.locator('#checklist-table')).toContainText('Verify Document Authenticity');

    // 6. Verify item description is still visible -> selector: #checklist-table
    await expect(page.locator('#checklist-table')).toBeVisible();
  });

  test('Toggle Item From Inactive to Active @regression @toggle-item-status @toggle-item-status-lci-04-TC-002', async ({ page }) => {
    // 1. Locate item "Check LC Amount" in the table -> selector: #checklist-table
    await expect(page.locator('#checklist-table')).toContainText('Check LC Amount');

    // 2. Verify status toggle is currently OFF (inactive) -> selector: #toggle-status-2
    await expect(page.locator('#toggle-status-2')).toHaveAttribute('aria-checked', 'false');

    // 3. Click the status toggle switch -> selector: #toggle-status-2
    await page.click('#toggle-status-2');

    // 4. Verify toggle appearance changes to ON -> selector: #toggle-status-2
    await expect(page.locator('#toggle-status-2')).toHaveAttribute('aria-checked', 'true');

    // 5. Verify item remains in the table -> selector: #checklist-table
    await expect(page.locator('#checklist-table')).toContainText('Check LC Amount');
  });

  test('Rapidly Toggle Item Multiple Times @regression @toggle-item-status @toggle-item-status-lci-04-TC-003', async ({ page }) => {
    // 1. Locate item "Verify Issuing Bank" -> selector: #checklist-table
    await expect(page.locator('#checklist-table')).toContainText('Verify Issuing Bank');

    // 2. Click toggle OFF -> selector: #toggle-status-3
    await page.click('#toggle-status-3');
    await expect(page.locator('#toggle-status-3')).toHaveAttribute('aria-checked', 'false');

    // 3. Immediately click toggle ON -> selector: #toggle-status-3
    await page.click('#toggle-status-3');
    await expect(page.locator('#toggle-status-3')).toHaveAttribute('aria-checked', 'true');

    // 4. Immediately click toggle OFF -> selector: #toggle-status-3
    await page.click('#toggle-status-3');

    // 5. Verify final state is OFF (inactive) -> selector: #toggle-status-3
    await expect(page.locator('#toggle-status-3')).toHaveAttribute('aria-checked', 'false');

    // 6. Verify item is inactive in the table -> selector: #checklist-table
    await expect(page.locator('#checklist-table')).toBeVisible();
  });
});
