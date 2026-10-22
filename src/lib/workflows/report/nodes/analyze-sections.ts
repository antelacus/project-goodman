/**
 * Analyze Sections Node
 *
 * Phase 3: Use LLM to generate analysis text for each section.
 * v4.2: Calls LLM sequentially for each of 5 sections.
 */

import { generateText, AIUnavailableError, AI_FAILURE_TEXT } from '@/lib/ai';
import type { ReportWorkflowState, ReportSectionData, MetricResult } from '../state';
import type { ReportSection, ReportMetric } from '@/types/report';
import { REPORT_SECTIONS, calculateChange } from '../constants';
import { buildSectionAnalysisPrompt, REPORT_ANALYST_SYSTEM } from '../prompts';

/**
 * Convert MetricResult to ReportMetric format
 */
function toReportMetric(
  metric: MetricResult,
  comparisonMetric?: MetricResult
): ReportMetric {
  // A metric that failed to calculate carries a placeholder 0, not a value.
  const previous = comparisonMetric && !comparisonMetric.error ? comparisonMetric.value : undefined;
  return {
    name: metric.displayName,
    toolName: metric.toolName,
    value: metric.value,
    formatted: metric.formatted,
    previousValue: previous,
    change: metric.error ? undefined : calculateChange(metric.value, previous),
    interpretation: metric.interpretation,
    warnings: metric.warnings,
    sourceDocumentIds: [
      ...metric.sourceDocumentIds,
      ...(comparisonMetric?.sourceDocumentIds || []),
    ],
  };
}

/**
 * Analyze a single section with LLM
 */
async function analyzeSection(
  sectionConfig: typeof REPORT_SECTIONS[number],
  primaryMetrics: Record<string, MetricResult>,
  comparisonMetrics: Record<string, MetricResult>,
  year: string,
  comparisonYear?: string,
  companyContext?: {
    companyProfile?: string;
    financialPolicy?: string;
  }
): Promise<ReportSection> {
  // Get metrics for this section
  const sectionMetrics = sectionConfig.metrics
    .map(name => primaryMetrics[name])
    .filter(Boolean);

  const sectionComparisonMetrics = sectionConfig.metrics
    .map(name => comparisonMetrics[name])
    .filter(Boolean);

  // Build prompt
  const prompt = buildSectionAnalysisPrompt(
    sectionConfig.id,
    sectionConfig.title,
    sectionMetrics,
    sectionComparisonMetrics,
    year,
    comparisonYear,
    companyContext
  );

  // Call LLM. A failed analysis is shown as failed; the metrics table below is
  // computed without AI and stays (REQ §5.2).
  let analysis: string;
  let analysisStatus: 'ok' | 'failed' = 'ok';

  try {
    analysis = await generateText({ purpose: 'reportSection', system: REPORT_ANALYST_SYSTEM, prompt });
  } catch (error) {
    if (!(error instanceof AIUnavailableError)) throw error;
    analysis = AI_FAILURE_TEXT.reportSection;
    analysisStatus = 'failed';
  }

  // Build metrics array
  const metrics: ReportMetric[] = sectionConfig.metrics.map(toolName => {
    const metric = primaryMetrics[toolName];
    const comparison = comparisonMetrics[toolName];
    return metric
      ? toReportMetric(metric, comparison)
      : {
          name: toolName,
          toolName,
          value: 0,
          formatted: 'N/A',
          warnings: ['数据不足'],
          sourceDocumentIds: [],
        };
  });

  // Collect source documents
  const sourceDocumentIds = new Set<string>();
  for (const metric of metrics) {
    for (const id of metric.sourceDocumentIds || []) {
      sourceDocumentIds.add(id);
    }
  }

  return {
    id: sectionConfig.id,
    title: sectionConfig.title,
    metrics,
    analysis,
    analysisStatus,
    sourceDocuments: [], // Will be populated in assemble step
  };
}

/**
 * Analyze sections node - generates analysis for all sections
 */
export async function analyzeSectionsNode(
  state: ReportWorkflowState
): Promise<Partial<ReportWorkflowState>> {
  const { year, comparisonYear, sections: selectedSections } = state.input;
  const { primary, comparison } = state.metricResults;
  const { companyProfile, companyInfo, financialPolicy } = state.contextDocuments;
  const companyContext = {
    companyProfile: companyProfile ?? companyInfo,
    financialPolicy,
  };

  // Filter sections based on user selection (default: all sections)
  const sectionsToAnalyze = selectedSections && selectedSections.length > 0
    ? REPORT_SECTIONS.filter(s => selectedSections.includes(s.id))
    : REPORT_SECTIONS;

  try {
    const sections: ReportSectionData[] = [];

    // Process each section sequentially (to manage API rate limits)
    for (const sectionConfig of sectionsToAnalyze) {
      const sectionData: ReportSectionData = {
        id: sectionConfig.id,
        title: sectionConfig.title,
        metrics: sectionConfig.metrics,
        status: 'analyzing',
      };

      try {
        const result = await analyzeSection(
          sectionConfig,
          primary,
          comparison,
          year,
          comparisonYear,
          companyContext
        );

        sectionData.status = 'completed';
        sectionData.result = result;
      } catch (error) {
        sectionData.status = 'error';
        sectionData.error = error instanceof Error ? error.message : '分析失败';
      }

      sections.push(sectionData);
    }

    return {
      sections,
      meta: {
        ...state.meta,
        currentPhase: 4,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return {
      sections: sectionsToAnalyze.map(config => ({
        id: config.id,
        title: config.title,
        metrics: config.metrics,
        status: 'error' as const,
        error: errorMessage,
      })),
      meta: {
        ...state.meta,
        error: error instanceof Error ? error : new Error(errorMessage),
      },
    };
  }
}
