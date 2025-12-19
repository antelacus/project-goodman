
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Using relative paths to import from src/lib
// Note: This relies on running with tsconfig-paths/register to handle internal @/ imports
import { runFinancialAnalysisWorkflow } from '../src/lib/workflows/financial-analysis';
import { runGuidanceChatWorkflow } from '../src/lib/workflows/guidance-chat';

async function verify() {
    console.log('=== Verifying Phase C Integration ===');

    // Test 1: Financial Analysis Auto-Selection
    console.log('\n--- Test 1: Financial Analysis (Auto Selection) ---');
    try {
        const start = Date.now();
        // Simulate API input
        const input = {
            question: "2024年净利润是多少？",
            autoSelect: { enabled: true, maxDocuments: 2 }
        };

        console.log('Running workflow with input:', JSON.stringify(input));

        const faState = await runFinancialAnalysisWorkflow(input);
        console.log(`Duration: ${Date.now() - start}ms`);

        // Check if documentSelection property exists (it's optional in state interface)
        if (faState.documentSelection) {
            console.log('✅ Document Selection populated!');
            console.log('Meta:', faState.documentSelection.meta);
            console.log('Selection Reason:', faState.documentSelection.selectionReason);
            if (faState.documentSelection.selectedDocuments.length > 0) {
                console.log('Selected Docs:', faState.documentSelection.selectedDocuments.map(d => d.documentName));
            } else {
                console.log('⚠️ No documents selected (but step ran).');
            }
        } else {
            console.error('❌ Document Selection missing in state!');
        }
    } catch (e) {
        console.error('Test 1 Failed:', e);
    }

    // Test 2: Guidance Chat (Auto Selection)
    console.log('\n--- Test 2: Guidance Chat (Auto Selection) ---');
    try {
        const start = Date.now();
        const input = {
            question: "研发费用加计扣除政策是什么？",
            autoSelect: { enabled: true, maxDocuments: 2 }
        };

        console.log('Running workflow with input:', JSON.stringify(input));

        const gcState = await runGuidanceChatWorkflow(input);
        console.log(`Duration: ${Date.now() - start}ms`);

        if (gcState.documentSelection) {
            console.log('✅ Document Selection populated!');
            console.log('Meta:', gcState.documentSelection.meta);
            console.log('Selection Reason:', gcState.documentSelection.selectionReason);
            if (gcState.documentSelection.selectedDocuments.length > 0) {
                console.log('Selected Docs:', gcState.documentSelection.selectedDocuments.map(d => d.documentName));
            } else {
                console.log('⚠️ No documents selected (but step ran).');
            }
        } else {
            console.error('❌ Document Selection missing in state!');
        }

        console.log('Combined Search Results Count:', gcState.search.combinedResults.length);

    } catch (e) {
        console.error('Test 2 Failed:', e);
    }
}

verify().catch(console.error);
