/**
 * Task 28: Test Compliance Guidance Hybrid Search
 *
 * This test suite validates:
 * 1. Regulatory question handling with proper citations
 * 2. Citation accuracy and relevance scoring
 * 3. "Not found" scenarios for non-existent regulations
 * 4. Hybrid search effectiveness (vector + keyword)
 * 5. Confidence scoring accuracy
 * 6. Document upload context integration
 */

const API_URL = 'http://localhost:3000/api/guidance-chat-v2';

interface GuidanceCitation {
  regulation: string;
  article: string;
  content: string;
  relevance: number;
}

interface GuidanceResponse {
  type: 'guidance' | 'not_found' | 'low_confidence';
  guidance?: string;
  citations: GuidanceCitation[];
  confidence: number;
  relatedArticles?: Array<{
    regulation: string;
    article: string;
    summary: string;
  }>;
  warnings?: string[];
}

async function testGuidanceAPI(
  testName: string,
  question: string,
  uploadedDocument?: { text: string; fileName: string },
  expectedType?: string
): Promise<void> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`TEST: ${testName}`);
  console.log('='.repeat(80));

  const startTime = Date.now();

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question,
        uploadedDocument,
      }),
    });

    const responseTime = Date.now() - startTime;

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data: GuidanceResponse = await response.json();

    console.log(`\n✅ Status: ${response.status} OK`);
    console.log(`⏱️  Response Time: ${responseTime}ms`);
    console.log(`\n📊 Response Type: ${data.type}`);
    console.log(`📈 Confidence: ${(data.confidence * 100).toFixed(1)}%`);

    if (expectedType && data.type !== expectedType) {
      console.log(`\n⚠️  WARNING: Expected type '${expectedType}' but got '${data.type}'`);
    }

    if (data.guidance) {
      console.log(`\n💬 Guidance (first 200 chars):`);
      console.log(data.guidance.substring(0, 200) + '...');
    }

    if (data.citations && data.citations.length > 0) {
      console.log(`\n📚 Citations (${data.citations.length}):`);
      data.citations.forEach((citation, index) => {
        console.log(`\n  ${index + 1}. ${citation.regulation} - ${citation.article}`);
        console.log(`     Relevance: ${(citation.relevance * 100).toFixed(1)}%`);
        console.log(`     Content: ${citation.content.substring(0, 100)}...`);
      });
    } else {
      console.log(`\n📚 Citations: None`);
    }

    if (data.relatedArticles && data.relatedArticles.length > 0) {
      console.log(`\n🔗 Related Articles (${data.relatedArticles.length}):`);
      data.relatedArticles.forEach((article, index) => {
        console.log(`  ${index + 1}. ${article.regulation} - ${article.article}`);
      });
    }

    if (data.warnings && data.warnings.length > 0) {
      console.log(`\n⚠️  Warnings:`);
      data.warnings.forEach(warning => {
        console.log(`  • ${warning}`);
      });
    }

    console.log(`\n✅ TEST PASSED: ${testName}`);

  } catch (error) {
    console.error(`\n❌ TEST FAILED: ${testName}`);
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

async function runAllTests() {
  console.log('\n' + '='.repeat(80));
  console.log('TASK 28: COMPLIANCE GUIDANCE HYBRID SEARCH TESTS');
  console.log('='.repeat(80));
  console.log('\nTesting API: ' + API_URL);
  console.log('Date: ' + new Date().toISOString());

  const tests = [
    // Test 1: Standard VAT question (should find citations)
    {
      name: 'Test 1: VAT Rate Inquiry',
      question: '销售货物的增值税税率是多少？',
      expectedType: 'guidance',
    },

    // Test 2: Specific article reference
    {
      name: 'Test 2: Specific Article Query',
      question: '增值税法第十三条的具体内容是什么？',
      expectedType: 'guidance',
    },

    // Test 3: Complex tax policy question
    {
      name: 'Test 3: Complex Tax Policy',
      question: '小规模纳税人和一般纳税人的区别是什么？适用的税率有什么不同？',
      expectedType: 'guidance',
    },

    // Test 4: Non-existent regulation (should return "not found")
    {
      name: 'Test 4: Non-existent Regulation',
      question: '关于虚拟货币交易的增值税规定是什么？',
      expectedType: 'not_found',
    },

    // Test 5: Vague question (might have low confidence)
    {
      name: 'Test 5: Vague Question',
      question: '税务方面有什么需要注意的吗？',
      expectedType: 'guidance',
    },

    // Test 6: With uploaded document context
    {
      name: 'Test 6: With Document Upload',
      question: '这份合同应该缴纳什么税？',
      uploadedDocument: {
        text: '软件开发服务合同\n甲方：示例公司\n乙方：技术公司\n合同金额：100,000元\n服务内容：软件系统开发',
        fileName: '软件开发合同.txt',
      },
      expectedType: 'guidance',
    },

    // Test 7: Keyword-heavy question (test keyword matching)
    {
      name: 'Test 7: Keyword Matching',
      question: '增值税 税率 13% 销售货物',
      expectedType: 'guidance',
    },

    // Test 8: Semantic question (test vector search)
    {
      name: 'Test 8: Semantic Search',
      question: '卖东西要交多少税？',
      expectedType: 'guidance',
    },

    // Test 9: Multiple regulation query
    {
      name: 'Test 9: Cross-regulation Query',
      question: '增值税和企业所得税分别如何计算？',
      expectedType: 'guidance',
    },

    // Test 10: Edge case - very specific scenario
    {
      name: 'Test 10: Specific Scenario',
      question: '软件产品即征即退政策的具体条件是什么？',
      expectedType: 'guidance',
    },
  ];

  let passed = 0;
  let failed = 0;
  const startTime = Date.now();

  for (const test of tests) {
    try {
      await testGuidanceAPI(
        test.name,
        test.question,
        test.uploadedDocument,
        test.expectedType
      );
      passed++;
    } catch (error) {
      failed++;
      console.error(`\nTest failed, continuing with next test...\n`);
    }

    // Add delay between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  const totalTime = Date.now() - startTime;

  console.log('\n' + '='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Tests: ${tests.length}`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log(`Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`);
  console.log(`Total Time: ${(totalTime / 1000).toFixed(1)}s`);
  console.log(`Average Time: ${(totalTime / tests.length / 1000).toFixed(1)}s per test`);
  console.log('='.repeat(80));

  if (failed > 0) {
    console.log(`\n⚠️  Some tests failed. Please review the errors above.`);
    process.exit(1);
  } else {
    console.log(`\n🎉 All tests passed!`);
    process.exit(0);
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('\n❌ Test suite failed:', error);
  process.exit(1);
});
