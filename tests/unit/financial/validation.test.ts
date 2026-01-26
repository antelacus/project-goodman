import { describe, it, test, expect } from 'vitest';
import {
  BalanceSheetSchema,
  type StandardBalanceSheet,
  type StandardIncomeStatement,
} from '@/lib/financial/schema';
import { validateBalanceSheet, validateIncomeStatement } from '@/lib/financial/validation';
import { FinancialMetrics } from '@/lib/financial/metric-names';

describe('balance sheet schema + validation', () => {
  it('accepts canonical keys in schema', () => {
    const BS = FinancialMetrics.BalanceSheet;
    const data = {
      [BS.MONETARY_FUNDS]: 100,
      [BS.TOTAL_CURRENT_ASSETS]: 100,
      [BS.TOTAL_NON_CURRENT_ASSETS]: 0,
      [BS.TOTAL_ASSETS]: 100,
      [BS.TOTAL_CURRENT_LIABILITIES]: 0,
      [BS.TOTAL_NON_CURRENT_LIABILITIES]: 0,
      [BS.TOTAL_LIABILITIES]: 0,
      [BS.TOTAL_EQUITY_ATTRIBUTABLE_TO_PARENT_COMPANY]: 100,
      [BS.TOTAL_OWNERS_EQUITY]: 100,
      [BS.TOTAL_LIABILITIES_AND_OWNERS_EQUITY]: 100,
    };

    const result = BalanceSheetSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('includes sub-account keys in schema', () => {
    const BS = FinancialMetrics.BalanceSheet;
    expect(BalanceSheetSchema.shape[BS.OTHER_RECEIVABLES_INTEREST]).toBeDefined();
  });

  it('excludes sub-accounts from totals', () => {
    const BS = FinancialMetrics.BalanceSheet;
    const data = {
      [BS.MONETARY_FUNDS]: 100,
      [BS.OTHER_RECEIVABLES]: 50,
      [BS.OTHER_RECEIVABLES_INTEREST]: 10,
      [BS.TOTAL_CURRENT_ASSETS]: 150,
      [BS.TOTAL_NON_CURRENT_ASSETS]: 0,
      [BS.TOTAL_ASSETS]: 150,
      [BS.TOTAL_CURRENT_LIABILITIES]: 0,
      [BS.TOTAL_NON_CURRENT_LIABILITIES]: 0,
      [BS.TOTAL_LIABILITIES]: 0,
      [BS.PAID_IN_CAPITAL]: 150,
      [BS.TOTAL_EQUITY_ATTRIBUTABLE_TO_PARENT_COMPANY]: 150,
      [BS.MINORITY_INTERESTS]: 0,
      [BS.TOTAL_OWNERS_EQUITY]: 150,
      [BS.TOTAL_LIABILITIES_AND_OWNERS_EQUITY]: 150,
    } as Record<string, number>;

    const result = validateBalanceSheet(data as unknown as StandardBalanceSheet);
    expect(result.isValid).toBe(true);
  });

  test('flags total assets mismatch with liabilities and equity total', () => {
    const BS = FinancialMetrics.BalanceSheet;
    const data = {
      [BS.MONETARY_FUNDS]: 100,
      [BS.TOTAL_CURRENT_ASSETS]: 100,
      [BS.TOTAL_NON_CURRENT_ASSETS]: 0,
      [BS.TOTAL_ASSETS]: 100,
      [BS.TOTAL_CURRENT_LIABILITIES]: 0,
      [BS.TOTAL_NON_CURRENT_LIABILITIES]: 0,
      [BS.TOTAL_LIABILITIES]: 0,
      [BS.PAID_IN_CAPITAL]: 90,
      [BS.TOTAL_EQUITY_ATTRIBUTABLE_TO_PARENT_COMPANY]: 90,
      [BS.MINORITY_INTERESTS]: 0,
      [BS.TOTAL_OWNERS_EQUITY]: 90,
      [BS.TOTAL_LIABILITIES_AND_OWNERS_EQUITY]: 90,
    } as Record<string, number>;

    const result = validateBalanceSheet(data as unknown as StandardBalanceSheet);
    expect(result.isValid).toBe(false);
    expect(result.errors.join('\n')).toContain(BS.TOTAL_ASSETS);
  });
});

const baseIncomeStatement = () => {
  const IS = FinancialMetrics.IncomeStatement;
  return {
    [IS.TOTAL_REVENUE]: 100,
    [IS.REVENUE]: 60,
    [IS.INTEREST_INCOME]: 20,
    [IS.EARNED_PREMIUMS]: 10,
    [IS.FEE_AND_COMMISSION_INCOME]: 10,

    [IS.TOTAL_OPERATING_COSTS]: 50,
    [IS.OPERATING_COSTS]: 30,
    [IS.FEE_AND_COMMISSION_EXPENSES]: 5,
    [IS.TAXES_AND_SURCHARGES]: 5,
    [IS.SELLING_EXPENSES]: 5,
    [IS.ADMINISTRATIVE_EXPENSES]: 5,
    [IS.FINANCIAL_EXPENSES]: 0,

    [IS.OPERATING_PROFIT]: 50,
    [IS.ADD_NON_OPERATING_INCOME]: 0,
    [IS.LESS_NON_OPERATING_EXPENSES]: 0,
    [IS.TOTAL_PROFIT]: 50,
    [IS.LESS_INCOME_TAX_EXPENSES]: 0,
    [IS.NET_PROFIT]: 50,

    [IS.NET_PROFIT_CONTINUING]: 50,
    [IS.NET_PROFIT_DISCONTINUED]: 0,
    [IS.NET_PROFIT_ATTRIBUTABLE_TO_PARENT_COMPANY]: 50,
    [IS.MINORITY_INTERESTS_INCOME]: 0,

    [IS.OTHER_COMPREHENSIVE_INCOME_NET_OF_TAX]: 0,
    [IS.OTHER_COMPREHENSIVE_INCOME_ATTRIBUTABLE_TO_PARENT_COMPANY]: 0,
    [IS.OTHER_COMPREHENSIVE_INCOME_ATTRIBUTABLE_TO_MINORITY_INTERESTS]: 0,
    [IS.OCI_NON_RECLASSIFIABLE]: 0,
    [IS.OCI_RECLASSIFIABLE]: 0,

    [IS.TOTAL_COMPREHENSIVE_INCOME]: 50,
    [IS.TOTAL_COMPREHENSIVE_INCOME_ATTRIBUTABLE_TO_PARENT_COMPANY]: 50,
    [IS.TOTAL_COMPREHENSIVE_INCOME_ATTRIBUTABLE_TO_MINORITY_INTERESTS]: 0,
  } as Record<string, number>;
};

describe('income statement validation', () => {
  test('treats total revenue and operating costs mismatch as errors', () => {
    const IS = FinancialMetrics.IncomeStatement;
    const data = baseIncomeStatement();
    data[IS.TOTAL_REVENUE] = 110; // mismatch: sum is 100
    data[IS.TOTAL_OPERATING_COSTS] = 60; // mismatch: sum is 50

    const result = validateIncomeStatement(data as unknown as StandardIncomeStatement);
    expect(result.isValid).toBe(false);
    expect(result.errors.join('\n')).toContain(IS.TOTAL_REVENUE);
    expect(result.errors.join('\n')).toContain(IS.TOTAL_OPERATING_COSTS);
  });

  test('validates net profit equals continuing + discontinued', () => {
    const IS = FinancialMetrics.IncomeStatement;
    const data = baseIncomeStatement();
    data[IS.NET_PROFIT_CONTINUING] = 40;
    data[IS.NET_PROFIT_DISCONTINUED] = 5;
    data[IS.NET_PROFIT] = 50; // mismatch (45 expected)

    const result = validateIncomeStatement(data as unknown as StandardIncomeStatement);
    expect(result.isValid).toBe(false);
    expect(result.errors.join('\n')).toContain(IS.NET_PROFIT);
  });

  test('validates net profit equals parent + minority', () => {
    const IS = FinancialMetrics.IncomeStatement;
    const data = baseIncomeStatement();
    data[IS.NET_PROFIT_ATTRIBUTABLE_TO_PARENT_COMPANY] = 40;
    data[IS.MINORITY_INTERESTS_INCOME] = 5;
    data[IS.NET_PROFIT] = 50; // mismatch (45 expected)

    const result = validateIncomeStatement(data as unknown as StandardIncomeStatement);
    expect(result.isValid).toBe(false);
    expect(result.errors.join('\n')).toContain(IS.NET_PROFIT);
  });

  test('validates OCI net of tax equals parent + minority', () => {
    const IS = FinancialMetrics.IncomeStatement;
    const data = baseIncomeStatement();
    data[IS.OTHER_COMPREHENSIVE_INCOME_ATTRIBUTABLE_TO_PARENT_COMPANY] = 6;
    data[IS.OTHER_COMPREHENSIVE_INCOME_ATTRIBUTABLE_TO_MINORITY_INTERESTS] = 3;
    data[IS.OTHER_COMPREHENSIVE_INCOME_NET_OF_TAX] = 12; // mismatch (9 expected)

    const result = validateIncomeStatement(data as unknown as StandardIncomeStatement);
    expect(result.isValid).toBe(false);
    expect(result.errors.join('\n')).toContain(IS.OTHER_COMPREHENSIVE_INCOME_NET_OF_TAX);
  });
});
