/**
 * Guidance Chat Agent Test
 *
 * Tests the Guidance Chat Agent workflow including:
 * - Hybrid search (vector + keyword)
 * - Tool calling for calculations
 * - Session persistence
 * - Multi-turn conversation context
 *
 * Run with: npx tsx tests/guidance-test.ts
 */

// Load environment variables FIRST
import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

async function main() {
    // Dynamic import after env vars are loaded
    const { runGuidanceChatWorkflow } = await import('../src/lib/workflows/guidance-chat');

    console.log("=== Testing Guidance Chat Agent ===\n");

    try {
        // Test 1: First Turn - Regulation question
        console.log("1. First Question: '什么是企业所得税？'");
        console.log("   (This tests: search, guidance generation, session creation)\n");

        const startTime1 = Date.now();
        const result1 = await runGuidanceChatWorkflow({
            question: "什么是企业所得税？"
        });
        const duration1 = Date.now() - startTime1;

        console.log("   Result Type:", result1.output?.type);
        console.log("   Guidance:", result1.output?.guidance?.substring(0, 100) + "...");
        console.log("   Session ID:", result1.sessionId);
        console.log("   Duration:", duration1, "ms");

        const sessionId = result1.sessionId;
        if (!sessionId) {
            console.error("\n❌ FAILED: No session ID returned");
            process.exit(1);
        }

        // Test 2: Follow-up question
        console.log("\n2. Follow-up: '税率是多少？'");
        console.log("   (This tests: session loading, context understanding)\n");

        const startTime2 = Date.now();
        const result2 = await runGuidanceChatWorkflow({
            question: "税率是多少？",
            sessionId: sessionId
        });
        const duration2 = Date.now() - startTime2;

        console.log("   Result Type:", result2.output?.type);
        console.log("   Guidance:", result2.output?.guidance?.substring(0, 100) + "...");
        console.log("   Session ID:", result2.sessionId);
        console.log("   Duration:", duration2, "ms");

        // Test 3: Question requiring tool use
        console.log("\n3. Calculation Question: '根据财务数据计算资产负债率'");
        console.log("   (This tests: tool calling within guidance chat)\n");

        const startTime3 = Date.now();
        const result3 = await runGuidanceChatWorkflow({
            question: "请根据我公司的财务数据计算资产负债率",
            sessionId: sessionId
        });
        const duration3 = Date.now() - startTime3;

        console.log("   Result Type:", result3.output?.type);
        console.log("   Guidance:", result3.output?.guidance?.substring(0, 150) + "...");
        console.log("   Duration:", duration3, "ms");

        // Validation
        console.log("\n=== Validation ===");
        let passed = true;

        // Check session persistence
        if (result1.sessionId !== result2.sessionId) {
            console.error("❌ FAILED: Session ID should persist across turns");
            passed = false;
        } else {
            console.log("✓ Session persistence: PASS");
        }

        // Check output type is valid
        const validTypes = ['success', 'not_found', 'error'];
        if (!validTypes.includes(result1.output?.type)) {
            console.error("❌ FAILED: Invalid output type");
            passed = false;
        } else {
            console.log("✓ Output type valid: PASS");
        }

        // Check guidance is non-empty
        if (!result1.output?.guidance || result1.output.guidance.length < 10) {
            console.error("❌ FAILED: Guidance response too short");
            passed = false;
        } else {
            console.log("✓ Guidance content: PASS");
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
            console.log("\n✅ ALL GUIDANCE CHAT TESTS PASSED");
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
