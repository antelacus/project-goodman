/**
 * Test Financial Analysis Workflow (V3.1 Refactored)
 *
 * Tests the new workflow architecture for financial metric calculations.
 *
 * Prerequisites:
 * 1. Development server running (npm run dev)
 * 2. Database has financial data uploaded via admin endpoint
 * 3. OPENAI_API_KEY and Supabase credentials configured
 *
 * Run with: npx tsx tests/integration/financial-analysis-workflow.test.ts
 */

const TEST_API_URL = 'http://localhost:3000/api/financial-analysis';

interface TestCase {
  name: string;
  payload: {
    question: string;
    year?: string;
    period?: string;
    documentIds?: string[];
  };
  expectedType?: 'calculation_result' | 'insufficient_data' | 'low_confidence' | 'no_function';
}

const testCases: TestCase[] = [
  // Test 1: Basic calculation
  {
    name: 'Test 1: Basic Calculation - Debt-to-Asset Ratio',
    payload: {
      question: '2024年的资产负债率是多少？',
    },
    expectedType: 'calculation_result',
  },

  // Test 2: Missing data
  {
    name: 'Test 2: Missing Data Scenario',
    payload: {
      question: '1999年的资产负债率是多少？',
      year: '1999',
    },
    expectedType: 'insufficient_data',
  },

  // Test 3: Metric retrieval (get_financial_metric)
  {
    name: 'Test 3: Dynamic Metric Retrieval',
    payload: {
      question: '2024年和2023年的营业收入对比',
    },
    // Should use get_financial_metric function
  },
];

async function runTest(testCase: TestCase): Promise<void> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`▶ ${testCase.name}`);
  console.log(`${'='.repeat(80)}`);
  console.log(`Question: "${testCase.payload.question}"`);
  console.log('');

  try {
    const startTime = Date.now();

    const response = await fetch(TEST_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testCase.payload),
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Response Time: ${responseTime}ms`);
    console.log('');

    const data = await response.json();

    if (!response.ok) {
      console.log('❌ ERROR:');
      console.log(JSON.stringify(data, null, 2));
      return;
    }

    console.log(`Type: ${data.type}`);
    console.log(`Confidence: ${(data.confidence * 100).toFixed(2)}%`);
    console.log('');

    // Check expected type
    if (testCase.expectedType && data.type !== testCase.expectedType) {
      console.log(`⚠️  WARNING: Expected type '${testCase.expectedType}' but got '${data.type}'`);
      console.log('');
    }

    // Display result
    switch (data.type) {
      case 'calculation_result':
        console.log('✅ CALCULATION SUCCESSFUL:');
        console.log('');
        console.log(`Answer: ${data.answer}`);
        console.log('');

        if (data.calculation) {
          const calc = data.calculation;
          console.log(`Function: ${calc.functionDisplayName} (${calc.functionUsed})`);
          console.log(`Result: ${calc.result.formatted}`);
          console.log('');
        }
        break;

      case 'insufficient_data':
        console.log('⚠️  INSUFFICIENT DATA:');
        console.log(`Answer: ${data.answer}`);
        if (data.missingData) {
          console.log(`Missing: ${data.missingData.join(', ')}`);
        }
        break;

      case 'no_function':
        console.log('ℹ️  NO FUNCTION MATCHED:');
        console.log(`Answer: ${data.answer}`);
        break;

      case 'low_confidence':
        console.log('⚠️  LOW CONFIDENCE:');
        console.log(`Answer: ${data.answer}`);
        break;
    }

  } catch (error: any) {
    console.log('❌ TEST FAILED:');
    console.log(error.message);
  }
}

async function runAllTests() {
  console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║       Financial Analysis Workflow Test Suite (V3.1)                        ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');

  // Check server
  try {
    const response = await fetch('http://localhost:3000', { method: 'HEAD' });
    if (!response.ok) throw new Error('Server not responding');
    console.log('✓ Server is running at http://localhost:3000\n');
  } catch (error) {
    console.log('❌ ERROR: Development server is not running!');
    process.exit(1);
  }

  // Run tests
  for (let i = 0; i < testCases.length; i++) {
    await runTest(testCases[i]);
    if (i < testCases.length - 1) {
      console.log('\nWaiting 2 seconds...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                        Tests Completed                                     ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');
}

runAllTests().catch(console.error);
