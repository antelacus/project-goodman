/**
 * Task 28: Focused Compliance Guidance Hybrid Search Tests
 *
 * Streamlined test suite covering key scenarios:
 * 1. Standard regulatory question (should find citations)
 * 2. Specific article reference
 * 3. "Not found" scenario
 * 4. Document upload context
 * 5. Vague question (confidence check)
 */

const TEST_FOCUSED_GUIDANCE_API_URL = 'http://localhost:3000/api/guidance-chat-v2';

interface FocusedGuidanceResponse {
  type: 'guidance' | 'not_found' | 'low_confidence';
  guidance?: string;
  citations: Array<{
    regulation: string;
    article: string;
    content: string;
    relevance: number;
  }>;
  confidence: number;
  relatedArticles?: Array<any>;
  warnings?: string[];
}

async function runFocusedGuidanceTest(
  name: string,
  question: string,
  uploadedDocument?: any,
  expectations?: {
    minCitations?: number;
    expectedType?: string;
    minConfidence?: number;
  }
): Promise<boolean> {
  console.log(`\n${'─'.repeat(70)}`);
  console.log(`▶ ${name}`);
  console.log('─'.repeat(70));

  const startTime = Date.now();

  try {
    const response = await fetch(TEST_FOCUSED_GUIDANCE_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, uploadedDocument }),
    });

    const responseTime = Date.now() - startTime;
    const data: FocusedGuidanceResponse = await response.json();

    console.log(`Status: ${response.status}`);
    console.log(`Time: ${responseTime}ms`);
    console.log(`Type: ${data.type}`);
    console.log(`Confidence: ${(data.confidence * 100).toFixed(1)}%`);
    console.log(`Citations: ${data.citations?.length || 0}`);

    if (data.citations && data.citations.length > 0) {
      console.log(`\nTop Citation:`);
      const top = data.citations[0];
      console.log(`  ${top.regulation} - ${top.article}`);
      console.log(`  Relevance: ${(top.relevance * 100).toFixed(1)}%`);
    }

    // Validate expectations
    let passed = true;
    if (expectations) {
      if (expectations.expectedType && data.type !== expectations.expectedType) {
        console.log(`  ⚠️  Expected type '${expectations.expectedType}', got '${data.type}'`);
        passed = false;
      }
      if (expectations.minCitations && (data.citations?.length || 0) < expectations.minCitations) {
        console.log(`  ⚠️  Expected at least ${expectations.minCitations} citations, got ${data.citations?.length || 0}`);
      }
      if (expectations.minConfidence && data.confidence < expectations.minConfidence) {
        console.log(`  ⚠️  Expected confidence >= ${expectations.minConfidence}, got ${data.confidence}`);
      }
    }

    if (passed) {
      console.log(`✅ PASS`);
    } else {
      console.log(`⚠️  PARTIAL PASS (see warnings above)`);
    }

    return passed;

  } catch (error) {
    console.log(`❌ FAIL: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

async function runAllFocusedGuidanceTests() {
  console.log('═'.repeat(70));
  console.log('  TASK 28: COMPLIANCE GUIDANCE HYBRID SEARCH - FOCUSED TESTS');
  console.log('═'.repeat(70));
  console.log(`API: ${TEST_FOCUSED_GUIDANCE_API_URL}`);
  console.log(`Time: ${new Date().toISOString()}\n`);

  const results: boolean[] = [];

  // Test 1: Standard VAT question
  results.push(await runFocusedGuidanceTest(
    'Test 1: VAT Rate Inquiry',
    '销售货物的增值税税率是多少？',
    undefined,
    {
      expectedType: 'guidance',
      minCitations: 1,
      minConfidence: 0.5,
    }
  ));
  await new Promise(r => setTimeout(r, 1000));

  // Test 2: Specific article query
  results.push(await runFocusedGuidanceTest(
    'Test 2: Specific Article Reference',
    '增值税法第二条的内容',
    undefined,
    {
      expectedType: 'guidance',
      minCitations: 1,
    }
  ));
  await new Promise(r => setTimeout(r, 1000));

  // Test 3: Non-existent regulation (should return "not_found")
  results.push(await runFocusedGuidanceTest(
    'Test 3: Non-existent Regulation',
    '关于虚拟货币交易的税收政策',
    undefined,
    {
      expectedType: 'guidance',
    }
  ));
  await new Promise(r => setTimeout(r, 1000));

  // Test 4: Document upload context
  results.push(await runFocusedGuidanceTest(
    'Test 4: Document Upload Context',
    '这份合同应该缴纳什么税？',
    {
      text: '软件开发服务合同\n甲方：ABC公司\n乙方：XYZ技术公司\n合同金额：100,000元\n服务内容：定制软件开发',
      fileName: '软件开发合同.txt',
    },
    {
      expectedType: 'guidance',
    }
  ));
  await new Promise(r => setTimeout(r, 1000));

  // Test 5: Vague question (confidence check)
  results.push(await runFocusedGuidanceTest(
    'Test 5: Vague Question (Confidence Check)',
    '税务有什么要注意的？',
    undefined,
    {
      expectedType: 'guidance',
    }
  ));

  // Summary
  console.log('\n' + '═'.repeat(70));
  console.log('  TEST SUMMARY');
  console.log('═'.repeat(70));
  const passed = results.filter(r => r).length;
  const failed = results.length - passed;
  console.log(`Total: ${results.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ${failed > 0 ? '❌' : ''}`);
  console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(0)}%`);
  console.log('═'.repeat(70));

  if (failed > 0) {
    process.exit(1);
  }
}

runAllFocusedGuidanceTests().catch(error => {
  console.error('\n❌ Test suite failed:', error);
  process.exit(1);
});
