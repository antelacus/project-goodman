/**
 * Assemble Report Node
 *
 * Phase 4: Assemble the final report structure.
 * v4.2: Combines all sections and generates executive summary.
 */

import { z } from 'zod';
import { generateJSON, AIUnavailableError, AI_FAILURE_TEXT } from '@/lib/ai';
import type { ReportWorkflowState } from '../state';
import type { ReportContent, ReportSection, ReportSummary } from '@/types/report';
import { buildSummaryPrompt, REPORT_ANALYST_SYSTEM } from '../prompts';

const SummarySchema = z.object({
  keyFindings: z.array(z.string()),
  riskWarnings: z.array(z.string()),
  recommendations: z.array(z.string()),
});

function notGenerated(reason: string): ReportSummary {
  return { status: 'not_generated', reason, keyFindings: [], riskWarnings: [], recommendations: [] };
}

/**
 * Generate executive summary using LLM. A summary drawn from a report with a
 * failed section would state conclusions the report does not support, so it is
 * not attempted (REQ §5.2).
 */
async function generateSummary(
  sections: ReportSection[],
  year: string,
  comparisonYear?: string
): Promise<ReportSummary> {
  if (sections.some(s => s.analysisStatus === 'failed')) {
    return notGenerated(AI_FAILURE_TEXT.summarySectionsFailed);
  }

  const prompt = buildSummaryPrompt(
    sections.map(s => ({ title: s.title, analysis: s.analysis })),
    year,
    comparisonYear
  );

  try {
    const summary = await generateJSON({
      purpose: 'reportSummary',
      system: REPORT_ANALYST_SYSTEM,
      prompt,
      schema: SummarySchema,
    });
    return { status: 'ok', ...summary };
  } catch (error) {
    if (!(error instanceof AIUnavailableError)) throw error;
    return notGenerated(AI_FAILURE_TEXT.summaryUnavailable);
  }
}

/**
 * Assemble report node - creates final report structure
 */
export async function assembleReportNode(
  state: ReportWorkflowState
): Promise<Partial<ReportWorkflowState>> {
  const { year, comparisonYear } = state.input;
  const { sourceDocuments } = state.contextDocuments;

  try {
    // Collect completed sections
    const completedSections: ReportSection[] = [];

    for (const sectionData of state.sections) {
      if (sectionData.result) {
        // Attach source documents to section
        const sectionDocIds = new Set<string>();
        for (const metric of sectionData.result.metrics) {
          for (const id of metric.sourceDocumentIds || []) {
            sectionDocIds.add(id);
          }
        }

        const sectionSourceDocs = sourceDocuments.filter(doc =>
          sectionDocIds.has(doc.documentId)
        );

        completedSections.push({
          ...sectionData.result,
          sourceDocuments: sectionSourceDocs,
        });
      } else {
        // Create placeholder for failed sections
        completedSections.push({
          id: sectionData.id as ReportSection['id'],
          title: sectionData.title,
          metrics: [],
          analysis: '该章节生成失败',
          analysisStatus: 'failed',
          sourceDocuments: [],
        });
      }
    }

    // Generate executive summary
    const summary = await generateSummary(completedSections, year, comparisonYear);

    // Build report title
    const title = comparisonYear
      ? `${year}年度财务综合分析报告（对比${comparisonYear}年）`
      : `${year}年度财务综合分析报告`;

    // Calculate generation time
    const generationTimeMs = Date.now() - state.meta.startTime;

    // Assemble final report
    const report: ReportContent = {
      title,
      generatedAt: new Date().toISOString(),
      year,
      comparisonYear,
      sections: completedSections,
      summary,
    };

    return {
      report,
      meta: {
        ...state.meta,
        currentPhase: 4,
        generationTimeMs,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';

    // Create minimal report on error
    const generationTimeMs = Date.now() - state.meta.startTime;

    return {
      report: {
        title: `${year}年度财务综合分析报告`,
        generatedAt: new Date().toISOString(),
        year,
        comparisonYear,
        sections: [],
        summary: notGenerated('摘要未生成：报告生成出错'),
      },
      meta: {
        ...state.meta,
        currentPhase: 4,
        generationTimeMs,
        error: error instanceof Error ? error : new Error(errorMessage),
      },
    };
  }
}
