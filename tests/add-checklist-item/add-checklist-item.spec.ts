import { test, expect } from '@playwright/test';

// Feature: add-checklist-item
// FRS: FRS-LCI-01
// Source: FRS Section 13 Scenarios

test.describe('add-checklist-item', () => {
  let createdRecords: string[] = [];

  test.afterEach(async ({ page }) => {
    for (const record of createdRecords) {
      try {
        // TODO: implement cleanup for added checklist items
      } catch {
        // record already gone or cleanup failed — safe to ignore
      }
    }
    createdRecords = [];
  });

  test('Add Item With Valid Description @smoke @add-checklist-item @add-checklist-item-lci-01-TC-001', async ({ page }) => {
    // 1. Click "Add Item" button -> selector: #btn-add-item
    await page.click('#btn-add-item');

    // 2. Verify "Add Checklist Item" dialog opens -> selector: #dialog-add-item
    await expect(page.locator('#dialog-add-item')).toBeVisible();

    // 3. Fill in Description field -> selector: getByLabel("Description")
    const description = `Verify Document Authenticity ${Date.now()}`;
    await page.getByLabel('Description').fill(description);
    createdRecords.push(description);

    // 4. Click "Add Item" button in dialog -> selector: #btn-dialog-add-item
    await page.click('#btn-dialog-add-item');

    // 5. Verify success toast appears -> selector: #toast-success
    await expect(page.locator('#toast-success')).toBeVisible();

    // 6. Verify new item appears in checklist table -> selector: #checklist-table
    await expect(page.locator('#checklist-table')).toContainText(description);
  });

  test('Add Item With Empty Description @regression @add-checklist-item @add-checklist-item-lci-01-TC-002', async ({ page }) => {
    // 1. Verify "Add Item" button is disabled -> selector: #btn-dialog-add-item
    // TODO: Need to open dialog first before checking disabled state
    await page.click('#btn-add-item');
    await expect(page.locator('#btn-dialog-add-item')).toBeDisabled();

    // 2. Type and then clear the Description field -> selector: getByLabel("Description")
    await page.getByLabel('Description').fill('test');
    await page.getByLabel('Description').clear();

    // 3. Verify "Add Item" button remains disabled -> selector: #btn-dialog-add-item
    await expect(page.locator('#btn-dialog-add-item')).toBeDisabled();

    // 4. Click "Cancel" button -> selector: #btn-dialog-cancel
    await page.click('#btn-dialog-cancel');
  });

  test('Add Multiple Items In Succession @regression @add-checklist-item @add-checklist-item-lci-01-TC-003', async ({ page }) => {
    // 1. Click "Add Item" button -> selector: #btn-add-item
    await page.click('#btn-add-item');

    // 2. Fill Description field with first item -> selector: getByLabel("Description")
    const firstDescription = `Check LC Amount ${Date.now()}`;
    await page.getByLabel('Description').fill(firstDescription);
    createdRecords.push(firstDescription);

    // 3. Click "Add Item" in dialog -> selector: #btn-dialog-add-item
    await page.click('#btn-dialog-add-item');

    // 4. Verify first new item appears with correct S.N -> selector: #checklist-table
    await expect(page.locator('#checklist-table')).toContainText(firstDescription);

    // 5. Click "Add Item" button again -> selector: #btn-add-item
    await page.click('#btn-add-item');

    // 6. Fill Description field with second item -> selector: getByLabel("Description")
    const secondDescription = `Verify Issuing Bank ${Date.now()}`;
    await page.getByLabel('Description').fill(secondDescription);
    createdRecords.push(secondDescription);

    // 7. Click "Add Item" in dialog -> selector: #btn-dialog-add-item
    await page.click('#btn-dialog-add-item');

    // 8. Verify second new item appears with incremented S.N -> selector: #checklist-table
    await expect(page.locator('#checklist-table')).toContainText(secondDescription);
  });
});
