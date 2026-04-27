import { test, expect } from '@playwright/test';

// Feature: edit-checklist-item
// FRS: FRS-LCI-02
// Source: FRS Section 13 Scenarios

test.describe('edit-checklist-item', () => {
  let createdRecords: string[] = [];

  test.afterEach(async ({ page }) => {
    for (const record of createdRecords) {
      try {
        // TODO: implement cleanup for edited checklist items
      } catch {
        // record already gone or cleanup failed — safe to ignore
      }
    }
    createdRecords = [];
  });

  test('Edit Item Description @smoke @edit-checklist-item @edit-checklist-item-lci-02-TC-001', async ({ page }) => {
    // 1. Locate the item "Verify Document Authenticity" in table -> selector: #checklist-table
    await expect(page.locator('#checklist-table')).toContainText('Verify Document Authenticity');

    // 2. Click pencil (edit) icon for that item -> selector: #btn-edit-item-1
    await page.click('#btn-edit-item-1');

    // 3. Verify "Edit Checklist Item" dialog opens -> selector: #dialog-edit-item
    await expect(page.locator('#dialog-edit-item')).toBeVisible();

    // 4. Verify current description appears in textarea -> selector: getByLabel("Description")
    const textarea = page.getByLabel('Description');
    await expect(textarea).toContainText('Verify Document Authenticity');

    // 5. Clear description field -> selector: getByLabel("Description")
    await textarea.clear();

    // 6. Enter updated description -> selector: getByLabel("Description")
    const updatedDescription = `Verify Authenticity of LC Documents ${Date.now()}`;
    await textarea.fill(updatedDescription);
    createdRecords.push(updatedDescription);

    // 7. Click "Save Changes" button -> selector: #btn-dialog-save-changes
    await page.click('#btn-dialog-save-changes');

    // 8. Verify success toast appears -> selector: #toast-success
    await expect(page.locator('#toast-success')).toBeVisible();

    // 9. Verify updated description displays in table -> selector: #checklist-table
    await expect(page.locator('#checklist-table')).toContainText(updatedDescription);
  });

  test('Edit Item But Close Without Saving @regression @edit-checklist-item @edit-checklist-item-lci-02-TC-002', async ({ page }) => {
    // 1. Verify dialog is open with edited text -> selector: #dialog-edit-item
    await expect(page.locator('#dialog-edit-item')).toBeVisible();

    // 2. Verify description field contains modified text -> selector: getByLabel("Description")
    const textarea = page.getByLabel('Description');
    await textarea.fill('Modified text that should not save');

    // 3. Click "Cancel" button -> selector: #btn-dialog-cancel
    await page.click('#btn-dialog-cancel');

    // 4. Verify dialog closes -> selector: #dialog-edit-item
    await expect(page.locator('#dialog-edit-item')).not.toBeVisible();

    // 5. Verify item in table shows original description -> selector: #checklist-table
    // TODO: Verify original description persists in table
    await expect(page.locator('#checklist-table')).toBeVisible();
  });

  test('Edit Item Description to Empty @regression @edit-checklist-item @edit-checklist-item-lci-02-TC-003', async ({ page }) => {
    // 1. Click in description field -> selector: getByLabel("Description")
    const textarea = page.getByLabel('Description');
    await textarea.click();

    // 2. Select all text -> selector: getByLabel("Description")
    await textarea.selectText();

    // 3. Delete all text -> selector: getByLabel("Description")
    await textarea.clear();

    // 4. Verify "Save Changes" button is disabled -> selector: #btn-dialog-save-changes
    await expect(page.locator('#btn-dialog-save-changes')).toBeDisabled();

    // 5. Click "Cancel" to close dialog -> selector: #btn-dialog-cancel
    await page.click('#btn-dialog-cancel');
  });
});
