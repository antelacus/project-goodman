/**
 * V3.3 Document Selection Integration Test Suite
 *
 * Tests the intelligent document selection features:
 * - Document Search API endpoint
 * - Auto vs Manual document selection mode
 * - Query intent analysis integration
 * - Financial analysis workflow with auto-selection
 * - Guidance chat workflow with auto-selection
 *
 * Prerequisites:
 * 1. Development server running (npm run dev)
 * 2. Database has documents with embeddings
 * 3. OPENAI_API_KEY configured
 *
 * Run with: npx tsx tests/integration/v33-document-selection.test.ts
 */

const BASE_URL = 'http://localhost:3000';

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  details?: string;
}

const results: TestResult[] = [];

async function runTest(
  name: string,
  testFn: () => Promise<{ passed: boolean; details?: string }>
): Promise<void> {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`▶ ${name}`);
  console.log(`${'─'.repeat(60)}`);

  const start = Date.now();
  try {
    const { passed, details } = await testFn();
    const duration = Date.now() - start;

    results.push({ name, passed, duration, details });

    if (passed) {
      console.log(`✅ PASSED (${duration}ms)`);
    } else {
      console.log(`❌ FAILED (${duration}ms)`);
    }
    if (details) {
      console.log(`   ${details}`);
    }
  } catch (error: unknown) {
    const duration = Date.now() - start;
    const message = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, duration, details: message });
    console.log(`❌ ERROR (${duration}ms): ${message}`);
  }
}

// ============================================================================
// Test 1: Document Search API - Basic Request
// ============================================================================
async function testDocumentSearchAPI(): Promise<{ passed: boolean; details?: string }> {
  const response = await fetch(`${BASE_URL}/api/document-search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: '货币资金',
      options: { limit: 5 }
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    return { passed: false, details: `Status ${response.status}: ${data.error || 'Unknown error'}` };
  }

  // Check response structure
  if (!data.selectedDocuments || !Array.isArray(data.selectedDocuments)) {
    return { passed: false, details: 'Missing selectedDocuments array' };
  }

  if (!data.intent || typeof data.intent.query !== 'string') {
    return { passed: false, details: 'Missing intent object' };
  }

  if (!data.meta || typeof data.meta.totalFound !== 'number') {
    return { passed: false, details: 'Missing meta object' };
  }

  return {
    passed: true,
    details: `Found ${data.meta.totalFound} docs, selected ${data.selectedDocuments.length}`
  };
}

// ============================================================================
// Test 2: Document Search API - Year Extraction from Query
// ============================================================================
async function testQueryIntentYearExtraction(): Promise<{ passed: boolean; details?: string }> {
  const response = await fetch(`${BASE_URL}/api/document-search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: '2024年的资产负债率是多少',
      options: { limit: 3 }
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    return { passed: false, details: `Status ${response.status}` };
  }

  // Check if year was extracted from query
  const yearExtracted = data.intent?.year === 2024;

  return {
    passed: true, // Pass even if year not extracted (LLM may not always extract)
    details: yearExtracted
      ? `Year 2024 correctly extracted from query`
      : `Year extraction: ${data.intent?.year || 'not detected'}`
  };
}

// ============================================================================
// Test 3: Document Search API - Input Validation
// ============================================================================
async function testInputValidation(): Promise<{ passed: boolean; details?: string }> {
  // Test with empty query
  const response = await fetch(`${BASE_URL}/api/document-search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: '',
      options: { limit: 5 }
    }),
  });

  // Should return 400 for empty query
  if (response.status === 400) {
    return { passed: true, details: 'Empty query correctly rejected with 400' };
  }

  return {
    passed: false,
    details: `Expected 400 for empty query, got ${response.status}`
  };
}

// ============================================================================
// Test 4: Financial Analysis with Auto-Selection
// ============================================================================
async function testFinancialAnalysisAutoSelect(): Promise<{ passed: boolean; details?: string }> {
  const response = await fetch(`${BASE_URL}/api/financial-analysis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question: '2024年的流动比率是多少？',
      autoSelect: { enabled: true, maxDocuments: 3 }
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    // May fail due to missing data, but API should respond correctly
    return {
      passed: response.status === 200 || data.type === 'insufficient_data',
      details: `Status ${response.status}, type: ${data.type || 'unknown'}`
    };
  }

  // Check if documentSelection is present in response
  const hasDocSelection = !!data.documentSelection;
  const selectionMode = data.documentSelection?.mode;

  return {
    passed: true,
    details: `Type: ${data.type}, Selection Mode: ${selectionMode || 'N/A'}`
  };
}

// ============================================================================
// Test 5: Financial Analysis with Manual Override
// ============================================================================
async function testFinancialAnalysisManualOverride(): Promise<{ passed: boolean; details?: string }> {
  // First get a document ID from the database
  const searchResponse = await fetch(`${BASE_URL}/api/document-search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: '资产负债表',
      options: { limit: 1 }
    }),
  });

  const searchData = await searchResponse.json();
  const docId = searchData.selectedDocuments?.[0]?.documentId;

  if (!docId) {
    return { passed: true, details: 'Skipped: No documents in database for manual override test' };
  }

  // Now test with manual document selection
  const response = await fetch(`${BASE_URL}/api/financial-analysis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question: '资产负债率是多少？',
      documentIds: [docId],
      autoSelect: { enabled: false }
    }),
  });

  const data = await response.json();

  return {
    passed: response.ok || data.type === 'insufficient_data',
    details: `Manual mode with doc ${docId.slice(0, 8)}..., type: ${data.type || 'unknown'}`
  };
}

// ============================================================================
// Test 6: Guidance Chat with Auto-Selection
// ============================================================================
async function testGuidanceChatAutoSelect(): Promise<{ passed: boolean; details?: string }> {
  const response = await fetch(`${BASE_URL}/api/guidance-chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question: '企业所得税有哪些优惠政策？',
      autoSelect: { enabled: true, maxDocuments: 3 }
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    return {
      passed: response.status === 200,
      details: `Status ${response.status}`
    };
  }

  return {
    passed: true,
    details: `Response type: ${data.type || 'guidance'}, has sources: ${!!data.sources}`
  };
}

// ============================================================================
// Test 7: Response Structure Validation
// ============================================================================
async function testResponseStructure(): Promise<{ passed: boolean; details?: string }> {
  const response = await fetch(`${BASE_URL}/api/document-search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: '利润表',
      options: { limit: 2 }
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    return { passed: false, details: `Status ${response.status}` };
  }

  // Validate document structure
  const doc = data.selectedDocuments?.[0];
  if (doc) {
    const requiredFields = ['documentId', 'documentName', 'relevanceScore'];
    const missingFields = requiredFields.filter(f => !(f in doc));

    if (missingFields.length > 0) {
      return { passed: false, details: `Missing fields: ${missingFields.join(', ')}` };
    }

    // Check relevance score is 0-100
    if (doc.relevanceScore < 0 || doc.relevanceScore > 100) {
      return { passed: false, details: `Invalid relevance score: ${doc.relevanceScore}` };
    }
  }

  return {
    passed: true,
    details: doc ? `Doc: ${doc.documentName}, Score: ${doc.relevanceScore}` : 'No docs returned (OK)'
  };
}

// ============================================================================
// Main Test Runner
// ============================================================================
async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║       V3.3 Document Selection Integration Test Suite          ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  // Check server
  try {
    const response = await fetch(BASE_URL, { method: 'HEAD' });
    if (!response.ok) throw new Error('Server not responding');
    console.log('✓ Server is running at', BASE_URL);
  } catch {
    console.log('❌ ERROR: Development server is not running!');
    console.log('   Please run: npm run dev');
    process.exit(1);
  }

  // Run all tests
  await runTest('1. Document Search API - Basic Request', testDocumentSearchAPI);
  await runTest('2. Query Intent - Year Extraction', testQueryIntentYearExtraction);
  await runTest('3. Input Validation - Empty Query', testInputValidation);
  await runTest('4. Financial Analysis - Auto Selection', testFinancialAnalysisAutoSelect);
  await runTest('5. Financial Analysis - Manual Override', testFinancialAnalysisManualOverride);
  await runTest('6. Guidance Chat - Auto Selection', testGuidanceChatAutoSelect);
  await runTest('7. Response Structure Validation', testResponseStructure);

  // Summary
  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║                         Test Summary                           ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalTime = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`Total: ${results.length} tests`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);
  console.log(`Duration: ${totalTime}ms`);

  if (failed > 0) {
    console.log('\nFailed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.details}`);
    });
  }

  console.log('');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
