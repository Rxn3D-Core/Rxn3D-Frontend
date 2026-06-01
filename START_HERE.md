# RXN3D E2E Test Suite - START HERE

Welcome! I've created a comprehensive E2E test suite for the RXN3D billing usage tracking feature.

## What You're Getting

A complete end-to-end test suite with:
- 9 comprehensive tests (5 automated + 4 interactive)
- Page Object Model for clean, maintainable code
- API logging utility for debugging
- Full HTML + JUnit reporting
- Complete documentation with examples
- CI/CD ready configuration

## 📍 Where Everything Is

All files are located in: `/Users/gilberttuazon/Documents/Projects/RXN3D/rx be fe/Rxn3D-Frontend/`

### Root-Level Files (Read These First!)
```
E2E_TEST_SUMMARY.md              ← Overview & quick start
E2E_DIRECTORY_STRUCTURE.txt      ← File organization
START_HERE.md                    ← This file
playwright.config.ts             ← Playwright configuration
```

### E2E Test Directory
```
e2e/
├── INDEX.md                     ← Navigation guide
├── QUICK_REFERENCE.md           ← Commands & common issues
├── TEST_EXECUTION_GUIDE.md      ← Step-by-step guide
├── README.md                    ← Complete documentation
├── tests/
│   ├── billing-usage-tracking.spec.ts    ← 5 automated tests
│   └── usage-tracking-manual.spec.ts     ← 4 interactive tests
├── pages/
│   └── BillingPage.ts                    ← Page Object Model
├── fixtures/
│   └── api-logger.ts                     ← API logging utility
├── artifacts/                            ← Screenshots (created when tests run)
└── reports/                              ← HTML/JUnit reports (created when tests run)
```

## 🚀 Quick Start (3 Steps)

### Step 1: Start the Frontend Server

Open a terminal and run:

```bash
cd "/Users/gilberttuazon/Documents/Projects/RXN3D/rx be fe/Rxn3D-Frontend"
npm run dev
```

Wait for: `ready - started server on 0.0.0.0:3000`

### Step 2: Run the Tests

Open another terminal and run:

```bash
cd "/Users/gilberttuazon/Documents/Projects/RXN3D/rx be fe/Rxn3D-Frontend"
npm run e2e:headed
```

Watch the browser open and execute tests.

### Step 3: View the Report

After tests complete:

```bash
npm run e2e:report
```

Opens an interactive HTML report with screenshots and results.

## 📖 Documentation Reading Order

1. **This file** - You're reading it!
2. **E2E_TEST_SUMMARY.md** - Overview of what was created
3. **e2e/QUICK_REFERENCE.md** - Common commands and quick lookup
4. **e2e/TEST_EXECUTION_GUIDE.md** - Detailed step-by-step instructions
5. **e2e/README.md** - Complete reference with best practices

## 🧪 Test Overview

### What the Tests Do

The tests verify that the billing usage tracking feature works correctly:

1. **Page loads** - Navigate to `/billing/subscriptions`
2. **Usage card displays** - Shows slip count, usage %, progress bar
3. **Metrics are correct** - Values extracted from API match display
4. **Progress bar works** - Width and color based on usage %
5. **API responds** - `/billing-usage` endpoint returns required fields
6. **UI updates** - After creating a case, usage metrics update

### Test Files

**`e2e/tests/billing-usage-tracking.spec.ts`** (5 tests)
- Automated tests for core functionality
- Fast, reliable, headless execution
- Run: `npm run e2e`

**`e2e/tests/usage-tracking-manual.spec.ts`** (4 tests)
- Interactive tests with full logging
- See browser during execution
- Best for debugging
- Run: `npm run e2e:headed`

## 🛠️ Key Files to Know About

### Page Object Model
**Location:** `e2e/pages/BillingPage.ts`

Encapsulates all interactions with the billing page:
```typescript
const billingPage = new BillingPage(page);
await billingPage.goto();
const metrics = await billingPage.getUsageMetrics();
```

Methods available:
- `goto()` - Navigate to page
- `getUsageMetrics()` - Extract usage data
- `getProgressBarWidth()` - Get progress bar width
- `getProgressBarColor()` - Get progress bar color
- `getCurrentPlanDetails()` - Get plan info
- Assertion helpers

### API Logging Utility
**Location:** `e2e/fixtures/api-logger.ts`

Logs all API calls automatically:
```typescript
const logger = new ApiLogger();
logger.setupLogging(page);
// ... run test ...
logger.printBillingLogs();
logger.getSummary();
```

## 💡 Common Commands

```bash
# Start frontend (required before tests)
npm run dev

# Run all tests (no browser, fast)
npm run e2e

# Run with browser visible (recommended for first run)
npm run e2e:headed

# Debug mode (interactive step-through)
npm run e2e:debug

# View HTML report
npm run e2e:report

# Run specific test file
npx playwright test e2e/tests/usage-tracking-manual.spec.ts

# Run tests matching a pattern
npx playwright test -k "should log"
```

## 📊 Expected Test Output

When you run tests, you should see:

```
PASS  e2e/tests/usage-tracking-manual.spec.ts (4 tests)
  ✓ should log billing-usage API calls and responses (5s)
  ✓ should verify Usage card structure and content (3s)
  ✓ should verify billing-usage endpoint response structure (2s)
  ✓ should verify progress bar color based on usage percentage (1s)

4 passed, 0 failed
```

Plus:
- Screenshots in `e2e/artifacts/`
- HTML report in `e2e/reports/index.html`
- Console logs showing API calls and metrics

## 🔍 Troubleshooting

### Tests time out
- Verify `npm run dev` is running on port 3000
- Check DevTools Network tab for `/billing-usage` requests
- See `e2e/QUICK_REFERENCE.md` for more solutions

### Elements not found
- Run with `--headed` to see what's happening: `npm run e2e:headed`
- Open DevTools (F12) and inspect elements
- Verify UI is rendering correctly

### API response not captured
- Check backend is running (if using separate backend)
- Verify API endpoint returns JSON
- Check console for CORS errors
- See `e2e/TEST_EXECUTION_GUIDE.md` for solutions

## 🔗 Understanding the Data Flow

```
1. Test starts
    ↓
2. Frontend loads /billing/subscriptions
    ↓
3. Frontend calls GET /billing-usage API
    ↓
4. Backend returns slip_count, slip_capacity, etc.
    ↓
5. Frontend renders Usage card with metrics
    ↓
6. Test extracts values using BillingPage locators
    ↓
7. Test verifies values match expectations
    ↓
8. Screenshots captured on failure
    ↓
9. Report generated
```

## 📋 API Response Format

The tests expect this from `/billing-usage?customer_id={id}`:

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

Or wrapped:
```json
{
  "data": { ... }
}
```

## 🎯 What Gets Generated

After running tests, you get:

**Artifacts** (`e2e/artifacts/`)
- Screenshots of page state
- Videos of test execution
- Debug information

**Reports** (`e2e/reports/`)
- `index.html` - Interactive HTML report (open in browser)
- `junit.xml` - JUnit format for CI integration
- `trace.zip` - Full execution trace for debugging

## 🔐 CI/CD Integration

Tests are ready for CI/CD. Example for GitHub Actions:

```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npm run e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-reports
          path: e2e/reports/
```

See `e2e/TEST_EXECUTION_GUIDE.md` for more CI/CD examples.

## 📝 Maintenance

### Update Selectors (if UI changes)
1. Edit `e2e/pages/BillingPage.ts`
2. Update the `readonly` locator properties
3. Run tests to verify

### Add New Test
1. Create `.spec.ts` file in `e2e/tests/`
2. Use `BillingPage` for interactions
3. Add assertions
4. Run: `npx playwright test`

### Quarantine Flaky Test
```typescript
test.fixme('test name', async ({ page }) => {
  // Issue #123 - flaky timing issue
})
```

## 🎓 Learning Resources

- **Playwright Docs**: https://playwright.dev
- **Test Best Practices**: See `e2e/README.md`
- **Page Object Model**: See `e2e/pages/BillingPage.ts`
- **Debugging**: Run `npm run e2e:debug`

## ✅ Checklist

Before considering tests "ready":

- [ ] Run tests: `npm run e2e:headed`
- [ ] Review console logs for API calls
- [ ] Check screenshots in `e2e/artifacts/`
- [ ] View HTML report: `npm run e2e:report`
- [ ] All tests pass
- [ ] No errors in console
- [ ] Commit tests to git
- [ ] Integrate with CI/CD

## 🚨 Next Steps

### Right Now
1. Read `E2E_TEST_SUMMARY.md` (5 min)
2. Run `npm run dev` in one terminal
3. Run `npm run e2e:headed` in another terminal
4. Watch tests execute and see the UI

### Today
1. Review test code: `e2e/tests/usage-tracking-manual.spec.ts`
2. Check HTML report: `npm run e2e:report`
3. Run `npm run e2e:debug` and step through a test
4. Read `e2e/README.md` for best practices

### This Week
1. Integrate tests into CI/CD pipeline
2. Update selectors if UI changes
3. Add more tests for new features
4. Document custom test utilities if needed

## 📞 Need Help?

1. **Quick lookup**: See `e2e/QUICK_REFERENCE.md`
2. **Step-by-step**: See `e2e/TEST_EXECUTION_GUIDE.md`
3. **Complete guide**: See `e2e/README.md`
4. **Navigation**: See `e2e/INDEX.md`
5. **Debugging**: Run `npm run e2e:debug`

## 📂 All File Locations (Absolute Paths)

```
/Users/gilberttuazon/Documents/Projects/RXN3D/rx be fe/Rxn3D-Frontend/
├── E2E_TEST_SUMMARY.md
├── E2E_DIRECTORY_STRUCTURE.txt
├── START_HERE.md                          ← You are here
├── playwright.config.ts
├── package.json                           (modified)
└── e2e/
    ├── INDEX.md
    ├── README.md
    ├── QUICK_REFERENCE.md
    ├── TEST_EXECUTION_GUIDE.md
    ├── tests/
    │   ├── billing-usage-tracking.spec.ts
    │   └── usage-tracking-manual.spec.ts
    ├── pages/
    │   └── BillingPage.ts
    ├── fixtures/
    │   └── api-logger.ts
    ├── artifacts/                         (created on test run)
    └── reports/                           (created on test run)
```

## Summary

You now have a production-ready E2E test suite that:

✅ Tests critical billing functionality
✅ Provides detailed API logging
✅ Generates HTML reports
✅ Integrates with CI/CD
✅ Is well-documented
✅ Uses best practices (Page Objects, etc.)
✅ Captures artifacts for debugging

Start by running:

```bash
npm run dev
npm run e2e:headed
```

Then read `E2E_TEST_SUMMARY.md` for complete details.

Good luck! 🎉
