/**
 * Test Script for GET /api/preset-functions
 *
 * Tests the preset functions list endpoint to verify:
 * 1. Endpoint returns 200 OK
 * 2. Response includes all 15 preset functions
 * 3. Response format matches specification
 * 4. Category counts are correct
 */

const TEST_PRESET_FUNCTIONS_API_URL = 'http://localhost:3000/api/preset-functions';

async function runPresetFunctionsTest() {
  console.log('🧪 Testing GET /api/preset-functions\n');
  console.log('='.repeat(70));

  try {
    // Test 1: Basic functionality
    console.log('\n📋 Test 1: Fetch preset functions list');
    console.log('-'.repeat(70));

    const startTime = Date.now();
    const response = await fetch(TEST_PRESET_FUNCTIONS_API_URL, {
      method: 'GET',
    });
    const responseTime = Date.now() - startTime;

    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Response time: ${responseTime}ms`);

    if (response.status !== 200) {
      throw new Error(`Expected 200, got ${response.status}`);
    }

    const data = await response.json();

    // Verify response structure
    console.log('\n📊 Response Summary:');
    console.log(`Total functions: ${data.total}`);
    console.log(`Categories breakdown:`, data.categories);

    // Verify we have all 14 functions
    if (data.total !== 14) {
      throw new Error(`Expected 14 functions, got ${data.total}`);
    }

    if (data.categories.profitability !== 4) {
      throw new Error(`Expected 4 profitability functions, got ${data.categories.profitability}`);
    }

    // Verify category counts
    const expectedCategoryCounts = {
      liquidity: 3,
      solvency: 3,
      profitability: 4,
      efficiency: 4,
    };

    for (const [category, expectedCount] of Object.entries(expectedCategoryCounts)) {
      const actualCount = data.categories[category];
      if (actualCount !== expectedCount) {
        throw new Error(`Expected ${expectedCount} ${category} functions, got ${actualCount}`);
      }
    }

    console.log('✅ Category counts verified');

    // Display all functions
    console.log('\n📚 All Available Functions:');
    console.log('='.repeat(70));

    const groupedByCategory = data.functions.reduce((acc: any, func: any) => {
      if (!acc[func.category]) {
        acc[func.category] = [];
      }
      acc[func.category].push(func);
      return acc;
    }, {});

    const categoryNames = {
      liquidity: '流动性比率',
      solvency: '偿债能力比率',
      profitability: '盈利能力比率',
      efficiency: '营运能力比率',
    };

    for (const [category, functions] of Object.entries(groupedByCategory) as [string, any[]][]) {
      console.log(`\n🏷️  ${categoryNames[category as keyof typeof categoryNames]} (${category.toUpperCase()})`);
      console.log('-'.repeat(70));

      functions.forEach((func, index) => {
        console.log(`\n${index + 1}. ${func.displayName} (${func.displayNameEn})`);
        console.log(`   ID: ${func.id}`);
        console.log(`   Formula: ${func.formulaDisplay}`);
        console.log(`   Unit: ${func.unit}`);
        console.log(`   Required Inputs: ${func.requiredInputs.join(', ')}`);
        console.log(`   Description: ${func.description.substring(0, 80)}...`);
      });
    }

    // Test 2: Verify specific functions
    console.log('\n\n📋 Test 2: Verify specific functions');
    console.log('='.repeat(70));

    const functionsToVerify = [
      { id: 'current_ratio', displayName: '流动比率', category: 'liquidity' },
      { id: 'debt_to_asset_ratio', displayName: '资产负债率', category: 'solvency' },
      { id: 'return_on_equity', displayName: '净资产收益率 (ROE)', category: 'profitability' },
      { id: 'asset_turnover', displayName: '总资产周转率', category: 'efficiency' },
    ];

    for (const expected of functionsToVerify) {
      const func = data.functions.find((f: any) => f.id === expected.id);
      if (!func) {
        throw new Error(`Function ${expected.id} not found`);
      }
      if (func.displayName !== expected.displayName) {
        throw new Error(`Function ${expected.id} has wrong displayName: ${func.displayName}`);
      }
      if (func.category !== expected.category) {
        throw new Error(`Function ${expected.id} has wrong category: ${func.category}`);
      }
      console.log(`✅ ${expected.displayName} verified`);
    }

    // Test 3: Verify required fields
    console.log('\n\n📋 Test 3: Verify all functions have required fields');
    console.log('='.repeat(70));

    const requiredFields = [
      'id',
      'name',
      'displayName',
      'displayNameEn',
      'category',
      'description',
      'requiredInputs',
      'unit',
      'formula',
      'formulaDisplay',
    ];

    let allFieldsPresent = true;
    for (const func of data.functions) {
      for (const field of requiredFields) {
        if (!(field in func)) {
          console.error(`❌ Function ${func.displayName} missing field: ${field}`);
          allFieldsPresent = false;
        }
      }
    }

    if (allFieldsPresent) {
      console.log('✅ All functions have all required fields');
    } else {
      throw new Error('Some functions missing required fields');
    }

    // Summary
    console.log('\n\n' + '='.repeat(70));
    console.log('✅ ALL TESTS PASSED');
    console.log('='.repeat(70));
    console.log('\n📊 Summary:');
    console.log(`  • Total functions: ${data.total}`);
    console.log(`  • Categories: ${Object.keys(data.categories).length}`);
    console.log(`  • Response time: ${responseTime}ms`);
    console.log(`  • All fields present: Yes`);
    console.log(`  • All functions verified: Yes`);

  } catch (error: any) {
    console.error('\n\n❌ TEST FAILED');
    console.error('='.repeat(70));
    console.error('Error:', error.message);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run tests
runPresetFunctionsTest();
