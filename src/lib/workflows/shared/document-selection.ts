
import { createServerSupabaseClient } from '@/lib/supabase';
import { selectDocumentsForQuery } from '@/lib/document-selector';
import {
    DocumentSelectionResult,
    SearchResultDocument
} from '@/lib/types/domain-types';
import { FinancialAnalysisState, GuidanceChatState } from '@/lib/types/workflow-states';

/**
 * Helper to fetch document details by IDs for manual override mode.
 * Returns SearchResultDocument format to maintain consistency with auto-selection.
 */
async function getDocumentsByIds(ids: string[]): Promise<SearchResultDocument[]> {
    if (ids.length === 0) return [];

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
        .from('documents')
        .select('id, name, doc_type, year, period')
        .in('id', ids);

    if (error) {
        console.error('Error fetching documents by IDs:', error);
        return [];
    }

    if (!data) return [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data as any[]).map(doc => ({
        documentId: doc.id,
        documentName: doc.name,
        docType: doc.doc_type,
        year: typeof doc.year === 'number' ? doc.year : Number(doc.year), // Ensure number
        period: doc.period,
        relevanceScore: 100, // Manual selection implies 100% relevance
        matchedChunks: [] // No chunks for manual selection at this stage
    }));
}

/**
 * Shared workflow step to perform document selection.
 * Handles both "Auto Mode" (AI Discovery) and "Manual Mode" (User Override).
 */
export async function performDocumentSelection(
    state: FinancialAnalysisState | GuidanceChatState
): Promise<Partial<FinancialAnalysisState | GuidanceChatState>> {
    const { input } = state;
    const { question } = input;
    const documentIds = input.documentIds;
    const autoSelect = input.autoSelect ?? { enabled: true, maxDocuments: 5 };

    console.log(`[Document Selection] Started. Input: q="${question}", manualIds=${documentIds?.length}, auto=${autoSelect.enabled}`);

    // 1. Manual Override Mode
    // If user explicitly provided document IDs, we skip auto-search and use those.
    if (documentIds && documentIds.length > 0) {
        console.log(`[Document Selection] Using manual override with ${documentIds.length} docs.`);
        const selectedDocs = await getDocumentsByIds(documentIds);

        const selectionResult: DocumentSelectionResult = {
            selectedDocuments: selectedDocs,
            intent: {
                query: question,
                keywords: [],
                year: undefined
            },
            meta: {
                totalFound: selectedDocs.length,
                autoSelectedCount: 0
            },
            mode: 'manual',
            selectionReason: '用户手动选择了文档'
        };

        return {
            documentSelection: selectionResult
        };
    }

    // 2. Auto Selection Mode
    if (autoSelect.enabled) {
        console.log(`[Document Selection] Performing auto selection...`);
        try {
            const result = await selectDocumentsForQuery(question, {
                maxDocuments: autoSelect.maxDocuments
            });

            // Inject mode
            const selectionResult: DocumentSelectionResult = {
                ...result,
                mode: 'auto',
                selectionReason: result.intent.year
                    ? `根据问题分析，已自动查找 ${result.intent.year} 年的相关文档`
                    : `已根据相关度自动选择前 ${result.selectedDocuments.length} 份文档`
            };

            console.log(`[Document Selection] Auto selected ${result.selectedDocuments.length} docs.`);
            return {
                documentSelection: selectionResult
            };

        } catch (error) {
            console.error('[Document Selection] Auto selection failed:', error);
            // Fallback to empty or propagate error?
            // For robustness, we return empty selection but log the error
            const selectionResult: DocumentSelectionResult = {
                selectedDocuments: [],
                intent: { query: question, keywords: [], year: undefined },
                meta: { totalFound: 0, autoSelectedCount: 0 },
                mode: 'auto',
                selectionReason: '自动选择失败'
            };
            return { documentSelection: selectionResult };
        }
    }

    // 3. No Selection (Fallback)
    console.log(`[Document Selection] No selection performed.`);
    return {
        documentSelection: {
            selectedDocuments: [],
            intent: { query: question, keywords: [], year: undefined },
            meta: { totalFound: 0, autoSelectedCount: 0 },
            mode: 'auto',
            selectionReason: '无需选择文档'
        }
    };
}
