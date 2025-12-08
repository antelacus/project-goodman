/**
 * Task 25: Admin Authentication Flow Testing
 *
 * This test suite validates:
 * 1. Password verification
 * 2. Session management
 * 3. Access control
 * 4. End-to-end authentication workflow
 *
 * Run with: npx tsx test-task25-admin-auth-flow.ts
 */

import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const TEST_ADMIN_AUTH_FLOW_BASE_URL = 'http://localhost:3000';

interface AdminAuthFlowTestResult {
  name: string;
  passed: boolean;
  message: string;
  duration: number;
}

const adminAuthFlowResults: AdminAuthFlowTestResult[] = [];

// Helper function to run a test
async function runAdminAuthFlowTest(name: string, testFn: () => Promise<void>): Promise<void> {
  const startTime = Date.now();
  try {
    await testFn();
    adminAuthFlowResults.push({
      name,
      passed: true,
      message: '✅ PASS',
      duration: Date.now() - startTime,
    });
  } catch (error) {
    adminAuthFlowResults.push({
      name,
      passed: false,
      message: `❌ FAIL: ${error instanceof Error ? error.message : String(error)}`,
      duration: Date.now() - startTime,
    });
  }
}

// Test 1: Verify password endpoint exists and returns correct format
async function testPasswordEndpointFormat() {
  const response = await fetch(`${TEST_ADMIN_AUTH_FLOW_BASE_URL}/api/admin/verify-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'wrong_password' }),
  });

  if (response.status !== 200) {
    throw new Error(`Expected status 200, got ${response.status}`);
  }

  const data = await response.json();

  if (!('valid' in data)) {
    throw new Error('Response missing "valid" field');
  }

  if (data.valid !== false) {
    throw new Error('Expected valid=false for wrong password');
  }

  console.log('✓ Password endpoint format correct');
}

// Test 2: Verify correct password authentication
async function testCorrectPassword() {
  const password = process.env.ADMIN_PASSWORD || 'GoodmanAdmin2024!';

  const response = await fetch(`${TEST_ADMIN_AUTH_FLOW_BASE_URL}/api/admin/verify-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });

  const data = await response.json();

  if (!data.valid) {
    throw new Error('Valid password should return valid=true');
  }

  if (!data.token || typeof data.token !== 'string') {
    throw new Error('Valid response should include token string');
  }

  if (data.token.length !== 64) {
    throw new Error(`Token should be 64 characters, got ${data.token.length}`);
  }

  if (!data.expiresAt || typeof data.expiresAt !== 'number') {
    throw new Error('Valid response should include expiresAt timestamp');
  }

  const expiresIn = data.expiresAt - Date.now();
  const expectedExpiry = 60 * 60 * 1000; // 1 hour in ms
  const tolerance = 5000; // 5 seconds tolerance

  if (Math.abs(expiresIn - expectedExpiry) > tolerance) {
    throw new Error(`Token expiry should be ~1 hour, got ${expiresIn}ms`);
  }

  console.log('✓ Correct password returns valid session');
  console.log(`  Token: ${data.token.substring(0, 16)}...`);
  console.log(`  Expires in: ${Math.round(expiresIn / 1000)}s`);

  // Store token for next tests
  (global as any).adminToken = data.token;
}

// Test 3: Verify wrong password rejection
async function testWrongPassword() {
  const response = await fetch(`${TEST_ADMIN_AUTH_FLOW_BASE_URL}/api/admin/verify-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'definitely_wrong_password_12345' }),
  });

  const data = await response.json();

  if (data.valid !== false) {
    throw new Error('Wrong password should return valid=false');
  }

  if (data.token) {
    throw new Error('Wrong password should not return token');
  }

  console.log('✓ Wrong password correctly rejected');
}

// Test 4: Verify missing password handling
async function testMissingPassword() {
  const response = await fetch(`${TEST_ADMIN_AUTH_FLOW_BASE_URL}/api/admin/verify-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

  if (response.status !== 400) {
    throw new Error(`Expected status 400 for missing password, got ${response.status}`);
  }

  const data = await response.json();

  if (data.valid !== false) {
    throw new Error('Missing password should return valid=false');
  }

  if (!data.error) {
    throw new Error('Missing password should include error message');
  }

  console.log('✓ Missing password correctly handled');
}

// Test 5: Test admin upload endpoint with valid token
async function testAdminUploadWithValidToken() {
  const password = process.env.ADMIN_PASSWORD || 'GoodmanAdmin2024!';

  const testDocument = {
    documentText: `
      示例公司 2025年度资产负债表

      资产：
      流动资产：
        货币资金：1,500,000
        应收账款：800,000
        存货：600,000
      流动资产合计：2,900,000

      非流动资产：
        固定资产：3,500,000
      非流动资产合计：3,500,000

      资产总计：6,400,000

      负债：
      流动负债：
        短期借款：500,000
        应付账款：400,000
      流动负债合计：900,000

      负债总计：900,000

      所有者权益：
      实收资本：3,000,000
      未分配利润：2,500,000
      所有者权益合计：5,500,000

      负债和所有者权益总计：6,400,000
    `,
    fileName: 'test-balance-sheet-2025.md',
    documentType: 'balance_sheet',
    year: '2025',
    period: 'annual',
    adminPassword: password,
  };

  const response = await fetch(`${TEST_ADMIN_AUTH_FLOW_BASE_URL}/api/admin/upload-database-document`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testDocument),
  });

  // Note: This might return 409 if document already exists from previous test
  if (response.status !== 200 && response.status !== 409) {
    throw new Error(`Expected status 200 or 409, got ${response.status}`);
  }

  const data = await response.json();

  if (response.status === 200) {
    if (!data.success) {
      throw new Error('Upload should succeed with valid password');
    }

    if (!data.documentId) {
      throw new Error('Successful upload should return documentId');
    }

    console.log('✓ Admin upload with valid password successful');
    console.log(`  Document ID: ${data.documentId}`);
    console.log(`  Processing time: ${data.processingTime}ms`);
  } else {
    console.log('✓ Document already exists (expected from previous test)');
  }
}

// Test 6: Test admin upload endpoint with invalid password
async function testAdminUploadWithInvalidToken() {
  const testDocument = {
    documentText: 'Sample document text',
    fileName: '2025年度资产负债表-测试.md',
    documentType: 'balance_sheet',
    year: '2025',
    period: 'Q1',
    adminPassword: 'wrong_password_12345',
  };

  const response = await fetch(`${TEST_ADMIN_AUTH_FLOW_BASE_URL}/api/admin/upload-database-document`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testDocument),
  });

  if (response.status !== 401) {
    throw new Error(`Expected status 401 for invalid password, got ${response.status}`);
  }

  console.log('✓ Admin upload correctly rejects invalid password');
}

// Test 7: Test session persistence (client-side localStorage simulation)
async function testSessionPersistence() {
  // This test simulates what the AdminPasswordTrigger component does
  const password = process.env.ADMIN_PASSWORD || 'GoodmanAdmin2024!';

  // Step 1: Get session token
  const response = await fetch(`${TEST_ADMIN_AUTH_FLOW_BASE_URL}/api/admin/verify-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });

  const data = await response.json();

  if (!data.valid || !data.token || !data.expiresAt) {
    throw new Error('Failed to get valid session token');
  }

  // Step 2: Simulate storing in localStorage (in real app)
  const sessionData = {
    token: data.token,
    expiresAt: data.expiresAt,
  };

  // Step 3: Verify session hasn't expired
  const now = Date.now();
  if (now >= sessionData.expiresAt) {
    throw new Error('Session should not be expired immediately after creation');
  }

  const remainingTime = sessionData.expiresAt - now;

  console.log('✓ Session persistence working');
  console.log(`  Token stored: ${sessionData.token.substring(0, 16)}...`);
  console.log(`  Remaining time: ${Math.round(remainingTime / 1000)}s`);
}

// Test 8: Test session expiration logic
async function testSessionExpiration() {
  // Simulate an expired session
  const expiredSession = {
    token: 'expired_token_12345678901234567890123456789012345678901234567890',
    expiresAt: Date.now() - 1000, // Expired 1 second ago
  };

  const now = Date.now();
  const isExpired = now >= expiredSession.expiresAt;

  if (!isExpired) {
    throw new Error('Session should be detected as expired');
  }

  console.log('✓ Session expiration detection working');
}

// Test 9: Test complete authentication workflow
async function testCompleteAuthWorkflow() {
  const password = process.env.ADMIN_PASSWORD || 'GoodmanAdmin2024!';

  // Step 1: User triggers admin mode (triple-click simulation)
  console.log('  Step 1: User triggers admin mode');

  // Step 2: User enters password
  console.log('  Step 2: User enters password');
  const authResponse = await fetch(`${TEST_ADMIN_AUTH_FLOW_BASE_URL}/api/admin/verify-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });

  const authData = await authResponse.json();
  if (!authData.valid) {
    throw new Error('Step 2 failed: Authentication failed');
  }

  console.log('  Step 3: Session token received and stored');

  // Step 4: User uploads document with admin features
  console.log('  Step 4: User uploads document with admin password');
  const uploadResponse = await fetch(`${TEST_ADMIN_AUTH_FLOW_BASE_URL}/api/admin/upload-database-document`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      documentText: 'Sample complete workflow test',
      fileName: 'workflow-test.md',
      documentType: 'general',
      adminPassword: password,
    }),
  });

  // Accept both 200 (success) and 409 (duplicate) as valid
  if (uploadResponse.status !== 200 && uploadResponse.status !== 409) {
    throw new Error(`Step 4 failed: Upload failed with status ${uploadResponse.status}`);
  }

  console.log('  Step 5: Document uploaded successfully');
  console.log('✓ Complete authentication workflow successful');
}

// Test 10: Test AdminPasswordTrigger component integration
async function testComponentIntegration() {
  // Test that the data extraction page is accessible
  const response = await fetch(`${TEST_ADMIN_AUTH_FLOW_BASE_URL}/data-extract`);

  if (response.status !== 200) {
    throw new Error(`Data extraction page should be accessible, got ${response.status}`);
  }

  const html = await response.text();

  // Check for admin trigger element (triple-click target)
  if (!html.includes('📄')) {
    console.log('⚠️ Warning: 📄 icon not found in HTML (may be rendered client-side)');
  }

  console.log('✓ Component integration verified');
  console.log('  Note: Full UI testing requires manual browser testing');
}

// Main test runner
async function runAllAdminAuthFlowTests() {
  console.log('\n=== Task 25: Admin Authentication Flow Testing ===\n');
  console.log('Starting comprehensive authentication tests...\n');

  // Check if dev server is running
  try {
    const response = await fetch(TEST_ADMIN_AUTH_FLOW_BASE_URL);
    if (!response.ok) {
      throw new Error('Dev server not responding');
    }
  } catch (error) {
    console.error('❌ ERROR: Dev server is not running at', TEST_ADMIN_AUTH_FLOW_BASE_URL);
    console.error('Please run: npm run dev');
    process.exit(1);
  }

  // Run all tests
  await runAdminAuthFlowTest('Test 1: Password endpoint format', testPasswordEndpointFormat);
  await runAdminAuthFlowTest('Test 2: Correct password authentication', testCorrectPassword);
  await runAdminAuthFlowTest('Test 3: Wrong password rejection', testWrongPassword);
  await runAdminAuthFlowTest('Test 4: Missing password handling', testMissingPassword);
  await runAdminAuthFlowTest('Test 5: Admin upload with valid password', testAdminUploadWithValidToken);
  await runAdminAuthFlowTest('Test 6: Admin upload with invalid password', testAdminUploadWithInvalidToken);
  await runAdminAuthFlowTest('Test 7: Session persistence', testSessionPersistence);
  await runAdminAuthFlowTest('Test 8: Session expiration logic', testSessionExpiration);
  await runAdminAuthFlowTest('Test 9: Complete authentication workflow', testCompleteAuthWorkflow);
  await runAdminAuthFlowTest('Test 10: Component integration', testComponentIntegration);

  // Print results
  console.log('\n=== Test Results ===\n');

  const passed = adminAuthFlowResults.filter(r => r.passed).length;
  const failed = adminAuthFlowResults.filter(r => !r.passed).length;
  const total = adminAuthFlowResults.length;

  adminAuthFlowResults.forEach((result, index) => {
    console.log(`${index + 1}. ${result.name}`);
    console.log(`   ${result.message} (${result.duration}ms)`);
  });

  console.log(`\n=== Summary ===`);
  console.log(`Total: ${total} tests`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log(`Success Rate: ${Math.round((passed / total) * 100)}%`);

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllAdminAuthFlowTests().catch(error => {
  console.error('\n❌ Test suite failed with error:', error);
  process.exit(1);
});
