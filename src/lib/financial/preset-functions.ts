/**
 * Preset Financial Calculation Functions Library
 *
 * This library provides 15 preset financial calculation functions across 4 categories:
 * - Liquidity Ratios: Measure short-term debt paying ability
 * - Solvency Ratios: Measure long-term financial stability
 * - Profitability Ratios: Measure earning capacity
 * - Efficiency Ratios: Measure asset utilization
 *
 * Each function uses deterministic calculations with input validation.
 */


import { FinancialMetrics } from './metric-names';

// ============================================================================
// Type Definitions
// ============================================================================

export type FunctionCategory = 'liquidity' | 'solvency' | 'profitability' | 'efficiency' | 'composite';

export interface ValidationRule {
  min?: number;
  max?: number;
  warn_if?: {
    above?: number;
    below?: number;
    message: string;
  };
}

export interface CalculationResult {
  value: number;
  formatted: string;
  warnings?: string[];
}

export interface PresetFunction {
  name: string;
  displayName: string;
  displayNameEn: string;
  category: FunctionCategory;
  formula: string;
  requiredInputs: string[];
  unit: string;
  interpretation: string;
  validationRules?: ValidationRule;
  formulaDisplay: string;
  calculate: (inputs: Record<string, number>) => CalculationResult;
}

export interface ExecutionResult {
  function: string;
  displayName: string;
  formula: string;
  formulaDisplay: string;
  inputs: Record<string, number>;
  result: CalculationResult;
  unit: string;
  interpretation: string;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format number with thousand separators and decimal places
 */
function formatNumber(value: number, decimals: number = 2): string {
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format percentage with % sign
 */
function formatPercentage(value: number): string {
  return `${formatNumber(value * 100, 2)}%`;
}

/**
 * Validate calculation result against rules
 */
function validateResult(value: number, rules?: ValidationRule): string[] {
  const warnings: string[] = [];

  if (!rules) return warnings;

  if (rules.min !== undefined && value < rules.min) {
    warnings.push(`值低于最小值 ${rules.min}`);
  }

  if (rules.max !== undefined && value > rules.max) {
    warnings.push(`值超过最大值 ${rules.max}`);
  }

  if (rules.warn_if) {
    if (rules.warn_if.above !== undefined && value > rules.warn_if.above) {
      warnings.push(rules.warn_if.message);
    }
    if (rules.warn_if.below !== undefined && value < rules.warn_if.below) {
      warnings.push(rules.warn_if.message);
    }
  }

  return warnings;
}



// ============================================================================
// Preset Function Definitions
// ============================================================================

export const presetFunctions: PresetFunction[] = [
  // ==========================================================================
  // LIQUIDITY RATIOS (流动性比率)
  // ==========================================================================

  {
    name: 'current_ratio',
    displayName: '流动比率',
    displayNameEn: 'Current Ratio',
    category: 'liquidity',
    formula: 'current_assets / current_liabilities',
    requiredInputs: [FinancialMetrics.BalanceSheet.TOTAL_CURRENT_ASSETS, FinancialMetrics.BalanceSheet.TOTAL_CURRENT_LIABILITIES],
    unit: '倍',
    interpretation: '流动比率衡量企业短期偿债能力。一般认为2:1较为合适，表明企业有足够的流动资产来偿还短期债务。',
    formulaDisplay: `流动比率 = ${FinancialMetrics.BalanceSheet.TOTAL_CURRENT_ASSETS} / ${FinancialMetrics.BalanceSheet.TOTAL_CURRENT_LIABILITIES}`,
    validationRules: {
      min: 0,
      warn_if: {
        below: 1.0,
        message: '流动比率低于1，可能存在短期偿债风险',
      },
    },
    calculate: (inputs) => {
      const currentAssets = inputs[FinancialMetrics.BalanceSheet.TOTAL_CURRENT_ASSETS];
      const currentLiabilities = inputs[FinancialMetrics.BalanceSheet.TOTAL_CURRENT_LIABILITIES];

      if (currentLiabilities === 0) {
        throw new Error(`${FinancialMetrics.BalanceSheet.TOTAL_CURRENT_LIABILITIES}不能为0`);
      }

      const value = currentAssets / currentLiabilities;
      const warnings = validateResult(value, presetFunctions[0].validationRules);

      return {
        value,
        formatted: formatNumber(value, 2) + '倍',
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    },
  },

  {
    name: 'quick_ratio',
    displayName: '速动比率',
    displayNameEn: 'Quick Ratio',
    category: 'liquidity',
    formula: '(current_assets - inventory) / current_liabilities',
    requiredInputs: [FinancialMetrics.BalanceSheet.TOTAL_CURRENT_ASSETS, FinancialMetrics.BalanceSheet.INVENTORY, FinancialMetrics.BalanceSheet.TOTAL_CURRENT_LIABILITIES],
    unit: '倍',
    interpretation: '速动比率更严格地衡量短期偿债能力，剔除了变现能力较弱的存货。一般认为1:1较为合适。',
    formulaDisplay: `速动比率 = (${FinancialMetrics.BalanceSheet.TOTAL_CURRENT_ASSETS} - ${FinancialMetrics.BalanceSheet.INVENTORY}) / ${FinancialMetrics.BalanceSheet.TOTAL_CURRENT_LIABILITIES}`,
    validationRules: {
      min: 0,
      warn_if: {
        below: 0.5,
        message: '速动比率过低，短期偿债能力较弱',
      },
    },
    calculate: (inputs) => {
      const currentAssets = inputs[FinancialMetrics.BalanceSheet.TOTAL_CURRENT_ASSETS];
      const inventory = inputs[FinancialMetrics.BalanceSheet.INVENTORY];
      const currentLiabilities = inputs[FinancialMetrics.BalanceSheet.TOTAL_CURRENT_LIABILITIES];

      if (currentLiabilities === 0) {
        throw new Error(`${FinancialMetrics.BalanceSheet.TOTAL_CURRENT_LIABILITIES}不能为0`);
      }

      const value = (currentAssets - inventory) / currentLiabilities;
      const warnings = validateResult(value, presetFunctions[1].validationRules);

      return {
        value,
        formatted: formatNumber(value, 2) + '倍',
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    },
  },

  {
    name: 'cash_ratio',
    displayName: '现金比率',
    displayNameEn: 'Cash Ratio',
    category: 'liquidity',
    formula: 'cash / current_liabilities',
    requiredInputs: [FinancialMetrics.BalanceSheet.MONETARY_FUNDS, FinancialMetrics.BalanceSheet.TOTAL_CURRENT_LIABILITIES],
    unit: '倍',
    interpretation: '现金比率衡量企业最直接的偿债能力，反映企业用现金偿还短期债务的能力。',
    formulaDisplay: `现金比率 = ${FinancialMetrics.BalanceSheet.MONETARY_FUNDS} / ${FinancialMetrics.BalanceSheet.TOTAL_CURRENT_LIABILITIES}`,
    validationRules: {
      min: 0,
    },
    calculate: (inputs) => {
      const cash = inputs[FinancialMetrics.BalanceSheet.MONETARY_FUNDS];
      const currentLiabilities = inputs[FinancialMetrics.BalanceSheet.TOTAL_CURRENT_LIABILITIES];

      if (currentLiabilities === 0) {
        throw new Error(`${FinancialMetrics.BalanceSheet.TOTAL_CURRENT_LIABILITIES}不能为0`);
      }

      const value = cash / currentLiabilities;
      const warnings = validateResult(value, presetFunctions[2].validationRules);

      return {
        value,
        formatted: formatNumber(value, 2) + '倍',
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    },
  },

  // ==========================================================================
  // SOLVENCY RATIOS (偿债能力比率)
  // ==========================================================================

  {
    name: 'debt_to_asset_ratio',
    displayName: '资产负债率',
    displayNameEn: 'Debt-to-Asset Ratio',
    category: 'solvency',
    formula: 'total_liabilities / total_assets',
    requiredInputs: [FinancialMetrics.BalanceSheet.TOTAL_LIABILITIES, FinancialMetrics.BalanceSheet.TOTAL_ASSETS],
    unit: '%',
    interpretation: '资产负债率反映企业资产中有多少是通过负债筹集的。一般认为50%-70%比较合理，过高可能存在财务风险。',
    formulaDisplay: `资产负债率 = ${FinancialMetrics.BalanceSheet.TOTAL_LIABILITIES} / ${FinancialMetrics.BalanceSheet.TOTAL_ASSETS} × 100%`,
    validationRules: {
      min: 0,
      max: 1,
      warn_if: {
        above: 0.7,
        message: '资产负债率较高，财务风险较大',
      },
    },
    calculate: (inputs) => {
      const totalLiabilities = inputs[FinancialMetrics.BalanceSheet.TOTAL_LIABILITIES];
      const totalAssets = inputs[FinancialMetrics.BalanceSheet.TOTAL_ASSETS];

      if (totalAssets === 0) {
        throw new Error(`${FinancialMetrics.BalanceSheet.TOTAL_ASSETS}不能为0`);
      }

      const value = totalLiabilities / totalAssets;
      const warnings = validateResult(value, presetFunctions[3].validationRules);

      return {
        value,
        formatted: formatPercentage(value),
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    },
  },

  {
    name: 'debt_to_equity_ratio',
    displayName: '产权比率',
    displayNameEn: 'Debt-to-Equity Ratio',
    category: 'solvency',
    formula: 'total_liabilities / shareholders_equity',
    requiredInputs: [FinancialMetrics.BalanceSheet.TOTAL_LIABILITIES, FinancialMetrics.BalanceSheet.TOTAL_OWNERS_EQUITY],
    unit: '%',
    interpretation: '产权比率反映债权人与股东提供资金的相对关系，比率越高说明企业偿债压力越大。',
    formulaDisplay: `产权比率 = ${FinancialMetrics.BalanceSheet.TOTAL_LIABILITIES} / ${FinancialMetrics.BalanceSheet.TOTAL_OWNERS_EQUITY} × 100%`,
    validationRules: {
      min: 0,
    },
    calculate: (inputs) => {
      const totalLiabilities = inputs[FinancialMetrics.BalanceSheet.TOTAL_LIABILITIES];
      const shareholdersEquity = inputs[FinancialMetrics.BalanceSheet.TOTAL_OWNERS_EQUITY];

      if (shareholdersEquity === 0) {
        throw new Error(`${FinancialMetrics.BalanceSheet.TOTAL_OWNERS_EQUITY}不能为0`);
      }

      const value = totalLiabilities / shareholdersEquity;
      const warnings = validateResult(value, presetFunctions[4].validationRules);

      return {
        value,
        formatted: formatPercentage(value),
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    },
  },

  {
    name: 'equity_multiplier',
    displayName: '权益乘数',
    displayNameEn: 'Equity Multiplier',
    category: 'solvency',
    formula: 'total_assets / shareholders_equity',
    requiredInputs: [FinancialMetrics.BalanceSheet.TOTAL_ASSETS, FinancialMetrics.BalanceSheet.TOTAL_OWNERS_EQUITY],
    unit: '倍',
    interpretation: '权益乘数反映企业财务杠杆程度，数值越大说明股东投入的资本在资产中所占比重越小。',
    formulaDisplay: `权益乘数 = ${FinancialMetrics.BalanceSheet.TOTAL_ASSETS} / ${FinancialMetrics.BalanceSheet.TOTAL_OWNERS_EQUITY}`,
    validationRules: {
      min: 1,
    },
    calculate: (inputs) => {
      const totalAssets = inputs[FinancialMetrics.BalanceSheet.TOTAL_ASSETS];
      const shareholdersEquity = inputs[FinancialMetrics.BalanceSheet.TOTAL_OWNERS_EQUITY];

      if (shareholdersEquity === 0) {
        throw new Error(`${FinancialMetrics.BalanceSheet.TOTAL_OWNERS_EQUITY}不能为0`);
      }

      const value = totalAssets / shareholdersEquity;
      const warnings = validateResult(value, presetFunctions[5].validationRules);

      return {
        value,
        formatted: formatNumber(value, 2) + '倍',
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    },
  },

  // ==========================================================================
  // PROFITABILITY RATIOS (盈利能力比率)
  // ==========================================================================

  {
    name: 'gross_profit_margin',
    displayName: '销售毛利率',
    displayNameEn: 'Gross Profit Margin',
    category: 'profitability',
    formula: '(revenue - cost_of_sales) / revenue',
    requiredInputs: [FinancialMetrics.IncomeStatement.REVENUE, FinancialMetrics.IncomeStatement.OPERATING_COSTS],
    unit: '%',
    interpretation: '销售毛利率反映企业销售收入中扣除成本后的利润比例，比率越高说明企业的盈利能力越强。',
    formulaDisplay: `销售毛利率 = (${FinancialMetrics.IncomeStatement.REVENUE} - ${FinancialMetrics.IncomeStatement.OPERATING_COSTS}) / ${FinancialMetrics.IncomeStatement.REVENUE} × 100%`,
    validationRules: {
      min: 0,
      max: 1,
    },
    calculate: (inputs) => {
      const revenue = inputs[FinancialMetrics.IncomeStatement.REVENUE];
      const costOfSales = inputs[FinancialMetrics.IncomeStatement.OPERATING_COSTS];

      if (revenue === 0) {
        throw new Error(`${FinancialMetrics.IncomeStatement.REVENUE}不能为0`);
      }

      const value = (revenue - costOfSales) / revenue;
      const warnings = validateResult(value, presetFunctions[6].validationRules);

      return {
        value,
        formatted: formatPercentage(value),
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    },
  },

  {
    name: 'net_profit_margin',
    displayName: '销售净利率',
    displayNameEn: 'Net Profit Margin',
    category: 'profitability',
    formula: 'net_profit / revenue',
    requiredInputs: [FinancialMetrics.IncomeStatement.NET_PROFIT, FinancialMetrics.IncomeStatement.TOTAL_REVENUE],
    unit: '%',
    interpretation: '销售净利率反映企业销售收入的最终盈利水平，是衡量企业盈利能力的重要指标。',
    formulaDisplay: `销售净利率 = ${FinancialMetrics.IncomeStatement.NET_PROFIT} / ${FinancialMetrics.IncomeStatement.TOTAL_REVENUE} × 100%`,
    validationRules: {
      min: -1,
      max: 1,
    },
    calculate: (inputs) => {
      const netProfit = inputs[FinancialMetrics.IncomeStatement.NET_PROFIT];
      const revenue = inputs[FinancialMetrics.IncomeStatement.TOTAL_REVENUE];

      if (revenue === 0) {
        throw new Error(`${FinancialMetrics.IncomeStatement.TOTAL_REVENUE}不能为0`);
      }

      const value = netProfit / revenue;
      const warnings = validateResult(value, presetFunctions[7].validationRules);

      return {
        value,
        formatted: formatPercentage(value),
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    },
  },

  {
    name: 'return_on_assets',
    displayName: '总资产收益率 (ROA)',
    displayNameEn: 'Return on Assets (ROA)',
    category: 'profitability',
    formula: 'net_profit / total_assets',
    requiredInputs: [FinancialMetrics.IncomeStatement.NET_PROFIT, FinancialMetrics.BalanceSheet.TOTAL_ASSETS],
    unit: '%',
    interpretation: 'ROA反映企业全部资产的盈利能力，比率越高说明资产利用效率越高，企业盈利能力越强。',
    formulaDisplay: `ROA = ${FinancialMetrics.IncomeStatement.NET_PROFIT} / ${FinancialMetrics.BalanceSheet.TOTAL_ASSETS} × 100%`,
    validationRules: {
      min: -1,
      max: 1,
    },
    calculate: (inputs) => {
      const netProfit = inputs[FinancialMetrics.IncomeStatement.NET_PROFIT];
      const totalAssets = inputs[FinancialMetrics.BalanceSheet.TOTAL_ASSETS];

      if (totalAssets === 0) {
        throw new Error(`${FinancialMetrics.BalanceSheet.TOTAL_ASSETS}不能为0`);
      }

      const value = netProfit / totalAssets;
      const warnings = validateResult(value, presetFunctions[8].validationRules);

      return {
        value,
        formatted: formatPercentage(value),
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    },
  },

  {
    name: 'return_on_equity',
    displayName: '净资产收益率 (ROE)',
    displayNameEn: 'Return on Equity (ROE)',
    category: 'profitability',
    formula: 'net_profit / shareholders_equity',
    requiredInputs: [FinancialMetrics.IncomeStatement.NET_PROFIT, FinancialMetrics.BalanceSheet.TOTAL_OWNERS_EQUITY],
    unit: '%',
    interpretation: 'ROE反映股东投资的回报率，是衡量公司盈利能力的重要指标。一般认为ROE越高越好。',
    formulaDisplay: `ROE = ${FinancialMetrics.IncomeStatement.NET_PROFIT} / ${FinancialMetrics.BalanceSheet.TOTAL_OWNERS_EQUITY} × 100%`,
    validationRules: {
      min: -1,
      max: 2,
    },
    calculate: (inputs) => {
      const netProfit = inputs[FinancialMetrics.IncomeStatement.NET_PROFIT];
      const shareholdersEquity = inputs[FinancialMetrics.BalanceSheet.TOTAL_OWNERS_EQUITY];

      if (shareholdersEquity === 0) {
        throw new Error(`${FinancialMetrics.BalanceSheet.TOTAL_OWNERS_EQUITY}不能为0`);
      }

      const value = netProfit / shareholdersEquity;
      const warnings = validateResult(value, presetFunctions[9].validationRules);

      return {
        value,
        formatted: formatPercentage(value),
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    },
  },

  // ==========================================================================
  // EFFICIENCY RATIOS (营运能力比率)
  // ==========================================================================

  {
    name: 'asset_turnover',
    displayName: '总资产周转率',
    displayNameEn: 'Asset Turnover',
    category: 'efficiency',
    formula: 'revenue / total_assets',
    requiredInputs: [FinancialMetrics.IncomeStatement.TOTAL_REVENUE, FinancialMetrics.BalanceSheet.TOTAL_ASSETS],
    unit: '次',
    interpretation: '总资产周转率反映企业资产的利用效率，比率越高说明资产利用效率越高，经营能力越强。',
    formulaDisplay: `总资产周转率 = ${FinancialMetrics.IncomeStatement.TOTAL_REVENUE} / ${FinancialMetrics.BalanceSheet.TOTAL_ASSETS}`,
    validationRules: {
      min: 0,
    },
    calculate: (inputs) => {
      const revenue = inputs[FinancialMetrics.IncomeStatement.TOTAL_REVENUE];
      const totalAssets = inputs[FinancialMetrics.BalanceSheet.TOTAL_ASSETS];

      if (totalAssets === 0) {
        throw new Error(`${FinancialMetrics.BalanceSheet.TOTAL_ASSETS}不能为0`);
      }

      const value = revenue / totalAssets;
      const warnings = validateResult(value, presetFunctions[10].validationRules);

      return {
        value,
        formatted: formatNumber(value, 2) + '次',
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    },
  },

  {
    name: 'inventory_turnover',
    displayName: '存货周转率',
    displayNameEn: 'Inventory Turnover',
    category: 'efficiency',
    formula: 'cost_of_sales / inventory',
    requiredInputs: [FinancialMetrics.IncomeStatement.OPERATING_COSTS, FinancialMetrics.BalanceSheet.INVENTORY],
    unit: '次',
    interpretation: '存货周转率反映存货的流动性，比率越高说明存货周转越快，企业销售能力越强。',
    formulaDisplay: `存货周转率 = ${FinancialMetrics.IncomeStatement.OPERATING_COSTS} / ${FinancialMetrics.BalanceSheet.INVENTORY}`,
    validationRules: {
      min: 0,
    },
    calculate: (inputs) => {
      const costOfSales = inputs[FinancialMetrics.IncomeStatement.OPERATING_COSTS];
      const inventory = inputs[FinancialMetrics.BalanceSheet.INVENTORY];

      if (inventory === 0) {
        throw new Error(`${FinancialMetrics.BalanceSheet.INVENTORY}不能为0`);
      }

      const value = costOfSales / inventory;
      const warnings = validateResult(value, presetFunctions[11].validationRules);

      return {
        value,
        formatted: formatNumber(value, 2) + '次',
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    },
  },

  {
    name: 'receivables_turnover',
    displayName: '应收账款周转率',
    displayNameEn: 'Receivables Turnover',
    category: 'efficiency',
    formula: 'revenue / accounts_receivable',
    requiredInputs: [FinancialMetrics.IncomeStatement.TOTAL_REVENUE, FinancialMetrics.BalanceSheet.ACCOUNTS_RECEIVABLE],
    unit: '次',
    interpretation: '应收账款周转率反映应收账款的流动性和管理效率，比率越高说明收账速度越快。',
    formulaDisplay: `应收账款周转率 = ${FinancialMetrics.IncomeStatement.TOTAL_REVENUE} / ${FinancialMetrics.BalanceSheet.ACCOUNTS_RECEIVABLE}`,
    validationRules: {
      min: 0,
    },
    calculate: (inputs) => {
      const revenue = inputs[FinancialMetrics.IncomeStatement.TOTAL_REVENUE];
      const accountsReceivable = inputs[FinancialMetrics.BalanceSheet.ACCOUNTS_RECEIVABLE];

      if (accountsReceivable === 0) {
        throw new Error(`${FinancialMetrics.BalanceSheet.ACCOUNTS_RECEIVABLE}不能为0`);
      }

      const value = revenue / accountsReceivable;
      const warnings = validateResult(value, presetFunctions[12].validationRules);

      return {
        value,
        formatted: formatNumber(value, 2) + '次',
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    },
  },

  {
    name: 'working_capital_turnover',
    displayName: '营运资本周转率',
    displayNameEn: 'Working Capital Turnover',
    category: 'efficiency',
    formula: 'revenue / (current_assets - current_liabilities)',
    requiredInputs: [FinancialMetrics.IncomeStatement.TOTAL_REVENUE, FinancialMetrics.BalanceSheet.TOTAL_CURRENT_ASSETS, FinancialMetrics.BalanceSheet.TOTAL_CURRENT_LIABILITIES],
    unit: '次',
    interpretation: '营运资本周转率反映营运资本的利用效率，比率越高说明营运资本使用效率越高。',
    formulaDisplay: `营运资本周转率 = ${FinancialMetrics.IncomeStatement.TOTAL_REVENUE} / (${FinancialMetrics.BalanceSheet.TOTAL_CURRENT_ASSETS} - ${FinancialMetrics.BalanceSheet.TOTAL_CURRENT_LIABILITIES})`,
    validationRules: {
      min: 0,
    },
    calculate: (inputs) => {
      const revenue = inputs[FinancialMetrics.IncomeStatement.TOTAL_REVENUE];
      const currentAssets = inputs[FinancialMetrics.BalanceSheet.TOTAL_CURRENT_ASSETS];
      const currentLiabilities = inputs[FinancialMetrics.BalanceSheet.TOTAL_CURRENT_LIABILITIES];

      const workingCapital = currentAssets - currentLiabilities;

      if (workingCapital === 0) {
        throw new Error(`营运资本(${FinancialMetrics.BalanceSheet.TOTAL_CURRENT_ASSETS} - ${FinancialMetrics.BalanceSheet.TOTAL_CURRENT_LIABILITIES})不能为0`);
      }

      const value = revenue / workingCapital;
      const warnings = validateResult(value, presetFunctions[13].validationRules);

      return {
        value,
        formatted: formatNumber(value, 2) + '次',
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    },
  },

  // ==========================================================================
  // NEW FORMULAS - Phase 6 Enhancement
  // ==========================================================================

  // --------------------------------------------------------------------------
  // Additional Liquidity Ratios
  // --------------------------------------------------------------------------

  {
    name: 'working_capital',
    displayName: '营运资本',
    displayNameEn: 'Working Capital',
    category: 'liquidity',
    formula: 'current_assets - current_liabilities',
    requiredInputs: [FinancialMetrics.BalanceSheet.TOTAL_CURRENT_ASSETS, FinancialMetrics.BalanceSheet.TOTAL_CURRENT_LIABILITIES],
    unit: '元',
    interpretation: '营运资本反映企业可用于日常经营的资金量。正值表示流动资产足以覆盖流动负债，负值则可能存在短期偿债风险。',
    formulaDisplay: `营运资本 = ${FinancialMetrics.BalanceSheet.TOTAL_CURRENT_ASSETS} - ${FinancialMetrics.BalanceSheet.TOTAL_CURRENT_LIABILITIES}`,
    validationRules: {
      warn_if: {
        below: 0,
        message: '营运资本为负，可能存在短期偿债风险',
      },
    },
    calculate: (inputs) => {
      const currentAssets = inputs[FinancialMetrics.BalanceSheet.TOTAL_CURRENT_ASSETS];
      const currentLiabilities = inputs[FinancialMetrics.BalanceSheet.TOTAL_CURRENT_LIABILITIES];

      const value = currentAssets - currentLiabilities;
      const func = presetFunctions.find(f => f.name === 'working_capital');
      const warnings = validateResult(value, func?.validationRules);

      return {
        value,
        formatted: formatNumber(value, 2) + '元',
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    },
  },

  {
    name: 'cash_flow_ratio',
    displayName: '现金流量比率',
    displayNameEn: 'Cash Flow Ratio',
    category: 'liquidity',
    formula: 'operating_cash_flow / current_liabilities',
    requiredInputs: [FinancialMetrics.CashFlow.NET_CASH_FLOWS_FROM_OPERATING_ACTIVITIES, FinancialMetrics.BalanceSheet.TOTAL_CURRENT_LIABILITIES],
    unit: '倍',
    interpretation: '现金流量比率反映企业经营活动产生的现金流量偿还短期债务的能力。比率越高，短期偿债能力越强。',
    formulaDisplay: `现金流量比率 = ${FinancialMetrics.CashFlow.NET_CASH_FLOWS_FROM_OPERATING_ACTIVITIES} / ${FinancialMetrics.BalanceSheet.TOTAL_CURRENT_LIABILITIES}`,
    validationRules: {
      warn_if: {
        below: 0.4,
        message: '现金流量比率较低，经营现金流可能不足以覆盖短期债务',
      },
    },
    calculate: (inputs) => {
      const operatingCashFlow = inputs[FinancialMetrics.CashFlow.NET_CASH_FLOWS_FROM_OPERATING_ACTIVITIES];
      const currentLiabilities = inputs[FinancialMetrics.BalanceSheet.TOTAL_CURRENT_LIABILITIES];

      if (currentLiabilities === 0) {
        throw new Error(`${FinancialMetrics.BalanceSheet.TOTAL_CURRENT_LIABILITIES}不能为0`);
      }

      const value = operatingCashFlow / currentLiabilities;
      const func = presetFunctions.find(f => f.name === 'cash_flow_ratio');
      const warnings = validateResult(value, func?.validationRules);

      return {
        value,
        formatted: formatNumber(value, 2) + '倍',
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    },
  },

  // --------------------------------------------------------------------------
  // Additional Solvency Ratios
  // --------------------------------------------------------------------------

  {
    name: 'long_term_capital_debt_ratio',
    displayName: '长期资本负债率',
    displayNameEn: 'Long-term Capital Debt Ratio',
    category: 'solvency',
    formula: 'non_current_liabilities / (non_current_liabilities + shareholders_equity)',
    requiredInputs: [FinancialMetrics.BalanceSheet.TOTAL_NON_CURRENT_LIABILITIES, FinancialMetrics.BalanceSheet.TOTAL_OWNERS_EQUITY],
    unit: '%',
    interpretation: '长期资本负债率反映企业长期资本结构中债务的比重。比率越高，说明企业对长期债务的依赖程度越大。',
    formulaDisplay: `长期资本负债率 = ${FinancialMetrics.BalanceSheet.TOTAL_NON_CURRENT_LIABILITIES} / (${FinancialMetrics.BalanceSheet.TOTAL_NON_CURRENT_LIABILITIES} + ${FinancialMetrics.BalanceSheet.TOTAL_OWNERS_EQUITY}) × 100%`,
    validationRules: {
      min: 0,
      max: 1,
      warn_if: {
        above: 0.5,
        message: '长期资本负债率较高，长期偿债压力较大',
      },
    },
    calculate: (inputs) => {
      const nonCurrentLiabilities = inputs[FinancialMetrics.BalanceSheet.TOTAL_NON_CURRENT_LIABILITIES];
      const shareholdersEquity = inputs[FinancialMetrics.BalanceSheet.TOTAL_OWNERS_EQUITY];

      const longTermCapital = nonCurrentLiabilities + shareholdersEquity;

      if (longTermCapital === 0) {
        throw new Error('长期资本(非流动负债 + 股东权益)不能为0');
      }

      const value = nonCurrentLiabilities / longTermCapital;
      const func = presetFunctions.find(f => f.name === 'long_term_capital_debt_ratio');
      const warnings = validateResult(value, func?.validationRules);

      return {
        value,
        formatted: formatPercentage(value),
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    },
  },

  {
    name: 'interest_coverage_ratio',
    displayName: '利息保障倍数',
    displayNameEn: 'Interest Coverage Ratio',
    category: 'solvency',
    formula: 'EBIT / interest_expense (EBIT = total_profit + financial_expenses)',
    requiredInputs: [FinancialMetrics.IncomeStatement.TOTAL_PROFIT, FinancialMetrics.IncomeStatement.FINANCIAL_EXPENSES],
    unit: '倍',
    interpretation: '利息保障倍数反映企业用息税前利润支付利息的能力。比率越高，企业支付利息的能力越强。一般认为该比率应大于1。',
    formulaDisplay: `利息保障倍数 = (${FinancialMetrics.IncomeStatement.TOTAL_PROFIT} + ${FinancialMetrics.IncomeStatement.FINANCIAL_EXPENSES}) / ${FinancialMetrics.IncomeStatement.FINANCIAL_EXPENSES}`,
    validationRules: {
      warn_if: {
        below: 1.5,
        message: '利息保障倍数较低，可能存在利息支付风险',
      },
    },
    calculate: (inputs) => {
      const totalProfit = inputs[FinancialMetrics.IncomeStatement.TOTAL_PROFIT];
      const financialExpenses = inputs[FinancialMetrics.IncomeStatement.FINANCIAL_EXPENSES];

      if (financialExpenses === 0) {
        throw new Error(`${FinancialMetrics.IncomeStatement.FINANCIAL_EXPENSES}不能为0`);
      }

      // EBIT = 利润总额 + 财务费用 (adding back interest)
      const ebit = totalProfit + financialExpenses;
      const value = ebit / financialExpenses;
      const func = presetFunctions.find(f => f.name === 'interest_coverage_ratio');
      const warnings = validateResult(value, func?.validationRules);

      return {
        value,
        formatted: formatNumber(value, 2) + '倍',
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    },
  },

  {
    name: 'cash_flow_interest_coverage',
    displayName: '现金流量利息保障倍数',
    displayNameEn: 'Cash Flow Interest Coverage Ratio',
    category: 'solvency',
    formula: 'operating_cash_flow / interest_expense',
    requiredInputs: [FinancialMetrics.CashFlow.NET_CASH_FLOWS_FROM_OPERATING_ACTIVITIES, FinancialMetrics.IncomeStatement.FINANCIAL_EXPENSES],
    unit: '倍',
    interpretation: '现金流量利息保障倍数反映企业用经营现金流支付利息的能力。比率越高，企业实际支付利息的能力越强。',
    formulaDisplay: `现金流量利息保障倍数 = ${FinancialMetrics.CashFlow.NET_CASH_FLOWS_FROM_OPERATING_ACTIVITIES} / ${FinancialMetrics.IncomeStatement.FINANCIAL_EXPENSES}`,
    validationRules: {
      warn_if: {
        below: 2,
        message: '现金流量利息保障倍数较低，经营现金流可能不足以支付利息',
      },
    },
    calculate: (inputs) => {
      const operatingCashFlow = inputs[FinancialMetrics.CashFlow.NET_CASH_FLOWS_FROM_OPERATING_ACTIVITIES];
      const financialExpenses = inputs[FinancialMetrics.IncomeStatement.FINANCIAL_EXPENSES];

      if (financialExpenses === 0) {
        throw new Error(`${FinancialMetrics.IncomeStatement.FINANCIAL_EXPENSES}不能为0`);
      }

      const value = operatingCashFlow / financialExpenses;
      const func = presetFunctions.find(f => f.name === 'cash_flow_interest_coverage');
      const warnings = validateResult(value, func?.validationRules);

      return {
        value,
        formatted: formatNumber(value, 2) + '倍',
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    },
  },

  {
    name: 'cash_flow_to_debt_ratio',
    displayName: '现金流量与负债比率',
    displayNameEn: 'Cash Flow to Debt Ratio',
    category: 'solvency',
    formula: 'operating_cash_flow / total_liabilities',
    requiredInputs: [FinancialMetrics.CashFlow.NET_CASH_FLOWS_FROM_OPERATING_ACTIVITIES, FinancialMetrics.BalanceSheet.TOTAL_LIABILITIES],
    unit: '%',
    interpretation: '现金流量与负债比率反映企业用经营现金流偿还全部债务的能力。比率越高，企业偿债能力越强。',
    formulaDisplay: `现金流量与负债比率 = ${FinancialMetrics.CashFlow.NET_CASH_FLOWS_FROM_OPERATING_ACTIVITIES} / ${FinancialMetrics.BalanceSheet.TOTAL_LIABILITIES} × 100%`,
    validationRules: {
      warn_if: {
        below: 0.2,
        message: '现金流量与负债比率较低，经营现金流可能不足以偿还债务',
      },
    },
    calculate: (inputs) => {
      const operatingCashFlow = inputs[FinancialMetrics.CashFlow.NET_CASH_FLOWS_FROM_OPERATING_ACTIVITIES];
      const totalLiabilities = inputs[FinancialMetrics.BalanceSheet.TOTAL_LIABILITIES];

      if (totalLiabilities === 0) {
        throw new Error(`${FinancialMetrics.BalanceSheet.TOTAL_LIABILITIES}不能为0`);
      }

      const value = operatingCashFlow / totalLiabilities;
      const func = presetFunctions.find(f => f.name === 'cash_flow_to_debt_ratio');
      const warnings = validateResult(value, func?.validationRules);

      return {
        value,
        formatted: formatPercentage(value),
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    },
  },

  // --------------------------------------------------------------------------
  // Additional Efficiency Ratios
  // --------------------------------------------------------------------------

  {
    name: 'asset_turnover_days',
    displayName: '总资产周转天数',
    displayNameEn: 'Asset Turnover Days',
    category: 'efficiency',
    formula: '365 / (revenue / total_assets) = 365 * total_assets / revenue',
    requiredInputs: [FinancialMetrics.IncomeStatement.TOTAL_REVENUE, FinancialMetrics.BalanceSheet.TOTAL_ASSETS],
    unit: '天',
    interpretation: '总资产周转天数反映企业总资产周转一次所需的天数。天数越少，说明资产利用效率越高。',
    formulaDisplay: `总资产周转天数 = 365 × ${FinancialMetrics.BalanceSheet.TOTAL_ASSETS} / ${FinancialMetrics.IncomeStatement.TOTAL_REVENUE}`,
    validationRules: {
      min: 0,
    },
    calculate: (inputs) => {
      const revenue = inputs[FinancialMetrics.IncomeStatement.TOTAL_REVENUE];
      const totalAssets = inputs[FinancialMetrics.BalanceSheet.TOTAL_ASSETS];

      if (revenue === 0) {
        throw new Error(`${FinancialMetrics.IncomeStatement.TOTAL_REVENUE}不能为0`);
      }

      const value = (365 * totalAssets) / revenue;
      const func = presetFunctions.find(f => f.name === 'asset_turnover_days');
      const warnings = validateResult(value, func?.validationRules);

      return {
        value,
        formatted: formatNumber(value, 2) + '天',
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    },
  },

  // --------------------------------------------------------------------------
  // Composite Analysis - DuPont
  // --------------------------------------------------------------------------

  {
    name: 'dupont_roe',
    displayName: '杜邦分析ROE',
    displayNameEn: 'DuPont ROE Analysis',
    category: 'composite',
    formula: 'net_profit_margin × asset_turnover × equity_multiplier',
    requiredInputs: [
      FinancialMetrics.IncomeStatement.NET_PROFIT,
      FinancialMetrics.IncomeStatement.TOTAL_REVENUE,
      FinancialMetrics.BalanceSheet.TOTAL_ASSETS,
      FinancialMetrics.BalanceSheet.TOTAL_OWNERS_EQUITY,
    ],
    unit: '%',
    interpretation: '杜邦分析将ROE分解为三个核心驱动因素：营业净利率（盈利能力）、总资产周转率（运营效率）、权益乘数（财务杠杆）。这有助于识别企业盈利的主要来源。',
    formulaDisplay: `ROE = (${FinancialMetrics.IncomeStatement.NET_PROFIT}/${FinancialMetrics.IncomeStatement.TOTAL_REVENUE}) × (${FinancialMetrics.IncomeStatement.TOTAL_REVENUE}/${FinancialMetrics.BalanceSheet.TOTAL_ASSETS}) × (${FinancialMetrics.BalanceSheet.TOTAL_ASSETS}/${FinancialMetrics.BalanceSheet.TOTAL_OWNERS_EQUITY})`,
    validationRules: {
      min: -1,
      max: 2,
    },
    calculate: (inputs) => {
      const netProfit = inputs[FinancialMetrics.IncomeStatement.NET_PROFIT];
      const revenue = inputs[FinancialMetrics.IncomeStatement.TOTAL_REVENUE];
      const totalAssets = inputs[FinancialMetrics.BalanceSheet.TOTAL_ASSETS];
      const shareholdersEquity = inputs[FinancialMetrics.BalanceSheet.TOTAL_OWNERS_EQUITY];

      if (revenue === 0) {
        throw new Error(`${FinancialMetrics.IncomeStatement.TOTAL_REVENUE}不能为0`);
      }
      if (totalAssets === 0) {
        throw new Error(`${FinancialMetrics.BalanceSheet.TOTAL_ASSETS}不能为0`);
      }
      if (shareholdersEquity === 0) {
        throw new Error(`${FinancialMetrics.BalanceSheet.TOTAL_OWNERS_EQUITY}不能为0`);
      }

      // Calculate DuPont components
      const netProfitMargin = netProfit / revenue;
      const assetTurnover = revenue / totalAssets;
      const equityMultiplier = totalAssets / shareholdersEquity;

      // DuPont ROE = Net Profit Margin × Asset Turnover × Equity Multiplier
      const value = netProfitMargin * assetTurnover * equityMultiplier;

      const func = presetFunctions.find(f => f.name === 'dupont_roe');
      const warnings = validateResult(value, func?.validationRules);

      // Enhanced formatted output showing breakdown
      const breakdown = [
        `ROE: ${formatPercentage(value)}`,
        `= 营业净利率 ${formatPercentage(netProfitMargin)}`,
        `× 总资产周转率 ${formatNumber(assetTurnover, 2)}次`,
        `× 权益乘数 ${formatNumber(equityMultiplier, 2)}倍`,
      ].join('\n');

      return {
        value,
        formatted: breakdown,
        warnings: warnings.length > 0 ? warnings : undefined,
      };
    },
  },
];

// ============================================================================
// Execution Engine
// ============================================================================

/**
 * Execute a preset function by name with provided inputs
 * @throws Error if function not found or inputs are invalid
 */
export function executeFunction(
  functionName: string,
  inputs: Record<string, number>
): ExecutionResult {
  // Find the function
  const func = presetFunctions.find((f) => f.name === functionName);

  if (!func) {
    throw new Error(`函数 "${functionName}" 未找到`);
  }

  // Validate all required inputs are provided
  const missingInputs = func.requiredInputs.filter((input) => !(input in inputs));

  if (missingInputs.length > 0) {
    throw new Error(`缺少必需的输入参数: ${missingInputs.join(', ')}`);
  }

  // Validate all inputs are numbers
  for (const [key, value] of Object.entries(inputs)) {
    if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
      throw new Error(`输入参数 "${key}" 必须是有效的数字`);
    }
  }

  // Execute the calculation
  try {
    const result = func.calculate(inputs);

    return {
      function: func.name,
      displayName: func.displayName,
      formula: func.formula,
      formulaDisplay: func.formulaDisplay,
      inputs,
      result,
      unit: func.unit,
      interpretation: func.interpretation,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`计算错误: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Get function by name
 */
export function getFunctionByName(name: string): PresetFunction | undefined {
  return presetFunctions.find((f) => f.name === name);
}

/**
 * Get all functions in a category
 */
export function getFunctionsByCategory(category: FunctionCategory): PresetFunction[] {
  return presetFunctions.filter((f) => f.category === category);
}

/**
 * Get list of all function names
 */
export function getAllFunctionNames(): string[] {
  return presetFunctions.map((f) => f.name);
}

/**
 * Search functions by display name (fuzzy search)
 */
export function searchFunctionsByName(query: string): PresetFunction[] {
  const lowerQuery = query.toLowerCase();
  return presetFunctions.filter(
    (f) =>
      f.displayName.toLowerCase().includes(lowerQuery) ||
      f.displayNameEn.toLowerCase().includes(lowerQuery) ||
      f.name.toLowerCase().includes(lowerQuery)
  );
}
