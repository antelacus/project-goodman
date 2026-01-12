/**
 * Integration Tests for Report Generation API
 *
 * Tests the report generation API endpoints:
 * 1. GET /api/financial-data/years - Available years
 * 2. POST /api/reports/parse-config - Config intent parsing
 * 3. POST /api/reports/generate - Report generation (SSE)
 * 4. POST /api/reports/save - Report saving
 * 5. GET /api/reports - Report listing
 * 6. GET /api/reports/[id] - Single report
 *
 * Run with: npx tsx tests/integration/report-generation.test.ts
 *
 * Prerequisites:
 * - Dev server running on localhost:3000
 * - Financial data exists in database
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

// ============================================================================
// Test Utilities
// ============================================================================

let passCount = 0;
let failCount = 0;
let cookies: string = '';

function test(name: string, fn: () => Promise<void>): Promise<void> {
  return fn()
    .then(() => {
      console.log(`✅ PASS: ${name}`);
      passCount++;
    })
    .catch((error: Error) => {
      console.log(`❌ FAIL: ${name}`);
      console.log(`   Error: ${error.message}`);
      failCount++;
    });
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function fetchWithCookies(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  if (cookies) {
    headers.set('Cookie', cookies);
  }

  const response = await fetch(url, { ...options, headers });

  // Capture set-cookie headers
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) {
    cookies = setCookie.split(';')[0];
  }

  return response;
}

// ============================================================================
// Integration Tests
// ============================================================================

async function runTests() {
  console.log('\n========================================');
  console.log('Report Generation Integration Tests');
  console.log(`Base URL: ${BASE_URL}`);
  console.log('========================================\n');

  // ---------------------------------------------------------------------------
  // Test Group 1: Financial Data Years API
  // ---------------------------------------------------------------------------
  console.log('\n--- Financial Data Years API ---\n');

  let availableYears: string[] = [];

  await test('GET /api/financial-data/years returns available years', async () => {
    const response = await fetchWithCookies(`${BASE_URL}/api/financial-data/years`);
    assert(response.ok, `Expected 200, got ${response.status}`);

    const data = await response.json();
    assert(data.success === true, 'Response should have success: true');
    assert(data.data && Array.isArray(data.data.years), 'Response should have data.years array');

    availableYears = data.data.years;
    console.log(`   Available years: ${availableYears.join(', ') || 'none'}`);
  });

  // ---------------------------------------------------------------------------
  // Test Group 2: Report Config Parsing API
  // ---------------------------------------------------------------------------
  console.log('\n--- Report Config Parsing API ---\n');

  await test('POST /api/reports/parse-config parses confirm intent', async () => {
    if (availableYears.length === 0) {
      console.log('   Skipped: No available years');
      return;
    }

    const response = await fetchWithCookies(`${BASE_URL}/api/reports/parse-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userMessage: '确认',
        currentConfig: {
          year: availableYears[0],
          comparisonYear: availableYears[1] || null,
        },
        availableYears,
      }),
    });

    assert(response.ok, `Expected 200, got ${response.status}`);

    const data = await response.json();
    assert(data.success === true, 'Response should have success: true');
    assert(data.data?.intent === 'confirm', `Expected intent "confirm", got "${data.data?.intent}"`);
  });

  await test('POST /api/reports/parse-config parses year change intent', async () => {
    if (availableYears.length < 2) {
      console.log('   Skipped: Need at least 2 years');
      return;
    }

    const response = await fetchWithCookies(`${BASE_URL}/api/reports/parse-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userMessage: `改成${availableYears[1]}年`,
        currentConfig: {
          year: availableYears[0],
          comparisonYear: null,
        },
        availableYears,
      }),
    });

    assert(response.ok, `Expected 200, got ${response.status}`);

    const data = await response.json();
    assert(data.success === true, 'Response should have success: true');
    assert(
      data.data?.intent === 'change_year' || data.data?.year === availableYears[1],
      'Should parse year change intent'
    );
  });

  await test('POST /api/reports/parse-config parses cancel intent', async () => {
    const response = await fetchWithCookies(`${BASE_URL}/api/reports/parse-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userMessage: '取消',
        currentConfig: {
          year: availableYears[0] || '2024',
          comparisonYear: null,
        },
        availableYears: availableYears.length > 0 ? availableYears : ['2024'],
      }),
    });

    assert(response.ok, `Expected 200, got ${response.status}`);

    const data = await response.json();
    assert(data.success === true, 'Response should have success: true');
    assert(data.data?.intent === 'cancel', `Expected intent "cancel", got "${data.data?.intent}"`);
  });

  // ---------------------------------------------------------------------------
  // Test Group 3: Report Generation API (SSE)
  // ---------------------------------------------------------------------------
  console.log('\n--- Report Generation API ---\n');

  let generatedReport: any = null;

  await test('POST /api/reports/generate returns SSE stream', async () => {
    if (availableYears.length === 0) {
      console.log('   Skipped: No available years');
      return;
    }

    const response = await fetchWithCookies(`${BASE_URL}/api/reports/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        year: availableYears[0],
        comparisonYear: availableYears[1] || undefined,
      }),
    });

    assert(response.ok, `Expected 200, got ${response.status}`);
    assert(
      response.headers.get('content-type')?.includes('text/event-stream'),
      'Should return text/event-stream'
    );

    // Read SSE stream
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';
    let eventCount = 0;
    let hasCompleteEvent = false;

    const startTime = Date.now();
    const timeout = 120000; // 2 minutes timeout

    while (true) {
      if (Date.now() - startTime > timeout) {
        throw new Error('SSE stream timeout');
      }

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          eventCount++;
          try {
            const eventData = JSON.parse(line.slice(6));
            if (eventData.type === 'complete') {
              hasCompleteEvent = true;
              generatedReport = eventData.data?.content;
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }

    console.log(`   Received ${eventCount} SSE events`);
    assert(hasCompleteEvent, 'Should receive complete event');
    assert(generatedReport !== null, 'Should have generated report content');
  });

  await test('Generated report has correct structure', async () => {
    if (!generatedReport) {
      console.log('   Skipped: No generated report');
      return;
    }

    assert(typeof generatedReport.title === 'string', 'Report should have title');
    assert(typeof generatedReport.year === 'string', 'Report should have year');
    assert(Array.isArray(generatedReport.sections), 'Report should have sections array');
    assert(generatedReport.sections.length === 5, `Expected 5 sections, got ${generatedReport.sections.length}`);
    assert(generatedReport.summary !== undefined, 'Report should have summary');

    console.log(`   Report title: ${generatedReport.title}`);
    console.log(`   Sections: ${generatedReport.sections.map((s: any) => s.id).join(', ')}`);
  });

  // ---------------------------------------------------------------------------
  // Test Group 4: Report Save API
  // ---------------------------------------------------------------------------
  console.log('\n--- Report Save API ---\n');

  let savedReportId: string | null = null;

  await test('POST /api/reports/save requires CSRF token', async () => {
    if (!generatedReport) {
      console.log('   Skipped: No generated report');
      return;
    }

    // Try without CSRF token - should fail
    const response = await fetchWithCookies(`${BASE_URL}/api/reports/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: generatedReport,
        year: generatedReport.year,
        comparisonYear: generatedReport.comparisonYear,
      }),
    });

    assert(response.status === 403, `Expected 403 without CSRF, got ${response.status}`);
  });

  await test('POST /api/reports/save works with CSRF token', async () => {
    if (!generatedReport) {
      console.log('   Skipped: No generated report');
      return;
    }

    // Get CSRF token
    const csrfResponse = await fetchWithCookies(`${BASE_URL}/api/auth/csrf`);
    const csrfData = await csrfResponse.json();
    assert(csrfData.success && csrfData.token, 'Should get CSRF token');

    // Save with CSRF token
    const response = await fetchWithCookies(`${BASE_URL}/api/reports/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfData.token,
      },
      body: JSON.stringify({
        content: generatedReport,
        year: generatedReport.year,
        comparisonYear: generatedReport.comparisonYear,
      }),
    });

    assert(response.ok, `Expected 200, got ${response.status}`);

    const data = await response.json();
    assert(data.success === true, 'Response should have success: true');
    assert(typeof data.data?.reportId === 'string', 'Should return reportId');

    savedReportId = data.data.reportId;
    console.log(`   Saved report ID: ${savedReportId}`);

    if (data.data?.pdfUrl) {
      console.log(`   PDF URL generated: Yes`);
    } else {
      console.log(`   PDF URL generated: No (may have failed)`);
    }
  });

  // ---------------------------------------------------------------------------
  // Test Group 5: Report Listing API
  // ---------------------------------------------------------------------------
  console.log('\n--- Report Listing API ---\n');

  await test('GET /api/reports returns report list', async () => {
    const response = await fetchWithCookies(`${BASE_URL}/api/reports`);
    assert(response.ok, `Expected 200, got ${response.status}`);

    const data = await response.json();
    assert(data.success === true, 'Response should have success: true');
    assert(data.data && Array.isArray(data.data.reports), 'Response should have data.reports array');

    console.log(`   Total reports: ${data.data.reports.length}`);

    if (savedReportId) {
      const found = data.data.reports.find((r: any) => r.id === savedReportId);
      assert(found !== undefined, 'Should find the saved report in list');
    }
  });

  // ---------------------------------------------------------------------------
  // Test Group 6: Single Report API
  // ---------------------------------------------------------------------------
  console.log('\n--- Single Report API ---\n');

  await test('GET /api/reports/[id] returns report details', async () => {
    if (!savedReportId) {
      console.log('   Skipped: No saved report');
      return;
    }

    const response = await fetchWithCookies(`${BASE_URL}/api/reports/${savedReportId}`);
    assert(response.ok, `Expected 200, got ${response.status}`);

    const data = await response.json();
    assert(data.success === true, 'Response should have success: true');
    assert(data.data?.report !== undefined, 'Should return report object');
    assert(data.data.report.id === savedReportId, 'Report ID should match');

    console.log(`   Retrieved report: ${data.data.report.title}`);
  });

  await test('GET /api/reports/[id] returns 404 for invalid ID', async () => {
    const response = await fetchWithCookies(`${BASE_URL}/api/reports/00000000-0000-0000-0000-000000000000`);
    assert(response.status === 404, `Expected 404, got ${response.status}`);
  });

  await test('GET /api/reports/[id] returns 400 for invalid UUID format', async () => {
    const response = await fetchWithCookies(`${BASE_URL}/api/reports/invalid-id`);
    assert(response.status === 400, `Expected 400, got ${response.status}`);
  });

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log('\n========================================');
  console.log(`Results: ${passCount} passed, ${failCount} failed`);
  console.log('========================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('Test runner error:', error);
  process.exit(1);
});
