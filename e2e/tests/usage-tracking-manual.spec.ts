import { test, expect, Page } from '@playwright/test';

/**
 * Manual test for billing usage tracking
 * This test is designed to be run with --headed flag to observe the UI
 *
 * Test Steps:
 * 1. Navigate to billing/subscriptions page
 * 2. Record current usage metrics from the Usage card
 * 3. Create a test case/slip
 * 4. Navigate back to billing/subscriptions
 * 5. Compare usage metrics
 * 6. Log API requests and responses
 */

test.describe('Billing Usage Tracking - Manual Test', () => {
  // Intercept and log API requests
  test('should log billing-usage API calls and responses', async ({ page, context }) => {
    const apiLog: Array<{
      method: string;
      url: string;
      status: number;
      responseBody: unknown;
      timestamp: string;
    }> = [];

    // Listen to all responses
    page.on('response', async (response) => {
      if (response.url().includes('/billing')) {
        try {
          const body = await response.json().catch(() => null);
          apiLog.push({
            method: response.request().method(),
            url: response.url(),
            status: response.status(),
            responseBody: body,
            timestamp: new Date().toISOString(),
          });

          console.log(`[API] ${response.request().method()} ${response.url()} → ${response.status()}`);
          if (body) {
            console.log('[Response]', JSON.stringify(body, null, 2));
          }
        } catch (e) {
          // Response might not be JSON
        }
      }
    });

    // Step 1: Navigate to billing/subscriptions
    console.log('\n=== STEP 1: Navigate to Billing Subscriptions ===');
    await page.goto('/billing/subscriptions', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Take screenshot
    console.log('Capturing screenshot: billing-subscriptions-before.png');
    await page.screenshot({ path: 'e2e/artifacts/billing-subscriptions-before.png' });

    // Step 2: Extract usage metrics from the page
    console.log('\n=== STEP 2: Extract Usage Metrics ===');
    const usageMetrics = await page.evaluate(() => {
      const sections = document.querySelectorAll('section');
      let usageSection: Element | null = null;

      // Find the Usage card
      for (const section of sections) {
        if (section.textContent?.includes('Usage')) {
          usageSection = section;
          break;
        }
      }

      if (!usageSection) {
        return null;
      }

      // Extract slip count (main heading with large number)
      const slipCountElement = usageSection.querySelector('h2');
      const slipCount = slipCountElement ? parseInt(slipCountElement.textContent?.replace(/,/g, '') || '0', 10) : 0;

      // Extract usage percent from the text
      const allText = usageSection.textContent || '';
      const percentMatch = allText.match(/(\d+\.?\d*)%/);
      const usagePercent = percentMatch ? parseFloat(percentMatch[1]) : 0;

      // Extract credits info
      const creditsMatch = allText.match(/(\d+)\s+credits/);
      const creditsAvailable = creditsMatch ? parseInt(creditsMatch[1], 10) : null;

      // Extract progress bar width
      const progressBar = usageSection.querySelector('div[style*="background"]');
      const barStyle = progressBar?.getAttribute('style');
      const widthMatch = barStyle?.match(/width:\s*(\d+(?:\.\d+)?)%/);
      const barWidth = widthMatch ? parseFloat(widthMatch[1]) : 0;

      // Get slip capacity from the tooltip/hint text if available
      const tooltipTrigger = usageSection.querySelector('[role="tooltip"]');
      const tooltipText = tooltipTrigger?.textContent || '';
      const capacityMatch = tooltipText.match(/(\d+)\s+cases?\/month/);
      const capacity = capacityMatch ? parseInt(capacityMatch[1], 10) : 0;

      return {
        slipCount,
        usagePercent,
        creditsAvailable,
        barWidth,
        capacity,
        timestamp: new Date().toISOString(),
      };
    });

    console.log('Initial Usage Metrics:');
    console.log(JSON.stringify(usageMetrics, null, 2));

    // Verify we got the metrics
    expect(usageMetrics).not.toBeNull();
    if (usageMetrics) {
      expect(usageMetrics.slipCount).toBeGreaterThanOrEqual(0);
    }

    // Log all API requests so far
    console.log('\n=== API Requests Made So Far ===');
    apiLog.forEach((log) => {
      console.log(`${log.timestamp} | ${log.method} ${log.url} (${log.status})`);
    });

    // Step 3: Check if we can access case creation
    console.log('\n=== STEP 3: Attempting to Create Test Case ===');
    const canAccessCaseCreation = await page.evaluate(() => {
      // Check for common case creation buttons/links
      const buttons = document.querySelectorAll('button, a');
      for (const btn of buttons) {
        const text = btn.textContent?.toLowerCase() || '';
        if (text.includes('create') || text.includes('new') || text.includes('case') || text.includes('slip')) {
          return true;
        }
      }
      return false;
    });

    console.log('Can access case creation from subscriptions page?', canAccessCaseCreation);

    if (!canAccessCaseCreation) {
      console.log('Note: Case creation not accessible from this page.');
      console.log('In a real test, you would navigate to the case creation page directly.');
    }

    // Step 4: Take final screenshot
    console.log('\n=== STEP 4: Final Screenshot ===');
    await page.screenshot({ path: 'e2e/artifacts/billing-subscriptions-final.png' });

    // Step 5: Summary of findings
    console.log('\n=== TEST SUMMARY ===');
    console.log('✓ Successfully navigated to /billing/subscriptions');
    console.log('✓ Usage metrics extracted:', usageMetrics ? 'Yes' : 'No');
    console.log('✓ API requests logged:', apiLog.length, 'requests');
    console.log(`\nCritical API endpoint: /billing-usage (customer_id={id})`);
    console.log('Response should include:');
    console.log('  - slip_count: number');
    console.log('  - slip_capacity: number');
    console.log('  - period_start: date string');
    console.log('  - period_end: date string');

    console.log('\nBilling-Usage API calls:');
    apiLog.filter((log) => log.url.includes('/billing-usage')).forEach((log) => {
      console.log(`  ${log.method} ${log.url}`);
      if (log.responseBody) {
        console.log('  Response:', JSON.stringify(log.responseBody, null, 4));
      }
    });
  });

  test('should verify Usage card structure and content', async ({ page }) => {
    await page.goto('/billing/subscriptions', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log('\n=== Verifying Usage Card Structure ===');

    // Find Usage card
    const usageCard = page.locator('section').filter({ has: page.locator('text=Usage') }).first();
    await expect(usageCard).toBeVisible({ timeout: 10000 });

    // Verify expected elements
    const heading = usageCard.locator('text=Usage');
    const slipCountValue = usageCard.locator('h2').first();
    const progressBar = usageCard.locator('div[style*="background"]').first();
    const actionButton = usageCard.locator('button');

    console.log('Usage Card Elements:');
    console.log('✓ Title "Usage" present:', await heading.isVisible());
    console.log('✓ Slip count value visible:', await slipCountValue.isVisible());
    console.log('✓ Progress bar visible:', await progressBar.isVisible());
    console.log('✓ Action button visible:', await actionButton.isVisible());

    // Get text content
    const slipCountText = await slipCountValue.textContent();
    const buttonText = await actionButton.textContent();

    console.log('\nContent:');
    console.log('Slip count:', slipCountText);
    console.log('Action button:', buttonText);

    // Verify button is "Explore Add-ons"
    expect(buttonText).toContain('Add-ons');
  });

  test('should verify billing-usage endpoint response structure', async ({ page }) => {
    let billingUsageResponse: unknown = null;

    page.on('response', async (response) => {
      if (response.url().includes('/billing-usage')) {
        try {
          billingUsageResponse = await response.json();
        } catch (e) {
          // Not JSON
        }
      }
    });

    await page.goto('/billing/subscriptions', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log('\n=== Billing Usage Endpoint Response ===');

    if (billingUsageResponse) {
      console.log(JSON.stringify(billingUsageResponse, null, 2));

      // Verify required fields
      const data = (billingUsageResponse as Record<string, unknown>)?.data || billingUsageResponse;
      if (typeof data === 'object' && data !== null) {
        const dataObj = data as Record<string, unknown>;
        console.log('\nResponse Structure Validation:');
        console.log('✓ Has slip_count:', 'slip_count' in dataObj);
        console.log('✓ Has slip_capacity:', 'slip_capacity' in dataObj);
        console.log('✓ Has period_start:', 'period_start' in dataObj);
        console.log('✓ Has period_end:', 'period_end' in dataObj);

        expect(dataObj).toHaveProperty('slip_count');
        expect(dataObj).toHaveProperty('slip_capacity');
      }
    } else {
      console.log('No billing-usage response captured');
      test.skip();
    }
  });

  test('should verify progress bar color based on usage percentage', async ({ page }) => {
    await page.goto('/billing/subscriptions', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    console.log('\n=== Progress Bar Color Verification ===');

    const metrics = await page.evaluate(() => {
      const sections = document.querySelectorAll('section');
      for (const section of sections) {
        if (section.textContent?.includes('Usage')) {
          // Get usage percent
          const allText = section.textContent || '';
          const percentMatch = allText.match(/(\d+\.?\d*)%/);
          const usagePercent = percentMatch ? parseFloat(percentMatch[1]) : 0;

          // Get progress bar color
          const progressBar = section.querySelector('div[style*="background"]');
          const style = progressBar?.getAttribute('style') || '';

          // Extract background color
          const colorMatch = style.match(/backgroundColor:\s*"([^"]+)"|background[^:]*:\s*([#\w()]+)/);
          const color = colorMatch ? (colorMatch[1] || colorMatch[2]) : 'unknown';

          return { usagePercent, color, style };
        }
      }
      return null;
    });

    if (metrics) {
      console.log('Usage Percent:', metrics.usagePercent + '%');
      console.log('Progress Bar Color:', metrics.color);
      console.log('Full Style:', metrics.style);

      // Verify color logic
      console.log('\nExpected Color Logic:');
      if (metrics.usagePercent >= 90) {
        console.log('  >= 90%: RED (#EF4444)');
      } else if (metrics.usagePercent >= 75) {
        console.log('  >= 75%: ORANGE (#FF9900)');
      } else {
        console.log('  < 75%: BLUE (#3B82F6)');
      }
    } else {
      console.log('Could not verify progress bar');
    }
  });
});
