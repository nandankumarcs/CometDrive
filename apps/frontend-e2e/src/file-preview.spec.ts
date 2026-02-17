import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

test.describe('File Preview Feature', () => {
  test.setTimeout(120000);
  const testEmail = 'test@crownstack.com';
  const testPassword = 'Password123!';
  const workspaceRoot = path.resolve(__dirname, '../../..');
  const videoFixtures = [
    'apps/backend/uploads/users/0cb2ee61-6aed-4eed-a4d3-88acfd56cbe2/a1889723-909c-40e3-8cf4-fa3f2cf3a118/1771166695818-file_example_MP4_1280_10MG.mp4',
    'apps/backend/uploads/users/0cb2ee61-6aed-4eed-a4d3-88acfd56cbe2/root/1771170541841-file_example_MP4_1280_10MG.mp4',
  ];

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('/drive');
    await waitForDriveReady(page);
  });

  const waitForDriveReady = async (page: any) => {
    const loading = page.locator('main').getByText('Loading…');
    await expect(loading).toBeHidden({ timeout: 60000 });
  };

  const uploadFileViaApi = async (page: any, filePath: string, mimeType: string) => {
    const token = await page.evaluate(() => {
      const raw = localStorage.getItem('auth-storage');
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        return parsed?.state?.accessToken ?? null;
      } catch {
        return null;
      }
    });

    if (!token) {
      throw new Error('Missing auth token after login');
    }

    const fileName = path.basename(filePath);
    const buffer = fs.readFileSync(filePath);
    const response = await page.request.post('http://localhost:3001/api/v1/files/upload', {
      headers: { Authorization: `Bearer ${token}` },
      multipart: {
        file: { name: fileName, mimeType, buffer },
      },
    });

    expect(response.ok()).toBeTruthy();
  };

  const waitForFileRow = async (page: any, filename: string) => {
    const list = page.getByTestId('drive-items');
    const row = list.locator(`[data-testid="drive-item"][data-name="${filename}"]`);
    await expect(row).toBeVisible({ timeout: 60000 });
    return row;
  };

  const createTempVideoFixture = () => {
    const source = videoFixtures
      .map((relativePath) => path.join(workspaceRoot, relativePath))
      .find((absPath) => fs.existsSync(absPath));

    if (!source) {
      throw new Error('No MP4 fixture found for continue-watching E2E test');
    }

    const uniqueId = Date.now();
    const fileName = `preview-video-${uniqueId}.mp4`;
    const target = path.join(__dirname, fileName);
    fs.copyFileSync(source, target);
    return { target, fileName };
  };

  test('should preview text file on double click', async ({ page }) => {
    // Create dummy text file
    const uniqueId = Date.now();
    const filename = `preview-test-${uniqueId}.txt`;
    const txtPath = path.join(__dirname, filename);
    fs.writeFileSync(txtPath, 'Playwright preview test content');

    // Upload
    await uploadFileViaApi(page, txtPath, 'text/plain');
    await page.reload();
    await waitForDriveReady(page);
    const fileItem = await waitForFileRow(page, filename);

    // Double click to preview
    await fileItem.dblclick();

    // Verify modal
    await expect(page.locator(`h2:has-text("${filename}")`)).toBeVisible({ timeout: 10000 });
    await expect(page.locator('pre:has-text("Playwright preview test content")')).toBeVisible({
      timeout: 60000,
    });

    // Close
    await page.click('button[title="Close"]');
    await expect(page.locator(`h2:has-text("${filename}")`)).toBeHidden();

    // Cleanup
    fs.rmSync(txtPath, { force: true });
  });

  test('should support rich image viewer controls and image navigation', async ({ page }) => {
    const uniqueId = Date.now();
    const filePrefix = `preview-image-${uniqueId}`;
    const firstName = `${filePrefix}-a.svg`;
    const secondName = `${filePrefix}-b.svg`;
    const firstPath = path.join(__dirname, firstName);
    const secondPath = path.join(__dirname, secondName);

    fs.writeFileSync(
      firstPath,
      '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><rect width="120" height="80" fill="red" /></svg>',
    );
    fs.writeFileSync(
      secondPath,
      '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><rect width="120" height="80" fill="blue" /></svg>',
    );

    try {
      await uploadFileViaApi(page, firstPath, 'image/svg+xml');
      await uploadFileViaApi(page, secondPath, 'image/svg+xml');
      await page.reload();
      await waitForDriveReady(page);

      await page.locator('input[placeholder="Search in Drive..."]').fill(filePrefix);
      const firstFile = await waitForFileRow(page, firstName);
      await firstFile.dblclick();

      await expect(page.locator(`h2:has-text("${firstName}")`)).toBeVisible({ timeout: 10000 });
      const imageViewer = page.getByTestId('image-viewer');
      await expect(imageViewer).toBeVisible({ timeout: 15000 });
      await expect(imageViewer).toHaveAttribute('data-zoom', '100');

      await page.getByTestId('image-zoom-preset-200').click();
      await expect(imageViewer).toHaveAttribute('data-zoom', '200');

      await page.getByTestId('image-zoom-preset-25').click();
      await expect(imageViewer).toHaveAttribute('data-zoom', '25');

      await page.getByTestId('image-reset').click();
      await expect(imageViewer).toHaveAttribute('data-zoom', '100');
      await page.getByTestId('image-actual-size').click();

      await page.getByTestId('image-canvas').evaluate((element) => {
        const rect = element.getBoundingClientRect();
        element.dispatchEvent(
          new WheelEvent('wheel', {
            deltaY: -120,
            bubbles: true,
            cancelable: true,
            clientX: rect.left + 20,
            clientY: rect.top + 20,
          }),
        );
      });
      await expect(imageViewer).toHaveAttribute('data-zoom', '120');

      const panX = Number(await imageViewer.getAttribute('data-pan-x'));
      const panY = Number(await imageViewer.getAttribute('data-pan-y'));
      expect(Math.abs(panX)).toBeGreaterThan(0);
      expect(Math.abs(panY)).toBeGreaterThan(0);

      await page.getByTestId('image-rotate-right').click();
      await expect(imageViewer).toHaveAttribute('data-rotation', '90');

      await page.getByTestId('image-flip-horizontal').click();
      await expect(imageViewer).toHaveAttribute('data-flip-horizontal', 'true');

      await page.getByTestId('image-reset').click();
      await expect(imageViewer).toHaveAttribute('data-zoom', '100');
      await expect(imageViewer).toHaveAttribute('data-rotation', '0');
      await expect(imageViewer).toHaveAttribute('data-flip-horizontal', 'false');

      await expect(page.getByTestId('image-prev')).toBeVisible();
      await page.getByTestId('image-prev').click();
      await expect(page.locator(`h2:has-text("${secondName}")`)).toBeVisible({ timeout: 10000 });
    } finally {
      fs.rmSync(firstPath, { force: true });
      fs.rmSync(secondPath, { force: true });
    }
  });

  test('should show continue watching card and resume from saved progress', async ({ page }) => {
    const { target, fileName } = createTempVideoFixture();

    try {
      await uploadFileViaApi(page, target, 'video/mp4');
      await page.reload();
      await waitForDriveReady(page);
      const fileItem = await waitForFileRow(page, fileName);

      await fileItem.dblclick();
      await expect(page.locator(`h2:has-text("${fileName}")`)).toBeVisible({ timeout: 10000 });
      const video = page.locator('video');
      await expect(video).toBeVisible({ timeout: 20000 });

      await page.keyboard.press('k');
      await page.keyboard.press('l');
      await page.keyboard.press('l');
      await expect
        .poll(async () => {
          return await page.locator('video').evaluate((el) => (el as HTMLVideoElement).currentTime);
        })
        .toBeGreaterThan(8);

      await page.keyboard.press('k');
      await page.click('button[title="Close"]');
      await page.reload();
      await waitForDriveReady(page);
      await expect(page.getByTestId('continue-watching-card')).toBeVisible({ timeout: 60000 });
      await expect(page.getByTestId('continue-watching-card')).toContainText(fileName);

      await page.getByTestId('continue-watching-resume').click();
      await expect(page.locator(`h2:has-text("${fileName}")`)).toBeVisible({ timeout: 10000 });
      const resumedTime = await page.locator('video').evaluate((el) => {
        return (el as HTMLVideoElement).currentTime;
      });
      expect(resumedTime).toBeGreaterThan(8);
    } finally {
      fs.rmSync(target, { force: true });
    }
  });

  test('should dismiss continue watching card', async ({ page }) => {
    const { target, fileName } = createTempVideoFixture();

    try {
      await uploadFileViaApi(page, target, 'video/mp4');
      await page.reload();
      await waitForDriveReady(page);
      const fileItem = await waitForFileRow(page, fileName);
      await fileItem.dblclick();
      await expect(page.locator(`h2:has-text("${fileName}")`)).toBeVisible({ timeout: 10000 });

      const video = page.locator('video');
      await expect(video).toBeVisible({ timeout: 20000 });
      await page.keyboard.press('k');
      await page.keyboard.press('l');
      await expect
        .poll(async () => {
          return await page.locator('video').evaluate((el) => (el as HTMLVideoElement).currentTime);
        })
        .toBeGreaterThan(4);

      await page.keyboard.press('k');
      await page.click('button[title="Close"]');
      await page.reload();
      await waitForDriveReady(page);

      const card = page.getByTestId('continue-watching-card');
      await expect(card).toBeVisible({ timeout: 60000 });
      await page.getByTestId('continue-watching-dismiss').click();
      await expect(card).toBeHidden({ timeout: 15000 });
    } finally {
      fs.rmSync(target, { force: true });
    }
  });

  test('should create timestamped comment, seek from comment, and delete comment', async ({
    page,
  }) => {
    const { target, fileName } = createTempVideoFixture();

    try {
      await uploadFileViaApi(page, target, 'video/mp4');
      await page.reload();
      await waitForDriveReady(page);
      const fileItem = await waitForFileRow(page, fileName);

      await fileItem.dblclick();
      await expect(page.locator(`h2:has-text("${fileName}")`)).toBeVisible({ timeout: 10000 });
      await expect(page.getByTestId('video-comments-panel')).toBeVisible({ timeout: 20000 });

      await page.keyboard.press('l');
      await page.keyboard.press('l');
      await expect
        .poll(async () => {
          return await page.locator('video').evaluate((el) => (el as HTMLVideoElement).currentTime);
        })
        .toBeGreaterThan(8);

      await page.getByTestId('video-comment-input').fill('Important detail here');
      await page.getByTestId('video-comment-submit').click();
      await expect(page.getByTestId('video-comment-item')).toContainText('Important detail here');

      await page.locator('video').evaluate((el) => {
        (el as HTMLVideoElement).currentTime = 0;
      });
      await expect
        .poll(async () => {
          return await page.locator('video').evaluate((el) => (el as HTMLVideoElement).currentTime);
        })
        .toBeLessThan(1);

      await page.getByTestId('video-comment-timestamp').first().click();
      await expect
        .poll(async () => {
          return await page.locator('video').evaluate((el) => (el as HTMLVideoElement).currentTime);
        })
        .toBeGreaterThan(8);

      await page.getByTestId('video-comment-delete').first().click();
      await expect(page.getByTestId('video-comment-item')).toHaveCount(0);
    } finally {
      fs.rmSync(target, { force: true });
    }
  });
});
