
import { analyzeIntent } from '../src/lib/query-intent';
import * as dotenv from 'dotenv';
dotenv.config();

async function runTests() {
    console.log("=== Testing Query Intent Analysis ===");

    const queries = [
        "2023年财务报告",
        "Show me the cash flow for 2024",
        "关于审计报告的问题",
        "revenue comparison"
    ];

    for (const q of queries) {
        console.log(`\nQuery: "${q}"`);
        try {
            const intent = await analyzeIntent(q);
            console.log("Result:", JSON.stringify(intent, null, 2));
        } catch (e) {
            console.error("Error:", e);
        }
    }
}

// Check if run directly
runTests().catch(console.error);
