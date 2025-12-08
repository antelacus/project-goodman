/**
 * Test Financial Analysis v2 API
 *
 * Tests the function calling architecture for financial metric calculations.
 *
 * Prerequisites:
 * 1. Development server running (npm run dev)
 * 2. Database has financial data uploaded via admin endpoint
 * 3. OPENAI_API_KEY and Supabase credentials configured
 *
 * Run with: npx tsx test-financial-analysis-v2.ts
 */

const TEST_FINANCIAL_ANALYSIS_V2_API_URL = 'http://localhost:3000/api/financial-analysis-v2';

interface FinancialAnalysisV2TestCase {
  name: string;
  payload: {
    question: string;
    year?: string;
    period?: string;
    documentIds?: string[];
  };
  expectedType?: 'calculation_result' | 'insufficient_data' | 'low_confidence' | 'no_function';
}

const testCases: FinancialAnalysisV2TestCase[] = [
  // Test 1: Basic calculation - Asset-to-Liability Ratio
  {
    name: 'Test 1: Calculate Debt-to-Asset Ratio (资产负债率)',
    payload: {
      question: '2024年的资产负债率是多少？',
    },
    expectedType: 'calculation_result',
  },

  // Test 2: Calculate with specific period
  {
    name: 'Test 2: Calculate Current Ratio (流动比率)',
    payload: {
      question: '计算2024年年度的流动比率',
      year: '2024',
      period: 'annual',
    },
    expectedType: 'calculation_result',
  },

  // Test 3: Profitability ratio
  {
    name: 'Test 3: Calculate Net Profit Margin (销售净利率)',
    payload: {
      question: '2024年的销售净利率是多少？',
    },
    // May be calculation_result or insufficient_data depending on uploaded data
  },

  // Test 4: Efficiency ratio
  {
    name: 'Test 4: Calculate Asset Turnover (总资产周转率)',
    payload: {
      question: '总资产周转率是多少？',
      year: '2024',
    },
    // May be calculation_result or insufficient_data
  },

  // Test 5: Missing data scenario
  {
    name: 'Test 5: Missing data for 2023',
    payload: {
      question: '2023年的资产负债率是多少？',
      year: '2023',
    },
    expectedType: 'insufficient_data', // Assuming 2023 data not uploaded
  },

  // Test 6: Ambiguous question (no function match)
  {
    name: 'Test 6: Ambiguous question',
    payload: {
      question: '公司财务状况怎么样？',
    },
    expectedType: 'no_function',
  },

  // Test 7: Conversational format
  {
    name: 'Test 7: Conversational question',
    payload: {
      question: '请帮我看一下最新的资产负债率',
    },
    expectedType: 'calculation_result',
  },

  // Test 8: ROE calculation
  {
    name: 'Test 8: Calculate ROE (净资产收益率)',
    payload: {
      question: '净资产收益率ROE是多少',
      year: '2024',
    },
    // May be calculation_result or insufficient_data
  },

  // Test 9: Multiple year comparison (should focus on latest)
  {
    name: 'Test 9: Latest year calculation',
    payload: {
      question: '最近一年的流动比率',
    },
    expectedType: 'calculation_result',
  },

  // Test 10: Solvency ratio
  {
    name: 'Test 10: Calculate Debt-to-Equity Ratio (产权比率)',
    payload: {
      question: '产权比率是多少？',
      year: '2024',
    },
    // May be calculation_result or insufficient_data
  },
];

/**
 * Run a single test case
 */
async function runFinancialAnalysisV2Test(testCase: FinancialAnalysisV2TestCase): Promise<void> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`▶ ${testCase.name}`);
  console.log(`${'='.repeat(80)}`);
  console.log(`Question: "${testCase.payload.question}"`);
  if (testCase.payload.year) console.log(`Year: ${testCase.payload.year}`);
  if (testCase.payload.period) console.log(`Period: ${testCase.payload.period}`);
  console.log('');

  try {
    const startTime = Date.now();

    const response = await fetch(TEST_FINANCIAL_ANALYSIS_V2_API_URL, {
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
      console.log('   (This may be normal depending on database state)');
      console.log('');
    }

    // Display result based on type
    switch (data.type) {
      case 'calculation_result':
        console.log('✅ CALCULATION SUCCESSFUL:');
        console.log('');
        console.log(`Answer: ${data.answer}`);
        console.log('');

        if (data.calculation) {
          const calc = data.calculation;
          console.log(`Function: ${calc.functionDisplayName} (${calc.functionUsed})`);
          console.log(`Formula: ${calc.formula}`);
          console.log(`Result: ${calc.result.formatted} ${calc.result.unit}`);
          console.log('');

          console.log('Inputs:');
          Object.entries(calc.inputs).forEach(([key, value]: [string, any]) => {
            console.log(`  - ${key}: ${value.value.toLocaleString()} ${value.unit} (来源: ${value.source})`);
          });
          console.log('');

          console.log('Calculation Steps:');
          calc.steps.forEach((step: string, index: number) => {
            console.log(`  ${index + 1}. ${step}`);
          });
          console.log('');
        }

        if (data.sourceDocuments && data.sourceDocuments.length > 0) {
          console.log('Source Documents:');
          data.sourceDocuments.forEach((doc: any) => {
            console.log(`  - ${doc.name} (${doc.year} ${doc.period})`);
          });
        }
        break;

      case 'insufficient_data':
        console.log('⚠️  INSUFFICIENT DATA:');
        console.log('');
        console.log(`Answer: ${data.answer}`);
        console.log('');

        if (data.missingData && data.missingData.length > 0) {
          console.log('Missing Metrics:');
          data.missingData.forEach((metric: string) => {
            console.log(`  - ${metric}`);
          });
          console.log('');
        }

        if (data.suggestion) {
          console.log(`Suggestion: ${data.suggestion}`);
        }
        break;

      case 'no_function':
        console.log('ℹ️  NO FUNCTION MATCHED:');
        console.log('');
        console.log(`Answer: ${data.answer}`);
        console.log('');
        if (data.suggestion) {
          console.log(`Suggestion: ${data.suggestion}`);
        }
        break;

      case 'low_confidence':
        console.log('⚠️  LOW CONFIDENCE:');
        console.log('');
        console.log(`Answer: ${data.answer}`);
        break;

      default:
        console.log('❓ UNKNOWN RESPONSE TYPE:');
        console.log(JSON.stringify(data, null, 2));
    }

  } catch (error: any) {
    console.log('❌ TEST FAILED:');
    console.log(error.message);
  }
}

/**
 * Main test runner
 */
async function runAllFinancialAnalysisV2Tests() {
  console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║         Financial Analysis v2 API Test Suite                              ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');

  // Check server availability
  try {
    const response = await fetch('http://localhost:3000', { method: 'HEAD' });
    if (!response.ok) {
      throw new Error('Server not responding');
    }
    console.log('✓ Server is running at http://localhost:3000\n');
  } catch (error) {
    console.log('❌ ERROR: Development server is not running!');
    console.log('   Please start the server with: npm run dev\n');
    process.exit(1);
  }

  // Run all tests
  for (let i = 0; i < testCases.length; i++) {
    await runFinancialAnalysisV2Test(testCases[i]);

    // Add delay between tests to avoid rate limiting
    if (i < testCases.length - 1) {
      console.log('\nWaiting 2 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                        All Tests Completed                                  ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');
}

// Run tests
runAllFinancialAnalysisV2Tests().catch(console.error);
