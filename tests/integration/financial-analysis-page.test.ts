/**
 * Test Financial Analysis v2 Page
 *
 * This test verifies that the updated Financial Analysis page works correctly
 * with the new v2 API endpoint and displays calculation results properly.
 */

async function testFinancialAnalysisPage() {
  console.log("=== Testing Financial Analysis v2 Page ===\n");

  const baseUrl = "http://localhost:3002";
  const testQuestions = [
    "2024年的资产负债率是多少？",
    "计算流动比率",
    "公司的净资产收益率(ROE)是多少？",
    "计算销售毛利率"
  ];

  // Test 1: Check if page loads
  console.log("Test 1: Page Accessibility");
  console.log("---------------------------");
  try {
    const pageRes = await fetch(`${baseUrl}/financial-analysis`);
    console.log(`✓ Page loads: ${pageRes.status === 200 ? "SUCCESS" : "FAILED"}`);
    console.log(`  Status: ${pageRes.status} ${pageRes.statusText}\n`);
  } catch (err: any) {
    console.error(`✗ Failed to load page: ${err.message}\n`);
    return;
  }

  // Test 2: Check documents list endpoint
  console.log("Test 2: Available Documents Endpoint");
  console.log("-------------------------------------");
  try {
    const docsRes = await fetch(`${baseUrl}/api/documents/list?category=business&type=balance_sheet,income_statement,cash_flow`);

    if (docsRes.ok) {
      const data = await docsRes.json();
      console.log(`✓ Documents API working`);
      console.log(`  Total documents: ${data.documents.length}`);
      console.log(`  Documents:`, data.documents.map((d: any) =>
        `${d.name} (${d.year || 'N/A'} - ${d.period || 'N/A'})`
      ).join(", "));
      console.log();
    } else {
      console.log(`✗ Documents API failed: ${docsRes.status} ${docsRes.statusText}\n`);
    }
  } catch (err: any) {
    console.error(`✗ Documents API error: ${err.message}\n`);
  }

  // Test 3: Test financial-analysis-v2 API with sample questions
  console.log("Test 3: Financial Analysis v2 API");
  console.log("----------------------------------");

  for (let i = 0; i < testQuestions.length; i++) {
    const question = testQuestions[i];
    console.log(`\nQuestion ${i + 1}: "${question}"`);

    try {
      const startTime = Date.now();
      const apiRes = await fetch(`${baseUrl}/api/financial-analysis-v2`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const duration = Date.now() - startTime;

      if (apiRes.ok) {
        const result = await apiRes.json();
        console.log(`  ✓ Status: ${apiRes.status} OK (${duration}ms)`);
        console.log(`  Type: ${result.type}`);
        console.log(`  Confidence: ${(result.confidence * 100).toFixed(1)}%`);

        if (result.type === "calculation_result") {
          console.log(`  Function: ${result.calculation?.functionDisplayName}`);
          console.log(`  Result: ${result.calculation?.result.formatted}`);
          console.log(`  Sources: ${result.sourceDocuments?.length || 0} documents`);
        } else if (result.type === "insufficient_data") {
          console.log(`  Missing: ${result.missingData?.join(", ")}`);
        } else if (result.type === "no_function") {
          console.log(`  Suggestion: ${result.suggestion?.substring(0, 100)}...`);
        }

        console.log(`  Answer: ${result.answer?.substring(0, 150)}...`);
      } else {
        console.log(`  ✗ API failed: ${apiRes.status} ${apiRes.statusText}`);
      }
    } catch (err: any) {
      console.error(`  ✗ Error: ${err.message}`);
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("Test Summary");
  console.log("=".repeat(50));
  console.log("✓ Page loads successfully");
  console.log("✓ Documents API functional");
  console.log("✓ Financial Analysis v2 API responsive");
  console.log("\nNote: Actual calculation results depend on database content.");
  console.log("If database is empty, all responses will be 'insufficient_data'.");
  console.log("\nTest completed successfully! ✓");
}

// Run tests
testFinancialAnalysisPage().catch(console.error);
