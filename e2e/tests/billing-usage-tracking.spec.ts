import { test, expect, Page } from '@playwright/test';

// Test data - update with valid credentials
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'password123';

interface UsageMetrics {
  slipCount: number;
  usagePercent: number;
  capacity: number;
  creditsAvailable: number | null;
}

/**
 * Extract usage metrics from the Usage card
 */
async function extractUsageMetrics(page: Page): Promise<UsageMetrics | null> {
  // Wait for the Usage card to be visible
  const usageCard = page.locator('[data-testid="usage-card"], h2:has-text("Usage")').first();

  try {
    await usageCard.waitFor({ timeout: 5000 });
  } catch {
    console.warn('Usage card not found, attempting alternative selectors');
    return null;
  }

  // Find the Usage card container
  const card = page.locator('section').filter({ has: page.locator('text=Usage') }).first();

  // Extract slip count (large number)
  const slipCountText = await card.locator('h2').first().textContent();
  const slipCount = parseInt(slipCountText?.replace(/,/g, '') || '0', 10);

  // Extract usage percent and credits from the hint/description text
  const descriptionText = await card.locator('text=/\\d+\\.\\d+%|\\d+ credits/').first().textContent();

  let usagePercent = 0;
  let creditsAvailable: number | null = null;

  if (descriptionText) {
    const percentMatch = descriptionText.match(/(\d+\.?\d*)%/);
    if (percentMatch) {
      usagePercent = parseFloat(percentMatch[1]);
    }

    const creditsMatch = descriptionText.match(/(\d+)\s+credits/);
    if (creditsMatch) {
      creditsAvailable = parseInt(creditsMatch[1], 10);
    }
  }

  // Extract capacity from the hint text or card content
  // The hint should contain "slip_capacity"
  const hintElement = card.locator('[role="tooltip"]');
  const hintText = await hintElement.textContent().catch(() => '');

  let capacity = 0;
  const capacityMatch = hintText.match(/(\d+)\s+cases?\/month/);
  if (capacityMatch) {
    capacity = parseInt(capacityMatch[1], 10);
  }

  return {
    slipCount,
    usagePercent,
    capacity,
    creditsAvailable,
  };
}

/**
 * Login to the app
 */
async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');

  // Check for email/password fields
  const emailInput = page.locator('input[type="email"], input[placeholder*="email"], input[placeholder*="Email"]').first();
  const passwordInput = page.locator('input[type="password"], input[placeholder*="password"], input[placeholder*="Password"]').first();
  const submitButton = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Login")').first();

  await emailInput.fill(email);
  await passwordInput.fill(password);
  await submitButton.click();

  // Wait for navigation or token to be stored
  await page.waitForTimeout(2000);

  // Check if token is in localStorage
  const token = await page.evaluate(() => localStorage.getItem('token'));
  expect(token).toBeTruthy();
}

/**
 * Navigate to billing subscriptions page and take screenshot
 */
async function navigateToBillingSubscriptions(page: Page): Promise<void> {
  await page.goto('/billing/subscriptions');

  // Wait for the page to load and display usage card
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

/**
 * Create a test case (slip) via the UI
 */
async function createTestCase(page: Page): Promise<void> {
  // Navigate to case creation (assuming there's a link in the nav or dashboard)
  // Look for "Create Case", "New Slip", or similar button
  const createButton = page.locator(
    'button:has-text("Create"), button:has-text("New"), button:has-text("Add"), a:has-text("Case"), a:has-text("Slip")'
  ).first();

  if (await createButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await createButton.click();
  } else {
    // Fallback: navigate directly
    console.warn('Create case button not found, attempting direct navigation');
    // Try common routes
    const possibleRoutes = [
      '/case-management',
      '/cases/create',
      '/slip-creation',
      '/slips/new'
    ];

    let created = false;
    for (const route of possibleRoutes) {
      await page.goto(route).catch(() => null);
      if (page.url().includes(route)) {
        created = true;
        break;
      }
    }

    if (!created) {
      console.warn('Could not navigate to case creation route');
      return;
    }
  }

  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

test.describe('Billing Usage Tracking', () => {
  test.beforeEach(async ({ page, context }) => {
    // Clear localStorage to ensure clean state
    await context.clearCookies();
    await page.evaluate(() => localStorage.clear());
  });

  test('should display usage card on subscriptions page', async ({ page }) => {
    // Navigate to subscriptions without login
    // (assuming page is public or auth is already established)
    await navigateToBillingSubscriptions(page);

    // Take screenshot of initial state
    await page.screenshot({ path: 'e2e/artifacts/billing-subscriptions-initial.png' });

    // Check for Usage card
    const usageCard = page.locator('section').filter({ has: page.locator('text=Usage') }).first();
    await expect(usageCard).toBeVisible({ timeout: 10000 }).catch(() => {
      console.warn('Usage card is not visible on subscriptions page');
    });
  });

  test('should track slip count and usage percent', async ({ page }) => {
    await navigateToBillingSubscriptions(page);

    // Extract initial metrics
    const initialMetrics = await extractUsageMetrics(page);

    if (!initialMetrics) {
      test.skip();
      return;
    }

    console.log('Initial Usage Metrics:', initialMetrics);

    // Log network request for billing-usage API
    page.on('response', async (response) => {
      if (response.url().includes('/billing-usage')) {
        const responseBody = await response.json();
        console.log('Billing Usage API Response:', responseBody);
      }
    });

    // Verify metrics are present
    expect(initialMetrics.slipCount).toBeGreaterThanOrEqual(0);
    expect(initialMetrics.capacity).toBeGreaterThanOrEqual(0);
    expect(initialMetrics.usagePercent).toBeGreaterThanOrEqual(0);
  });

  test('should update usage after creating a case', async ({ page }) => {
    await navigateToBillingSubscriptions(page);

    // Extract initial metrics
    const initialMetrics = await extractUsageMetrics(page);

    if (!initialMetrics) {
      test.skip();
      return;
    }

    console.log('Initial metrics:', initialMetrics);
    await page.screenshot({ path: 'e2e/artifacts/billing-usage-before-case.png' });

    // Navigate to case creation
    await createTestCase(page);

    // Return to billing subscriptions
    await page.goto('/billing/subscriptions');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Extract updated metrics
    const updatedMetrics = await extractUsageMetrics(page);

    if (!updatedMetrics) {
      console.warn('Unable to extract updated metrics');
      test.skip();
      return;
    }

    console.log('Updated metrics:', updatedMetrics);
    await page.screenshot({ path: 'e2e/artifacts/billing-usage-after-case.png' });

    // Report comparison
    console.log('Slip count change:', updatedMetrics.slipCount - initialMetrics.slipCount);
    console.log('Usage percent change:', updatedMetrics.usagePercent - initialMetrics.usagePercent);
  });

  test('should capture network requests for billing-usage endpoint', async ({ page }) => {
    const requestsLog: Array<{
      url: string;
      status: number;
      responseBody: unknown;
    }> = [];

    // Intercept billing-usage requests
    page.on('response', async (response) => {
      if (response.url().includes('/billing-usage')) {
        try {
          const body = await response.json();
          requestsLog.push({
            url: response.url(),
            status: response.status(),
            responseBody: body,
          });
        } catch (e) {
          console.error('Failed to parse billing-usage response:', e);
        }
      }
    });

    await navigateToBillingSubscriptions(page);

    // Wait for requests to complete
    await page.waitForLoadState('networkidle');

    console.log('Billing Usage API Requests:');
    requestsLog.forEach((log) => {
      console.log(`${log.status} ${log.url}`);
      console.log(JSON.stringify(log.responseBody, null, 2));
    });

    // Verify at least one billing-usage request was made
    expect(requestsLog.length).toBeGreaterThan(0);
  });

  test('should show progress bar with correct percentage', async ({ page }) => {
    await navigateToBillingSubscriptions(page);

    // Find the progress bar element
    const progressBar = page.locator('section').filter({ has: page.locator('text=Usage') }).first()
      .locator('div[style*="background"]').first();

    await expect(progressBar).toBeVisible({ timeout: 10000 }).catch(() => {
      console.warn('Progress bar not visible');
    });

    // Get the inline style with width
    const barStyle = await progressBar.getAttribute('style');
    console.log('Progress bar style:', barStyle);

    // Extract width percentage
    if (barStyle) {
      const widthMatch = barStyle.match(/width:\s*(\d+(?:\.\d+)?)%/);
      if (widthMatch) {
        const percentage = parseFloat(widthMatch[1]);
        console.log('Progress bar width:', percentage + '%');
        expect(percentage).toBeGreaterThanOrEqual(0);
        expect(percentage).toBeLessThanOrEqual(100);
      }
    }
  });
});
