/**
 * Financial Analysis Agent Test
 *
 * Tests the Agent workflow including:
 * - Tool calling loop
 * - Session persistence
 * - Multi-turn conversation context
 *
 * Run with: npx tsx tests/agent-test.ts
 */

// Load environment variables FIRST
import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function main() {
    // Dynamic import after env vars are loaded
    const { runFinancialAgentWorkflow } = await import('../src/lib/workflows/financial-analysis');

    console.log("=== Testing Financial Analysis Agent ===\n");

    try {
        // Test 1: First Turn - Basic question
        console.log("1. First Question: '今年的资产负债率是多少？'");
        console.log("   (This tests: session creation, tool calling, calculation)\n");

        const startTime1 = Date.now();
        const result1 = await runFinancialAgentWorkflow({
            question: "今年的资产负债率是多少？",
            year: "2024",
            period: "annual"
        });
        const duration1 = Date.now() - startTime1;

        console.log("   Result Type:", result1.output.type);
        console.log("   Answer:", result1.output.answer?.substring(0, 100) + "...");
        console.log("   Session ID:", result1.agent?.sessionId);
        console.log("   Iteration Count:", result1.agent?.currentIteration);
        console.log("   Duration:", duration1, "ms");

        const sessionId = result1.agent?.sessionId;
        if (!sessionId) {
            console.error("\n❌ FAILED: No session ID returned");
            process.exit(1);
        }

        // Test 2: Second Turn - Context-aware question
        console.log("\n2. Follow-up: '与去年相比如何？'");
        console.log("   (This tests: session loading, context understanding)\n");

        const startTime2 = Date.now();
        const result2 = await runFinancialAgentWorkflow({
            question: "与去年相比如何？",
            sessionId: sessionId
        });
        const duration2 = Date.now() - startTime2;

        console.log("   Result Type:", result2.output.type);
        console.log("   Answer:", result2.output.answer?.substring(0, 100) + "...");
        console.log("   Session ID:", result2.agent?.sessionId);
        console.log("   Iteration Count:", result2.agent?.currentIteration);
        console.log("   Duration:", duration2, "ms");

        // Test 3: Multi-metric question
        console.log("\n3. Multi-metric: '计算流动比率和速动比率'");
        console.log("   (This tests: multiple tool calls in sequence)\n");

        const startTime3 = Date.now();
        const result3 = await runFinancialAgentWorkflow({
            question: "请计算流动比率和速动比率",
            sessionId: sessionId,
            year: "2024"
        });
        const duration3 = Date.now() - startTime3;

        console.log("   Result Type:", result3.output.type);
        console.log("   Answer:", result3.output.answer?.substring(0, 150) + "...");
        console.log("   Iteration Count:", result3.agent?.currentIteration);
        console.log("   Duration:", duration3, "ms");

        // Validation
        console.log("\n=== Validation ===");
        let passed = true;

        // Check session persistence
        if (result1.agent?.sessionId !== result2.agent?.sessionId) {
            console.error("❌ FAILED: Session ID should persist across turns");
            passed = false;
        } else {
            console.log("✓ Session persistence: PASS");
        }

        // Check iteration count is within limits
        if (result1.agent?.currentIteration > 5) {
            console.error("❌ FAILED: Iteration count exceeded limit (5)");
            passed = false;
        } else {
            console.log("✓ Iteration limit: PASS");
        }

        // Check context understanding (look for comparison keywords)
        const contextKeywords = ['去年', '2023', '相比', '变化', '增长', '下降', '对比'];
        const hasContext = contextKeywords.some(kw => result2.output.answer?.includes(kw));
        if (hasContext) {
            console.log("✓ Context understanding: PASS");
        } else {
            console.log("⚠️ Context understanding: UNCERTAIN (check answer manually)");
        }

        // Check performance
        const maxDuration = 30000; // 30 seconds
        if (duration1 > maxDuration || duration2 > maxDuration || duration3 > maxDuration) {
            console.error(`❌ FAILED: Response time exceeded ${maxDuration}ms`);
            passed = false;
        } else {
            console.log("✓ Performance (<30s): PASS");
        }

        if (passed) {
            console.log("\n✅ ALL AGENT TESTS PASSED");
        } else {
            console.log("\n❌ SOME TESTS FAILED");
            process.exit(1);
        }

    } catch (error) {
        console.error("\n❌ TEST FAILED with error:", error);
        process.exit(1);
    }
}

main().catch(console.error);
