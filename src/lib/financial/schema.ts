import { z } from 'zod';
import { FinancialMetrics } from './metric-names';
import {
    getAllMetricKeys,
    getMetricDefinitions,
    type FinancialTable,
} from './metric-registry';

const METRIC_DEFINITIONS = getMetricDefinitions();

const REQUIRED_BALANCE_SHEET_KEYS = new Set<string>([
    FinancialMetrics.BalanceSheet.TOTAL_CURRENT_ASSETS,
    FinancialMetrics.BalanceSheet.TOTAL_NON_CURRENT_ASSETS,
    FinancialMetrics.BalanceSheet.TOTAL_ASSETS,
    FinancialMetrics.BalanceSheet.TOTAL_CURRENT_LIABILITIES,
    FinancialMetrics.BalanceSheet.TOTAL_NON_CURRENT_LIABILITIES,
    FinancialMetrics.BalanceSheet.TOTAL_LIABILITIES,
    FinancialMetrics.BalanceSheet.TOTAL_EQUITY_ATTRIBUTABLE_TO_PARENT_COMPANY,
    FinancialMetrics.BalanceSheet.TOTAL_OWNERS_EQUITY,
    FinancialMetrics.BalanceSheet.TOTAL_LIABILITIES_AND_OWNERS_EQUITY,
]);

const REQUIRED_INCOME_STATEMENT_KEYS = new Set<string>([
    FinancialMetrics.IncomeStatement.TOTAL_REVENUE,
    FinancialMetrics.IncomeStatement.TOTAL_OPERATING_COSTS,
    FinancialMetrics.IncomeStatement.OPERATING_PROFIT,
    FinancialMetrics.IncomeStatement.TOTAL_PROFIT,
    FinancialMetrics.IncomeStatement.NET_PROFIT,
    FinancialMetrics.IncomeStatement.TOTAL_COMPREHENSIVE_INCOME,
]);

const REQUIRED_CASH_FLOW_KEYS = new Set<string>([
    FinancialMetrics.CashFlow.SUBTOTAL_OF_CASH_INFLOWS_FROM_OPERATING_ACTIVITIES,
    FinancialMetrics.CashFlow.SUBTOTAL_OF_CASH_OUTFLOWS_FROM_OPERATING_ACTIVITIES,
    FinancialMetrics.CashFlow.NET_CASH_FLOWS_FROM_OPERATING_ACTIVITIES,
    FinancialMetrics.CashFlow.SUBTOTAL_OF_CASH_INFLOWS_FROM_INVESTING_ACTIVITIES,
    FinancialMetrics.CashFlow.SUBTOTAL_OF_CASH_OUTFLOWS_FROM_INVESTING_ACTIVITIES,
    FinancialMetrics.CashFlow.NET_CASH_FLOWS_FROM_INVESTING_ACTIVITIES,
    FinancialMetrics.CashFlow.SUBTOTAL_OF_CASH_INFLOWS_FROM_FINANCING_ACTIVITIES,
    FinancialMetrics.CashFlow.SUBTOTAL_OF_CASH_OUTFLOWS_FROM_FINANCING_ACTIVITIES,
    FinancialMetrics.CashFlow.NET_CASH_FLOWS_FROM_FINANCING_ACTIVITIES,
    FinancialMetrics.CashFlow.NET_INCREASE_IN_CASH_AND_CASH_EQUIVALENTS,
    FinancialMetrics.CashFlow.CASH_AND_CASH_EQUIVALENTS_AT_END_OF_PERIOD,
]);

function buildSchemaForTable(
    table: FinancialTable,
    requiredKeys: Set<string>
): z.ZodObject<z.ZodRawShape> {
    const shape = Object.fromEntries(
        METRIC_DEFINITIONS.filter((metric) => metric.table === table).map((metric) => {
            const baseSchema = z.number().describe(metric.label);
            const schema = requiredKeys.has(metric.key)
                ? baseSchema
                : baseSchema.optional();
            return [metric.key, schema];
        })
    ) as z.ZodRawShape;

    return z.object(shape);
}

export const BalanceSheetSchema = buildSchemaForTable(
    'balance_sheet',
    REQUIRED_BALANCE_SHEET_KEYS
);
export const IncomeStatementSchema = buildSchemaForTable(
    'income_statement',
    REQUIRED_INCOME_STATEMENT_KEYS
);
export const CashFlowSchema = buildSchemaForTable(
    'cash_flow',
    REQUIRED_CASH_FLOW_KEYS
);

export type StandardBalanceSheet = z.infer<typeof BalanceSheetSchema>;
export type StandardIncomeStatement = z.infer<typeof IncomeStatementSchema>;
export type StandardCashFlow = z.infer<typeof CashFlowSchema>;

/**
 * Get all standard financial metric names
 */
export function getAllMetricNames(): string[] {
    return getAllMetricKeys();
}
