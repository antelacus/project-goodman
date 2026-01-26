/**
 * Unit Tests for Financial Preset Functions
 *
 * Tests the calculation logic of financial ratios defined in
 * src/lib/financial/preset-functions.ts
 */

import { describe, it, expect } from 'vitest';
import {
  executeFunction,
  getFunctionByName,
  getFunctionsByCategory,
  getAllFunctionNames,
  searchFunctionsByName,
  presetFunctions,
} from '@/lib/financial/preset-functions';
import { FinancialMetrics } from '@/lib/financial/metric-names';

// ============================================================================
// Helper functions
// ============================================================================

const M = FinancialMetrics; // Shorthand for cleaner test code

// ============================================================================
// Liquidity Ratios Tests
// ============================================================================

describe('Liquidity Ratios', () => {
  describe('current_ratio (流动比率)', () => {
    it('should calculate correctly with normal values', () => {
      const result = executeFunction('current_ratio', {
        [M.BalanceSheet.TOTAL_CURRENT_ASSETS]: 200000,
        [M.BalanceSheet.TOTAL_CURRENT_LIABILITIES]: 100000,
      });

      expect(result.result.value).toBe(2);
      expect(result.result.formatted).toBe('200.00%');
      expect(result.result.warnings).toBeUndefined();
    });

    it('should warn when ratio is below 1', () => {
      const result = executeFunction('current_ratio', {
        [M.BalanceSheet.TOTAL_CURRENT_ASSETS]: 80000,
        [M.BalanceSheet.TOTAL_CURRENT_LIABILITIES]: 100000,
      });

      expect(result.result.value).toBe(0.8);
      expect(result.result.warnings).toBeUndefined();
    });

    it('should throw error when current liabilities is zero', () => {
      expect(() =>
        executeFunction('current_ratio', {
          [M.BalanceSheet.TOTAL_CURRENT_ASSETS]: 200000,
          [M.BalanceSheet.TOTAL_CURRENT_LIABILITIES]: 0,
        })
      ).toThrow('流动负债合计不能为0');
    });
  });

  describe('quick_ratio (速动比率)', () => {
    it('should calculate correctly by excluding inventory', () => {
      const result = executeFunction('quick_ratio', {
        [M.BalanceSheet.TOTAL_CURRENT_ASSETS]: 200000,
        [M.BalanceSheet.INVENTORY]: 50000,
        [M.BalanceSheet.TOTAL_CURRENT_LIABILITIES]: 100000,
      });

      // (200000 - 50000) / 100000 = 1.5
      expect(result.result.value).toBe(1.5);
      expect(result.result.formatted).toBe('150.00%');
    });

    it('should warn when ratio is below 0.5', () => {
      const result = executeFunction('quick_ratio', {
        [M.BalanceSheet.TOTAL_CURRENT_ASSETS]: 100000,
        [M.BalanceSheet.INVENTORY]: 80000,
        [M.BalanceSheet.TOTAL_CURRENT_LIABILITIES]: 100000,
      });

      // (100000 - 80000) / 100000 = 0.2
      expect(result.result.value).toBe(0.2);
      expect(result.result.warnings).toBeUndefined();
    });
  });

  describe('cash_ratio (现金比率)', () => {
    it('should calculate correctly', () => {
      const result = executeFunction('cash_ratio', {
        [M.BalanceSheet.MONETARY_FUNDS]: 50000,
        [M.BalanceSheet.TOTAL_CURRENT_LIABILITIES]: 100000,
      });

      expect(result.result.value).toBe(0.5);
      expect(result.result.formatted).toBe('50.00%');
    });
  });

  describe('working_capital (营运资本)', () => {
    it('should calculate positive working capital', () => {
      const result = executeFunction('working_capital', {
        [M.BalanceSheet.TOTAL_CURRENT_ASSETS]: 200000,
        [M.BalanceSheet.TOTAL_CURRENT_LIABILITIES]: 100000,
      });

      expect(result.result.value).toBe(100000);
      expect(result.result.formatted).toBe('100,000.00元');
    });

    it('should warn when working capital is negative', () => {
      const result = executeFunction('working_capital', {
        [M.BalanceSheet.TOTAL_CURRENT_ASSETS]: 80000,
        [M.BalanceSheet.TOTAL_CURRENT_LIABILITIES]: 100000,
      });

      expect(result.result.value).toBe(-20000);
      expect(result.result.warnings).toBeUndefined();
    });
  });
});

// ============================================================================
// Solvency Ratios Tests
// ============================================================================

describe('Solvency Ratios', () => {
  describe('debt_to_asset_ratio (资产负债率)', () => {
    it('should calculate correctly as a percentage', () => {
      const result = executeFunction('debt_to_asset_ratio', {
        [M.BalanceSheet.TOTAL_LIABILITIES]: 600000,
        [M.BalanceSheet.TOTAL_ASSETS]: 1000000,
      });

      expect(result.result.value).toBe(0.6);
      expect(result.result.formatted).toBe('60.00%');
    });

    it('should warn when ratio exceeds 70%', () => {
      const result = executeFunction('debt_to_asset_ratio', {
        [M.BalanceSheet.TOTAL_LIABILITIES]: 800000,
        [M.BalanceSheet.TOTAL_ASSETS]: 1000000,
      });

      expect(result.result.value).toBe(0.8);
      expect(result.result.warnings).toBeUndefined();
    });

    it('should throw error when total assets is zero', () => {
      expect(() =>
        executeFunction('debt_to_asset_ratio', {
          [M.BalanceSheet.TOTAL_LIABILITIES]: 600000,
          [M.BalanceSheet.TOTAL_ASSETS]: 0,
        })
      ).toThrow('资产总计不能为0');
    });
  });

  describe('debt_to_equity_ratio (产权比率)', () => {
    it('should calculate correctly', () => {
      const result = executeFunction('debt_to_equity_ratio', {
        [M.BalanceSheet.TOTAL_LIABILITIES]: 400000,
        [M.BalanceSheet.TOTAL_OWNERS_EQUITY]: 600000,
      });

      // 400000 / 600000 ≈ 0.6667
      expect(result.result.value).toBeCloseTo(0.6667, 4);
    });
  });

  describe('equity_multiplier (权益乘数)', () => {
    it('should calculate correctly', () => {
      const result = executeFunction('equity_multiplier', {
        [M.BalanceSheet.TOTAL_ASSETS]: 1000000,
        [M.BalanceSheet.TOTAL_OWNERS_EQUITY]: 400000,
      });

      // 1000000 / 400000 = 2.5
      expect(result.result.value).toBe(2.5);
      expect(result.result.formatted).toBe('250.00%');
    });
  });

  describe('interest_coverage_ratio (利息保障倍数)', () => {
    it('should use interest expense from financial sub-account', () => {
      const result = executeFunction('interest_coverage_ratio', {
        [M.IncomeStatement.TOTAL_PROFIT]: 100,
        [M.IncomeStatement.INTEREST_EXPENSES]: 20,
      });

      // (100 + 20) / 20 = 6
      expect(result.result.value).toBe(6);
      expect(result.result.formatted).toBe('600.00%');
    });
  });

  describe('cash_flow_interest_coverage (现金流量利息保障倍数)', () => {
    it('should use interest expense from financial sub-account', () => {
      const result = executeFunction('cash_flow_interest_coverage', {
        [M.CashFlow.NET_CASH_FLOWS_FROM_OPERATING_ACTIVITIES]: 200,
        [M.IncomeStatement.INTEREST_EXPENSES]: 40,
      });

      // 200 / 40 = 5
      expect(result.result.value).toBe(5);
      expect(result.result.formatted).toBe('500.00%');
    });
  });
});

// ============================================================================
// Profitability Ratios Tests
// ============================================================================

describe('Profitability Ratios', () => {
  describe('gross_profit_margin (销售毛利率)', () => {
    it('should calculate correctly', () => {
      const result = executeFunction('gross_profit_margin', {
        [M.IncomeStatement.REVENUE]: 1000000,
        [M.IncomeStatement.OPERATING_COSTS]: 600000,
      });

      // (1000000 - 600000) / 1000000 = 0.4
      expect(result.result.value).toBe(0.4);
      expect(result.result.formatted).toBe('40.00%');
    });
  });

  describe('net_profit_margin (销售净利率)', () => {
    it('should calculate correctly', () => {
      const result = executeFunction('net_profit_margin', {
        [M.IncomeStatement.NET_PROFIT]: 100000,
        [M.IncomeStatement.TOTAL_REVENUE]: 1000000,
      });

      expect(result.result.value).toBe(0.1);
      expect(result.result.formatted).toBe('10.00%');
    });

    it('should handle negative profit (loss)', () => {
      const result = executeFunction('net_profit_margin', {
        [M.IncomeStatement.NET_PROFIT]: -50000,
        [M.IncomeStatement.TOTAL_REVENUE]: 1000000,
      });

      expect(result.result.value).toBe(-0.05);
      expect(result.result.formatted).toBe('-5.00%');
    });
  });

  describe('return_on_assets (ROA)', () => {
    it('should calculate correctly', () => {
      const result = executeFunction('return_on_assets', {
        [M.IncomeStatement.NET_PROFIT]: 80000,
        [M.BalanceSheet.TOTAL_ASSETS]: 1000000,
      });

      expect(result.result.value).toBe(0.08);
      expect(result.result.formatted).toBe('8.00%');
    });
  });

  describe('return_on_equity (ROE)', () => {
    it('should calculate correctly', () => {
      const result = executeFunction('return_on_equity', {
        [M.IncomeStatement.NET_PROFIT]: 120000,
        [M.BalanceSheet.TOTAL_OWNERS_EQUITY]: 600000,
      });

      expect(result.result.value).toBe(0.2);
      expect(result.result.formatted).toBe('20.00%');
    });

    it('should throw error when equity is zero', () => {
      expect(() =>
        executeFunction('return_on_equity', {
          [M.IncomeStatement.NET_PROFIT]: 120000,
          [M.BalanceSheet.TOTAL_OWNERS_EQUITY]: 0,
        })
      ).toThrow('所有者权益合计不能为0');
    });
  });
});

// ============================================================================
// Efficiency Ratios Tests
// ============================================================================

describe('Efficiency Ratios', () => {
  describe('asset_turnover (总资产周转率)', () => {
    it('should calculate correctly', () => {
      const result = executeFunction('asset_turnover', {
        [M.IncomeStatement.TOTAL_REVENUE]: 2000000,
        [M.BalanceSheet.TOTAL_ASSETS]: 1000000,
      });

      expect(result.result.value).toBe(2);
      expect(result.result.formatted).toBe('2.00次');
    });
  });

  describe('inventory_turnover (存货周转率)', () => {
    it('should calculate correctly', () => {
      const result = executeFunction('inventory_turnover', {
        [M.IncomeStatement.OPERATING_COSTS]: 600000,
        [M.BalanceSheet.INVENTORY]: 100000,
      });

      expect(result.result.value).toBe(6);
      expect(result.result.formatted).toBe('6.00次');
    });
  });

  describe('receivables_turnover (应收账款周转率)', () => {
    it('should calculate correctly', () => {
      const result = executeFunction('receivables_turnover', {
        [M.IncomeStatement.TOTAL_REVENUE]: 1000000,
        [M.BalanceSheet.ACCOUNTS_RECEIVABLE]: 200000,
      });

      expect(result.result.value).toBe(5);
      expect(result.result.formatted).toBe('5.00次');
    });
  });

  describe('asset_turnover_days (总资产周转天数)', () => {
    it('should calculate correctly', () => {
      const result = executeFunction('asset_turnover_days', {
        [M.IncomeStatement.TOTAL_REVENUE]: 1000000,
        [M.BalanceSheet.TOTAL_ASSETS]: 500000,
      });

      // 365 * 500000 / 1000000 = 182.5
      expect(result.result.value).toBe(182.5);
      expect(result.result.formatted).toBe('182.50天');
    });
  });
});

// ============================================================================
// Composite Analysis Tests
// ============================================================================

describe('Composite Analysis', () => {
  describe('dupont_roe (杜邦分析ROE)', () => {
    it('should calculate correctly with breakdown', () => {
      const result = executeFunction('dupont_roe', {
        [M.IncomeStatement.NET_PROFIT]: 100000,
        [M.IncomeStatement.TOTAL_REVENUE]: 1000000,
        [M.BalanceSheet.TOTAL_ASSETS]: 500000,
        [M.BalanceSheet.TOTAL_OWNERS_EQUITY]: 250000,
      });

      // Net Profit Margin = 100000 / 1000000 = 0.1
      // Asset Turnover = 1000000 / 500000 = 2
      // Equity Multiplier = 500000 / 250000 = 2
      // ROE = 0.1 * 2 * 2 = 0.4 = 40%
      expect(result.result.value).toBe(0.4);
      expect(result.result.formatted).toContain('ROE: 40.00%');
      expect(result.result.formatted).toContain('营业净利率 10.00%');
      expect(result.result.formatted).toContain('总资产周转率 2.00次');
      expect(result.result.formatted).toContain('权益乘数 200.00%');
    });

    it('should throw error when revenue is zero', () => {
      expect(() =>
        executeFunction('dupont_roe', {
          [M.IncomeStatement.NET_PROFIT]: 100000,
          [M.IncomeStatement.TOTAL_REVENUE]: 0,
          [M.BalanceSheet.TOTAL_ASSETS]: 500000,
          [M.BalanceSheet.TOTAL_OWNERS_EQUITY]: 250000,
        })
      ).toThrow('不能为0');
    });

    it('should throw error when total assets is zero', () => {
      expect(() =>
        executeFunction('dupont_roe', {
          [M.IncomeStatement.NET_PROFIT]: 100000,
          [M.IncomeStatement.TOTAL_REVENUE]: 1000000,
          [M.BalanceSheet.TOTAL_ASSETS]: 0,
          [M.BalanceSheet.TOTAL_OWNERS_EQUITY]: 250000,
        })
      ).toThrow('不能为0');
    });

    it('should throw error when shareholders equity is zero', () => {
      expect(() =>
        executeFunction('dupont_roe', {
          [M.IncomeStatement.NET_PROFIT]: 100000,
          [M.IncomeStatement.TOTAL_REVENUE]: 1000000,
          [M.BalanceSheet.TOTAL_ASSETS]: 500000,
          [M.BalanceSheet.TOTAL_OWNERS_EQUITY]: 0,
        })
      ).toThrow('不能为0');
    });
  });
});

// ============================================================================
// Input Validation Tests
// ============================================================================

describe('Input Validation', () => {
  it('should throw error for missing required inputs', () => {
    expect(() =>
      executeFunction('current_ratio', {
        [M.BalanceSheet.TOTAL_CURRENT_ASSETS]: 200000,
        // Missing TOTAL_CURRENT_LIABILITIES
      })
    ).toThrow('缺少必需的输入参数');
  });

  it('should throw error for unknown function', () => {
    expect(() =>
      executeFunction('unknown_function', {})
    ).toThrow('函数 "unknown_function" 未找到');
  });

  it('should throw error for NaN input', () => {
    expect(() =>
      executeFunction('current_ratio', {
        [M.BalanceSheet.TOTAL_CURRENT_ASSETS]: NaN,
        [M.BalanceSheet.TOTAL_CURRENT_LIABILITIES]: 100000,
      })
    ).toThrow('必须是有效的数字');
  });

  it('should throw error for Infinity input', () => {
    expect(() =>
      executeFunction('current_ratio', {
        [M.BalanceSheet.TOTAL_CURRENT_ASSETS]: Infinity,
        [M.BalanceSheet.TOTAL_CURRENT_LIABILITIES]: 100000,
      })
    ).toThrow('必须是有效的数字');
  });

  it('should rethrow non-Error values from calculate', () => {
    const target = presetFunctions.find((func) => func.name === 'current_ratio');

    if (!target) {
      throw new Error('current_ratio function not found');
    }

    const originalCalculate = target.calculate;
    const sentinel = 'non-error';

    target.calculate = () => {
      throw sentinel;
    };

    try {
      let thrown: unknown;

      try {
        executeFunction('current_ratio', {
          [M.BalanceSheet.TOTAL_CURRENT_ASSETS]: 200000,
          [M.BalanceSheet.TOTAL_CURRENT_LIABILITIES]: 100000,
        });
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBe(sentinel);
    } finally {
      target.calculate = originalCalculate;
    }
  });
});

// ============================================================================
// Utility Functions Tests
// ============================================================================

describe('Utility Functions', () => {
  describe('getFunctionByName', () => {
    it('should return function by name', () => {
      const func = getFunctionByName('current_ratio');
      expect(func).toBeDefined();
      expect(func?.displayName).toBe('流动比率');
    });

    it('should return undefined for unknown name', () => {
      const func = getFunctionByName('unknown');
      expect(func).toBeUndefined();
    });
  });

  describe('getFunctionsByCategory', () => {
    it('should return all functions in a category', () => {
      const liquidityFuncs = getFunctionsByCategory('liquidity');
      expect(liquidityFuncs.length).toBeGreaterThan(0);
      expect(liquidityFuncs.every((f) => f.category === 'liquidity')).toBe(true);
    });
  });

  describe('getAllFunctionNames', () => {
    it('should return all function names', () => {
      const names = getAllFunctionNames();
      expect(names).toContain('current_ratio');
      expect(names).toContain('return_on_equity');
      expect(names.length).toBe(presetFunctions.length);
    });
  });

  describe('searchFunctionsByName', () => {
    it('should find functions by Chinese name', () => {
      const results = searchFunctionsByName('流动');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((f) => f.displayName.includes('流动'))).toBe(true);
    });

    it('should find functions by English name', () => {
      const results = searchFunctionsByName('ROE');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should return empty array for no matches', () => {
      const results = searchFunctionsByName('xyz123nonexistent');
      expect(results).toHaveLength(0);
    });
  });
});

// ============================================================================
// Interpretation & Formatting Guards
// ============================================================================

describe('presetFunctions interpretation', () => {
  it('does not contain numeric thresholds', () => {
    const withDigits = presetFunctions.filter(f => /\d/.test(f.interpretation));
    expect(withDigits).toHaveLength(0);
  });
});

describe('ratio formatting', () => {
  it('formats current ratio as percent', () => {
    const currentRatio = presetFunctions.find(f => f.name === 'current_ratio');
    const result = currentRatio?.calculate({
      [M.BalanceSheet.TOTAL_CURRENT_ASSETS]: 227,
      [M.BalanceSheet.TOTAL_CURRENT_LIABILITIES]: 100,
    });

    expect(result?.formatted).toBe('227.00%');
  });
});
