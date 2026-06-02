# Billing Usage Tracking - Test Execution Guide

This guide walks you through executing the billing usage tracking E2E tests for the RXN3D frontend.

## Quick Start

### 1. Start the Frontend Server

```bash
cd "/Users/gilberttuazon/Documents/Projects/RXN3D/rx be fe/Rxn3D-Frontend"
npm run dev
```

Wait for the message `ready - started server on 0.0.0.0:3000`.

### 2. Run the Manual Test (Recommended First)

In a new terminal:

```bash
cd "/Users/gilberttuazon/Documents/Projects/RXN3D/rx be fe/Rxn3D-Frontend"
npm run e2e:headed -- e2e/tests/usage-tracking-manual.spec.ts
```

This will:
- Open Chromium browser
- Navigate to `/billing/subscriptions`
- Extract and log usage metrics
- Capture all API requests/responses
- Display progress bar info
- Take screenshots

**Expected Output:**
```
PASS  e2e/tests/usage-tracking-manual.spec.ts (2 tests)
  ✓ should log billing-usage API calls and responses
  ✓ should verify Usage card structure and content
  ✓ should verify billing-usage endpoint response structure
  ✓ should verify progress bar color based on usage percentage
```

## Step-by-Step Test Execution

### Test 1: Verify Billing Page Loads

```bash
npx playwright test e2e/tests/usage-tracking-manual.spec.ts -k "should log billing"
```

This test:
1. Navigates to `/billing/subscriptions`
2. Logs all billing-related API calls
3. Extracts usage metrics from the UI
4. Verifies the API response structure
5. Takes screenshots

**What to look for:**
- Browser opens and navigates to `/billing/subscriptions`
- Usage card displays with large number (slip count)
- Progress bar visible with width corresponding to usage %
- Console logs show API calls with responses

### Test 2: Verify Usage Card Structure

```bash
npx playwright test e2e/tests/usage-tracking-manual.spec.ts -k "Usage card structure"
```

This test verifies:
- Title "Usage" is present
- Slip count value is visible
- Progress bar is visible
- Action button ("Explore Add-ons") is visible

### Test 3: Verify API Response Structure

```bash
npx playwright test e2e/tests/usage-tracking-manual.spec.ts -k "endpoint response structure"
```

This test checks the `/billing-usage` API response contains:
- `slip_count` - Current number of slips/cases
- `slip_capacity` - Maximum slips allowed
- `period_start` - Billing period start date
- `period_end` - Billing period end date

### Test 4: Verify Progress Bar Colors

```bash
npx playwright test e2e/tests/usage-tracking-manual.spec.ts -k "progress bar color"
```

This test verifies progress bar color logic:
- < 75% usage: Blue (#3B82F6)
- 75-89% usage: Orange (#FF9900)
- >= 90% usage: Red (#EF4444)

## Run All Tests

```bash
npm run e2e
```

This runs all tests in headless mode (no browser UI).

## View Test Results

### HTML Report

```bash
npm run e2e:report
```

Opens interactive HTML report with:
- Test results
- Screenshots on failure
- Video recordings
- Execution traces

### Console Output

Tests print detailed logs:
- API requests and responses
- Usage metrics extraction
- Element visibility checks
- Timing information

## Debugging Failed Tests

### Run with Full Logging

```bash
npx playwright test e2e/tests/usage-tracking-manual.spec.ts --trace on
```

This captures:
- Full trace of all interactions
- Screenshots at each step
- Console output
- Network requests

View the trace:

```bash
npx playwright show-trace e2e/reports/trace.zip
```

### Interactive Debug Mode

```bash
npm run e2e:debug
```

This opens the Playwright Inspector where you can:
- Step through tests line by line
- Inspect elements on the page
- Run JavaScript in browser console
- Pause at breakpoints

### Check Test Artifacts

Screenshots and artifacts are saved to `e2e/artifacts/`:

```bash
ls -la e2e/artifacts/
```

You should see:
- `billing-subscriptions-before.png`
- `billing-subscriptions-final.png`
- Other screenshots taken during tests

### View Network Traffic

In headed mode, open DevTools in the browser:

1. Click the browser window
2. Press `F12` to open DevTools
3. Go to Network tab
4. Look for `/billing-usage` requests
5. Check response contains:
   ```json
   {
     "slip_count": 5,
     "slip_capacity": 100,
     "period_start": "2026-05-01",
     "period_end": "2026-05-31"
   }
   ```

## Expected Behavior

### Before Creating a Case

1. Page loads with Usage card visible
2. Usage card shows:
   - Slip count: e.g., "5"
   - Usage percent: e.g., "5.0% used"
   - Progress bar width matches percentage
   - Credits available (if in response)
3. Progress bar color: Blue (< 75%)

### API Response Structure

The `GET /billing-usage?customer_id={id}` endpoint should return:

```json
{
  "slip_count": 5,
  "slip_capacity": 100,
  "credit_used": 0,
  "overage_count": 0,
  "period_start": "2026-05-01",
  "period_end": "2026-05-31",
  "remaining_slips": 95
}
```

Or wrapped in `data`:

```json
{
  "data": {
    "slip_count": 5,
    "slip_capacity": 100,
    ...
  }
}
```

## Troubleshooting

### Test Times Out Waiting for Usage Card

**Problem:** Tests hang waiting for the Usage card

**Solutions:**
1. Verify frontend is running: `npm run dev`
2. Check `/billing/subscriptions` loads in browser
3. Verify API is responding: Check DevTools Network tab
4. Increase timeout:
   ```typescript
   await billingPage.usageCard.waitFor({ timeout: 15000 });
   ```

### API Response Not Captured

**Problem:** Tests don't capture billing-usage API response

**Solutions:**
1. Verify backend is running (if using separate backend)
2. Check API URL in frontend config (`.env.local`)
3. Verify customer_id is sent in request
4. Check for CORS errors in console
5. Verify API returns valid JSON

### Progress Bar Not Visible

**Problem:** Progress bar element not found

**Solutions:**
1. Check page loaded: `await page.waitForLoadState('networkidle')`
2. Add explicit wait: `await page.waitForTimeout(1000)`
3. Verify CSS selector: Update `usageProgressBar` locator
4. Check element visibility: Press F12 in browser, inspect

### Screenshots Look Empty/Blank

**Problem:** Artifacts show blank pages

**Solutions:**
1. Verify Next.js build succeeded: `npm run build`
2. Clear cache: `rm -rf .next`
3. Restart dev server: `npm run dev`
4. Check for blocking modals/overlays

## Integration with CI/CD

### GitHub Actions Example

Add to `.github/workflows/e2e.yml`:

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
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
          name: playwright-reports
          path: e2e/reports/
          retention-days: 30
```

## Test Maintenance

### Update Selectors If UI Changes

If the billing page structure changes:

1. Open the page in browser
2. Inspect element you're looking for
3. Update locator in `e2e/pages/BillingPage.ts`

Example:
```typescript
// Old
readonly usageCard = page.locator('section').filter({ has: page.locator('text=Usage') }).first();

// New (if heading changes)
readonly usageCard = page.locator('[data-testid="usage-card"]');
```

### Add `data-testid` Attributes

Improve selector stability by adding `data-testid` to key elements:

```tsx
<section data-testid="usage-card">
  <h2>Usage</h2>
  ...
</section>
```

Then in tests:
```typescript
readonly usageCard = page.locator('[data-testid="usage-card"]');
```

### Quarantine Flaky Tests

If a test is unstable, mark it as flaky:

```typescript
test.fixme('should update usage after creating a case', async ({ page }) => {
  // Flaky due to timing issues - needs investigation
})
```

Then investigate and fix.

## Performance Testing

### Measure API Response Times

Tests automatically measure and log API response times:

```
[API] GET /billing-usage?customer_id=123 → 200
Average response time: 45ms
```

If response is slow (>500ms), investigate backend:
- Check database queries
- Verify indices on `slip` table
- Check for N+1 queries
- Monitor server load

## Additional Resources

- **Playwright Docs**: https://playwright.dev
- **Test Configuration**: `playwright.config.ts`
- **Page Objects**: `e2e/pages/BillingPage.ts`
- **Test Files**: `e2e/tests/`
- **Test Artifacts**: `e2e/artifacts/`
- **Reports**: `e2e/reports/`

## Summary

The E2E tests verify:

✓ Usage card displays on `/billing/subscriptions`
✓ Usage metrics (slip count, %) are extracted correctly
✓ Progress bar width corresponds to usage percentage
✓ Progress bar colors are correct based on usage
✓ `/billing-usage` API endpoint returns required fields
✓ API response is properly unwrapped by frontend
✓ UI updates reflect API data correctly

Use these tests to ensure the billing usage tracking feature works correctly across releases.
