/**
 * Memory Test - Tests Conversation Memory Service
 *
 * Run with: npx tsx tests/memory-test.ts
 */

// Load environment variables FIRST (before any other imports)
import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// Dynamic import to ensure env vars are loaded first
async function main() {
    // Now import the module (after env vars are loaded)
    const { ConversationMemory } = await import('../src/lib/memory/conversation-memory');

    console.log("=== Testing Conversation Memory Service ===\n");

    const memory = new ConversationMemory();

    try {
        // 1. Create a session
        console.log("1. Creating Session...");
        const sessionId = await memory.createSession('financial-analysis', { test: true });
        console.log("   ✓ Session ID:", sessionId);

        // 2. Add messages
        console.log("\n2. Saving Messages...");
        const messages = [
            { role: 'user' as const, content: '今年的流动比率是多少？' },
            { role: 'assistant' as const, content: '2024年的流动比率是 1.85...' }
        ];
        await memory.saveMessages(sessionId, messages);
        console.log("   ✓ Messages saved.");

        // 3. Load session
        console.log("\n3. Loading Session...");
        const session = await memory.loadSession(sessionId);
        console.log("   ✓ Session Loaded:", session?.id);
        console.log("   ✓ Message Count:", session?.messages.length);

        if (session?.messages) {
            console.log("   ✓ First Message:", session.messages[0]?.content);
            console.log("   ✓ Last Message:", session.messages[session.messages.length - 1]?.content);
        }

        // 4. Test getOrCreateSession (existing)
        console.log("\n4. Testing getOrCreateSession (existing session)...");
        const result1 = await memory.getOrCreateSession(sessionId, 'financial-analysis');
        console.log("   ✓ isNew:", result1.isNew);
        console.log("   ✓ Messages loaded:", result1.messages.length);

        // 5. Test getOrCreateSession (new)
        console.log("\n5. Testing getOrCreateSession (new session)...");
        const result2 = await memory.getOrCreateSession(undefined, 'guidance-chat');
        console.log("   ✓ isNew:", result2.isNew);
        console.log("   ✓ New Session ID:", result2.sessionId);

        // Validation
        console.log("\n=== Validation ===");
        let passed = true;

        if (session?.messages.length !== 2) {
            console.error("❌ FAILED: Expected 2 messages, got", session?.messages.length);
            passed = false;
        }

        if (session?.messages[0]?.content !== '今年的流动比率是多少？') {
            console.error("❌ FAILED: First message content mismatch");
            passed = false;
        }

        if (result1.isNew !== false) {
            console.error("❌ FAILED: getOrCreateSession should return isNew=false for existing session");
            passed = false;
        }

        if (result2.isNew !== true) {
            console.error("❌ FAILED: getOrCreateSession should return isNew=true for new session");
            passed = false;
        }

        if (passed) {
            console.log("\n✅ ALL MEMORY TESTS PASSED");
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
