import { test, expect } from '@playwright/test';
import { apiClient, hasCredentials, signIn } from './helpers';

test.skip(!hasCredentials, 'Set E2E_ADMIN_PASSWORD to run the admin E2E suite');

test('a manager finds a paid order, ships it with tracking and marks it delivered', async ({
  page,
}) => {
  const api = await apiClient();
  const product = await api.createProduct();
  const order = await api.paidOrder(product.variants[0].id);

  await signIn(page, 'manager');
  await page.goto('/orders');
  await page.getByLabel('Search orders').fill(order.invoice_number);
  await page.getByLabel('Search orders').press('Enter');
  await page.getByRole('link', { name: order.invoice_number }).click();

  await expect(page.getByRole('heading', { name: order.invoice_number })).toBeVisible();
  await expect(page.getByText(product.name)).toBeVisible();

  await page.getByRole('button', { name: 'Mark as shipped' }).click();
  const dialog = page.getByRole('dialog', { name: 'Mark as shipped' });
  await dialog.getByRole('button', { name: 'Mark as shipped' }).click();
  await expect(dialog.getByText(/Enter the tracking number/)).toBeVisible();
  await dialog.getByLabel('Tracking number').fill('RR123456789LK');
  await dialog.getByRole('button', { name: 'Mark as shipped' }).click();

  await expect(page.getByText(`${order.invoice_number} is now shipped`)).toBeVisible();
  await expect(page.getByText('RR123456789LK')).toBeVisible();

  await page.getByRole('button', { name: 'Mark as delivered' }).click();
  await page
    .getByRole('dialog', { name: 'Mark as delivered' })
    .getByRole('button', { name: 'Mark as delivered' })
    .click();
  await expect(page.getByText('No further changes are possible.')).toBeVisible();

  await api.archiveProduct(product.id);
  await api.dispose();
});

test('cancelling a paid order restocks it and reports the refund', async ({ page }) => {
  const api = await apiClient();
  const product = await api.createProduct();
  const order = await api.paidOrder(product.variants[0].id, { quantity: 2 });

  await signIn(page, 'manager');
  await page.goto(`/orders/${order.id}`);
  await page.getByRole('button', { name: 'Cancel order' }).click();
  const dialog = page.getByRole('dialog', { name: 'Cancel order' });
  await expect(dialog).toContainText('go back into stock');
  await dialog.getByRole('button', { name: 'Cancel order' }).click();

  await expect(page.getByText(/Refunded LKR/)).toBeVisible();
  await page.goto(`/inventory?search=${product.variants[0].sku}`);
  const row = page.getByRole('row').filter({ hasText: product.variants[0].sku });
  await expect(row.getByRole('cell').nth(2)).toHaveText('10');

  await api.archiveProduct(product.id);
  await api.dispose();
});
