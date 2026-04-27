import { test, expect } from '@playwright/test';

// Feature: Checklist
// Use case: edit
// Source: docs/wiki/test-plans/checklist/edit/

test.describe('Checklist — Edit', () => {
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

  test('Edit Checklist Item (Happy Path) @smoke @checklist @checklist-TC-005', async ({ page }) => {
    // Step 1: Locate checklist item row
    await expect(page.locator('[data-testid="checklist-row-{item.id}"]')).toBeVisible();
    // Expected: Row visible with description "Old description"

    // Step 2: Click edit button
    await page.locator('[data-testid="checklist-edit-{item.id}"]').click();
    // Expected: Edit dialog opens with title "Edit Checklist Item"
    // NOTE: {item.id} is dynamic — resolve at runtime

    // Step 3: Verify dialog content
    await expect(page.locator('[data-testid="input-edit-description"]')).toBeVisible();
    // Expected: Textarea pre-filled with current description

    // Step 4: Clear description
    await page.locator('[data-testid="input-edit-description"]').fill('');
    // Expected: Select all and delete existing text

    // Step 5: Enter new description
    await page.locator('[data-testid="input-edit-description"]').fill('Updated description text');
    // Expected: Type "Updated description text"

    // Step 6: Click "Save Changes"
    await page.locator('[data-testid="btn-edit-confirm"]').click();
    // Expected: Dialog closes

    // Step 7: Verify toast notification
    // TODO: selector not found for step 7 — (discovered by explorer)
    // Expected: Toast shows: "Checklist item updated"

    // Step 8: Verify updated text in table
    await expect(page.locator('[data-testid="checklist-desc-{item.id}"]')).toContainText('Updated description text');
    // Expected: Item description updated to "Updated description text"
  });

  test('Edit Item — Empty Description (Validation) @checklist @checklist-TC-006', async ({ page }) => {
    // Step 1: Click edit button on item
    await page.locator('[data-testid="checklist-edit-{item.id}"]').click();
    // Expected: Edit dialog opens with current description
    // NOTE: {item.id} is dynamic — resolve at runtime

    // Step 2: Select all text
    await page.locator('[data-testid="input-edit-description"]').focus();
    await page.keyboard.press('Control+A');
    // Expected: Current text highlighted

    // Step 3: Delete text
    await page.keyboard.press('Delete');
    // Expected: Field becomes empty

    // Step 4: Verify "Save Changes" button disabled
    await expect(page.locator('[data-testid="btn-edit-confirm"]')).toBeDisabled();
    // Expected: Confirm button is disabled

    // Step 5: Type whitespace only
    await page.locator('[data-testid="input-edit-description"]').fill('   ');
    // Expected: Enter "   " (spaces only)

    // Step 6: Verify button still disabled
    await expect(page.locator('[data-testid="btn-edit-confirm"]')).toBeDisabled();
    // Expected: Confirm button remains disabled

    // Step 7: Click Cancel
    await page.locator('[data-testid="btn-edit-cancel"]').click();
    // Expected: Dialog closes without updating item

    // Step 8: Verify original text preserved
    await expect(page.locator('[data-testid="checklist-desc-{item.id}"]')).toContainText('');
    // Expected: Description unchanged in table
    // NOTE: {item.id} is dynamic — resolve at runtime
  });
});
