import { Page, Locator, expect } from '@playwright/test';

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Page Object for the Login page
 * Encapsulates the brand logo and the submit button. It never fills in or
 * submits the form: the login screen renders without any API call.
 */
export class LoginPage {
  readonly page: Page;

  // Brand logo: an <img alt="Rxn3D"> inside a link labelled "Rxn3D home"
  readonly logoLink: Locator;
  readonly logo: Locator;

  // Submit button
  readonly logInButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // The link's aria-label ("Rxn3D home") replaces the image alt as its accessible name
    this.logoLink = page.getByRole('link', { name: 'Rxn3D home', exact: true });
    this.logo = this.logoLink.locator('img[alt="Rxn3D"]');

    this.logInButton = page.getByRole('button', { name: 'Log In Now', exact: true });
  }

  /**
   * Navigate to the login page and wait until the layout is stable:
   * logo decoded, button visible and web fonts loaded.
   */
  async goto(): Promise<void> {
    await this.page.goto('/login');
    await expect(this.logo).toBeVisible();
    await expect(this.logInButton).toBeVisible();
    await this.waitForLogoLoaded();
    await this.page.evaluate(() => document.fonts.ready);
  }

  /**
   * Wait until the logo image has loaded, so its width reflects the real
   * SVG aspect ratio and not the width/height attributes used before load.
   */
  async waitForLogoLoaded(): Promise<void> {
    await expect
      .poll(() => this.logo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
      .toBe(true);
  }

  /**
   * Rendered size of the logo in CSS pixels
   */
  async getLogoBox(): Promise<Box> {
    const box = await this.logo.boundingBox();
    if (!box) {
      throw new Error('Logo has no bounding box (not rendered)');
    }
    return box;
  }

  /**
   * Bounding box of the "Log In Now" button in CSS pixels, relative to the viewport
   */
  async getLogInButtonBox(): Promise<Box> {
    const box = await this.logInButton.boundingBox();
    if (!box) {
      throw new Error('"Log In Now" button has no bounding box (not rendered)');
    }
    return box;
  }

  /**
   * Horizontal overflow of the page in CSS pixels (0 or less means no horizontal scroll)
   */
  async getHorizontalOverflow(): Promise<number> {
    return this.page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
  }

  /**
   * Assert the logo link still points home with its accessible label
   */
  async expectLogoLinkIntact(): Promise<void> {
    await expect(this.logoLink).toHaveAttribute('href', '/');
    await expect(this.logoLink).toHaveAttribute('aria-label', 'Rxn3D home');
  }
}
