import { Page } from '@playwright/test';

/**
 * API Request/Response logging fixture
 * Captures all API calls during test execution
 */

export interface ApiLogEntry {
  method: string;
  url: string;
  status: number;
  responseBody: unknown;
  timestamp: string;
  duration: number;
}

export class ApiLogger {
  private logs: ApiLogEntry[] = [];
  private requestTimestamps: Map<string, number> = new Map();

  /**
   * Setup API logging on a page
   */
  setupLogging(page: Page): void {
    page.on('request', (request) => {
      // Store request timestamp for duration calculation
      this.requestTimestamps.set(request.url(), Date.now());
    });

    page.on('response', async (response) => {
      const startTime = this.requestTimestamps.get(response.url()) || Date.now();
      const duration = Date.now() - startTime;

      try {
        let responseBody: unknown;

        // Try to parse JSON response
        try {
          responseBody = await response.json();
        } catch {
          // Not JSON, try text
          responseBody = await response.text().catch(() => null);
        }

        this.logs.push({
          method: response.request().method(),
          url: response.url(),
          status: response.status(),
          responseBody,
          timestamp: new Date().toISOString(),
          duration,
        });
      } catch (error) {
        console.error('Failed to log API response:', error);
      }
    });
  }

  /**
   * Get all logs
   */
  getAll(): ApiLogEntry[] {
    return this.logs;
  }

  /**
   * Get logs for a specific endpoint pattern
   */
  getByEndpoint(pattern: string | RegExp): ApiLogEntry[] {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    return this.logs.filter((log) => regex.test(log.url));
  }

  /**
   * Get billing-usage endpoint logs
   */
  getBillingUsageLogs(): ApiLogEntry[] {
    return this.getByEndpoint('/billing-usage');
  }

  /**
   * Get logs filtered by method
   */
  getByMethod(method: string): ApiLogEntry[] {
    return this.logs.filter((log) => log.method === method);
  }

  /**
   * Get logs filtered by status code
   */
  getByStatus(status: number): ApiLogEntry[] {
    return this.logs.filter((log) => log.status === status);
  }

  /**
   * Print all logs to console
   */
  printAll(): void {
    console.log('\n=== API Call Log ===\n');
    this.logs.forEach((log) => {
      console.log(`[${log.timestamp}] ${log.method} ${log.url}`);
      console.log(`  Status: ${log.status} | Duration: ${log.duration}ms`);
      if (log.responseBody) {
        console.log(`  Response: ${JSON.stringify(log.responseBody).substring(0, 200)}...`);
      }
    });
    console.log('\n=== End API Call Log ===\n');
  }

  /**
   * Print only billing-related logs
   */
  printBillingLogs(): void {
    console.log('\n=== Billing API Logs ===\n');
    const billingLogs = this.getBillingUsageLogs();
    billingLogs.forEach((log) => {
      console.log(`${log.method} ${log.url}`);
      console.log(`Status: ${log.status} | Duration: ${log.duration}ms`);
      console.log(JSON.stringify(log.responseBody, null, 2));
    });
    console.log('\n=== End Billing API Logs ===\n');
  }

  /**
   * Get average response time for an endpoint
   */
  getAverageResponseTime(pattern: string | RegExp): number {
    const logs = this.getByEndpoint(pattern);
    if (logs.length === 0) return 0;
    const total = logs.reduce((sum, log) => sum + log.duration, 0);
    return total / logs.length;
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.logs = [];
    this.requestTimestamps.clear();
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    totalRequests: number;
    totalDuration: number;
    averageResponseTime: number;
    successCount: number;
    errorCount: number;
  } {
    const totalRequests = this.logs.length;
    const totalDuration = this.logs.reduce((sum, log) => sum + log.duration, 0);
    const successCount = this.logs.filter((log) => log.status >= 200 && log.status < 300).length;
    const errorCount = this.logs.filter((log) => log.status >= 400).length;

    return {
      totalRequests,
      totalDuration,
      averageResponseTime: totalRequests > 0 ? totalDuration / totalRequests : 0,
      successCount,
      errorCount,
    };
  }

  /**
   * Find specific billing-usage response with expected fields
   */
  findBillingUsageWithFields(
    expectedFields: (keyof typeof null)[]
  ): ApiLogEntry | undefined {
    return this.getBillingUsageLogs().find((log) => {
      if (!log.responseBody || typeof log.responseBody !== 'object') {
        return false;
      }

      const data = (log.responseBody as Record<string, unknown>)?.data || log.responseBody;
      if (typeof data !== 'object' || data === null) {
        return false;
      }

      return expectedFields.every((field) => field in data);
    });
  }
}
