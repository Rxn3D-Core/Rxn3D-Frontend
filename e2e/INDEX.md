# E2E Test Suite - Complete Index

This document indexes all E2E test files and documentation for the RXN3D billing usage tracking feature.

## Quick Navigation

### 📖 Documentation (Start Here!)
- **[E2E_TEST_SUMMARY.md](../E2E_TEST_SUMMARY.md)** - Executive summary of what was created
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Commands, selectors, and common issues
- **[TEST_EXECUTION_GUIDE.md](./TEST_EXECUTION_GUIDE.md)** - Step-by-step guide to running tests
- **[README.md](./README.md)** - Complete documentation with best practices

### 🧪 Test Files
- **[tests/billing-usage-tracking.spec.ts](./tests/billing-usage-tracking.spec.ts)** - 5 automated tests
- **[tests/usage-tracking-manual.spec.ts](./tests/usage-tracking-manual.spec.ts)** - 4 interactive tests

### 🔧 Code Files
- **[pages/BillingPage.ts](./pages/BillingPage.ts)** - Page Object Model
- **[fixtures/api-logger.ts](./fixtures/api-logger.ts)** - API logging utility
- **[playwright.config.ts](../playwright.config.ts)** - Playwright configuration

### 📊 Generated Files (Created After Running Tests)
- **reports/index.html** - Interactive HTML test report
- **reports/junit.xml** - JUnit XML for CI integration
- **artifacts/** - Screenshots and videos

## What Each File Does

### Tests

#### billing-usage-tracking.spec.ts
5 automated tests for billing usage functionality:
1. `should display usage card on subscriptions page`
2. `should track slip count and usage percent`
3. `should update usage after creating a case`
4. `should capture network requests for billing-usage endpoint`
5. `should show progress bar with correct percentage`

Run: `npx playwright test e2e/tests/billing-usage-tracking.spec.ts`

#### usage-tracking-manual.spec.ts
4 interactive tests designed for `--headed` mode:
1. `should log billing-usage API calls and responses`
2. `should verify Usage card structure and content`
3. `should verify billing-usage endpoint response structure`
4. `should verify progress bar color based on usage percentage`

Run: `npm run e2e:headed -- e2e/tests/usage-tracking-manual.spec.ts`

### Page Objects

#### BillingPage.ts
Page Object Model encapsulating:
- Navigation to `/billing/subscriptions`
- Card element locators (Current Plan, Usage, Next Billing Date)
- Metrics extraction methods
- Assertion helpers

Usage:
```typescript
const billingPage = new BillingPage(page);
await billingPage.goto();
const metrics = await billingPage.getUsageMetrics();
```

### Utilities

#### api-logger.ts
API request/response logging utility:
- Automatic request/response capture
- Filtering by endpoint, method, status
- Response time tracking
- Summary statistics

Usage:
```typescript
const logger = new ApiLogger();
logger.setupLogging(page);
// ... run test ...
logger.printBillingLogs();
```

### Configuration

#### playwright.config.ts
Configures:
- Base URL: `http://localhost:3000`
- Browser: Chromium
- Reports: HTML + JUnit
- Trace: on-first-retry
- Screenshots: on-failure

### Documentation

#### E2E_TEST_SUMMARY.md (Parent Directory)
- Overview of what was created
- Expected API response format
- Quick start instructions
- Test coverage details
- File structure
- Troubleshooting guide

#### QUICK_REFERENCE.md
- Common commands
- File locations
- Key elements and locators
- Common issues and solutions
- Performance baselines
- Maintenance checklist

#### TEST_EXECUTION_GUIDE.md
- Step-by-step execution instructions
- Test-by-test breakdown
- Expected behavior
- Debugging failed tests
- CI/CD integration examples
- Performance testing

#### README.md
- Full setup and installation
- Running tests (all variants)
- Test reporting
- Debugging guide
- Best practices
- Common issues
- Extending tests

#### INDEX.md (This File)
Navigation guide for all E2E test files.

## Getting Started

### 1. Read the Summary
Start with **E2E_TEST_SUMMARY.md** for an overview of everything that was created.

### 2. Quick Start
Use **QUICK_REFERENCE.md** for common commands:
```bash
npm run dev
npm run e2e:headed
```

### 3. Learn Details
Read **TEST_EXECUTION_GUIDE.md** for detailed step-by-step instructions.

### 4. Use the Tests
Run tests with: `npm run e2e`

### 5. Refer to Full Docs
Consult **README.md** for best practices and advanced usage.

## Common Tasks

### Run All Tests
```bash
npm run dev  # Terminal 1
npm run e2e  # Terminal 2
```

### Run Tests With Browser Visible
```bash
npm run dev  # Terminal 1
npm run e2e:headed  # Terminal 2
```

### Debug Failing Test
```bash
npm run e2e:debug
```

### View HTML Report
```bash
npm run e2e:report
```

### Run Specific Test
```bash
npx playwright test e2e/tests/usage-tracking-manual.spec.ts
```

### Update Test (if UI Changed)
Edit `e2e/pages/BillingPage.ts` to update selectors.

## File Relationships

```
playwright.config.ts
├─→ e2e/tests/billing-usage-tracking.spec.ts
│   ├─→ uses BillingPage
│   └─→ captures screenshots
├─→ e2e/tests/usage-tracking-manual.spec.ts
│   ├─→ uses BillingPage
│   ├─→ uses ApiLogger
│   └─→ logs all API calls
├─→ e2e/pages/BillingPage.ts
│   └─→ encapsulates page interactions
├─→ e2e/fixtures/api-logger.ts
│   └─→ logs API requests/responses
└─→ e2e/artifacts/ (created when tests run)
    ├─→ screenshots
    └─→ videos
```

## Test Data Flow

1. **Test Runs** → `e2e/tests/billing-usage-tracking.spec.ts`
2. **Uses** → `e2e/pages/BillingPage.ts` for element interactions
3. **Logs** → `e2e/fixtures/api-logger.ts` captures API calls
4. **Generates** → Screenshots to `e2e/artifacts/`
5. **Reports** → HTML report in `e2e/reports/index.html`

## Documentation Map

```
├─ Quick Start
│  └─ QUICK_REFERENCE.md
├─ Detailed How-To
│  └─ TEST_EXECUTION_GUIDE.md
├─ Complete Reference
│  ├─ README.md
│  └─ This File (INDEX.md)
└─ Executive Summary
   └─ E2E_TEST_SUMMARY.md (parent dir)
```

## Performance Baselines

Expected times (may vary by machine):
- Test execution: < 30s per test
- Page load: < 2000ms
- API response: < 100ms
- Full suite: < 3 minutes

## Key Concepts

### Page Object Model
Encapsulates UI interactions in `BillingPage` class:
- Easier to maintain if selectors change
- More readable test code
- Reusable across tests

### API Logging
`ApiLogger` utility captures all HTTP requests:
- Logs method, URL, status, response
- Tracks response times
- Filters by endpoint/method/status

### Assertions
Tests use Playwright assertions:
- `expect(element).toBeVisible()`
- `expect(text).toContain('Usage')`
- `expect(value).toBeGreaterThan(0)`

### Artifacts
Screenshots and videos auto-saved:
- On test failure (screenshots)
- On demand (videos)
- In CI/CD pipelines

## Integration Points

### GitHub Actions
See `TEST_EXECUTION_GUIDE.md` for example workflow.

### GitLab CI
See `README.md` for GitLab CI configuration.

### Other CI/CD
JUnit XML report in `e2e/reports/junit.xml` works with any CI system.

## Maintenance

### Update Selectors
If UI changes:
1. Run test with `--headed`
2. Inspect changed element
3. Update locator in `BillingPage.ts`

### Add New Test
1. Create test in `e2e/tests/`
2. Use `BillingPage` for interactions
3. Add assertions
4. Take screenshots

### Quarantine Flaky Test
```typescript
test.fixme('test name', async ({ page }) => {
  // Flaky - Issue #123
})
```

## Troubleshooting Quick Links

| Issue | Solution |
|-------|----------|
| Tests timeout | See TEST_EXECUTION_GUIDE.md → "Test Times Out" |
| Elements not found | See QUICK_REFERENCE.md → "Elements Not Found" |
| API response not captured | See README.md → "Common Issues" |
| Screenshot blank | See TEST_EXECUTION_GUIDE.md → "Screenshots Blank" |

## Resources

- **Playwright Docs**: https://playwright.dev
- **Best Practices**: README.md → "Best Practices"
- **CI/CD Integration**: TEST_EXECUTION_GUIDE.md → "Integration"
- **Advanced Debugging**: README.md → "Debugging"

## Summary

This E2E test suite provides:

✓ 9 comprehensive tests
✓ Page Object Model for maintainability
✓ API logging for debugging
✓ HTML + JUnit reporting
✓ Complete documentation
✓ CI/CD ready

All files are organized and documented for easy maintenance and extension.

---

**Start reading**: [E2E_TEST_SUMMARY.md](../E2E_TEST_SUMMARY.md)

**Quick start**: [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)

**Step-by-step**: [TEST_EXECUTION_GUIDE.md](./TEST_EXECUTION_GUIDE.md)
