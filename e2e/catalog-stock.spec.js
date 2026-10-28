import { test, expect } from '@playwright/test';
import { hasCredentials, signIn, unique } from './helpers';

test.skip(!hasCredentials, 'Set E2E_ADMIN_PASSWORD to run the admin E2E suite');

test('a manager adds a product, restocks a size, archives and deletes it', async ({ page }) => {
  const name = unique('E2E Linen Shirt');
  await signIn(page, 'manager');

  await page.goto('/products/new');
  await page.getByLabel('Product name').fill(name);
  await page.getByLabel('Category').selectOption({ index: 1 });
  await page.getByLabel('Price (LKR)').fill('5200');
  await page.getByLabel('Size', { exact: true }).fill('M');
  await page.getByLabel('Colour', { exact: true }).fill('Sand');
  await page.getByLabel('Opening stock').fill('3');
  await page.getByRole('button', { name: 'Save product' }).click();

  await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();
  await expect(page.locator('.order-status')).toContainText('3 available');

  await page.getByRole('link', { name: 'Adjust stock' }).click();
  await page.getByRole('button', { name: /^Adjust stock for/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Quantity').fill('7');
  await dialog.getByLabel('Note (optional)').fill('E2E delivery');
  await dialog.getByRole('button', { name: 'Save adjustment' }).click();
  await expect(page.getByText(/added 7, 10 on hand/)).toBeVisible();

  await page.getByRole('button', { name: /^Stock history for/ }).click();
  await expect(page.getByRole('dialog').getByText('restock: E2E delivery')).toBeVisible();
  await expect(page.getByRole('dialog').getByText('opening stock')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();

  await page.getByRole('link', { name }).click();
  await page.getByRole('button', { name: 'Archive' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Archive' }).click();
  await expect(page.getByText('Product archived')).toBeVisible();

  await page.getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Delete permanently' }).click();
  await expect(page).toHaveURL(/\/products$/);
  await expect(page.getByText(`${name} was deleted`)).toBeVisible();
});
