/**
 * Report Workflow Constants
 *
 * Section configuration and metric mappings for report generation.
 * v4.2: Defines the 5 sections and 21 metrics for comprehensive financial reports.
 */

import type { ReportSectionId } from '@/types/report';

// ============================================================================
// Section Configuration
// ============================================================================

/**
 * Report section definition
 */
export interface SectionConfig {
  id: ReportSectionId;
  title: string;
  metrics: string[];  // Tool names
}

/**
 * Report sections with their associated metrics
 * Total: 21 metrics across 5 sections
 */
export const REPORT_SECTIONS: readonly SectionConfig[] = [
  {
    id: 'liquidity',
    title: '流动性分析',
    metrics: [
      'current_ratio',
      'quick_ratio',
      'cash_ratio',
      'working_capital',
      'cash_flow_ratio',
    ],
  },
  {
    id: 'solvency',
    title: '偿债能力分析',
    metrics: [
      'debt_to_asset_ratio',
      'debt_to_equity_ratio',
      'equity_multiplier',
      'long_term_capital_debt_ratio',
      'interest_coverage_ratio',
      'cash_flow_interest_coverage',
      'cash_flow_to_debt_ratio',
    ],
  },
  {
    id: 'profitability',
    title: '盈利能力分析',
    metrics: [
      'gross_profit_margin',
      'net_profit_margin',
      'return_on_assets',
      'return_on_equity',
    ],
  },
  {
    id: 'efficiency',
    title: '运营效率分析',
    metrics: [
      'asset_turnover',
      'asset_turnover_days',
      'inventory_turnover',
      'receivables_turnover',
      'working_capital_turnover',
    ],
  },
  {
    id: 'comprehensive',
    title: '综合评价与建议',
    metrics: ['dupont_roe'],  // DuPont analysis as comprehensive evaluation base
  },
] as const;

/**
 * Get all metric tool names (excluding dupont_roe which is for comprehensive analysis)
 */
export function getAllMetricNames(): string[] {
  return REPORT_SECTIONS.flatMap(section => section.metrics);
}

/**
 * Total number of metrics (21 + 1 dupont = 22)
 */
export const TOTAL_METRICS_COUNT = getAllMetricNames().length;

/**
 * Get section by ID
 */
export function getSectionById(id: ReportSectionId): SectionConfig | undefined {
  return REPORT_SECTIONS.find(section => section.id === id);
}

/**
 * Get section by metric tool name
 */
export function getSectionByMetric(metricName: string): SectionConfig | undefined {
  return REPORT_SECTIONS.find(section => section.metrics.includes(metricName));
}

// ============================================================================
// Metric Display Names
// ============================================================================

/**
 * Mapping from tool name to Chinese display name
 */
export const METRIC_DISPLAY_NAMES: Record<string, string> = {
  // Liquidity
  current_ratio: '流动比率',
  quick_ratio: '速动比率',
  cash_ratio: '现金比率',
  working_capital: '营运资本',
  cash_flow_ratio: '现金流量比率',

  // Solvency
  debt_to_asset_ratio: '资产负债率',
  debt_to_equity_ratio: '产权比率',
  equity_multiplier: '权益乘数',
  long_term_capital_debt_ratio: '长期资本负债率',
  interest_coverage_ratio: '利息保障倍数',
  cash_flow_interest_coverage: '现金流量利息保障倍数',
  cash_flow_to_debt_ratio: '现金流量与负债比率',

  // Profitability
  gross_profit_margin: '毛利率',
  net_profit_margin: '净利润率',
  return_on_assets: '总资产收益率',
  return_on_equity: '净资产收益率',

  // Efficiency
  asset_turnover: '总资产周转率',
  asset_turnover_days: '总资产周转天数',
  inventory_turnover: '存货周转率',
  receivables_turnover: '应收账款周转率',
  working_capital_turnover: '营运资本周转率',

  // Comprehensive
  dupont_roe: '杜邦分析ROE',
};

/**
 * Get display name for a metric
 */
export function getMetricDisplayName(toolName: string): string {
  return METRIC_DISPLAY_NAMES[toolName] || toolName;
}

// ============================================================================
// Unit Formatting
// ============================================================================

/**
 * Metric unit types
 */
export const METRIC_UNITS: Record<string, string> = {
  // Ratios (倍)
  current_ratio: '倍',
  quick_ratio: '倍',
  cash_ratio: '倍',
  equity_multiplier: '倍',
  interest_coverage_ratio: '倍',
  cash_flow_interest_coverage: '倍',
  asset_turnover: '次',
  inventory_turnover: '次',
  receivables_turnover: '次',
  working_capital_turnover: '次',

  // Percentages (%)
  debt_to_asset_ratio: '%',
  debt_to_equity_ratio: '%',
  long_term_capital_debt_ratio: '%',
  cash_flow_to_debt_ratio: '%',
  cash_flow_ratio: '%',
  gross_profit_margin: '%',
  net_profit_margin: '%',
  return_on_assets: '%',
  return_on_equity: '%',
  dupont_roe: '%',

  // Days (天)
  asset_turnover_days: '天',

  // Currency (元)
  working_capital: '元',
};

/**
 * Format metric value with unit
 */
export function formatMetricValue(toolName: string, value: number): string {
  const unit = METRIC_UNITS[toolName] || '';

  if (unit === '元') {
    // Format as currency with thousands separator
    return value >= 10000
      ? `${(value / 10000).toFixed(2)}万元`
      : `${value.toFixed(2)}元`;
  }

  if (unit === '%') {
    return `${value.toFixed(2)}%`;
  }

  if (unit === '天') {
    return `${value.toFixed(0)}天`;
  }

  if (unit === '倍' || unit === '次') {
    return `${value.toFixed(2)}${unit}`;
  }

  return `${value.toFixed(2)}`;
}

/**
 * Calculate percentage change between two values
 */
export function calculateChange(
  current: number,
  previous: number | undefined
): string | undefined {
  if (previous === undefined || previous === 0) {
    return undefined;
  }

  const change = ((current - previous) / Math.abs(previous)) * 100;
  const sign = change >= 0 ? '+' : '';
  return `${sign}${change.toFixed(2)}%`;
}
