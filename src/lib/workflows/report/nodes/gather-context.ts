/**
 * Gather Context Node
 *
 * Phase 2b: Collect contextual documents for LLM analysis.
 * v4.2: Retrieves company info and source document references.
 */

import { createServerSupabaseClient } from '@/lib/database/supabase';
import type { Database } from '@/lib/database';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ReportWorkflowState } from '../state';
import type { ReportSourceReference } from '@/types/report';

const CONTEXT_CONTENT_MAX_CHARS = 12000;
const CONTEXT_FETCH_TIMEOUT_MS = 5000;
const CONTEXT_DOCUMENTS = {
  companyProfile: {
    docType: 'business_info',
    name: '公司详细档案.md',
    label: '公司详细档案',
  },
  financialPolicy: {
    docType: 'policy',
    name: '财务管理制度.md',
    label: '财务管理制度',
  },
};

type ContextDocumentConfig = typeof CONTEXT_DOCUMENTS[keyof typeof CONTEXT_DOCUMENTS];

type FetchContentResult = {
  content?: string;
  error?: string;
};

async function withTimeout<T>(
  promise: PromiseLike<T>,
  timeoutMs: number
): Promise<T | null> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<null>(resolve => {
    timeoutId = setTimeout(() => resolve(null), timeoutMs);
  });

  const result = await Promise.race([promise, timeoutPromise]);

  if (timeoutId) {
    clearTimeout(timeoutId);
  }

  return result;
}

function truncateContent(content: string, maxChars: number): string {
  if (content.length <= maxChars) return content;
  return content.slice(0, maxChars);
}

async function fetchContextDocument(
  supabase: SupabaseClient<Database>,
  config: ContextDocumentConfig
): Promise<{ id: string; name: string } | null> {
  const { data, error } = await supabase
    .from('documents')
    .select('id, name')
    .eq('doc_type', config.docType)
    .eq('name', config.name)
    .limit(1);

  if (error) {
    console.warn(`[Report Context] Failed to locate ${config.label}:`, error.message);
    return null;
  }

  return data?.[0] ?? null;
}

async function fetchDocumentContent(
  supabase: SupabaseClient<Database>,
  documentId: string,
  maxChars = CONTEXT_CONTENT_MAX_CHARS,
  timeoutMs = CONTEXT_FETCH_TIMEOUT_MS
): Promise<FetchContentResult> {
  const queryPromise = supabase
    .from('document_chunks')
    .select('content')
    .eq('document_id', documentId)
    .order('chunk_index', { ascending: true })
    .then(response => response);

  const result = await withTimeout(queryPromise, timeoutMs);

  if (!result) {
    return { error: 'timeout' };
  }

  const { data, error } = result;

  if (error) {
    return { error: error.message || 'query_failed' };
  }

  if (!data || data.length === 0) {
    return { error: 'empty' };
  }

  const content = data.map((chunk: { content: string }) => chunk.content).join('\n\n');

  return {
    content: truncateContent(content, maxChars),
  };
}

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

    const supabase = createServerSupabaseClient();

    // Fetch document details for source references
    let sourceDocuments: ReportSourceReference[] = [];

    if (documentIds.length > 0) {
      const { data: documents, error } = await supabase
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

    const [companyDoc, policyDoc] = await Promise.all([
      fetchContextDocument(supabase, CONTEXT_DOCUMENTS.companyProfile),
      fetchContextDocument(supabase, CONTEXT_DOCUMENTS.financialPolicy),
    ]);

    const [companyProfileResult, financialPolicyResult] = await Promise.all([
      companyDoc
        ? fetchDocumentContent(supabase, companyDoc.id)
        : Promise.resolve<FetchContentResult>({ error: 'missing' }),
      policyDoc
        ? fetchDocumentContent(supabase, policyDoc.id)
        : Promise.resolve<FetchContentResult>({ error: 'missing' }),
    ]);

    let companyProfile: string | undefined;
    let financialPolicy: string | undefined;
    let companyInfo: string | undefined;

    if (!companyDoc) {
      console.warn(`[Report Context] ${CONTEXT_DOCUMENTS.companyProfile.label}文档不存在`);
    } else if (!companyProfileResult.content) {
      console.warn(
        `[Report Context] ${CONTEXT_DOCUMENTS.companyProfile.label}内容不可用: ${companyProfileResult.error || 'unknown'}`
      );
    } else {
      companyProfile = companyProfileResult.content;
      companyInfo = companyProfile;
    }

    if (!policyDoc) {
      console.warn(`[Report Context] ${CONTEXT_DOCUMENTS.financialPolicy.label}文档不存在`);
    } else if (!financialPolicyResult.content) {
      console.warn(
        `[Report Context] ${CONTEXT_DOCUMENTS.financialPolicy.label}内容不可用: ${financialPolicyResult.error || 'unknown'}`
      );
    } else {
      financialPolicy = financialPolicyResult.content;
    }

    return {
      contextDocuments: {
        companyInfo,
        companyProfile,
        financialPolicy,
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
