import {
    StandardBalanceSheet,
    StandardIncomeStatement,
    StandardCashFlow,
} from './schema';
import { FinancialMetrics } from './metric-names';
import { getMetricDefinitions } from './metric-registry';

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

const TOLERANCE = 1.0; // Tolerance for floating point comparisons (e.g. 1.0 Yuan)
const METRIC_DEFINITIONS = getMetricDefinitions();

function toNumber(value: unknown): number {
    return typeof value === 'number' && !Number.isNaN(value) ? value : 0;
}

function getNumberValue(
    data: Record<string, number | undefined>,
    key: string
): number | undefined {
    const value = data[key];
    return typeof value === 'number' && !Number.isNaN(value) ? value : undefined;
}

function safeAdd(...numbers: Array<number | undefined>): number {
    return numbers.reduce<number>((sum, n) => sum + (n ?? 0), 0);
}

function isApproximatelyEqual(a: number | undefined, b: number | undefined): boolean {
    if (a === undefined || b === undefined) return false;
    return Math.abs(a - b) <= TOLERANCE;
}

function getKeysByPrefix(prefix: string, excludeKeys: Set<string>): string[] {
    return METRIC_DEFINITIONS.filter(
        (metric) =>
            metric.key.startsWith(prefix) &&
            metric.includeInTotals !== false &&
            !excludeKeys.has(metric.key)
    ).map((metric) => metric.key);
}

function sumKeys(data: Record<string, number | undefined>, keys: string[]): number {
    return keys.reduce((sum, key) => sum + toNumber(data[key]), 0);
}

function sumByPrefix(
    data: Record<string, number | undefined>,
    prefix: string,
    excludeKeys: Set<string>
): number {
    return sumKeys(data, getKeysByPrefix(prefix, excludeKeys));
}

function validateTotal(
    data: Record<string, number | undefined>,
    key: string,
    calculated: number,
    errors: string[]
): void {
    const reported = getNumberValue(data, key);
    if (reported === undefined) {
        errors.push(`${key}缺失`);
        return;
    }

    if (!isApproximatelyEqual(reported, calculated)) {
        errors.push(
            `${key}不平衡: 报表值=${reported}, 计算值=${calculated}, 差额=${(reported - calculated).toFixed(2)}`
        );
    }
}

export function validateBalanceSheet(data: StandardBalanceSheet): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const BS = FinancialMetrics.BalanceSheet;
    const dataRecord = data as Record<string, number | undefined>;

    // 1. Validate Current Assets Total
    const calculatedCurrentAssets = sumByPrefix(
        dataRecord,
        '资产负债表-流动资产-',
        new Set([BS.TOTAL_CURRENT_ASSETS])
    );
    validateTotal(dataRecord, BS.TOTAL_CURRENT_ASSETS, calculatedCurrentAssets, errors);

    // 2. Validate Non-Current Assets Total
    const calculatedNonCurrentAssets = sumByPrefix(
        dataRecord,
        '资产负债表-非流动资产-',
        new Set([BS.TOTAL_NON_CURRENT_ASSETS])
    );
    validateTotal(dataRecord, BS.TOTAL_NON_CURRENT_ASSETS, calculatedNonCurrentAssets, errors);

    // 3. Validate Total Assets
    const calculatedTotalAssets = safeAdd(
        getNumberValue(dataRecord, BS.TOTAL_CURRENT_ASSETS),
        getNumberValue(dataRecord, BS.TOTAL_NON_CURRENT_ASSETS)
    );
    validateTotal(dataRecord, BS.TOTAL_ASSETS, calculatedTotalAssets, errors);

    // 4. Validate Current Liabilities Total
    const calculatedCurrentLiabilities = sumByPrefix(
        dataRecord,
        '资产负债表-流动负债-',
        new Set([BS.TOTAL_CURRENT_LIABILITIES])
    );
    validateTotal(dataRecord, BS.TOTAL_CURRENT_LIABILITIES, calculatedCurrentLiabilities, errors);

    // 5. Validate Non-Current Liabilities Total
    const calculatedNonCurrentLiabilities = sumByPrefix(
        dataRecord,
        '资产负债表-非流动负债-',
        new Set([BS.TOTAL_NON_CURRENT_LIABILITIES])
    );
    validateTotal(dataRecord, BS.TOTAL_NON_CURRENT_LIABILITIES, calculatedNonCurrentLiabilities, errors);

    // 6. Validate Total Liabilities
    const calculatedTotalLiabilities = safeAdd(
        getNumberValue(dataRecord, BS.TOTAL_CURRENT_LIABILITIES),
        getNumberValue(dataRecord, BS.TOTAL_NON_CURRENT_LIABILITIES)
    );
    validateTotal(dataRecord, BS.TOTAL_LIABILITIES, calculatedTotalLiabilities, errors);

    // 7. Validate Equity Attributable to Parent
    const equityExcludeKeys = new Set<string>([
        BS.TOTAL_EQUITY_ATTRIBUTABLE_TO_PARENT_COMPANY,
        BS.TOTAL_OWNERS_EQUITY,
        BS.MINORITY_INTERESTS,
        BS.LESS_TREASURY_STOCK,
    ]);
    const equityComponents = sumByPrefix(
        dataRecord,
        '资产负债表-所有者权益-',
        equityExcludeKeys
    );
    const calculatedEquityParent = safeAdd(
        equityComponents,
        -toNumber(dataRecord[BS.LESS_TREASURY_STOCK])
    );
    validateTotal(
        dataRecord,
        BS.TOTAL_EQUITY_ATTRIBUTABLE_TO_PARENT_COMPANY,
        calculatedEquityParent,
        errors
    );

    // 8. Validate Total Equity
    const calculatedTotalEquity = safeAdd(
        getNumberValue(dataRecord, BS.TOTAL_EQUITY_ATTRIBUTABLE_TO_PARENT_COMPANY),
        getNumberValue(dataRecord, BS.MINORITY_INTERESTS)
    );
    validateTotal(dataRecord, BS.TOTAL_OWNERS_EQUITY, calculatedTotalEquity, errors);

    // 9. Validate Liabilities and Equity Total (The Accounting Equation)
    const calculatedLiabilitiesAndEquity = safeAdd(
        getNumberValue(dataRecord, BS.TOTAL_LIABILITIES),
        getNumberValue(dataRecord, BS.TOTAL_OWNERS_EQUITY)
    );
    validateTotal(
        dataRecord,
        BS.TOTAL_LIABILITIES_AND_OWNERS_EQUITY,
        calculatedLiabilitiesAndEquity,
        errors
    );

    const reportedLiabilitiesAndEquity = getNumberValue(
        dataRecord,
        BS.TOTAL_LIABILITIES_AND_OWNERS_EQUITY
    );
    validateTotal(
        dataRecord,
        BS.TOTAL_ASSETS,
        reportedLiabilitiesAndEquity ?? 0,
        errors
    );

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

export function validateIncomeStatement(data: StandardIncomeStatement): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const IS = FinancialMetrics.IncomeStatement;
    const dataRecord = data as Record<string, number | undefined>;

    const revenueKeys = getKeysByPrefix('利润表-营业总收入-', new Set([IS.TOTAL_REVENUE]));
    const calculatedTotalRevenue = sumKeys(dataRecord, revenueKeys);
    const reportedTotalRevenue = getNumberValue(dataRecord, IS.TOTAL_REVENUE);
    validateTotal(dataRecord, IS.TOTAL_REVENUE, calculatedTotalRevenue, errors);

    const costKeys = getKeysByPrefix('利润表-营业总成本-', new Set([IS.TOTAL_OPERATING_COSTS]));
    const calculatedTotalCost = sumKeys(dataRecord, costKeys);
    const reportedTotalCost = getNumberValue(dataRecord, IS.TOTAL_OPERATING_COSTS);
    validateTotal(dataRecord, IS.TOTAL_OPERATING_COSTS, calculatedTotalCost, errors);

    // 3. Validate Operating Profit
    const calculatedOperatingProfit = safeAdd(
        reportedTotalRevenue,
        -(reportedTotalCost ?? 0),
        dataRecord[IS.ADD_OTHER_INCOME],
        dataRecord[IS.INVESTMENT_INCOME],
        dataRecord[IS.EXCHANGE_GAINS],
        dataRecord[IS.NET_EXPOSURE_HEDGING_GAINS],
        dataRecord[IS.FAIR_VALUE_CHANGE_INCOME],
        dataRecord[IS.CREDIT_IMPAIRMENT_LOSS],
        dataRecord[IS.ASSET_IMPAIRMENT_LOSS],
        dataRecord[IS.ASSET_DISPOSAL_INCOME]
    );
    validateTotal(dataRecord, IS.OPERATING_PROFIT, calculatedOperatingProfit, errors);

    // 4. Validate Total Profit
    const calculatedTotalProfit = safeAdd(
        getNumberValue(dataRecord, IS.OPERATING_PROFIT),
        dataRecord[IS.ADD_NON_OPERATING_INCOME],
        -(dataRecord[IS.LESS_NON_OPERATING_EXPENSES] ?? 0)
    );
    validateTotal(dataRecord, IS.TOTAL_PROFIT, calculatedTotalProfit, errors);

    // 5. Validate Net Profit
    const calculatedNetProfit = safeAdd(
        getNumberValue(dataRecord, IS.TOTAL_PROFIT),
        -(dataRecord[IS.LESS_INCOME_TAX_EXPENSES] ?? 0)
    );
    validateTotal(dataRecord, IS.NET_PROFIT, calculatedNetProfit, errors);

    const calculatedNetProfitByContinuing = safeAdd(
        dataRecord[IS.NET_PROFIT_CONTINUING],
        dataRecord[IS.NET_PROFIT_DISCONTINUED]
    );
    validateTotal(dataRecord, IS.NET_PROFIT, calculatedNetProfitByContinuing, errors);

    const calculatedNetProfitByOwnership = safeAdd(
        dataRecord[IS.NET_PROFIT_ATTRIBUTABLE_TO_PARENT_COMPANY],
        dataRecord[IS.MINORITY_INTERESTS_INCOME]
    );
    validateTotal(dataRecord, IS.NET_PROFIT, calculatedNetProfitByOwnership, errors);

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

export function validateCashFlow(data: StandardCashFlow): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const CF = FinancialMetrics.CashFlow;
    const dataRecord = data as Record<string, number | undefined>;

    // 1. Operating Activities
    const calculatedOperatingInflow = safeAdd(
        dataRecord[CF.CASH_RECEIVED_FROM_SALES_OF_GOODS_OR_RENDERING_OF_SERVICES],
        dataRecord[CF.NET_INCREASE_IN_DEPOSITS_FROM_CUSTOMERS_AND_INTERBANK],
        dataRecord[CF.NET_INCREASE_IN_BORROWINGS_FROM_CENTRAL_BANK],
        dataRecord[CF.NET_INCREASE_IN_BORROWINGS_FROM_OTHER_FINANCIAL_INSTITUTIONS],
        dataRecord[CF.CASH_RECEIVED_FROM_PREMIUMS_OF_ORIGINAL_INSURANCE_CONTRACTS],
        dataRecord[CF.NET_CASH_RECEIVED_FROM_REINSURANCE_BUSINESS],
        dataRecord[CF.NET_INCREASE_IN_INSURED_DEPOSITS_AND_INVESTMENT],
        dataRecord[CF.CASH_RECEIVED_FROM_INTEREST_FEES_AND_COMMISSIONS],
        dataRecord[CF.NET_INCREASE_IN_BORROWINGS_FROM_BANKS_AND_OTHER_FINANCIAL_INSTITUTIONS],
        dataRecord[CF.NET_INCREASE_IN_REPURCHASE_BUSINESS_FUNDS],
        dataRecord[CF.NET_CASH_RECEIVED_FROM_PROXY_TRADING_OF_SECURITIES],
        dataRecord[CF.REFUND_OF_TAXES_AND_SURCHARGES],
        dataRecord[CF.CASH_RECEIVED_RELATING_TO_OTHER_OPERATING_ACTIVITIES]
    );
    validateTotal(
        dataRecord,
        CF.SUBTOTAL_OF_CASH_INFLOWS_FROM_OPERATING_ACTIVITIES,
        calculatedOperatingInflow,
        errors
    );

    const calculatedOperatingOutflow = safeAdd(
        dataRecord[CF.CASH_PAID_FOR_GOODS_AND_SERVICES],
        dataRecord[CF.NET_INCREASE_IN_LOANS_AND_ADVANCES_TO_CUSTOMERS],
        dataRecord[CF.NET_INCREASE_IN_DEPOSITS_IN_CENTRAL_BANK_AND_INTERBANK],
        dataRecord[CF.CASH_PAID_FOR_ORIGINAL_INSURANCE_CONTRACT_CLAIMS],
        dataRecord[CF.NET_INCREASE_IN_LENDING_FUNDS],
        dataRecord[CF.CASH_PAID_FOR_INTEREST_FEES_AND_COMMISSIONS],
        dataRecord[CF.CASH_PAID_FOR_POLICY_DIVIDENDS],
        dataRecord[CF.CASH_PAID_TO_AND_ON_BEHALF_OF_EMPLOYEES],
        dataRecord[CF.PAYMENTS_OF_TAXES_AND_SURCHARGES],
        dataRecord[CF.CASH_PAID_RELATING_TO_OTHER_OPERATING_ACTIVITIES]
    );
    validateTotal(
        dataRecord,
        CF.SUBTOTAL_OF_CASH_OUTFLOWS_FROM_OPERATING_ACTIVITIES,
        calculatedOperatingOutflow,
        errors
    );

    const calculatedNetOperating = safeAdd(
        getNumberValue(dataRecord, CF.SUBTOTAL_OF_CASH_INFLOWS_FROM_OPERATING_ACTIVITIES),
        -(getNumberValue(dataRecord, CF.SUBTOTAL_OF_CASH_OUTFLOWS_FROM_OPERATING_ACTIVITIES) ?? 0)
    );
    validateTotal(dataRecord, CF.NET_CASH_FLOWS_FROM_OPERATING_ACTIVITIES, calculatedNetOperating, errors);

    // 2. Investing Activities
    const calculatedNetInvesting = safeAdd(
        getNumberValue(dataRecord, CF.SUBTOTAL_OF_CASH_INFLOWS_FROM_INVESTING_ACTIVITIES),
        -(getNumberValue(dataRecord, CF.SUBTOTAL_OF_CASH_OUTFLOWS_FROM_INVESTING_ACTIVITIES) ?? 0)
    );
    validateTotal(dataRecord, CF.NET_CASH_FLOWS_FROM_INVESTING_ACTIVITIES, calculatedNetInvesting, errors);

    const calculatedNetFinancing = safeAdd(
        getNumberValue(dataRecord, CF.SUBTOTAL_OF_CASH_INFLOWS_FROM_FINANCING_ACTIVITIES),
        -(getNumberValue(dataRecord, CF.SUBTOTAL_OF_CASH_OUTFLOWS_FROM_FINANCING_ACTIVITIES) ?? 0)
    );
    validateTotal(dataRecord, CF.NET_CASH_FLOWS_FROM_FINANCING_ACTIVITIES, calculatedNetFinancing, errors);

    // 3. Final Check
    const calculatedNetIncrease = safeAdd(
        getNumberValue(dataRecord, CF.NET_CASH_FLOWS_FROM_OPERATING_ACTIVITIES),
        getNumberValue(dataRecord, CF.NET_CASH_FLOWS_FROM_INVESTING_ACTIVITIES),
        getNumberValue(dataRecord, CF.NET_CASH_FLOWS_FROM_FINANCING_ACTIVITIES),
        dataRecord[CF.EFFECT_OF_FOREIGN_EXCHANGE_RATE_CHANGES_ON_CASH_AND_CASH_EQUIVALENTS]
    );
    validateTotal(dataRecord, CF.NET_INCREASE_IN_CASH_AND_CASH_EQUIVALENTS, calculatedNetIncrease, errors);

    const calculatedEndBalance = safeAdd(
        getNumberValue(dataRecord, CF.NET_INCREASE_IN_CASH_AND_CASH_EQUIVALENTS),
        dataRecord[CF.ADD_CASH_AND_CASH_EQUIVALENTS_AT_BEGINNING_OF_PERIOD]
    );
    validateTotal(dataRecord, CF.CASH_AND_CASH_EQUIVALENTS_AT_END_OF_PERIOD, calculatedEndBalance, errors);

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}
