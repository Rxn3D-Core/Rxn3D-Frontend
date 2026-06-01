# E2E Tests - Quick Reference

## File Locations

```
e2e/
├── tests/
│   ├── billing-usage-tracking.spec.ts    # Main E2E tests
│   └── usage-tracking-manual.spec.ts     # Interactive tests
├── pages/
│   └── BillingPage.ts                    # Page Object Model
├── fixtures/
│   └── api-logger.ts                     # API logging utility
├── artifacts/                             # Screenshots & videos
├── reports/                               # HTML & JUnit reports
├── playwright.config.ts                   # Playwright config
├── README.md                              # Full documentation
├── TEST_EXECUTION_GUIDE.md               # Step-by-step guide
└── QUICK_REFERENCE.md                    # This file
```

## Common Commands

```bash
# Start frontend (required before tests)
npm run dev

# Run all tests
npm run e2e

# Run tests with browser visible
npm run e2e:headed

# Run specific test file
npx playwright test e2e/tests/usage-tracking-manual.spec.ts

# Debug test (interactive inspector)
npm run e2e:debug

# View HTML report
npm run e2e:report

# Run single test with filter
npx playwright test -k "should log billing"
```

## Test Files Overview

### `billing-usage-tracking.spec.ts`
5 tests for automatic validation:
1. Usage card visibility
2. Usage metrics extraction
3. Usage updates after case creation
4. API request logging
5. Progress bar percentage

```bash
npx playwright test e2e/tests/billing-usage-tracking.spec.ts
```

### `usage-tracking-manual.spec.ts`
4 interactive tests (best with `--headed`):
1. Full API call logging with responses
2. Usage card structure validation
3. API response field validation
4. Progress bar color verification

```bash
npm run e2e:headed -- e2e/tests/usage-tracking-manual.spec.ts
```

## Key Page Elements

### BillingPage Class Usage

```typescript
import { BillingPage } from './pages/BillingPage';

const billingPage = new BillingPage(page);
await billingPage.goto();
await billingPage.expectUsageCardVisible();

const metrics = await billingPage.getUsageMetrics();
console.log('Slip count:', metrics.slipCount);
console.log('Usage %:', metrics.usagePercent);
```

### Element Locators

```typescript
// Usage Card
billingPage.usageCard                    // Entire card
billingPage.usageSlipCount               // Large number (5)
billingPage.usagePercent                 // Percentage text (5.0%)
billingPage.usageProgressBar             // Progress bar element
billingPage.usageActionButton            // "Explore Add-ons"

// Current Plan Card
billingPage.currentPlanCard              // Entire card
billingPage.currentPlanName              // Plan name
billingPage.currentPlanPrice             // Price text
billingPage.upgradePlanButton            // Upgrade button

// Next Billing Date Card
billingPage.nextBillingDateCard          // Entire card
```

## API Endpoint

### GET /billing-usage

**URL:** `/v1/billing-usage?customer_id={id}`

**Response:**
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

**Or wrapped:**
```json
{
  "data": {
    "slip_count": 5,
    "slip_capacity": 100,
    ...
  }
}
```

## Expected UI Display

### Usage Card Content

```
Usage
━━━━━━━━━━━━━━━━━━━━━━━━━━

5                           ← slip_count
5.0% used · 95 credits available
████░░░░░░░░░░░░░░░░░░░░░░  ← progress bar (5% width)

[Explore Add-ons]
```

### Progress Bar Colors
- `< 75%`: Blue (#3B82F6)
- `75-89%`: Orange (#FF9900)
- `>= 90%`: Red (#EF4444)

## Debugging Tips

### View Network Requests
1. Run test with `--headed`: `npm run e2e:headed`
2. Press `F12` in browser
3. Go to Network tab
4. Look for `/billing-usage` requests
5. Check Response tab

### View Screenshots
```bash
ls -la e2e/artifacts/
open e2e/artifacts/billing-subscriptions-before.png
```

### View HTML Report
```bash
npm run e2e:report
```
Opens interactive report with screenshots, videos, traces.

### Step Through Test
```bash
npm run e2e:debug
```
Opens Playwright Inspector. Use:
- Step over (F10)
- Step into (F11)
- Continue (F8)
- Pause/Resume

### Check Console Logs
During `--headed` run:
- Open DevTools (F12)
- Console tab shows all logs
- Look for API responses
- Check for errors

## Test Artifacts

### Saved After Each Run
```
e2e/artifacts/
├── billing-subscriptions-before.png
├── billing-subscriptions-after.png
├── billing-usage-before-case.png
├── billing-usage-after-case.png
└── billing-subscriptions-final.png

e2e/reports/
├── index.html                           # Open in browser
├── junit.xml                            # CI/CD integration
└── trace.zip                            # Full execution trace
```

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Tests hang/timeout | Verify `npm run dev` running on port 3000 |
| API response not captured | Check backend running, verify endpoint returns JSON |
| Elements not found | Run with `--headed`, inspect element with DevTools |
| Screenshots blank | Clear cache: `rm -rf .next`, restart dev server |
| Flaky tests | Add explicit waits: `await page.waitForLoadState('networkidle')` |

## CI/CD Integration

### GitHub Actions
```yaml
- run: npm run e2e
- uses: actions/upload-artifact@v3
  if: always()
  with:
    name: playwright-reports
    path: e2e/reports/
```

### GitLab CI
```yaml
e2e-tests:
  script:
    - npm run e2e
  artifacts:
    paths:
      - e2e/reports/
    when: always
```

## Performance Baselines

Expected API response times:
- `/billing-usage`: < 100ms
- Page load: < 2000ms
- Test execution: < 30s per test

## Selector Best Practices

### Good (stable)
```typescript
page.locator('[data-testid="usage-card"]')
page.locator('text=Usage')
page.locator('section').filter({ has: page.locator('text=Usage') })
```

### Avoid (fragile)
```typescript
page.locator('div:nth-child(2) > section > h2')
page.locator('.chakra-css-abcd123')  // generated classes
```

## Test Data

No login required for these tests (assumes already authenticated).

If authentication needed:
```bash
TEST_EMAIL=user@example.com TEST_PASSWORD=password123 npm run e2e
```

## Maintenance Checklist

- [ ] Tests run locally successfully
- [ ] All assertions pass
- [ ] Artifacts captured
- [ ] HTML report viewable
- [ ] API calls logged correctly
- [ ] No flaky test runs
- [ ] Performance acceptable
- [ ] CI/CD integration working

## Resources

- **Playwright Docs**: https://playwright.dev/docs/intro
- **Assertions**: https://playwright.dev/docs/test-assertions
- **Selectors**: https://playwright.dev/docs/locators
- **Debugging**: https://playwright.dev/docs/debug
- **CI/CD**: https://playwright.dev/docs/ci

## Next Steps

1. Run tests: `npm run e2e:headed`
2. Review artifacts in `e2e/artifacts/`
3. Check HTML report: `npm run e2e:report`
4. Investigate any failures
5. Update selectors if UI changed
6. Commit E2E tests to version control
7. Integrate with CI/CD pipeline
