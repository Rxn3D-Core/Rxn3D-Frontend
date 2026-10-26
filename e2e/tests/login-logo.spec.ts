import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

// Logo height is `h-14` (56px) below the Tailwind `sm` breakpoint (640px) and `sm:h-16` (64px) from 640px up.
const SM_BREAKPOINT = 640;
const LOGO_HEIGHT_BELOW_SM = 56;
const LOGO_HEIGHT_FROM_SM = 64;
const HEIGHT_TOLERANCE = 0.6;

// Intrinsic ratio of public/images/rxn3d-logo.svg (viewBox 194.5 x 75.81)
const LOGO_ASPECT_RATIO = 2.565;
const ASPECT_TOLERANCE = 0.05;

test.describe('Login logo', () => {
  test('@smoke logo renders at the responsive height and keeps its aspect ratio', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    const viewport = page.viewportSize();
    if (!viewport) {
      throw new Error('No viewport size is set for this project');
    }
    const expectedHeight =
      viewport.width < SM_BREAKPOINT ? LOGO_HEIGHT_BELOW_SM : LOGO_HEIGHT_FROM_SM;

    await expect
      .poll(async () => (await loginPage.getLogoBox()).height, {
        message: `logo height at viewport width ${viewport.width}px`,
      })
      .toBeGreaterThanOrEqual(expectedHeight - HEIGHT_TOLERANCE);
    await expect
      .poll(async () => (await loginPage.getLogoBox()).height, {
        message: `logo height at viewport width ${viewport.width}px`,
      })
      .toBeLessThanOrEqual(expectedHeight + HEIGHT_TOLERANCE);

    const { width, height } = await loginPage.getLogoBox();
    expect(width / height).toBeGreaterThan(LOGO_ASPECT_RATIO - ASPECT_TOLERANCE);
    expect(width / height).toBeLessThan(LOGO_ASPECT_RATIO + ASPECT_TOLERANCE);
  });

  test('@smoke logo link still points home with its accessible label', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await loginPage.expectLogoLinkIntact();
  });

  test('@smoke login page has no horizontal scroll', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    await expect
      .poll(() => loginPage.getHorizontalOverflow(), {
        message: 'scrollWidth minus innerWidth',
      })
      .toBeLessThanOrEqual(0);
  });
});

test.describe('Login button on a small phone', () => {
  const VIEWPORT = { width: 375, height: 667 };
  test.use({ viewport: VIEWPORT });

  test('@smoke Log In Now button is fully inside a 375x667 viewport', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();

    // Nothing is clicked or submitted: only the position of the button is read.
    await expect
      .poll(async () => {
        const box = await loginPage.getLogInButtonBox();
        return box.y + box.height;
      }, { message: 'bottom edge of the Log In Now button' })
      .toBeLessThanOrEqual(VIEWPORT.height);

    const box = await loginPage.getLogInButtonBox();
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(VIEWPORT.width);
  });
});
