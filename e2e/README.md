# E2E Tests for RXN3D Frontend

End-to-end tests for critical user journeys in the RXN3D Laboratory Management System.

## Setup

### Install Dependencies

Playwright is already configured. To install additional dependencies:

```bash
npm install
```

### Configuration

All tests use the configuration in `playwright.config.ts`:
- Base URL: `http://localhost:3000`
- Browser: Chromium
- Trace: `on-first-retry` (captures traces on failures)
- Screenshots: Only on failure
- Reports: HTML + JUnit XML

## Running Tests

### Start the Frontend Server

Before running tests, start the Next.js dev server:

```bash
npm run dev
```

This runs on `http://localhost:3000` by default.

### Run All Tests

```bash
npm run e2e
```

### Run Tests in Headed Mode

See the browser as tests run:

```bash
npm run e2e:headed
```

### Run Specific Test File

```bash
npx playwright test e2e/tests/usage-tracking-manual.spec.ts
```

### Debug Tests

Open the Playwright Inspector:

```bash
npm run e2e:debug
```

### View HTML Report

After running tests:

```bash
npm run e2e:report
```

Opens the HTML report in your browser showing screenshots, videos, and traces.

## Test Files

### `billing-usage-tracking.spec.ts`

Tests for the billing usage tracking feature on `/billing/subscriptions`.

**Tests:**
1. `should display usage card on subscriptions page` - Verifies the Usage card renders
2. `should track slip count and usage percent` - Extracts and validates usage metrics
3. `should update usage after creating a case` - Tests if usage updates after case creation
4. `should capture network requests for billing-usage endpoint` - Logs API calls
5. `should show progress bar with correct percentage` - Verifies progress bar display

**Running this test:**

```bash
npx playwright test e2e/tests/billing-usage-tracking.spec.ts
```

### `usage-tracking-manual.spec.ts`

Interactive tests designed to be run with `--headed` flag to observe the UI and API behavior.

**Tests:**
1. `should log billing-usage API calls and responses` - Main test that captures all API calls
2. `should verify Usage card structure and content` - Validates card structure
3. `should verify billing-usage endpoint response structure` - Checks API response fields
4. `should verify progress bar color based on usage percentage` - Validates color logic

**Running in headed mode (recommended for this test):**

```bash
npm run e2e:headed -- e2e/tests/usage-tracking-manual.spec.ts
```

## Page Object Model

### `BillingPage.ts`

Encapsulates all interactions with the billing/subscriptions page.

**Usage:**

```typescript
import { BillingPage } from './pages/BillingPage';

const billingPage = new BillingPage(page);
await billingPage.goto();
await billingPage.waitForPageLoad();
const metrics = await billingPage.getUsageMetrics();
```

**Available Methods:**
- `goto()` - Navigate to /billing/subscriptions
- `waitForPageLoad()` - Wait for all cards to load
- `getUsageMetrics()` - Extract usage data
- `getProgressBarWidth()` - Get progress bar width %
- `getProgressBarColor()` - Get progress bar color
- `getCurrentPlanDetails()` - Get current plan name/price
- `getNextBillingDate()` - Get next billing date
- `clickUpgradePlanButton()` - Click upgrade plan
- `clickExploreAddOnsButton()` - Click explore add-ons
- `takeScreenshot(filename)` - Capture screenshot
- Assertion helpers: `expectUsageCardVisible()`, `expectCurrentPlanCardVisible()`, etc.

## Test Data

Tests use the following environment variables (optional):

```bash
TEST_EMAIL=user@example.com
TEST_PASSWORD=password123
```

If not set, tests skip the login step and assume the user is already authenticated.

## Expected Behavior

### Billing Usage Endpoint

The test expects the following from the `GET /v1/billing-usage?customer_id={id}` endpoint:

```json
{
  "slip_count": 5,
  "slip_capacity": 100,
  "period_start": "2026-05-01",
  "period_end": "2026-05-31",
  "credit_used": 0,
  "overage_count": 0,
  "remaining_slips": 95
}
```

**Required fields:**
- `slip_count` (number) - Current number of slips/cases created this period
- `slip_capacity` (number) - Maximum slips allowed this period
- `period_start` (string) - Start date of billing period
- `period_end` (string) - End date of billing period

### Usage Card UI

The Usage card should display:

1. **Slip Count** - Large number showing `slip_count` from the API
2. **Usage Percent** - Calculated as `(slip_count / slip_capacity) * 100`
3. **Progress Bar** - Visual representation with width = usage percent
4. **Credits Available** - If available in the API response
5. **Progress Bar Color** - Based on usage:
   - < 75%: Blue (#3B82F6)
   - 75% - 89%: Orange (#FF9900)
   - >= 90%: Red (#EF4444)

## Artifacts

Screenshots and videos are saved to `e2e/artifacts/`:

- `billing-subscriptions-initial.png` - Initial state
- `billing-subscriptions-before.png` - Before creating case
- `billing-usage-before-case.png` - Usage metrics before
- `billing-usage-after-case.png` - Usage metrics after
- `billing-subscriptions-final.png` - Final state

## Debugging Failed Tests

### View Trace

Failed tests capture traces (when running on CI). View them:

```bash
npx playwright show-trace e2e/reports/trace.zip
```

### Check Screenshots

Look at `e2e/artifacts/` for failure screenshots.

### Run with Extended Logging

```bash
npx playwright test --trace on e2e/tests/usage-tracking-manual.spec.ts
```

### Interactive Debug

```bash
npm run e2e:debug
```

Use the Inspector to:
- Step through tests
- Run commands in the browser console
- Inspect elements
- Pause execution

## CI/CD Integration

Tests are configured to run in CI mode in `playwright.config.ts`:

- Retries: 2x on failure
- Workers: 1 (sequential)
- forbidOnly: Prevents `.only()` in CI

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm ci
      - run: npm run build
      - run: npm run e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: e2e/reports/
          retention-days: 30
```

## Common Issues

### Tests time out waiting for Usage card

**Cause:** Page not loading or element not rendered

**Solution:**
1. Verify the frontend is running: `npm run dev`
2. Check browser console for errors
3. Increase timeout: `waitFor({ timeout: 15000 })`
4. Verify API is returning data (check network tab)

### "Cannot find module" errors

**Cause:** Path resolution issue

**Solution:**
```bash
npm install @playwright/test
npx playwright install
```

### Tests pass locally but fail in CI

**Cause:** Environment differences (network, timing, auth)

**Solution:**
1. Run with `--headed` locally to verify UI behavior
2. Use `test.fixme()` to quarantine flaky tests
3. Add explicit waits for network idle: `waitForLoadState('networkidle')`
4. Check CI environment variables are set

### Progress bar not visible

**Cause:** Element hasn't rendered yet

**Solution:**
```typescript
await page.waitForLoadState('networkidle');
await page.waitForTimeout(1000); // Give React time to render
```

## Best Practices

1. **Use Page Objects** - Encapsulate page interactions in `BillingPage` or similar
2. **Wait for Conditions** - Use `waitFor()`, `waitForLoadState()`, not `waitForTimeout()`
3. **Explicit Assertions** - Use `expect()` at key steps
4. **Isolate Tests** - Each test should be independent
5. **Capture Artifacts** - Screenshots help debug failures
6. **Log API Calls** - Verify backend responses match expectations

## Extending Tests

### Add a New Test

```typescript
test('should verify new feature', async ({ page }) => {
  const billingPage = new BillingPage(page);
  await billingPage.goto();
  
  // Your test steps here
  
  await billingPage.takeScreenshot('my-feature.png');
  await expect(billingPage.usageCard).toBeVisible();
});
```

### Add a New Page Object

Create `e2e/pages/YourPage.ts`:

```typescript
import { Page, Locator } from '@playwright/test';

export class YourPage {
  readonly page: Page;
  readonly myElement: Locator;

  constructor(page: Page) {
    this.page = page;
    this.myElement = page.locator('[data-testid="my-element"]');
  }

  async goto() {
    await this.page.goto('/your-path');
  }
}
```

## Resources

- [Playwright Docs](https://playwright.dev)
- [Playwright Test API](https://playwright.dev/docs/api/class-test)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging](https://playwright.dev/docs/debug)
