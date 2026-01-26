/**
 * Report Workflow Prompts
 *
 * LLM prompt templates for section analysis.
 * v4.2: Structured prompts for consistent analysis output.
 */

import type { ReportSectionId } from '@/types/report';
import type { MetricResult } from './state';

type CompanyContext = {
  companyProfile?: string;
  financialPolicy?: string;
};

// ============================================================================
// Section Analysis Prompts
// ============================================================================

/**
 * Section-specific analysis guidance
 */
const SECTION_GUIDANCE: Record<ReportSectionId, string> = {
  liquidity: `分析企业的短期偿债能力和资金流动性。
关注点：
- 流动比率和速动比率的变化趋势与风险提示
- 现金比率是否过低（影响即时支付能力）或过高（资金利用效率低）
- 营运资本是否为正，是否充足
- 与上年同比变化趋势`,

  solvency: `分析企业的长期偿债能力和财务杠杆水平。
关注点：
- 资产负债率变化趋势与财务杠杆水平
- 利息保障倍数与现金流覆盖能力的变化
- 现金流量对债务的覆盖能力
- 债务结构是否合理`,

  profitability: `分析企业的盈利能力和经营效益。
关注点：
- 毛利率反映的核心业务盈利能力
- 净利润率体现的综合盈利水平
- ROA和ROE的变化趋势与结构性驱动因素
- 盈利能力的变化趋势和原因`,

  efficiency: `分析企业的资产运营效率和管理能力。
关注点：
- 总资产周转率反映的资产利用效率
- 存货周转率和应收账款周转率是否正常
- 营运资本周转效率
- 周转效率的改善或恶化趋势`,

  comprehensive: `综合评价企业的整体财务状况，结合杜邦分析框架。
关注点：
- ROE的三大驱动因素：净利润率、资产周转率、权益乘数
- 各项指标之间的关联和平衡
- 企业的核心优势和潜在风险
- 改进建议和发展方向`,
};

/**
 * Build section analysis prompt
 */
export function buildSectionAnalysisPrompt(
  sectionId: ReportSectionId,
  sectionTitle: string,
  metrics: MetricResult[],
  comparisonMetrics: MetricResult[],
  year: string,
  comparisonYear?: string,
  companyContext?: CompanyContext
): string {
  const guidance = SECTION_GUIDANCE[sectionId];
  const companyContextBlock = buildCompanyContextBlock(companyContext);

  // Format metrics data
  const metricsTable = formatMetricsForPrompt(metrics, comparisonMetrics, year, comparisonYear);

  return `你是一位专业的财务分析师，正在撰写企业${year}年度财务分析报告的"${sectionTitle}"章节。

## 分析数据

${metricsTable}

${companyContextBlock ? `## 公司上下文\n\n${companyContextBlock}\n` : ''}
## 分析指导

${guidance}

## 输出要求

请撰写该章节的分析文字，要求：
1. 长度：200-400字
2. 结构：先概述本章节核心发现，再逐项分析关键指标，最后总结
3. 语言：专业但易懂，适合财务人员阅读
4. 数据：引用具体数值，${comparisonYear ? `对比${comparisonYear}年数据变化` : '无需对比'}
5. 基准：优先依据公司基准与财务管理制度中的标准或要求，避免仅使用通用行业均值
6. 客观：基于数据分析，避免过度主观判断
7. 原因：解释变化原因时需基于${year}年发生事项与公司信息（如有），避免编造具体事件

请直接输出分析文字，不要添加标题或其他格式。`;
}

function buildCompanyContextBlock(companyContext?: CompanyContext): string {
  if (!companyContext) return '';

  const sections: string[] = [];

  if (companyContext.companyProfile) {
    sections.push(`### 公司档案摘要\n${companyContext.companyProfile}`);
  }

  if (companyContext.financialPolicy) {
    sections.push(`### 财务管理制度要点\n${companyContext.financialPolicy}`);
  }

  return sections.join('\n\n');
}

/**
 * Format metrics as a table for the prompt
 */
function formatMetricsForPrompt(
  metrics: MetricResult[],
  comparisonMetrics: MetricResult[],
  year: string,
  comparisonYear?: string
): string {
  const comparisonMap = new Map(
    comparisonMetrics.map(m => [m.toolName, m])
  );

  const lines: string[] = [];

  if (comparisonYear) {
    lines.push(`| 指标 | ${year}年 | ${comparisonYear}年 | 变化 |`);
    lines.push('| --- | --- | --- | --- |');
  } else {
    lines.push(`| 指标 | ${year}年 |`);
    lines.push('| --- | --- |');
  }

  for (const metric of metrics) {
    const comparison = comparisonMap.get(metric.toolName);

    if (comparisonYear && comparison) {
      const change = calculateChangeForPrompt(metric.value, comparison.value);
      lines.push(`| ${metric.displayName} | ${metric.formatted} | ${comparison.formatted} | ${change} |`);
    } else if (comparisonYear) {
      lines.push(`| ${metric.displayName} | ${metric.formatted} | N/A | - |`);
    } else {
      lines.push(`| ${metric.displayName} | ${metric.formatted} |`);
    }

    // Add warnings if any
    if (metric.warnings && metric.warnings.length > 0) {
      lines.push(`| ⚠️ ${metric.warnings.join('; ')} | | | |`);
    }
  }

  return lines.join('\n');
}

/**
 * Calculate change string for prompt
 */
function calculateChangeForPrompt(current: number, previous: number): string {
  if (previous === 0) return 'N/A';
  const change = ((current - previous) / Math.abs(previous)) * 100;
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(1)}%`;
}

// ============================================================================
// Summary Generation Prompt
// ============================================================================

/**
 * Build summary generation prompt
 */
export function buildSummaryPrompt(
  sections: Array<{ title: string; analysis: string }>,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  year: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  comparisonYear?: string
): string {
  const sectionsText = sections
    .map(s => `### ${s.title}\n${s.analysis}`)
    .join('\n\n');

  return `你是一位专业的财务分析师，需要根据以下各章节分析内容，生成报告的执行摘要。

## 各章节分析

${sectionsText}

## 输出要求

请生成以下三部分内容，以JSON格式输出：

{
  "keyFindings": ["关键发现1", "关键发现2", ...],  // 3-5条最重要的财务发现
  "riskWarnings": ["风险警示1", ...],              // 0-3条需要关注的风险
  "recommendations": ["建议1", "建议2", ...]       // 3-5条改进建议
}

要求：
1. 关键发现：提炼最重要的财务状况结论，每条1-2句话
2. 风险警示：仅列出真正需要关注的风险点，没有则为空数组
3. 改进建议：具体可行的改进方向，每条1-2句话
4. 语言简洁专业，适合管理层阅读

请直接输出JSON，不要添加其他内容。`;
}

// ============================================================================
// Error Messages
// ============================================================================

export const ERROR_MESSAGES = {
  NO_DATA: (year: string) =>
    `未找到${year}年度的财务数据。请确保已上传该年度的资产负债表、利润表和现金流量表。`,

  PARTIAL_DATA: (year: string, missing: string[]) =>
    `${year}年度部分数据缺失：${missing.join('、')}。报告将基于可用数据生成，缺失指标将标记为"数据不足"。`,

  METRIC_ERROR: (metricName: string, error: string) =>
    `计算${metricName}时出错：${error}`,

  LLM_ERROR: (section: string) =>
    `生成"${section}"分析时出错，将使用默认文字。`,
};
