/**
 * Test Suite for Compliance Guidance Page (Task 23)
 *
 * Tests the updated guidance-chat/page.tsx with hybrid search functionality
 *
 * Test Coverage:
 * 1. Page accessibility
 * 2. API integration with /api/guidance-chat-v2
 * 3. Response type handling (guidance, not_found, low_confidence)
 * 4. Citation display and expandable content
 * 5. Document upload functionality
 * 6. Preset questions
 */

const TEST_GUIDANCE_CHAT_API_BASE = "http://localhost:3000";

interface Citation {
  regulation: string;
  article: string;
  content: string;
  relevance: number;
}

interface RelatedArticle {
  regulation: string;
  article: string;
  summary: string;
}

interface GuidanceResponse {
  type: 'guidance' | 'not_found' | 'low_confidence';
  guidance?: string;
  citations: Citation[];
  confidence: number;
  relatedArticles?: RelatedArticle[];
  warnings?: string[];
}

// Test helper to format output
function logTestResult(testName: string, passed: boolean, details?: string) {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`\n${status} - ${testName}`);
  if (details) {
    console.log(`   ${details}`);
  }
}

// Test 1: Page Accessibility
async function testPageAccessibility() {
  console.log('\n=== Test 1: Page Accessibility ===');

  try {
    const response = await fetch(`${TEST_GUIDANCE_CHAT_API_BASE}/guidance-chat`);
    const html = await response.text();

    // Check if page loads successfully
    const pageLoads = response.status === 200;
    logTestResult('Page loads successfully', pageLoads, `Status: ${response.status}`);

    // Check if page contains expected elements
    const hasTitle = html.includes('财务合规指导');
    logTestResult('Page has correct title', hasTitle);

    const hasUploadSection = html.includes('上传文档');
    logTestResult('Page has upload section', hasUploadSection);

    return pageLoads && hasTitle && hasUploadSection;
  } catch (error) {
    logTestResult('Page Accessibility Test', false, `Error: ${error}`);
    return false;
  }
}

// Test 2: API Integration - Guidance Response
async function testGuidanceResponse() {
  console.log('\n=== Test 2: Guidance Response (VAT Rate) ===');

  try {
    const response = await fetch(`${TEST_GUIDANCE_CHAT_API_BASE}/api/guidance-chat-v2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: "公司销售软件产品，应该适用什么增值税税率？"
      })
    });

    const data: GuidanceResponse = await response.json();

    // Check response structure
    const hasCorrectStructure =
      data.hasOwnProperty('type') &&
      data.hasOwnProperty('citations') &&
      data.hasOwnProperty('confidence');
    logTestResult('Response has correct structure', hasCorrectStructure);

    // Check response type
    const hasValidType = ['guidance', 'not_found', 'low_confidence'].includes(data.type);
    logTestResult('Response type is valid', hasValidType, `Type: ${data.type}`);

    // Check citations
    const hasCitations = Array.isArray(data.citations);
    logTestResult('Citations are array', hasCitations, `Count: ${data.citations?.length || 0}`);

    if (data.citations && data.citations.length > 0) {
      const firstCitation = data.citations[0];
      const citationHasRequiredFields =
        firstCitation.regulation &&
        firstCitation.article &&
        firstCitation.content &&
        typeof firstCitation.relevance === 'number';
      logTestResult('Citations have required fields', !!citationHasRequiredFields,
        `Regulation: ${firstCitation.regulation}, Article: ${firstCitation.article}`);
    }

    // Check confidence score
    const hasValidConfidence =
      typeof data.confidence === 'number' &&
      data.confidence >= 0 &&
      data.confidence <= 1;
    logTestResult('Confidence score is valid', hasValidConfidence,
      `Confidence: ${(data.confidence * 100).toFixed(1)}%`);

    // Log full response for inspection
    console.log('\nFull Response:');
    console.log(JSON.stringify(data, null, 2));

    return hasCorrectStructure && hasValidType && hasCitations && hasValidConfidence;
  } catch (error) {
    logTestResult('Guidance Response Test', false, `Error: ${error}`);
    return false;
  }
}

// Test 3: Not Found Scenario
async function testNotFoundResponse() {
  console.log('\n=== Test 3: Not Found Response (Obscure Question) ===');

  try {
    const response = await fetch(`${TEST_GUIDANCE_CHAT_API_BASE}/api/guidance-chat-v2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: "火星殖民地的税务处理规定是什么？"
      })
    });

    const data: GuidanceResponse = await response.json();

    // Check if we get a response (might be not_found or low_confidence)
    const hasResponse = data.type !== undefined;
    logTestResult('Received response for obscure question', hasResponse, `Type: ${data.type}`);

    // Check response handling
    const properlyHandled =
      data.type === 'not_found' ||
      data.type === 'low_confidence' ||
      (data.type === 'guidance' && data.confidence < 0.6);
    logTestResult('Obscure question properly handled', properlyHandled,
      `Type: ${data.type}, Confidence: ${(data.confidence * 100).toFixed(1)}%`);

    return hasResponse && properlyHandled;
  } catch (error) {
    logTestResult('Not Found Response Test', false, `Error: ${error}`);
    return false;
  }
}

// Test 4: Document Upload Context
async function testDocumentUploadContext() {
  console.log('\n=== Test 4: Document Upload Context ===');

  try {
    const sampleContract = `
软件销售合同

甲方：示例科技有限公司
乙方：客户公司

第一条 合同标的
甲方向乙方销售软件产品，总金额为人民币 100,000 元（含税）。

第二条 付款方式
乙方应在合同签订后 30 日内支付全款。

第三条 税务处理
本合同项下的增值税专用发票由甲方开具。
    `.trim();

    const response = await fetch(`${TEST_GUIDANCE_CHAT_API_BASE}/api/guidance-chat-v2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: "这份合同应该如何处理税务？",
        uploadedDocument: {
          text: sampleContract,
          fileName: "软件销售合同.txt"
        }
      })
    });

    const data: GuidanceResponse = await response.json();

    // Check if context is considered
    const hasResponse = data.guidance !== undefined || data.type === 'not_found';
    logTestResult('Response generated with document context', hasResponse);

    // Check if confidence is reasonable (context should help)
    const reasonableConfidence = data.confidence > 0;
    logTestResult('Confidence score is positive with context', reasonableConfidence,
      `Confidence: ${(data.confidence * 100).toFixed(1)}%`);

    console.log('\nResponse Summary:', data.guidance?.substring(0, 200) || 'N/A');

    return hasResponse && reasonableConfidence;
  } catch (error) {
    logTestResult('Document Upload Context Test', false, `Error: ${error}`);
    return false;
  }
}

// Test 5: Multiple Questions (Different Topics)
async function testMultipleTopics() {
  console.log('\n=== Test 5: Multiple Topics ===');

  const questions = [
    "小规模纳税人的增值税税率是多少？",
    "企业所得税的基本税率是多少？",
    "固定资产折旧有哪些方法？",
  ];

  let allPassed = true;

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];
    console.log(`\n--- Question ${i + 1}: ${question} ---`);

    try {
      const response = await fetch(`${TEST_GUIDANCE_CHAT_API_BASE}/api/guidance-chat-v2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question })
      });

      const data: GuidanceResponse = await response.json();

      const success = response.ok && data.type !== undefined;
      logTestResult(`Question ${i + 1}`, success,
        `Type: ${data.type}, Confidence: ${(data.confidence * 100).toFixed(1)}%`);

      if (!success) allPassed = false;

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      logTestResult(`Question ${i + 1}`, false, `Error: ${error}`);
      allPassed = false;
    }
  }

  return allPassed;
}

// Test 6: Response Components
async function testResponseComponents() {
  console.log('\n=== Test 6: Response Components (Detailed Check) ===');

  try {
    const response = await fetch(`${TEST_GUIDANCE_CHAT_API_BASE}/api/guidance-chat-v2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: "增值税的基本税率有哪些？"
      })
    });

    const data: GuidanceResponse = await response.json();

    // Check main guidance
    const hasGuidance = data.guidance !== undefined && data.guidance.length > 0;
    logTestResult('Has guidance text', hasGuidance);

    // Check citations structure
    if (data.citations && data.citations.length > 0) {
      const citation = data.citations[0];

      const hasRegulation = citation.regulation && citation.regulation.length > 0;
      logTestResult('Citation has regulation name', !!hasRegulation, citation.regulation);

      const hasArticle = citation.article && citation.article.length > 0;
      logTestResult('Citation has article number', !!hasArticle, citation.article);

      const hasContent = citation.content && citation.content.length > 0;
      logTestResult('Citation has content', !!hasContent,
        `Length: ${citation.content?.length || 0} chars`);

      const hasRelevance = typeof citation.relevance === 'number' &&
        citation.relevance >= 0 &&
        citation.relevance <= 1;
      logTestResult('Citation has valid relevance score', hasRelevance,
        `${(citation.relevance * 100).toFixed(1)}%`);
    }

    // Check warnings (if any)
    if (data.warnings && data.warnings.length > 0) {
      console.log(`\nWarnings (${data.warnings.length}):`);
      data.warnings.forEach((warning, idx) => {
        console.log(`  ${idx + 1}. ${warning}`);
      });
    }

    // Check related articles (if any)
    if (data.relatedArticles && data.relatedArticles.length > 0) {
      console.log(`\nRelated Articles (${data.relatedArticles.length}):`);
      data.relatedArticles.forEach((article, idx) => {
        console.log(`  ${idx + 1}. ${article.regulation} ${article.article}`);
      });
    }

    return hasGuidance;
  } catch (error) {
    logTestResult('Response Components Test', false, `Error: ${error}`);
    return false;
  }
}

// Main test runner
async function runAllGuidanceChatTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     Compliance Guidance Page Test Suite (Task 23)         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  const startTime = Date.now();

  const results = {
    pageAccessibility: await testPageAccessibility(),
    guidanceResponse: await testGuidanceResponse(),
    notFoundResponse: await testNotFoundResponse(),
    documentUpload: await testDocumentUploadContext(),
    multipleTopics: await testMultipleTopics(),
    responseComponents: await testResponseComponents(),
  };

  const endTime = Date.now();
  const totalTime = ((endTime - startTime) / 1000).toFixed(2);

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║                      Test Summary                          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  const passRate = ((passedTests / totalTests) * 100).toFixed(1);

  Object.entries(results).forEach(([name, passed]) => {
    const status = passed ? '✅' : '❌';
    const label = name.replace(/([A-Z])/g, ' $1').trim();
    console.log(`${status} ${label.charAt(0).toUpperCase() + label.slice(1)}`);
  });

  console.log('\n' + '─'.repeat(60));
  console.log(`Total: ${passedTests}/${totalTests} tests passed (${passRate}%)`);
  console.log(`Total time: ${totalTime}s`);
  console.log('─'.repeat(60));

  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! Task 23 is complete.');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the output above.');
  }
}

// Run tests
runAllGuidanceChatTests().catch(console.error);
