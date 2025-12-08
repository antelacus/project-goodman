/**
 * Test Script for Landing Page
 * Tests the conversational chat interface and module routing
 */

const TEST_LANDING_PAGE_BASE_URL = "http://localhost:3000";

interface LandingPageTestResult {
  test: string;
  success: boolean;
  details?: any;
  error?: string;
}

async function testLandingChat(message: string, description: string): Promise<LandingPageTestResult> {
  try {
    console.log(`\n🧪 Testing: ${description}`);
    console.log(`   Message: "${message}"`);

    const response = await fetch(`${TEST_LANDING_PAGE_BASE_URL}/api/landing-chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        conversationHistory: [],
      }),
    });

    if (!response.ok) {
      return {
        test: description,
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    const data = await response.json();

    console.log(`   ✅ Reply: ${data.reply.substring(0, 100)}...`);
    if (data.suggestedModule) {
      console.log(`   📍 Suggested Module: ${data.suggestedModule.displayName} (${data.suggestedModule.name})`);
      console.log(`   🔍 Reason: ${data.suggestedModule.reason}`);
    }
    if (data.suggestedQuestions && data.suggestedQuestions.length > 0) {
      console.log(`   💡 Suggested Questions (${data.suggestedQuestions.length}):`);
      data.suggestedQuestions.forEach((q: string, i: number) => {
        console.log(`      ${i + 1}. ${q}`);
      });
    }
    console.log(`   🎯 Confidence: ${(data.confidence * 100).toFixed(1)}%`);

    return {
      test: description,
      success: true,
      details: {
        reply: data.reply,
        suggestedModule: data.suggestedModule,
        suggestedQuestions: data.suggestedQuestions,
        confidence: data.confidence,
      },
    };
  } catch (error) {
    return {
      test: description,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function runLandingPageTests() {
  console.log("=".repeat(60));
  console.log("🚀 Landing Page Chat Tests");
  console.log("=".repeat(60));

  const results: LandingPageTestResult[] = [];

  // Test 1: Extraction routing
  results.push(
    await testLandingChat(
      "我想从PDF文件中提取财务数据",
      "Test 1: Extraction module routing"
    )
  );

  // Test 2: Analysis routing
  results.push(
    await testLandingChat(
      "帮我计算2024年的资产负债率",
      "Test 2: Financial analysis routing"
    )
  );

  // Test 3: Guidance routing
  results.push(
    await testLandingChat(
      "请问增值税税率是多少？",
      "Test 3: Compliance guidance routing"
    )
  );

  // Test 4: General conversation
  results.push(
    await testLandingChat("你好，能介绍一下你的功能吗？", "Test 4: General greeting")
  );

  // Test 5: Ambiguous query
  results.push(
    await testLandingChat("我需要帮助", "Test 5: Ambiguous query")
  );

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 Test Summary");
  console.log("=".repeat(60));

  const successCount = results.filter((t) => t.success).length;
  const totalCount = results.length;

  results.forEach((test, index) => {
    const status = test.success ? "✅ PASS" : "❌ FAIL";
    console.log(`${index + 1}. ${status} - ${test.test}`);
    if (test.error) {
      console.log(`   Error: ${test.error}`);
    }
  });

  console.log(`\nResults: ${successCount}/${totalCount} tests passed`);

  if (successCount === totalCount) {
    console.log("\n🎉 All tests passed!");
  } else {
    console.log("\n⚠️  Some tests failed. Please review the errors above.");
  }
}

// Run tests
runLandingPageTests().catch(console.error);
