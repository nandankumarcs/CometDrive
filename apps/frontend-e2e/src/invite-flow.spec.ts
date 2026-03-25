import { test, expect } from '@playwright/test';

test.describe('Invitation Signup Flow', () => {
  test.setTimeout(120000);

  const adminEmail = 'test@crownstack.com';
  const adminPassword = 'Password123!';

  test('should create a generic invite link from settings and redeem it in a fresh browser session', async ({
    page,
    browser,
  }) => {
    await page.goto('/login');
    await page.getByLabel('Email address').fill(adminEmail);
    await page.getByLabel('Password').fill(adminPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/drive');

    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Invite Teammates' })).toBeVisible();

    await page.getByTestId('create-invite-button').click();

    const inviteLink = await page.getByTestId('invite-link-text').textContent();
    expect(inviteLink).toBeTruthy();
    expect(inviteLink).toContain('/auth/signup?token=');

    const inviteContext = await browser.newContext();
    const invitePage = await inviteContext.newPage();
    await invitePage.goto(inviteLink!);

    const uniqueEmail = `invite-flow-${Date.now()}@example.com`;

    await invitePage.getByLabel('Email address').fill(uniqueEmail);
    await invitePage.getByLabel('First name').fill('Invite');
    await invitePage.getByLabel('Last name').fill('Flow');
    await invitePage.getByLabel('Password', { exact: true }).fill('Password123!');
    await invitePage.getByLabel('Confirm password').fill('Password123!');
    await invitePage.getByRole('button', { name: 'Accept invitation' }).click();

    await invitePage.waitForURL('**/drive');
    await expect(invitePage).toHaveURL(/\/drive$/);
    await expect(invitePage.getByText('CometDrive')).toBeVisible();

    await inviteContext.close();
  });
});
