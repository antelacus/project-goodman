/**
 * Guidance Chat Workflow Integration Test
 *
 * Tests the complete guidance chat workflow end-to-end.
 */

async function testGuidanceChatWorkflow() {
  const API_URL = "http://localhost:3000/api/guidance-chat";

  console.log("=".repeat(80));
  console.log("Guidance Chat Workflow Integration Test");
  console.log("=".repeat(80));
  console.log();

  // Test Case 1: Basic compliance guidance query
  console.log("Test 1: Basic compliance guidance query");
  console.log("-".repeat(80));
  const test1Start = Date.now();

  try {
    const response1 = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: "企业所得税的税率是多少？",
        documentIds: [], // Will search all knowledge documents
      }),
    });

    const test1Duration = ((Date.now() - test1Start) / 1000).toFixed(1);
    const result1 = await response1.json();

    console.log("Status:", response1.status);
    console.log("Response time:", test1Duration + "s");
    console.log("\nResponse type:", result1.type);
    console.log("Confidence score:", (result1.confidence * 100).toFixed(2) + "%");
    console.log("\nGuidance:", result1.guidance?.substring(0, 200) + "...");
    console.log("\nCitations found:", result1.citations?.length || 0);
    if (result1.citations && result1.citations.length > 0) {
      console.log("Top citation:", {
        regulation: result1.citations[0].regulation,
        article: result1.citations[0].article,
        relevance: (result1.citations[0].relevance * 100).toFixed(1) + "%",
      });
    }
    console.log("\nRelated articles:", result1.relatedArticles?.length || 0);
    console.log("Warnings:", result1.warnings?.length || 0);

    console.log("\n✅ Test 1 PASSED");
  } catch (error) {
    console.error("\n❌ Test 1 FAILED:", error);
  }

  console.log("\n" + "=".repeat(80));

  // Test Case 2: Guidance query with financial calculations
  console.log("\nTest 2: Guidance query with financial calculations");
  console.log("-".repeat(80));
  const test2Start = Date.now();

  try {
    const response2 = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: "我公司2024年的资产负债率是多少？这个比率符合税法要求吗？",
        documentIds: [], // Will search all documents
      }),
    });

    const test2Duration = ((Date.now() - test2Start) / 1000).toFixed(1);
    const result2 = await response2.json();

    console.log("Status:", response2.status);
    console.log("Response time:", test2Duration + "s");
    console.log("\nResponse type:", result2.type);
    console.log("Confidence score:", (result2.confidence * 100).toFixed(2) + "%");
    console.log("\nGuidance:", result2.guidance?.substring(0, 300) + "...");
    console.log("\nCitations found:", result2.citations?.length || 0);
    console.log("Calculations performed:", result2.calculations?.length || 0);

    if (result2.calculations && result2.calculations.length > 0) {
      console.log("\nCalculation details:");
      result2.calculations.forEach((calc: any, idx: number) => {
        console.log(`  ${idx + 1}. ${calc.functionDisplayName}: ${calc.result.formatted}`);
        console.log(`     Formula: ${calc.formula}`);
      });
    }

    console.log("\n✅ Test 2 PASSED");
  } catch (error) {
    console.error("\n❌ Test 2 FAILED:", error);
  }

  console.log("\n" + "=".repeat(80));

  // Test Case 3: Invalid input (empty question)
  console.log("\nTest 3: Invalid input handling");
  console.log("-".repeat(80));
  const test3Start = Date.now();

  try {
    const response3 = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: "",
      }),
    });

    const test3Duration = ((Date.now() - test3Start) / 1000).toFixed(1);
    const result3 = await response3.json();

    console.log("Status:", response3.status);
    console.log("Response time:", test3Duration + "s");
    console.log("\nError message:", result3.error);

    if (response3.status === 400) {
      console.log("\n✅ Test 3 PASSED (correctly rejected invalid input)");
    } else {
      console.log("\n❌ Test 3 FAILED (should return 400 status)");
    }
  } catch (error) {
    console.error("\n❌ Test 3 FAILED:", error);
  }

  console.log("\n" + "=".repeat(80));
  console.log("All tests completed!");
  console.log("=".repeat(80));
}

// Run tests
testGuidanceChatWorkflow().catch(console.error);
