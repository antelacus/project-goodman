/**
 * Tool Registry Integration Test
 *
 * Run with: npx tsx tests/integration/tool-registry.test.ts
 */

import {
  toolRegistry,
  registerFinancialTools,
  buildFinancialAnalysisFunctionDefs,
  buildGuidanceChatFunctionDefs,
  getFinancialToolNames,
} from "../../src/lib/tools";

// ============================================================================
// Test Utilities
// ============================================================================

let passCount = 0;
let failCount = 0;

function test(name: string, fn: () => void | Promise<void>): void {
  try {
    const result = fn();
    if (result instanceof Promise) {
      result
        .then(() => {
          console.log(`✅ PASS: ${name}`);
          passCount++;
        })
        .catch((error) => {
          console.log(`❌ FAIL: ${name}`);
          console.log(`   Error: ${error.message}`);
          failCount++;
        });
    } else {
      console.log(`✅ PASS: ${name}`);
      passCount++;
    }
  } catch (error: any) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${error.message}`);
    failCount++;
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

// ============================================================================
// Tests
// ============================================================================

async function runTests() {
  console.log("\n========================================");
  console.log("Tool Registry Integration Tests");
  console.log("========================================\n");

  // Test 1: Registry starts empty
  test("Registry starts empty", () => {
    toolRegistry.clear();
    assert(toolRegistry.size === 0, "Registry should be empty after clear");
  });

  // Test 2: Register financial tools
  test("Register financial tools", () => {
    registerFinancialTools();
    assert(toolRegistry.size > 0, "Registry should have tools after registration");
    console.log(`   Registered ${toolRegistry.size} tools`);
  });

  // Test 3: Get tool by name
  test("Get tool by name", () => {
    const tool = toolRegistry.get("debt_to_asset_ratio");
    assert(tool !== undefined, "Should find debt_to_asset_ratio tool");
    assert(
      tool?.displayName === "资产负债率",
      "Display name should be 资产负债率"
    );
  });

  // Test 4: Get tools by category
  test("Get tools by category - financial", () => {
    const financialTools = toolRegistry.getByCategory("financial");
    assert(financialTools.length > 0, "Should have financial tools");
    console.log(`   Found ${financialTools.length} financial tools`);
  });

  // Test 5: Get tools by category - query
  test("Get tools by category - query", () => {
    const queryTools = toolRegistry.getByCategory("query");
    assert(queryTools.length >= 2, "Should have at least 2 query tools");
    console.log(`   Found ${queryTools.length} query tools`);
  });

  // Test 6: Tool names list
  test("Get all tool names", () => {
    const names = toolRegistry.getNames();
    assert(names.length === toolRegistry.size, "Names count should match size");
    assert(
      names.includes("current_ratio"),
      "Should include current_ratio"
    );
    assert(
      names.includes("get_financial_metric"),
      "Should include get_financial_metric"
    );
  });

  // Test 7: Build financial analysis function definitions
  test("Build financial analysis function definitions", () => {
    const defs = buildFinancialAnalysisFunctionDefs();
    assert(defs.length > 20, "Should have 20+ function definitions");

    // Check structure
    const firstDef = defs[0];
    assert(firstDef.type === "function", "Type should be function");
    assert(typeof firstDef.function.name === "string", "Should have name");
    assert(
      typeof firstDef.function.description === "string",
      "Should have description"
    );
    assert(
      typeof firstDef.function.parameters === "object",
      "Should have parameters"
    );

    console.log(`   Generated ${defs.length} function definitions`);
  });

  // Test 8: Build guidance chat function definitions
  test("Build guidance chat function definitions", () => {
    const defs = buildGuidanceChatFunctionDefs("资产总计, 负债总计...");
    assert(defs.length === 2, "Should have 2 function definitions");
    assert(
      defs[0].function.name === "query_financial_data",
      "First should be query_financial_data"
    );
    assert(
      defs[1].function.name === "calculate_financial_metric",
      "Second should be calculate_financial_metric"
    );
  });

  // Test 9: OpenAI function definitions from registry
  test("Convert registry to OpenAI function definitions", () => {
    const defs = toolRegistry.toOpenAIFunctionDefs();
    assert(defs.length > 0, "Should generate OpenAI definitions");

    // Check structure
    const firstDef = defs[0];
    assert(firstDef.type === "function", "Type should be function");
    console.log(`   Generated ${defs.length} OpenAI function definitions`);
  });

  // Test 10: Filter by category in OpenAI conversion
  test("Filter OpenAI definitions by category", () => {
    const financialDefs = toolRegistry.toOpenAIFunctionDefs({
      category: "financial",
    });
    const queryDefs = toolRegistry.toOpenAIFunctionDefs({ category: "query" });

    assert(financialDefs.length > queryDefs.length, "Financial should have more tools than query");
    console.log(
      `   Financial: ${financialDefs.length}, Query: ${queryDefs.length}`
    );
  });

  // Test 11: Execute calculate_financial_metric tool
  test("Execute calculate_financial_metric tool", async () => {
    const result = await toolRegistry.execute("calculate_financial_metric", {
      metric_name: "debt_to_asset_ratio",
      inputs: {
        负债总计: 500000,
        资产总计: 1000000,
      },
    });

    assert(result.success, "Calculation should succeed");
    assert(result.data !== undefined, "Should return data");

    const data = result.data as any;
    assert(Math.abs(data.value - 0.5) < 0.001, "Value should be 0.5 (50%)");
    console.log(`   Result: ${data.formatted}`);
  });

  // Test 12: Execute with invalid input
  test("Execute with invalid input", async () => {
    const result = await toolRegistry.execute("calculate_financial_metric", {
      metric_name: "invalid_metric",
      inputs: {},
    });

    assert(!result.success, "Should fail with invalid metric");
    assert(result.error !== undefined, "Should have error message");
  });

  // Test 13: Execute non-existent tool
  test("Execute non-existent tool", async () => {
    const result = await toolRegistry.execute("non_existent_tool", {});
    assert(!result.success, "Should fail for non-existent tool");
    assert(result.error?.includes("not found"), "Error should mention not found");
  });

  // Test 14: Get financial tool names helper
  test("Get financial tool names helper", () => {
    const names = getFinancialToolNames();
    assert(names.length > 20, "Should have 20+ financial tool names");
    assert(names.includes("current_ratio"), "Should include current_ratio");
    assert(names.includes("dupont_roe"), "Should include dupont_roe");
  });

  // Test 15: Tool list for debugging
  test("Tool list for debugging", () => {
    const list = toolRegistry.toList();
    assert(list.length === toolRegistry.size, "List should match size");
    assert(list[0].name !== undefined, "Should have name");
    assert(list[0].displayName !== undefined, "Should have displayName");
    assert(list[0].category !== undefined, "Should have category");
  });

  // Wait for async tests
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Summary
  console.log("\n========================================");
  console.log(`Results: ${passCount} passed, ${failCount} failed`);
  console.log("========================================\n");

  if (failCount > 0) {
    process.exit(1);
  }
}

// Run tests
runTests().catch(console.error);
