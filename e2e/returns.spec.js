import { test, expect } from '@playwright/test';
import { apiClient, hasCredentials, signIn } from './helpers';

test.skip(!hasCredentials, 'Set E2E_ADMIN_PASSWORD to run the admin E2E suite');

test('a manager approves a return, inspects the parcel and the customer is refunded', async ({
  page,
}) => {
  const api = await apiClient();
  const product = await api.createProduct();
  const shopper = await api.registerCustomer();
  const order = await api.paidOrder(product.variants[0].id, { customerToken: shopper.token });
  await api.setOrderStatus(order.id, 'shipped', 'RR000000001LK');
  await api.setOrderStatus(order.id, 'delivered');
  const request = await api.requestReturn(shopper.token, order.items[0].id);

  await signIn(page, 'manager');
  await page.goto('/returns?status=requested');
  await page.getByRole('link', { name: `Return #${request.id ?? request.return_id}` }).click();

  await page.getByRole('button', { name: 'Approve' }).click();
  await page
    .getByRole('dialog')
    .getByLabel(/Message to the customer/)
    .fill('Post it to the store.');
  await page.getByRole('dialog').getByRole('button', { name: 'Approve' }).click();
  await expect(page.getByText(/Request approved/)).toBeVisible();

  await page.getByRole('button', { name: 'Record returned parcel' }).click();
  const dialog = page.getByRole('dialog', { name: 'Record returned parcel' });
  await dialog.getByRole('radio', { name: /Resellable/ }).check();
  await dialog.getByRole('button', { name: 'Save inspection' }).click();

  await expect(page.getByText(/Item restocked and LKR\s?2,500\.00 refunded/)).toBeVisible();
  await expect(page.locator('.order-status')).toContainText('Completed');

  await api.archiveProduct(product.id);
  await api.dispose();
});
