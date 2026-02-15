import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

test.describe('File Preview Feature', () => {
  const testEmail = 'test@crownstack.com';
  const testPassword = 'Password123!';

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('/drive');
  });

  test('should preview text file on double click', async ({ page }) => {
    // Create dummy text file
    const txtPath = path.join(__dirname, 'temp-preview.txt');
    fs.writeFileSync(txtPath, 'Playwright preview test content');

    // Upload
    await page.setInputFiles('input[type="file"]', txtPath);
    await expect(page.locator('text=temp-preview.txt')).toBeVisible({ timeout: 10000 });

    // Double click to preview
    await page.dblclick('text=temp-preview.txt');

    // Verify modal
    await expect(page.locator('h2:has-text("temp-preview.txt")')).toBeVisible();
    await expect(page.locator('pre:has-text("Playwright preview test content")')).toBeVisible();

    // Close
    await page.click('button[title="Close"]');
    await expect(page.locator('h2:has-text("temp-preview.txt")')).toBeHidden();

    // Cleanup
    fs.unlinkSync(txtPath);
  });

  test('should preview image file via context menu', async ({ page }) => {
    // Create dummy SVG
    const svgPath = path.join(__dirname, 'temp-preview.svg');
    fs.writeFileSync(
      svgPath,
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="red" /></svg>',
    );

    // Upload
    await page.setInputFiles('input[type="file"]', svgPath);
    await expect(page.locator('text=temp-preview.svg')).toBeVisible({ timeout: 10000 });

    // Right click context menu
    await page.click('text=temp-preview.svg', { button: 'right' });

    // Click Preview
    await page.click('button:has-text("Preview")');

    // Verify modal
    await expect(page.locator('h2:has-text("temp-preview.svg")')).toBeVisible();
    // Check for img tag
    const img = page.locator('div[class*="fixed"] img');
    await expect(img).toBeVisible();

    // Close
    await page.click('button[title="Close"]');

    // Cleanup
    fs.unlinkSync(svgPath);
  });
});
