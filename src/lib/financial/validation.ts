import {
    StandardBalanceSheet,
    StandardIncomeStatement,
    StandardCashFlow
} from './schema';
import { FinancialMetrics } from './metric-names';

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
}

const TOLERANCE = 1.0; // Tolerance for floating point comparisons (e.g. 1.0 Yuan)

function isApproximatelyEqual(a: number, b: number): boolean {
    return Math.abs(a - b) <= TOLERANCE;
}

function safeAdd(...numbers: (number | undefined)[]): number {
    return numbers.reduce((sum, n) => (sum || 0) + (n || 0), 0) || 0;
}

export function validateBalanceSheet(data: StandardBalanceSheet): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const BS = FinancialMetrics.BalanceSheet;

    // 1. Validate Current Assets Total
    // 流动资产合计 = 货币资金 + ... + 其他流动资产
    const calculatedCurrentAssets = safeAdd(
        data[BS.MONETARY_FUNDS],
        data[BS.SETTLEMENT_PROVISIONS],
        data[BS.LENDING_FUNDS],
        data[BS.TRADING_FINANCIAL_ASSETS],
        data[BS.DERIVATIVE_FINANCIAL_ASSETS],
        data[BS.NOTES_RECEIVABLE],
        data[BS.ACCOUNTS_RECEIVABLE],
        data[BS.RECEIVABLES_FINANCING],
        data[BS.PREPAYMENTS],
        data[BS.PREMIUMS_RECEIVABLE],
        data[BS.REINSURANCE_ACCOUNTS_RECEIVABLE],
        data[BS.REINSURANCE_CONTRACT_RESERVES_RECEIVABLE],
        data[BS.OTHER_RECEIVABLES],
        data[BS.BUYING_BACK_FINANCIAL_ASSETS],
        data[BS.INVENTORY],
        data[BS.CONTRACT_ASSETS],
        data[BS.ASSETS_HELD_FOR_SALE],
        data[BS.NON_CURRENT_ASSETS_DUE_WITHIN_ONE_YEAR],
        data[BS.OTHER_CURRENT_ASSETS]
    );

    if (!isApproximatelyEqual(data[BS.TOTAL_CURRENT_ASSETS], calculatedCurrentAssets)) {
        errors.push(`${BS.TOTAL_CURRENT_ASSETS}不平衡: 报表值=${data[BS.TOTAL_CURRENT_ASSETS]}, 计算值=${calculatedCurrentAssets}, 差额=${(data[BS.TOTAL_CURRENT_ASSETS] - calculatedCurrentAssets).toFixed(2)}`);
    }

    // 2. Validate Non-Current Assets Total
    const calculatedNonCurrentAssets = safeAdd(
        data[BS.LOANS_AND_ADVANCES],
        data[BS.DEBT_INVESTMENT],
        data[BS.OTHER_DEBT_INVESTMENT],
        data[BS.LONG_TERM_RECEIVABLES],
        data[BS.LONG_TERM_EQUITY_INVESTMENT],
        data[BS.OTHER_EQUITY_INSTRUMENT_INVESTMENT],
        data[BS.OTHER_NON_CURRENT_FINANCIAL_ASSETS],
        data[BS.INVESTMENT_PROPERTY],
        data[BS.FIXED_ASSETS],
        data[BS.CONSTRUCTION_IN_PROGRESS],
        data[BS.PRODUCTIVE_BIOLOGICAL_ASSETS],
        data[BS.OIL_AND_GAS_ASSETS],
        data[BS.RIGHT_OF_USE_ASSETS],
        data[BS.INTANGIBLE_ASSETS],
        data[BS.DEVELOPMENT_EXPENDITURE],
        data[BS.GOODWILL],
        data[BS.LONG_TERM_DEFERRED_EXPENSES],
        data[BS.DEFERRED_TAX_ASSETS],
        data[BS.OTHER_NON_CURRENT_ASSETS]
    );

    if (!isApproximatelyEqual(data[BS.TOTAL_NON_CURRENT_ASSETS], calculatedNonCurrentAssets)) {
        errors.push(`${BS.TOTAL_NON_CURRENT_ASSETS}不平衡: 报表值=${data[BS.TOTAL_NON_CURRENT_ASSETS]}, 计算值=${calculatedNonCurrentAssets}, 差额=${(data[BS.TOTAL_NON_CURRENT_ASSETS] - calculatedNonCurrentAssets).toFixed(2)}`);
    }

    // 3. Validate Total Assets
    const calculatedTotalAssets = safeAdd(data[BS.TOTAL_CURRENT_ASSETS], data[BS.TOTAL_NON_CURRENT_ASSETS]);
    if (!isApproximatelyEqual(data[BS.TOTAL_ASSETS], calculatedTotalAssets)) {
        errors.push(`${BS.TOTAL_ASSETS}不平衡: 报表值=${data[BS.TOTAL_ASSETS]}, 计算值=${calculatedTotalAssets}, 差额=${(data[BS.TOTAL_ASSETS] - calculatedTotalAssets).toFixed(2)}`);
    }

    // 4. Validate Current Liabilities Total
    const calculatedCurrentLiabilities = safeAdd(
        data[BS.SHORT_TERM_BORROWINGS],
        data[BS.BORROWINGS_FROM_CENTRAL_BANK],
        data[BS.TAKING_FROM_BANKS_AND_OTHER_FINANCIAL_INSTITUTIONS],
        data[BS.TRADING_FINANCIAL_LIABILITIES],
        data[BS.DERIVATIVE_FINANCIAL_LIABILITIES],
        data[BS.NOTES_PAYABLE],
        data[BS.ACCOUNTS_PAYABLE],
        data[BS.ADVANCE_RECEIPTS],
        data[BS.CONTRACT_LIABILITIES],
        data[BS.FINANCIAL_ASSETS_SOLD_FOR_REPURCHASE],
        data[BS.DEPOSITS_FROM_CUSTOMERS_AND_INTERBANK],
        data[BS.PROXY_TRADING_SECURITIES],
        data[BS.PROXY_UNDERWRITING_SECURITIES],
        data[BS.EMPLOYEE_BENEFITS_PAYABLE],
        data[BS.TAXES_PAYABLE],
        data[BS.OTHER_PAYABLES],
        data[BS.FEES_AND_COMMISSIONS_PAYABLE],
        data[BS.REINSURANCE_ACCOUNTS_PAYABLE],
        data[BS.LIABILITIES_HELD_FOR_SALE],
        data[BS.NON_CURRENT_LIABILITIES_DUE_WITHIN_ONE_YEAR],
        data[BS.OTHER_CURRENT_LIABILITIES]
    );

    if (!isApproximatelyEqual(data[BS.TOTAL_CURRENT_LIABILITIES], calculatedCurrentLiabilities)) {
        errors.push(`${BS.TOTAL_CURRENT_LIABILITIES}不平衡: 报表值=${data[BS.TOTAL_CURRENT_LIABILITIES]}, 计算值=${calculatedCurrentLiabilities}, 差额=${(data[BS.TOTAL_CURRENT_LIABILITIES] - calculatedCurrentLiabilities).toFixed(2)}`);
    }

    // 5. Validate Non-Current Liabilities Total
    const calculatedNonCurrentLiabilities = safeAdd(
        data[BS.INSURANCE_CONTRACT_RESERVES],
        data[BS.LONG_TERM_BORROWINGS],
        data[BS.BONDS_PAYABLE],
        data[BS.LEASE_LIABILITIES],
        data[BS.LONG_TERM_PAYABLES],
        data[BS.LONG_TERM_EMPLOYEE_BENEFITS_PAYABLE],
        data[BS.PROVISIONS],
        data[BS.DEFERRED_INCOME],
        data[BS.DEFERRED_TAX_LIABILITIES],
        data[BS.OTHER_NON_CURRENT_LIABILITIES]
    );

    if (!isApproximatelyEqual(data[BS.TOTAL_NON_CURRENT_LIABILITIES], calculatedNonCurrentLiabilities)) {
        errors.push(`${BS.TOTAL_NON_CURRENT_LIABILITIES}不平衡: 报表值=${data[BS.TOTAL_NON_CURRENT_LIABILITIES]}, 计算值=${calculatedNonCurrentLiabilities}, 差额=${(data[BS.TOTAL_NON_CURRENT_LIABILITIES] - calculatedNonCurrentLiabilities).toFixed(2)}`);
    }

    // 6. Validate Total Liabilities
    const calculatedTotalLiabilities = safeAdd(data[BS.TOTAL_CURRENT_LIABILITIES], data[BS.TOTAL_NON_CURRENT_LIABILITIES]);
    if (!isApproximatelyEqual(data[BS.TOTAL_LIABILITIES], calculatedTotalLiabilities)) {
        errors.push(`${BS.TOTAL_LIABILITIES}不平衡: 报表值=${data[BS.TOTAL_LIABILITIES]}, 计算值=${calculatedTotalLiabilities}, 差额=${(data[BS.TOTAL_LIABILITIES] - calculatedTotalLiabilities).toFixed(2)}`);
    }

    // 7. Validate Equity Attributable to Parent
    const calculatedEquityParent = safeAdd(
        data[BS.PAID_IN_CAPITAL],
        data[BS.OTHER_EQUITY_INSTRUMENTS],
        data[BS.CAPITAL_RESERVE],
        -(data[BS.LESS_TREASURY_STOCK] || 0), // Subtract treasury stocks
        data[BS.OTHER_COMPREHENSIVE_INCOME],
        data[BS.SPECIAL_RESERVE],
        data[BS.SURPLUS_RESERVE],
        data[BS.GENERAL_RISK_RESERVE],
        data[BS.UNDISTRIBUTED_PROFITS]
    );

    if (!isApproximatelyEqual(data[BS.TOTAL_EQUITY_ATTRIBUTABLE_TO_PARENT_COMPANY], calculatedEquityParent)) {
        errors.push(`${BS.TOTAL_EQUITY_ATTRIBUTABLE_TO_PARENT_COMPANY}不平衡: 报表值=${data[BS.TOTAL_EQUITY_ATTRIBUTABLE_TO_PARENT_COMPANY]}, 计算值=${calculatedEquityParent}, 差额=${(data[BS.TOTAL_EQUITY_ATTRIBUTABLE_TO_PARENT_COMPANY] - calculatedEquityParent).toFixed(2)}`);
    }

    // 8. Validate Total Equity
    const calculatedTotalEquity = safeAdd(data[BS.TOTAL_EQUITY_ATTRIBUTABLE_TO_PARENT_COMPANY], data[BS.MINORITY_INTERESTS]);
    if (!isApproximatelyEqual(data[BS.TOTAL_OWNERS_EQUITY], calculatedTotalEquity)) {
        errors.push(`${BS.TOTAL_OWNERS_EQUITY}不平衡: 报表值=${data[BS.TOTAL_OWNERS_EQUITY]}, 计算值=${calculatedTotalEquity}, 差额=${(data[BS.TOTAL_OWNERS_EQUITY] - calculatedTotalEquity).toFixed(2)}`);
    }

    // 9. Validate Liabilities and Equity Total (The Accounting Equation)
    const calculatedLiabilitiesAndEquity = safeAdd(data[BS.TOTAL_LIABILITIES], data[BS.TOTAL_OWNERS_EQUITY]);
    if (!isApproximatelyEqual(data[BS.TOTAL_LIABILITIES_AND_OWNERS_EQUITY], calculatedLiabilitiesAndEquity)) {
        errors.push(`${BS.TOTAL_LIABILITIES_AND_OWNERS_EQUITY}不平衡: 报表值=${data[BS.TOTAL_LIABILITIES_AND_OWNERS_EQUITY]}, 计算值=${calculatedLiabilitiesAndEquity}, 差额=${(data[BS.TOTAL_LIABILITIES_AND_OWNERS_EQUITY] - calculatedLiabilitiesAndEquity).toFixed(2)}`);
    }

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

    // 1. Validate Operating Revenue (Total)
    const calculatedTotalRevenue = safeAdd(
        data[IS.REVENUE],
        data[IS.INTEREST_INCOME],
        data[IS.EARNED_PREMIUMS],
        data[IS.FEE_AND_COMMISSION_INCOME]
    );
    // Note: Sometimes "Total Revenue" is just "Revenue", so we check if components exist before enforcing sum
    if (data[IS.REVENUE] && !isApproximatelyEqual(data[IS.TOTAL_REVENUE], calculatedTotalRevenue)) {
        // Only warn here because sometimes simplified reports don't list all components
        warnings.push(`${IS.TOTAL_REVENUE}与分项之和可能有差异: 报表值=${data[IS.TOTAL_REVENUE]}, 计算值=${calculatedTotalRevenue}`);
    }

    // 2. Validate Operating Cost (Total)
    const calculatedTotalCost = safeAdd(
        data[IS.OPERATING_COSTS],
        data[IS.INTEREST_EXPENSES],
        data[IS.FEE_AND_COMMISSION_EXPENSES],
        data[IS.SURRENDER_VALUE],
        data[IS.NET_PAYMENTS_FOR_INSURANCE_CLAIMS],
        data[IS.NET_PROVISION_FOR_INSURANCE_CONTRACTS],
        data[IS.POLICY_DIVIDEND_EXPENSES],
        data[IS.REINSURANCE_EXPENSES],
        data[IS.TAXES_AND_SURCHARGES],
        data[IS.SELLING_EXPENSES],
        data[IS.ADMINISTRATIVE_EXPENSES],
        data[IS.R_AND_D_EXPENSES],
        data[IS.FINANCIAL_EXPENSES]
    );

    if (data[IS.OPERATING_COSTS] && !isApproximatelyEqual(data[IS.TOTAL_OPERATING_COSTS], calculatedTotalCost)) {
        warnings.push(`${IS.TOTAL_OPERATING_COSTS}与分项之和可能有差异: 报表值=${data[IS.TOTAL_OPERATING_COSTS]}, 计算值=${calculatedTotalCost}`);
    }

    // 3. Validate Operating Profit
    // 营业利润 = 营业总收入 - 营业总成本 + 其他收益 + 投资收益 + 汇兑收益 + 净敞口套期收益 + 公允价值变动收益 + 信用减值损失 + 资产减值损失 + 资产处置收益
    const calculatedOperatingProfit = safeAdd(
        data[IS.TOTAL_REVENUE],
        -data[IS.TOTAL_OPERATING_COSTS],
        data[IS.ADD_OTHER_INCOME],
        data[IS.INVESTMENT_INCOME],
        data[IS.EXCHANGE_GAINS],
        data[IS.NET_EXPOSURE_HEDGING_GAINS],
        data[IS.FAIR_VALUE_CHANGE_INCOME],
        data[IS.CREDIT_IMPAIRMENT_LOSS],
        data[IS.ASSET_IMPAIRMENT_LOSS],
        data[IS.ASSET_DISPOSAL_INCOME]
    );

    if (!isApproximatelyEqual(data[IS.OPERATING_PROFIT], calculatedOperatingProfit)) {
        errors.push(`${IS.OPERATING_PROFIT}不平衡: 报表值=${data[IS.OPERATING_PROFIT]}, 计算值=${calculatedOperatingProfit}, 差额=${(data[IS.OPERATING_PROFIT] - calculatedOperatingProfit).toFixed(2)}`);
    }

    // 4. Validate Total Profit
    const calculatedTotalProfit = safeAdd(
        data[IS.OPERATING_PROFIT],
        data[IS.ADD_NON_OPERATING_INCOME],
        -(data[IS.LESS_NON_OPERATING_EXPENSES] || 0)
    );

    if (!isApproximatelyEqual(data[IS.TOTAL_PROFIT], calculatedTotalProfit)) {
        errors.push(`${IS.TOTAL_PROFIT}不平衡: 报表值=${data[IS.TOTAL_PROFIT]}, 计算值=${calculatedTotalProfit}, 差额=${(data[IS.TOTAL_PROFIT] - calculatedTotalProfit).toFixed(2)}`);
    }

    // 5. Validate Net Profit
    const calculatedNetProfit = safeAdd(data[IS.TOTAL_PROFIT], -(data[IS.LESS_INCOME_TAX_EXPENSES] || 0));
    if (!isApproximatelyEqual(data[IS.NET_PROFIT], calculatedNetProfit)) {
        errors.push(`${IS.NET_PROFIT}不平衡: 报表值=${data[IS.NET_PROFIT]}, 计算值=${calculatedNetProfit}, 差额=${(data[IS.NET_PROFIT] - calculatedNetProfit).toFixed(2)}`);
    }

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

    // 1. Operating Activities
    const calculatedOperatingInflow = safeAdd(
        data[CF.CASH_RECEIVED_FROM_SALES_OF_GOODS_OR_RENDERING_OF_SERVICES],
        data[CF.NET_INCREASE_IN_DEPOSITS_FROM_CUSTOMERS_AND_INTERBANK],
        data[CF.NET_INCREASE_IN_BORROWINGS_FROM_CENTRAL_BANK],
        data[CF.NET_INCREASE_IN_BORROWINGS_FROM_OTHER_FINANCIAL_INSTITUTIONS],
        data[CF.CASH_RECEIVED_FROM_PREMIUMS_OF_ORIGINAL_INSURANCE_CONTRACTS],
        data[CF.NET_CASH_RECEIVED_FROM_REINSURANCE_BUSINESS],
        data[CF.NET_INCREASE_IN_INSURED_DEPOSITS_AND_INVESTMENT],
        data[CF.CASH_RECEIVED_FROM_INTEREST_FEES_AND_COMMISSIONS],
        data[CF.NET_INCREASE_IN_BORROWINGS_FROM_BANKS_AND_OTHER_FINANCIAL_INSTITUTIONS],
        data[CF.NET_INCREASE_IN_REPURCHASE_BUSINESS_FUNDS],
        data[CF.NET_CASH_RECEIVED_FROM_PROXY_TRADING_OF_SECURITIES],
        data[CF.REFUND_OF_TAXES_AND_SURCHARGES],
        data[CF.CASH_RECEIVED_RELATING_TO_OTHER_OPERATING_ACTIVITIES]
    );
    if (!isApproximatelyEqual(data[CF.SUBTOTAL_OF_CASH_INFLOWS_FROM_OPERATING_ACTIVITIES], calculatedOperatingInflow)) {
        errors.push(`${CF.SUBTOTAL_OF_CASH_INFLOWS_FROM_OPERATING_ACTIVITIES}不平衡`);
    }

    const calculatedOperatingOutflow = safeAdd(
        data[CF.CASH_PAID_FOR_GOODS_AND_SERVICES],
        data[CF.NET_INCREASE_IN_LOANS_AND_ADVANCES_TO_CUSTOMERS],
        data[CF.NET_INCREASE_IN_DEPOSITS_IN_CENTRAL_BANK_AND_INTERBANK],
        data[CF.CASH_PAID_FOR_ORIGINAL_INSURANCE_CONTRACT_CLAIMS],
        data[CF.NET_INCREASE_IN_LENDING_FUNDS],
        data[CF.CASH_PAID_FOR_INTEREST_FEES_AND_COMMISSIONS],
        data[CF.CASH_PAID_FOR_POLICY_DIVIDENDS],
        data[CF.CASH_PAID_TO_AND_ON_BEHALF_OF_EMPLOYEES],
        data[CF.PAYMENTS_OF_TAXES_AND_SURCHARGES],
        data[CF.CASH_PAID_RELATING_TO_OTHER_OPERATING_ACTIVITIES]
    );
    if (!isApproximatelyEqual(data[CF.SUBTOTAL_OF_CASH_OUTFLOWS_FROM_OPERATING_ACTIVITIES], calculatedOperatingOutflow)) {
        errors.push(`${CF.SUBTOTAL_OF_CASH_OUTFLOWS_FROM_OPERATING_ACTIVITIES}不平衡`);
    }

    const calculatedNetOperating = safeAdd(data[CF.SUBTOTAL_OF_CASH_INFLOWS_FROM_OPERATING_ACTIVITIES], -data[CF.SUBTOTAL_OF_CASH_OUTFLOWS_FROM_OPERATING_ACTIVITIES]);
    if (!isApproximatelyEqual(data[CF.NET_CASH_FLOWS_FROM_OPERATING_ACTIVITIES], calculatedNetOperating)) {
        errors.push(`${CF.NET_CASH_FLOWS_FROM_OPERATING_ACTIVITIES}不平衡`);
    }

    // 2. Investing Activities
    const calculatedNetInvesting = safeAdd(data[CF.SUBTOTAL_OF_CASH_INFLOWS_FROM_INVESTING_ACTIVITIES], -data[CF.SUBTOTAL_OF_CASH_OUTFLOWS_FROM_INVESTING_ACTIVITIES]);
    if (!isApproximatelyEqual(data[CF.NET_CASH_FLOWS_FROM_INVESTING_ACTIVITIES], calculatedNetInvesting)) {
        errors.push(`${CF.NET_CASH_FLOWS_FROM_INVESTING_ACTIVITIES}不平衡`);
    }

    const calculatedNetFinancing = safeAdd(data[CF.SUBTOTAL_OF_CASH_INFLOWS_FROM_FINANCING_ACTIVITIES], -data[CF.SUBTOTAL_OF_CASH_OUTFLOWS_FROM_FINANCING_ACTIVITIES]);
    if (!isApproximatelyEqual(data[CF.NET_CASH_FLOWS_FROM_FINANCING_ACTIVITIES], calculatedNetFinancing)) {
        errors.push(`${CF.NET_CASH_FLOWS_FROM_FINANCING_ACTIVITIES}不平衡`);
    }

    // 3. Final Check
    const calculatedNetIncrease = safeAdd(
        data[CF.NET_CASH_FLOWS_FROM_OPERATING_ACTIVITIES],
        data[CF.NET_CASH_FLOWS_FROM_INVESTING_ACTIVITIES],
        data[CF.NET_CASH_FLOWS_FROM_FINANCING_ACTIVITIES],
        data[CF.EFFECT_OF_FOREIGN_EXCHANGE_RATE_CHANGES_ON_CASH_AND_CASH_EQUIVALENTS]
    );
    if (!isApproximatelyEqual(data[CF.NET_INCREASE_IN_CASH_AND_CASH_EQUIVALENTS], calculatedNetIncrease)) {
        errors.push(`${CF.NET_INCREASE_IN_CASH_AND_CASH_EQUIVALENTS}不平衡`);
    }

    const calculatedEndBalance = safeAdd(data[CF.NET_INCREASE_IN_CASH_AND_CASH_EQUIVALENTS], data[CF.ADD_CASH_AND_CASH_EQUIVALENTS_AT_BEGINNING_OF_PERIOD]);
    if (!isApproximatelyEqual(data[CF.CASH_AND_CASH_EQUIVALENTS_AT_END_OF_PERIOD], calculatedEndBalance)) {
        errors.push(`${CF.CASH_AND_CASH_EQUIVALENTS_AT_END_OF_PERIOD}不平衡`);
    }

    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}
