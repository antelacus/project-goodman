/**
 * Gather Context Node
 *
 * Phase 2b: Collect contextual documents for LLM analysis.
 * v4.2: Retrieves company info and source document references.
 */

import { createServerSupabaseClient } from '@/lib/database/supabase';
import type { ReportWorkflowState } from '../state';
import type { ReportSourceReference } from '@/types/report';

/**
 * Gather context documents for analysis
 */
export async function gatherContextNode(
  state: ReportWorkflowState
): Promise<Partial<ReportWorkflowState>> {
  const { primary, comparison } = state.metricResults;

  try {
    // Collect all unique document IDs from metrics
    const documentIdSet = new Set<string>();

    // Add document IDs from primary year metrics
    for (const metric of Object.values(primary)) {
      for (const docId of metric.sourceDocumentIds) {
        documentIdSet.add(docId);
      }
    }

    // Add document IDs from comparison year metrics
    for (const metric of Object.values(comparison)) {
      for (const docId of metric.sourceDocumentIds) {
        documentIdSet.add(docId);
      }
    }

    const documentIds = Array.from(documentIdSet);

    // Fetch document details for source references
    let sourceDocuments: ReportSourceReference[] = [];

    if (documentIds.length > 0) {
      const { data: documents, error } = await createServerSupabaseClient()
        .from('documents')
        .select('id, name, doc_type, year, period, file_url')
        .in('id', documentIds);

      if (!error && documents) {
        sourceDocuments = documents.map(doc => ({
          documentId: doc.id,
          documentName: doc.name,
          documentType: doc.doc_type || '财务报表',
          year: doc.year || undefined,
          period: doc.period || undefined,
          fileUrl: doc.file_url || undefined,
        }));
      }
    }

    // Try to get company info if available
    let companyInfo: string | undefined;

    const { data: companyDocs } = await createServerSupabaseClient()
      .from('documents')
      .select('id, name')
      .eq('doc_type', '公司章程')
      .limit(1);

    if (companyDocs && companyDocs.length > 0) {
      // Could fetch company info content here if needed
      companyInfo = `公司基本情况文档：${companyDocs[0].name}`;
    }

    return {
      contextDocuments: {
        companyInfo,
        sourceDocuments,
      },
      meta: {
        ...state.meta,
        currentPhase: 3,
      },
    };
  } catch (error) {
    // Context gathering is non-critical, continue with empty context
    console.error('Error gathering context:', error);

    return {
      contextDocuments: {
        sourceDocuments: [],
      },
      meta: {
        ...state.meta,
        currentPhase: 3,
      },
    };
  }
}
