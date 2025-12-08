/**
 * Test Script for Structured Extraction Utilities
 *
 * This script tests the structured extraction functionality with various
 * document types to ensure correct classification and extraction.
 */

import {
  classifyDocumentType,
  extractFinancialMetrics,
  extractYearAndPeriod,
  extractRegulationArticles,
  performStructuredExtraction,
  validateExtractionResult,
  chineseToArabic,
} from './src/lib/structured-extraction';

// ============================================================================
// Test Data
// ============================================================================

const balanceSheetSample = `
2024年度资产负债表
单位：元

资产
流动资产：
  货币资金                     1,000,000.00
  交易性金融资产                 500,000.00
  应收账款                       800,000.00
  预付款项                       200,000.00
  存货                           600,000.00
  流动资产合计                 3,100,000.00

非流动资产：
  长期投资                       400,000.00
  固定资产                     1,200,000.00
  无形资产                       300,000.00
  非流动资产合计               1,900,000.00

资产总计                       5,000,000.00

负债和所有者权益
流动负债：
  短期借款                       300,000.00
  应付账款                       500,000.00
  应交税费                       200,000.00
  流动负债合计                 1,000,000.00

非流动负债：
  长期借款                       500,000.00
  非流动负债合计                 500,000.00

负债总计                       1,500,000.00

所有者权益：
  实收资本                     2,000,000.00
  资本公积                       800,000.00
  盈余公积                       300,000.00
  未分配利润                     400,000.00
  所有者权益合计               3,500,000.00

负债和所有者权益总计           5,000,000.00
`;

const incomeStatementSample = `
2024年度利润表
单位：元

营业收入                      10,000,000.00
  减：营业成本                 6,000,000.00
      税金及附加                 200,000.00
      销售费用                   800,000.00
      管理费用                   600,000.00
      研发费用                   400,000.00
      财务费用                   100,000.00

营业利润                       1,900,000.00
  加：投资收益                   100,000.00

利润总额                       2,000,000.00
  减：所得税费用                 500,000.00

净利润                         1,500,000.00
`;

const regulationSample = `
中华人民共和国增值税法

第一条 在中华人民共和国境内销售货物或者加工、修理修配劳务，销售服务、无形资产、不动产以及进口货物的单位和个人，为增值税的纳税人，应当依照本法规定缴纳增值税。

第二条 增值税税率：
（一）纳税人销售货物、劳务、有形动产租赁服务或者进口货物，除本条第二项、第四项、第五项另有规定外，税率为13%。
（二）纳税人销售交通运输、邮政、基础电信、建筑、不动产租赁服务，销售不动产，转让土地使用权，销售或者进口下列货物，税率为9%。

第三条 纳税人兼营不同税率的项目，应当分别核算不同税率项目的销售额；未分别核算的，从高适用税率。

第十三条 小规模纳税人发生应税销售行为，实行按照销售额和征收率计算应纳税额的简易办法，并不得抵扣进项税额。应纳税额计算公式：应纳税额=销售额×征收率
`;

// ============================================================================
// Test Functions
// ============================================================================

async function testDocumentClassification() {
  console.log('\n=== Test 1: Document Type Classification ===\n');

  const tests = [
    { text: balanceSheetSample, fileName: '2024年度资产负债表.pdf', expected: 'balance_sheet' },
    { text: incomeStatementSample, fileName: '利润表.pdf', expected: 'income_statement' },
    { text: regulationSample, fileName: '增值税法.pdf', expected: 'regulation' },
  ];

  for (const test of tests) {
    const result = classifyDocumentType(test.text, test.fileName);
    const status = result.type === test.expected ? '✓' : '✗';
    console.log(`${status} Expected: ${test.expected}, Got: ${result.type} (confidence: ${result.confidence.toFixed(2)})`);
  }
}

async function testFinancialExtraction() {
  console.log('\n=== Test 2: Financial Metrics Extraction ===\n');

  console.log('Balance Sheet Extraction:');
  const balanceSheetMetrics = extractFinancialMetrics(balanceSheetSample, 'balance_sheet');
  console.log(`  Extracted ${balanceSheetMetrics.length} metrics`);
  console.log('  Sample metrics:');
  balanceSheetMetrics.slice(0, 5).forEach(m => {
    console.log(`    - ${m.name}: ${m.value.toLocaleString()} ${m.unit} (confidence: ${m.confidence})`);
  });

  console.log('\nIncome Statement Extraction:');
  const incomeMetrics = extractFinancialMetrics(incomeStatementSample, 'income_statement');
  console.log(`  Extracted ${incomeMetrics.length} metrics`);
  console.log('  Sample metrics:');
  incomeMetrics.slice(0, 5).forEach(m => {
    console.log(`    - ${m.name}: ${m.value.toLocaleString()} ${m.unit} (confidence: ${m.confidence})`);
  });
}

async function testYearPeriodExtraction() {
  console.log('\n=== Test 3: Year and Period Extraction ===\n');

  const tests = [
    { text: balanceSheetSample, fileName: '2024年度资产负债表.pdf' },
    { text: incomeStatementSample, fileName: '2024年Q1利润表.pdf' },
    { text: '2023年半年度财务报表', fileName: undefined },
  ];

  for (const test of tests) {
    const result = extractYearAndPeriod(test.text, test.fileName);
    console.log(`File: ${test.fileName || 'N/A'}`);
    console.log(`  Year: ${result.year}, Period: ${result.period}`);
  }
}

async function testRegulationExtraction() {
  console.log('\n=== Test 4: Regulation Articles Extraction ===\n');

  const articles = extractRegulationArticles(regulationSample);
  console.log(`Extracted ${articles.length} articles`);
  console.log('\nSample articles:');
  articles.forEach(article => {
    console.log(`\n${article.articleNumber}${article.title ? ': ' + article.title : ''}`);
    console.log(`  Content preview: ${article.content.substring(0, 100)}...`);
    console.log(`  Keywords: ${article.keywords.join(', ')}`);
  });
}

async function testFullExtraction() {
  console.log('\n=== Test 5: Full Structured Extraction ===\n');

  console.log('Balance Sheet Full Extraction:');
  const balanceSheetResult = await performStructuredExtraction(
    balanceSheetSample,
    '2024年度资产负债表.pdf'
  );
  console.log(`  Document Type: ${balanceSheetResult.documentType}`);
  console.log(`  Confidence: ${balanceSheetResult.confidence.toFixed(2)}`);
  if (balanceSheetResult.documentType === 'balance_sheet') {
    console.log(`  Year: ${balanceSheetResult.year}, Period: ${balanceSheetResult.period}`);
    console.log(`  Metrics Count: ${balanceSheetResult.metrics.length}`);
  }

  const validation = validateExtractionResult(balanceSheetResult);
  console.log(`  Validation: ${validation.valid ? 'PASS' : 'FAIL'}`);
  if (!validation.valid) {
    console.log(`  Errors: ${validation.errors.join(', ')}`);
  }

  console.log('\nRegulation Full Extraction:');
  const regulationResult = await performStructuredExtraction(
    regulationSample,
    '增值税法.pdf',
    'regulation'
  );
  console.log(`  Document Type: ${regulationResult.documentType}`);
  console.log(`  Confidence: ${regulationResult.confidence.toFixed(2)}`);
  if (regulationResult.documentType === 'regulation') {
    console.log(`  Regulation Name: ${regulationResult.regulationName}`);
    console.log(`  Articles Count: ${regulationResult.articles.length}`);
  }

  const regValidation = validateExtractionResult(regulationResult);
  console.log(`  Validation: ${regValidation.valid ? 'PASS' : 'FAIL'}`);
}

async function testChineseNumberConversion() {
  console.log('\n=== Test 6: Chinese Number Conversion ===\n');

  const tests = ['一', '十', '十三', '二十', '九十九', '一百'];
  tests.forEach(chinese => {
    const arabic = chineseToArabic(chinese);
    console.log(`  ${chinese} -> ${arabic}`);
  });
}

// ============================================================================
// Run All Tests
// ============================================================================

async function runAllTests() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  Structured Extraction Utilities - Test Suite            ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  try {
    await testDocumentClassification();
    await testFinancialExtraction();
    await testYearPeriodExtraction();
    await testRegulationExtraction();
    await testFullExtraction();
    await testChineseNumberConversion();

    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║  All Tests Completed Successfully! ✓                     ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('\n❌ Test Error:', error);
    process.exit(1);
  }
}

// Run tests
runAllTests();
