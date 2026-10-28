import { test, expect } from '@playwright/test';
import { hasCredentials, signIn, STAFF } from './helpers';

test.skip(!hasCredentials, 'Set E2E_ADMIN_PASSWORD to run the admin E2E suite');

test.describe('staff sign-in and roles', () => {
  test('a manager signs in, keeps the session on reload and signs out', async ({ page }) => {
    await signIn(page, 'manager');
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();

    const menu = page.getByRole('button', { name: 'Open menu' });
    if (await menu.isVisible()) await menu.click();
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page.getByRole('heading', { name: 'Staff sign in' })).toBeVisible();

    await page.goto('/orders');
    await expect(page).toHaveURL(/\/login\?next=%2Forders/);
  });

  test('a support agent only gets the support console', async ({ page }) => {
    await signIn(page, 'agent');
    await expect(page).toHaveURL(/\/support$/);
    await expect(page.getByRole('heading', { name: 'Live support', level: 1 })).toBeVisible();

    await page.goto('/orders');
    await expect(
      page.getByRole('heading', { name: 'This page is not available for your role' })
    ).toBeVisible();
  });

  test('a wrong password is refused without revealing which part was wrong', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Work email').fill(STAFF.manager.email);
    await page.getByLabel('Password', { exact: true }).fill('not-the-password');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByRole('alert')).toHaveText(
      'That email and password do not match a staff account.'
    );
    await expect(page.getByLabel('Password', { exact: true })).toHaveValue('');
  });
});
