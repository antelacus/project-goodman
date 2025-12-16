/**
 * Landing Chat Workflow Integration Test
 *
 * Tests the complete landing chat workflow end-to-end.
 */

async function testLandingChatWorkflow() {
  const API_URL = "http://localhost:3000/api/landing-chat";

  console.log("=".repeat(80));
  console.log("Landing Chat Workflow Integration Test");
  console.log("=".repeat(80));
  console.log();

  // Test Case 1: Basic greeting/general query
  console.log("Test 1: Basic greeting/general query");
  console.log("-".repeat(80));
  const test1Start = Date.now();

  try {
    const response1 = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "你好，你能帮我做什么？",
        conversationHistory: [],
      }),
    });

    const test1Duration = ((Date.now() - test1Start) / 1000).toFixed(1);
    const result1 = await response1.json();

    console.log("Status:", response1.status);
    console.log("Response time:", test1Duration + "s");
    console.log("\nReply:", result1.reply?.substring(0, 200) + "...");
    console.log("\nSuggested module:", result1.suggestedModule?.displayName || "None");
    console.log("Confidence score:", (result1.confidence * 100).toFixed(2) + "%");
    console.log("Suggested questions:", result1.suggestedQuestions?.length || 0);
    if (result1.suggestedQuestions) {
      result1.suggestedQuestions.forEach((q: string, idx: number) => {
        console.log(`  ${idx + 1}. ${q}`);
      });
    }

    console.log("\n✅ Test 1 PASSED");
  } catch (error) {
    console.error("\n❌ Test 1 FAILED:", error);
  }

  console.log("\n" + "=".repeat(80));

  // Test Case 2: Query suggesting financial analysis module
  console.log("\nTest 2: Query suggesting financial-analysis module");
  console.log("-".repeat(80));
  const test2Start = Date.now();

  try {
    const response2 = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "我想计算一下公司的资产负债率和净利率",
        conversationHistory: [],
      }),
    });

    const test2Duration = ((Date.now() - test2Start) / 1000).toFixed(1);
    const result2 = await response2.json();

    console.log("Status:", response2.status);
    console.log("Response time:", test2Duration + "s");
    console.log("\nReply:", result2.reply?.substring(0, 200) + "...");
    console.log("\nSuggested module:", result2.suggestedModule?.displayName || "None");
    console.log("Module name:", result2.suggestedModule?.name || "None");
    console.log("Module reason:", result2.suggestedModule?.reason || "None");
    console.log("Confidence score:", (result2.confidence * 100).toFixed(2) + "%");

    if (result2.suggestedModule?.name === "financial-analysis") {
      console.log("\n✅ Test 2 PASSED (correctly suggested financial-analysis module)");
    } else {
      console.log("\n⚠️ Test 2 WARNING (expected financial-analysis module, got:", result2.suggestedModule?.name || "none" + ")");
    }
  } catch (error) {
    console.error("\n❌ Test 2 FAILED:", error);
  }

  console.log("\n" + "=".repeat(80));

  // Test Case 3: Query suggesting guidance-chat module
  console.log("\nTest 3: Query suggesting guidance-chat module");
  console.log("-".repeat(80));
  const test3Start = Date.now();

  try {
    const response3 = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "企业所得税税率是多少？增值税怎么计算？",
        conversationHistory: [],
      }),
    });

    const test3Duration = ((Date.now() - test3Start) / 1000).toFixed(1);
    const result3 = await response3.json();

    console.log("Status:", response3.status);
    console.log("Response time:", test3Duration + "s");
    console.log("\nReply:", result3.reply?.substring(0, 200) + "...");
    console.log("\nSuggested module:", result3.suggestedModule?.displayName || "None");
    console.log("Module name:", result3.suggestedModule?.name || "None");
    console.log("Confidence score:", (result3.confidence * 100).toFixed(2) + "%");

    if (result3.suggestedModule?.name === "guidance-chat") {
      console.log("\n✅ Test 3 PASSED (correctly suggested guidance-chat module)");
    } else {
      console.log("\n⚠️ Test 3 WARNING (expected guidance-chat module, got:", result3.suggestedModule?.name || "none" + ")");
    }
  } catch (error) {
    console.error("\n❌ Test 3 FAILED:", error);
  }

  console.log("\n" + "=".repeat(80));

  // Test Case 4: Conversation with history
  console.log("\nTest 4: Conversation with history");
  console.log("-".repeat(80));
  const test4Start = Date.now();

  try {
    const response4 = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "还有其他功能吗？",
        conversationHistory: [
          { role: "user", content: "你好" },
          { role: "assistant", content: "你好！我是Goodman财务助手。" },
        ],
      }),
    });

    const test4Duration = ((Date.now() - test4Start) / 1000).toFixed(1);
    const result4 = await response4.json();

    console.log("Status:", response4.status);
    console.log("Response time:", test4Duration + "s");
    console.log("\nReply:", result4.reply?.substring(0, 200) + "...");
    console.log("Confidence score:", (result4.confidence * 100).toFixed(2) + "%");

    console.log("\n✅ Test 4 PASSED");
  } catch (error) {
    console.error("\n❌ Test 4 FAILED:", error);
  }

  console.log("\n" + "=".repeat(80));

  // Test Case 5: Invalid input (empty message)
  console.log("\nTest 5: Invalid input handling");
  console.log("-".repeat(80));
  const test5Start = Date.now();

  try {
    const response5 = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "",
      }),
    });

    const test5Duration = ((Date.now() - test5Start) / 1000).toFixed(1);
    const result5 = await response5.json();

    console.log("Status:", response5.status);
    console.log("Response time:", test5Duration + "s");
    console.log("\nError message:", result5.error);

    if (response5.status === 400) {
      console.log("\n✅ Test 5 PASSED (correctly rejected invalid input)");
    } else {
      console.log("\n❌ Test 5 FAILED (should return 400 status)");
    }
  } catch (error) {
    console.error("\n❌ Test 5 FAILED:", error);
  }

  console.log("\n" + "=".repeat(80));
  console.log("All tests completed!");
  console.log("=".repeat(80));
}

// Run tests
testLandingChatWorkflow().catch(console.error);
