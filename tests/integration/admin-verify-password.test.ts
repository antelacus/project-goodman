/**
 * Test file for /api/admin/verify-password endpoint
 *
 * Usage: npx tsx test-admin-verify-password.ts
 */

// Test configuration
const TEST_ADMIN_VERIFY_API_BASE = 'http://localhost:3000';
const ENDPOINT = '/api/admin/verify-password';

// Test cases
const tests = [
  {
    name: '✅ Test 1: Valid password should return session token',
    payload: {
      password: process.env.ADMIN_PASSWORD || 'test-password'
    },
    expectedValid: true,
    shouldHaveToken: true,
  },
  {
    name: '❌ Test 2: Invalid password should be rejected',
    payload: {
      password: 'wrong-password-123'
    },
    expectedValid: false,
    shouldHaveToken: false,
  },
  {
    name: '❌ Test 3: Empty password should be rejected',
    payload: {
      password: ''
    },
    expectedValid: false,
    shouldHaveToken: false,
  },
  {
    name: '❌ Test 4: Missing password should return error',
    payload: {},
    expectedValid: false,
    shouldHaveToken: false,
  },
  {
    name: '❌ Test 5: Non-string password should be rejected',
    payload: {
      password: 12345
    },
    expectedValid: false,
    shouldHaveToken: false,
  },
];

// Helper function to make API request
async function testEndpoint(payload: any) {
  const response = await fetch(`${TEST_ADMIN_VERIFY_API_BASE}${ENDPOINT}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  return { response, data };
}

// Run tests
async function runAdminVerifyTests() {
  console.log('🧪 Testing /api/admin/verify-password endpoint...\n');
  console.log('====================================================');

  let passedTests = 0;
  let failedTests = 0;

  for (const test of tests) {
    console.log(`\n${test.name}`);
    console.log(`Payload:`, JSON.stringify(test.payload, null, 2));

    try {
      const { response, data } = await testEndpoint(test.payload);

      console.log(`Response Status: ${response.status}`);
      console.log(`Response Data:`, JSON.stringify(data, null, 2));

      // Validate response
      let testPassed = true;
      const errors: string[] = [];

      // Check valid flag
      if (data.valid !== test.expectedValid) {
        testPassed = false;
        errors.push(
          `Expected valid=${test.expectedValid}, got valid=${data.valid}`
        );
      }

      // Check token presence
      if (test.shouldHaveToken && !data.token) {
        testPassed = false;
        errors.push('Expected token to be present, but it was missing');
      }

      if (!test.shouldHaveToken && data.token) {
        testPassed = false;
        errors.push('Expected no token, but token was present');
      }

      // Check expiresAt presence for valid responses
      if (test.expectedValid && test.shouldHaveToken) {
        if (!data.expiresAt) {
          testPassed = false;
          errors.push('Expected expiresAt to be present');
        } else {
          // Validate expiresAt is a future timestamp
          const now = Date.now();
          if (data.expiresAt <= now) {
            testPassed = false;
            errors.push('expiresAt should be in the future');
          }

          // Validate expiresAt is approximately 1 hour from now (within 5 minutes tolerance)
          const expectedExpiry = now + 60 * 60 * 1000; // 1 hour
          const tolerance = 5 * 60 * 1000; // 5 minutes
          if (Math.abs(data.expiresAt - expectedExpiry) > tolerance) {
            testPassed = false;
            errors.push(
              `expiresAt should be ~1 hour from now, got ${Math.round(
                (data.expiresAt - now) / 1000 / 60
              )} minutes`
            );
          }
        }
      }

      // Print result
      if (testPassed) {
        console.log('✅ PASSED');
        passedTests++;
      } else {
        console.log('❌ FAILED');
        errors.forEach((err) => console.log(`   - ${err}`));
        failedTests++;
      }
    } catch (error) {
      console.log('❌ FAILED - Exception occurred');
      console.error(error);
      failedTests++;
    }

    console.log('----------------------------------------------------');
  }

  // Summary
  console.log('\n====================================================');
  console.log('📊 TEST SUMMARY');
  console.log('====================================================');
  console.log(`Total Tests: ${tests.length}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log(
    `Success Rate: ${((passedTests / tests.length) * 100).toFixed(1)}%`
  );
  console.log('====================================================\n');

  if (failedTests === 0) {
    console.log('✅ All tests passed! 🎉\n');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed. Please review the output above.\n');
    process.exit(1);
  }
}

// Check if dev server is running
async function checkAdminVerifyServer() {
  try {
    const response = await fetch(TEST_ADMIN_VERIFY_API_BASE); // Changed API_BASE_URL to TEST_ADMIN_VERIFY_API_BASE
    return true;
  } catch (error) {
    return false;
  }
}

// Main execution
async function mainAdminVerify() {
  console.log('🔍 Checking if development server is running...');

  const serverRunning = await checkAdminVerifyServer();

  if (!serverRunning) {
    console.error(
      '❌ Development server is not running at',
      API_BASE_URL
    );
    console.error('   Please start the server with: npm run dev\n');
    process.exit(1);
  }

  console.log('✅ Development server is running\n');

  await runAdminVerifyTests();
}

mainAdminVerify();
