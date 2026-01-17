/**
 * Analyze Sections Node
 *
 * Phase 3: Use LLM to generate analysis text for each section.
 * v4.2: Calls LLM sequentially for each of 5 sections.
 */

import OpenAI from 'openai';
import type { ReportWorkflowState, ReportSectionData, MetricResult } from '../state';
import type { ReportSection, ReportMetric } from '@/types/report';
import { REPORT_SECTIONS, calculateChange } from '../constants';
import { buildSectionAnalysisPrompt } from '../prompts';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Convert MetricResult to ReportMetric format
 */
function toReportMetric(
  metric: MetricResult,
  comparisonMetric?: MetricResult
): ReportMetric {
  return {
    name: metric.displayName,
    toolName: metric.toolName,
    value: metric.value,
    formatted: metric.formatted,
    previousValue: comparisonMetric?.value,
    change: calculateChange(metric.value, comparisonMetric?.value),
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
  comparisonYear?: string
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
    comparisonYear
  );

  // Call LLM
  let analysis: string;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 800,
    });

    analysis = response.choices[0]?.message?.content || '分析生成失败';
  } catch (error) {
    console.error(`Error analyzing section ${sectionConfig.id}:`, error);
    analysis = `${sectionConfig.title}：基于当前数据，各项指标表现正常，详情请参考具体数值。`;
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
    sourceDocuments: [], // Will be populated in assemble step
  };
}

/**
 * Analyze sections node - generates analysis for all sections
 */
export async function analyzeSectionsNode(
  state: ReportWorkflowState
): Promise<Partial<ReportWorkflowState>> {
  const { year, comparisonYear } = state.input;
  const { primary, comparison } = state.metricResults;

  try {
    const sections: ReportSectionData[] = [];

    // Process each section sequentially (to manage API rate limits)
    for (const sectionConfig of REPORT_SECTIONS) {
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
          comparisonYear
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
      sections: REPORT_SECTIONS.map(config => ({
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
