/**
 * Task 27: Test Financial Analysis Calculations
 *
 * This test suite validates:
 * 1. Successful calculations with real data
 * 2. Calculation accuracy verification
 * 3. Insufficient data handling
 * 4. Source citation verification
 * 5. Different calculation types (liquidity, solvency, profitability, efficiency)
 */

const TEST_FINANCIAL_CALC_API_BASE = 'http://localhost:3000';

interface TestFinancialAnalysisResponse {
  type: 'calculation_result' | 'insufficient_data' | 'low_confidence' | 'no_function';
  answer?: string;
  calculation?: {
    functionUsed: string;
    functionDisplayName: string;
    formula: string;
    inputs: Record<string, { value: number; unit: string; source: string }>;
    result: { value: number; formatted: string; unit: string };
    steps: string[];
  };
  confidence: number;
  sourceDocuments: Array<{ id: string; name: string; year: string; period: string }>;
  missingData?: string[];
  suggestion?: string;
}

async function runFinancialAnalysisTest(question: string, testName: string): Promise<void> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Test: ${testName}`);
  console.log(`Question: "${question}"`);
  console.log(`${'='.repeat(80)}`);

  const startTime = Date.now();

  try {
    const response = await fetch(`${TEST_FINANCIAL_CALC_API_BASE}/api/financial-analysis-v2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      console.error(`❌ HTTP Error: ${response.status} ${response.statusText}`);
      return;
    }

    const data: TestFinancialAnalysisResponse = await response.json();

    console.log(`\n📊 Response Type: ${data.type}`);
    console.log(`⏱️  Response Time: ${responseTime}ms`);
    console.log(`🎯 Confidence: ${(data.confidence * 100).toFixed(1)}%`);

    if (data.type === 'calculation_result' && data.calculation) {
      console.log(`\n✅ CALCULATION SUCCESSFUL`);
      console.log(`\nFunction: ${data.calculation.functionDisplayName} (${data.calculation.functionUsed})`);
      console.log(`Formula: ${data.calculation.formula}`);

      console.log(`\nInputs:`);
      for (const [key, input] of Object.entries(data.calculation.inputs)) {
        console.log(`  - ${key}: ${input.value.toLocaleString()} ${input.unit}`);
        console.log(`    Source: ${input.source}`);
      }

      console.log(`\nResult: ${data.calculation.result.formatted}`);
      console.log(`Raw Value: ${data.calculation.result.value}`);

      console.log(`\nCalculation Steps:`);
      data.calculation.steps.forEach((step, i) => {
        console.log(`  ${i + 1}. ${step}`);
      });

      console.log(`\nSource Documents:`);
      data.sourceDocuments.forEach(doc => {
        console.log(`  - ${doc.name} (${doc.year} ${doc.period})`);
      });

      // Verify calculation accuracy
      console.log(`\n🔍 Accuracy Verification:`);
      verifyCalculation(data.calculation);

    } else if (data.type === 'insufficient_data') {
      console.log(`\n⚠️ INSUFFICIENT DATA`);
      console.log(`\nAnswer: ${data.answer}`);
      if (data.missingData && data.missingData.length > 0) {
        console.log(`\nMissing Data:`);
        data.missingData.forEach(metric => {
          console.log(`  - ${metric}`);
        });
      }
      if (data.suggestion) {
        console.log(`\nSuggestion: ${data.suggestion}`);
      }

    } else if (data.type === 'no_function') {
      console.log(`\n❓ NO FUNCTION MATCH`);
      console.log(`\nAnswer: ${data.answer}`);
      if (data.suggestion) {
        console.log(`\nSuggestion: ${data.suggestion}`);
      }

    } else if (data.type === 'low_confidence') {
      console.log(`\n⚠️ LOW CONFIDENCE`);
      console.log(`\nAnswer: ${data.answer}`);
    }

    console.log(`\n${'─'.repeat(80)}\n`);

  } catch (error) {
    console.error(`\n❌ Test Failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function verifyCalculation(calculation: any): void {
  const { functionUsed, inputs, result } = calculation;
  let expectedValue: number | null = null;
  let calculationCorrect = false;

  try {
    switch (functionUsed) {
      case 'debt_to_asset_ratio':
        expectedValue = inputs['负债总计'].value / inputs['资产总计'].value;
        break;

      case 'current_ratio':
        expectedValue = inputs['流动资产合计'].value / inputs['流动负债合计'].value;
        break;

      case 'quick_ratio':
        expectedValue = (inputs['流动资产合计'].value - inputs['存货'].value) / inputs['流动负债合计'].value;
        break;

      case 'cash_ratio':
        expectedValue = inputs['货币资金'].value / inputs['流动负债合计'].value;
        break;

      case 'debt_to_equity_ratio':
        expectedValue = inputs['负债总计'].value / inputs['所有者权益合计'].value;
        break;

      case 'equity_multiplier':
        expectedValue = inputs['资产总计'].value / inputs['所有者权益合计'].value;
        break;

      case 'gross_profit_margin':
        expectedValue = (inputs['营业收入'].value - inputs['营业成本'].value) / inputs['营业收入'].value;
        break;

      case 'net_profit_margin':
        expectedValue = inputs['净利润'].value / inputs['营业收入'].value;
        break;

      case 'return_on_assets':
        expectedValue = inputs['净利润'].value / inputs['资产总计'].value;
        break;

      case 'return_on_equity':
        expectedValue = inputs['净利润'].value / inputs['所有者权益合计'].value;
        break;

      case 'asset_turnover':
        expectedValue = inputs['营业收入'].value / inputs['资产总计'].value;
        break;

      case 'inventory_turnover':
        expectedValue = inputs['营业成本'].value / inputs['存货'].value;
        break;

      case 'receivables_turnover':
        expectedValue = inputs['营业收入'].value / inputs['应收账款'].value;
        break;

      case 'working_capital_turnover':
        expectedValue = inputs['营业收入'].value / (inputs['流动资产合计'].value - inputs['流动负债合计'].value);
        break;

      default:
        console.log(`  ⚠️ Unknown function: ${functionUsed}`);
        return;
    }

    if (expectedValue !== null) {
      const tolerance = 0.0001; // Allow small floating point differences
      const difference = Math.abs(result.value - expectedValue);
      calculationCorrect = difference < tolerance;

      console.log(`  Expected Value: ${expectedValue.toFixed(6)}`);
      console.log(`  Actual Value: ${result.value.toFixed(6)}`);
      console.log(`  Difference: ${difference.toFixed(8)}`);
      console.log(`  Status: ${calculationCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`);
    }

  } catch (error) {
    console.log(`  ⚠️ Verification failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function runAllFinancialCalcTests(): Promise<void> {
  console.log('\n' + '='.repeat(80));
  console.log('TASK 27: FINANCIAL ANALYSIS CALCULATIONS TEST SUITE');
  console.log('='.repeat(80));
  console.log(`Test Server: ${TEST_FINANCIAL_CALC_API_BASE}`);
  console.log(`Start Time: ${new Date().toISOString()}`);
  console.log('='.repeat(80));

  // Test 1: Debt-to-Asset Ratio (Solvency)
  await runFinancialAnalysisTest(
    '2025年的资产负债率是多少？',
    'Test 1 - Debt-to-Asset Ratio (Solvency)'
  );

  // Test 2: Current Ratio (Liquidity)
  await runFinancialAnalysisTest(
    '计算2025年度的流动比率',
    'Test 2 - Current Ratio (Liquidity)'
  );

  // Test 3: Quick Ratio (Liquidity)
  await runFinancialAnalysisTest(
    '2025年的速动比率是多少',
    'Test 3 - Quick Ratio (Liquidity)'
  );

  // Test 4: Cash Ratio (Liquidity)
  await runFinancialAnalysisTest(
    '请计算现金比率',
    'Test 4 - Cash Ratio (Liquidity)'
  );

  // Test 5: Debt-to-Equity Ratio (Solvency)
  await runFinancialAnalysisTest(
    '产权比率是多少？',
    'Test 5 - Debt-to-Equity Ratio (Solvency)'
  );

  // Test 6: Equity Multiplier (Solvency)
  await runFinancialAnalysisTest(
    '计算权益乘数',
    'Test 6 - Equity Multiplier (Solvency)'
  );

  // Test 7: Insufficient Data - Profitability Ratio (no income statement)
  await runFinancialAnalysisTest(
    '2025年的销售毛利率是多少？',
    'Test 7 - Insufficient Data (Profitability - Missing Income Statement)'
  );

  // Test 8: Insufficient Data - ROE (no net profit)
  await runFinancialAnalysisTest(
    '净资产收益率（ROE）是多少',
    'Test 8 - Insufficient Data (ROE - Missing Net Profit)'
  );

  // Test 9: Insufficient Data - Asset Turnover (no revenue)
  await runFinancialAnalysisTest(
    '总资产周转率是多少',
    'Test 9 - Insufficient Data (Asset Turnover - Missing Revenue)'
  );

  // Test 10: Ambiguous Question (no year specified)
  await runFinancialAnalysisTest(
    '资产负债率',
    'Test 10 - Ambiguous Question (No Year Specified)'
  );

  // Test 11: Non-existent Year
  await runFinancialAnalysisTest(
    '2023年的流动比率是多少？',
    'Test 11 - Non-existent Year (2023)'
  );

  // Test 12: Multiple Metrics Request
  await runFinancialAnalysisTest(
    '请分析公司的偿债能力，包括资产负债率和流动比率',
    'Test 12 - Multiple Metrics Request'
  );

  console.log('\n' + '='.repeat(80));
  console.log('TEST SUITE COMPLETE');
  console.log(`End Time: ${new Date().toISOString()}`);
  console.log('='.repeat(80) + '\n');
}

// Run tests
runAllFinancialCalcTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
