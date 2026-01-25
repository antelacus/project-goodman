import { describe, it, expect } from 'vitest';
import { BalanceSheetSchema, type StandardBalanceSheet } from '@/lib/financial/schema';
import { validateBalanceSheet } from '@/lib/financial/validation';
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
});
