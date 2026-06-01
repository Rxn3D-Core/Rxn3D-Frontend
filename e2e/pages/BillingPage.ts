import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object for Billing Subscriptions page
 * Encapsulates all interactions with the billing/subscriptions page
 */
export class BillingPage {
  readonly page: Page;

  // Card locators
  readonly currentPlanCard: Locator;
  readonly usageCard: Locator;
  readonly nextBillingDateCard: Locator;

  // Usage card specific elements
  readonly usageSlipCount: Locator;
  readonly usagePercent: Locator;
  readonly usageProgressBar: Locator;
  readonly usageActionButton: Locator;

  // Plan card elements
  readonly currentPlanName: Locator;
  readonly currentPlanPrice: Locator;
  readonly upgradePlanButton: Locator;

  // Payment details
  readonly updateBillingInfoButton: Locator;
  readonly cancelSubscriptionButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Find cards by their title text
    this.currentPlanCard = page.locator('section').filter({ has: page.locator('text=Current plan') }).first();
    this.usageCard = page.locator('section').filter({ has: page.locator('text=Usage') }).first();
    this.nextBillingDateCard = page.locator('section').filter({ has: page.locator('text=Next billing date') }).first();

    // Usage card specific
    this.usageSlipCount = this.usageCard.locator('h2').first();
    this.usagePercent = this.usageCard.locator('text=/\\d+\\.\\d+%/');
    this.usageProgressBar = this.usageCard.locator('div[style*="background-color"]').first();
    this.usageActionButton = this.usageCard.locator('button').first();

    // Plan card elements
    this.currentPlanName = this.currentPlanCard.locator('h2').first();
    this.currentPlanPrice = this.currentPlanCard.locator('text=/\\$\\d+/');
    this.upgradePlanButton = this.currentPlanCard.locator('button').first();

    // Payment details buttons
    this.updateBillingInfoButton = page.locator('button:has-text("Update Billing Info")').first();
    this.cancelSubscriptionButton = page.locator('button:has-text("Cancel Subscription")').first();
  }

  /**
   * Navigate to billing/subscriptions page
   */
  async goto(): Promise<void> {
    await this.page.goto('/billing/subscriptions', { waitUntil: 'networkidle' });
    await this.page.waitForTimeout(1000);
  }

  /**
   * Wait for page to load and all cards to be visible
   */
  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');

    // Wait for at least the usage card to be visible
    try {
      await this.usageCard.waitFor({ timeout: 10000 });
    } catch {
      console.warn('Usage card not visible within timeout');
    }
  }

  /**
   * Get current usage metrics from the Usage card
   */
  async getUsageMetrics(): Promise<{
    slipCount: number;
    usagePercent: number;
    capacity: number;
    creditsAvailable: number | null;
  } | null> {
    // Make sure card is visible
    if (!(await this.usageCard.isVisible().catch(() => false))) {
      return null;
    }

    const slipCountText = await this.usageSlipCount.textContent();
    const slipCount = parseInt(slipCountText?.replace(/,/g, '') || '0', 10);

    // Get all text from the card
    const cardText = await this.usageCard.textContent();

    // Extract usage percent
    const percentMatch = cardText?.match(/(\d+\.?\d*)%/);
    const usagePercent = percentMatch ? parseFloat(percentMatch[1]) : 0;

    // Extract credits
    const creditsMatch = cardText?.match(/(\d+)\s+credits/);
    const creditsAvailable = creditsMatch ? parseInt(creditsMatch[1], 10) : null;

    // Get capacity from tooltip/hint (if available)
    const hintText = await this.page.evaluate(() => {
      const tooltips = document.querySelectorAll('[role="tooltip"]');
      for (const tooltip of tooltips) {
        if (tooltip.textContent?.includes('cases')) {
          return tooltip.textContent;
        }
      }
      return '';
    });

    const capacityMatch = hintText.match(/(\d+)\s+cases?\/month/);
    const capacity = capacityMatch ? parseInt(capacityMatch[1], 10) : 0;

    return {
      slipCount,
      usagePercent,
      capacity,
      creditsAvailable,
    };
  }

  /**
   * Get progress bar width percentage
   */
  async getProgressBarWidth(): Promise<number> {
    const barStyle = await this.usageProgressBar.getAttribute('style');
    const widthMatch = barStyle?.match(/width:\s*(\d+(?:\.\d+)?)%/);
    return widthMatch ? parseFloat(widthMatch[1]) : 0;
  }

  /**
   * Get progress bar color
   */
  async getProgressBarColor(): Promise<string> {
    const barStyle = await this.usageProgressBar.getAttribute('style');
    const colorMatch = barStyle?.match(/backgroundColor:\s*"([^"]+)"/);
    return colorMatch ? colorMatch[1] : 'unknown';
  }

  /**
   * Get current plan details
   */
  async getCurrentPlanDetails(): Promise<{
    name: string;
    price: string;
  } | null> {
    if (!(await this.currentPlanCard.isVisible().catch(() => false))) {
      return null;
    }

    const name = await this.currentPlanName.textContent();
    const price = await this.currentPlanPrice.textContent();

    return {
      name: name?.trim() || '',
      price: price?.trim() || '',
    };
  }

  /**
   * Get next billing date
   */
  async getNextBillingDate(): Promise<string | null> {
    if (!(await this.nextBillingDateCard.isVisible().catch(() => false))) {
      return null;
    }

    const dateElement = this.nextBillingDateCard.locator('h2').first();
    return dateElement.textContent();
  }

  /**
   * Click upgrade/downgrade plan button
   */
  async clickUpgradePlanButton(): Promise<void> {
    await this.upgradePlanButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Click "Explore Add-ons" button
   */
  async clickExploreAddOnsButton(): Promise<void> {
    await this.usageActionButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Take screenshot of the page
   */
  async takeScreenshot(filename: string): Promise<void> {
    await this.page.screenshot({ path: `e2e/artifacts/${filename}` });
  }

  /**
   * Verify usage card is visible
   */
  async expectUsageCardVisible(): Promise<void> {
    await expect(this.usageCard).toBeVisible({ timeout: 10000 });
  }

  /**
   * Verify current plan card is visible
   */
  async expectCurrentPlanCardVisible(): Promise<void> {
    await expect(this.currentPlanCard).toBeVisible({ timeout: 10000 });
  }

  /**
   * Verify next billing date card is visible
   */
  async expectNextBillingDateCardVisible(): Promise<void> {
    await expect(this.nextBillingDateCard).toBeVisible({ timeout: 10000 });
  }
}
