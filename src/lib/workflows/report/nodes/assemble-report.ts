/**
 * Assemble Report Node
 *
 * Phase 4: Assemble the final report structure.
 * v4.2: Combines all sections and generates executive summary.
 */

import { z } from 'zod';
import { generateJSON } from '@/lib/ai';
import type { ReportWorkflowState } from '../state';
import type { ReportContent, ReportSection, ReportSummary } from '@/types/report';
import { buildSummaryPrompt, REPORT_ANALYST_SYSTEM } from '../prompts';

const SummarySchema = z.object({
  keyFindings: z.array(z.string()),
  riskWarnings: z.array(z.string()),
  recommendations: z.array(z.string()),
});

/**
 * Generate executive summary using LLM
 */
async function generateSummary(
  sections: ReportSection[],
  year: string,
  comparisonYear?: string
): Promise<ReportSummary> {
  const prompt = buildSummaryPrompt(
    sections.map(s => ({ title: s.title, analysis: s.analysis })),
    year,
    comparisonYear
  );

  try {
    return await generateJSON({
      purpose: 'reportSummary',
      system: REPORT_ANALYST_SYSTEM,
      prompt,
      schema: SummarySchema,
    });
  } catch (error) {
    console.error('Error generating summary:', error);
  }

  // Fallback summary
  return {
    keyFindings: ['财务数据已汇总完成，详细分析请参阅各章节内容。'],
    riskWarnings: [],
    recommendations: ['建议结合行业数据进行深入分析。'],
  };
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
          analysis: sectionData.error || '该章节生成失败',
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
        summary: {
          keyFindings: ['报告生成过程中出现错误'],
          riskWarnings: [errorMessage],
          recommendations: ['请稍后重试或联系管理员'],
        },
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
