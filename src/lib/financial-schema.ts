import { z } from 'zod';
import { FinancialMetrics } from './financial-metric-names';

// ============================================================================
// 1. Balance Sheet Schema (资产负债表)
// ============================================================================

export const BalanceSheetSchema = z.object({
    // --- 流动资产 ---
    [FinancialMetrics.BalanceSheet.MONETARY_FUNDS]: z.number().describe(FinancialMetrics.BalanceSheet.MONETARY_FUNDS),
    [FinancialMetrics.BalanceSheet.SETTLEMENT_PROVISIONS]: z.number().optional().describe(FinancialMetrics.BalanceSheet.SETTLEMENT_PROVISIONS),
    [FinancialMetrics.BalanceSheet.LENDING_FUNDS]: z.number().optional().describe(FinancialMetrics.BalanceSheet.LENDING_FUNDS),
    [FinancialMetrics.BalanceSheet.TRADING_FINANCIAL_ASSETS]: z.number().optional().describe(FinancialMetrics.BalanceSheet.TRADING_FINANCIAL_ASSETS),
    [FinancialMetrics.BalanceSheet.DERIVATIVE_FINANCIAL_ASSETS]: z.number().optional().describe(FinancialMetrics.BalanceSheet.DERIVATIVE_FINANCIAL_ASSETS),
    [FinancialMetrics.BalanceSheet.NOTES_RECEIVABLE]: z.number().optional().describe(FinancialMetrics.BalanceSheet.NOTES_RECEIVABLE),
    [FinancialMetrics.BalanceSheet.ACCOUNTS_RECEIVABLE]: z.number().optional().describe(FinancialMetrics.BalanceSheet.ACCOUNTS_RECEIVABLE),
    [FinancialMetrics.BalanceSheet.RECEIVABLES_FINANCING]: z.number().optional().describe(FinancialMetrics.BalanceSheet.RECEIVABLES_FINANCING),
    [FinancialMetrics.BalanceSheet.PREPAYMENTS]: z.number().optional().describe(FinancialMetrics.BalanceSheet.PREPAYMENTS),
    [FinancialMetrics.BalanceSheet.PREMIUMS_RECEIVABLE]: z.number().optional().describe(FinancialMetrics.BalanceSheet.PREMIUMS_RECEIVABLE),
    [FinancialMetrics.BalanceSheet.REINSURANCE_ACCOUNTS_RECEIVABLE]: z.number().optional().describe(FinancialMetrics.BalanceSheet.REINSURANCE_ACCOUNTS_RECEIVABLE),
    [FinancialMetrics.BalanceSheet.REINSURANCE_CONTRACT_RESERVES_RECEIVABLE]: z.number().optional().describe(FinancialMetrics.BalanceSheet.REINSURANCE_CONTRACT_RESERVES_RECEIVABLE),
    [FinancialMetrics.BalanceSheet.OTHER_RECEIVABLES]: z.number().optional().describe(FinancialMetrics.BalanceSheet.OTHER_RECEIVABLES),
    [FinancialMetrics.BalanceSheet.BUYING_BACK_FINANCIAL_ASSETS]: z.number().optional().describe(FinancialMetrics.BalanceSheet.BUYING_BACK_FINANCIAL_ASSETS),
    [FinancialMetrics.BalanceSheet.INVENTORY]: z.number().optional().describe(FinancialMetrics.BalanceSheet.INVENTORY),
    [FinancialMetrics.BalanceSheet.CONTRACT_ASSETS]: z.number().optional().describe(FinancialMetrics.BalanceSheet.CONTRACT_ASSETS),
    [FinancialMetrics.BalanceSheet.ASSETS_HELD_FOR_SALE]: z.number().optional().describe(FinancialMetrics.BalanceSheet.ASSETS_HELD_FOR_SALE),
    [FinancialMetrics.BalanceSheet.NON_CURRENT_ASSETS_DUE_WITHIN_ONE_YEAR]: z.number().optional().describe(FinancialMetrics.BalanceSheet.NON_CURRENT_ASSETS_DUE_WITHIN_ONE_YEAR),
    [FinancialMetrics.BalanceSheet.OTHER_CURRENT_ASSETS]: z.number().optional().describe(FinancialMetrics.BalanceSheet.OTHER_CURRENT_ASSETS),

    [FinancialMetrics.BalanceSheet.TOTAL_CURRENT_ASSETS]: z.number().describe(FinancialMetrics.BalanceSheet.TOTAL_CURRENT_ASSETS),

    // --- 非流动资产 ---
    [FinancialMetrics.BalanceSheet.LOANS_AND_ADVANCES]: z.number().optional().describe(FinancialMetrics.BalanceSheet.LOANS_AND_ADVANCES),
    [FinancialMetrics.BalanceSheet.DEBT_INVESTMENT]: z.number().optional().describe(FinancialMetrics.BalanceSheet.DEBT_INVESTMENT),
    [FinancialMetrics.BalanceSheet.OTHER_DEBT_INVESTMENT]: z.number().optional().describe(FinancialMetrics.BalanceSheet.OTHER_DEBT_INVESTMENT),
    [FinancialMetrics.BalanceSheet.LONG_TERM_RECEIVABLES]: z.number().optional().describe(FinancialMetrics.BalanceSheet.LONG_TERM_RECEIVABLES),
    [FinancialMetrics.BalanceSheet.LONG_TERM_EQUITY_INVESTMENT]: z.number().optional().describe(FinancialMetrics.BalanceSheet.LONG_TERM_EQUITY_INVESTMENT),
    [FinancialMetrics.BalanceSheet.OTHER_EQUITY_INSTRUMENT_INVESTMENT]: z.number().optional().describe(FinancialMetrics.BalanceSheet.OTHER_EQUITY_INSTRUMENT_INVESTMENT),
    [FinancialMetrics.BalanceSheet.OTHER_NON_CURRENT_FINANCIAL_ASSETS]: z.number().optional().describe(FinancialMetrics.BalanceSheet.OTHER_NON_CURRENT_FINANCIAL_ASSETS),
    [FinancialMetrics.BalanceSheet.INVESTMENT_PROPERTY]: z.number().optional().describe(FinancialMetrics.BalanceSheet.INVESTMENT_PROPERTY),
    [FinancialMetrics.BalanceSheet.FIXED_ASSETS]: z.number().optional().describe(FinancialMetrics.BalanceSheet.FIXED_ASSETS),
    [FinancialMetrics.BalanceSheet.CONSTRUCTION_IN_PROGRESS]: z.number().optional().describe(FinancialMetrics.BalanceSheet.CONSTRUCTION_IN_PROGRESS),
    [FinancialMetrics.BalanceSheet.PRODUCTIVE_BIOLOGICAL_ASSETS]: z.number().optional().describe(FinancialMetrics.BalanceSheet.PRODUCTIVE_BIOLOGICAL_ASSETS),
    [FinancialMetrics.BalanceSheet.OIL_AND_GAS_ASSETS]: z.number().optional().describe(FinancialMetrics.BalanceSheet.OIL_AND_GAS_ASSETS),
    [FinancialMetrics.BalanceSheet.RIGHT_OF_USE_ASSETS]: z.number().optional().describe(FinancialMetrics.BalanceSheet.RIGHT_OF_USE_ASSETS),
    [FinancialMetrics.BalanceSheet.INTANGIBLE_ASSETS]: z.number().optional().describe(FinancialMetrics.BalanceSheet.INTANGIBLE_ASSETS),
    [FinancialMetrics.BalanceSheet.DEVELOPMENT_EXPENDITURE]: z.number().optional().describe(FinancialMetrics.BalanceSheet.DEVELOPMENT_EXPENDITURE),
    [FinancialMetrics.BalanceSheet.GOODWILL]: z.number().optional().describe(FinancialMetrics.BalanceSheet.GOODWILL),
    [FinancialMetrics.BalanceSheet.LONG_TERM_DEFERRED_EXPENSES]: z.number().optional().describe(FinancialMetrics.BalanceSheet.LONG_TERM_DEFERRED_EXPENSES),
    [FinancialMetrics.BalanceSheet.DEFERRED_TAX_ASSETS]: z.number().optional().describe(FinancialMetrics.BalanceSheet.DEFERRED_TAX_ASSETS),
    [FinancialMetrics.BalanceSheet.OTHER_NON_CURRENT_ASSETS]: z.number().optional().describe(FinancialMetrics.BalanceSheet.OTHER_NON_CURRENT_ASSETS),

    [FinancialMetrics.BalanceSheet.TOTAL_NON_CURRENT_ASSETS]: z.number().describe(FinancialMetrics.BalanceSheet.TOTAL_NON_CURRENT_ASSETS),

    [FinancialMetrics.BalanceSheet.TOTAL_ASSETS]: z.number().describe(FinancialMetrics.BalanceSheet.TOTAL_ASSETS),

    // --- 流动负债 ---
    [FinancialMetrics.BalanceSheet.SHORT_TERM_BORROWINGS]: z.number().optional().describe(FinancialMetrics.BalanceSheet.SHORT_TERM_BORROWINGS),
    [FinancialMetrics.BalanceSheet.BORROWINGS_FROM_CENTRAL_BANK]: z.number().optional().describe(FinancialMetrics.BalanceSheet.BORROWINGS_FROM_CENTRAL_BANK),
    [FinancialMetrics.BalanceSheet.TAKING_FROM_BANKS_AND_OTHER_FINANCIAL_INSTITUTIONS]: z.number().optional().describe(FinancialMetrics.BalanceSheet.TAKING_FROM_BANKS_AND_OTHER_FINANCIAL_INSTITUTIONS),
    [FinancialMetrics.BalanceSheet.TRADING_FINANCIAL_LIABILITIES]: z.number().optional().describe(FinancialMetrics.BalanceSheet.TRADING_FINANCIAL_LIABILITIES),
    [FinancialMetrics.BalanceSheet.DERIVATIVE_FINANCIAL_LIABILITIES]: z.number().optional().describe(FinancialMetrics.BalanceSheet.DERIVATIVE_FINANCIAL_LIABILITIES),
    [FinancialMetrics.BalanceSheet.NOTES_PAYABLE]: z.number().optional().describe(FinancialMetrics.BalanceSheet.NOTES_PAYABLE),
    [FinancialMetrics.BalanceSheet.ACCOUNTS_PAYABLE]: z.number().optional().describe(FinancialMetrics.BalanceSheet.ACCOUNTS_PAYABLE),
    [FinancialMetrics.BalanceSheet.ADVANCE_RECEIPTS]: z.number().optional().describe(FinancialMetrics.BalanceSheet.ADVANCE_RECEIPTS),
    [FinancialMetrics.BalanceSheet.CONTRACT_LIABILITIES]: z.number().optional().describe(FinancialMetrics.BalanceSheet.CONTRACT_LIABILITIES),
    [FinancialMetrics.BalanceSheet.FINANCIAL_ASSETS_SOLD_FOR_REPURCHASE]: z.number().optional().describe(FinancialMetrics.BalanceSheet.FINANCIAL_ASSETS_SOLD_FOR_REPURCHASE),
    [FinancialMetrics.BalanceSheet.DEPOSITS_FROM_CUSTOMERS_AND_INTERBANK]: z.number().optional().describe(FinancialMetrics.BalanceSheet.DEPOSITS_FROM_CUSTOMERS_AND_INTERBANK),
    [FinancialMetrics.BalanceSheet.PROXY_TRADING_SECURITIES]: z.number().optional().describe(FinancialMetrics.BalanceSheet.PROXY_TRADING_SECURITIES),
    [FinancialMetrics.BalanceSheet.PROXY_UNDERWRITING_SECURITIES]: z.number().optional().describe(FinancialMetrics.BalanceSheet.PROXY_UNDERWRITING_SECURITIES),
    [FinancialMetrics.BalanceSheet.EMPLOYEE_BENEFITS_PAYABLE]: z.number().optional().describe(FinancialMetrics.BalanceSheet.EMPLOYEE_BENEFITS_PAYABLE),
    [FinancialMetrics.BalanceSheet.TAXES_PAYABLE]: z.number().optional().describe(FinancialMetrics.BalanceSheet.TAXES_PAYABLE),
    [FinancialMetrics.BalanceSheet.OTHER_PAYABLES]: z.number().optional().describe(FinancialMetrics.BalanceSheet.OTHER_PAYABLES),
    [FinancialMetrics.BalanceSheet.FEES_AND_COMMISSIONS_PAYABLE]: z.number().optional().describe(FinancialMetrics.BalanceSheet.FEES_AND_COMMISSIONS_PAYABLE),
    [FinancialMetrics.BalanceSheet.REINSURANCE_ACCOUNTS_PAYABLE]: z.number().optional().describe(FinancialMetrics.BalanceSheet.REINSURANCE_ACCOUNTS_PAYABLE),
    [FinancialMetrics.BalanceSheet.LIABILITIES_HELD_FOR_SALE]: z.number().optional().describe(FinancialMetrics.BalanceSheet.LIABILITIES_HELD_FOR_SALE),
    [FinancialMetrics.BalanceSheet.NON_CURRENT_LIABILITIES_DUE_WITHIN_ONE_YEAR]: z.number().optional().describe(FinancialMetrics.BalanceSheet.NON_CURRENT_LIABILITIES_DUE_WITHIN_ONE_YEAR),
    [FinancialMetrics.BalanceSheet.OTHER_CURRENT_LIABILITIES]: z.number().optional().describe(FinancialMetrics.BalanceSheet.OTHER_CURRENT_LIABILITIES),

    [FinancialMetrics.BalanceSheet.TOTAL_CURRENT_LIABILITIES]: z.number().describe(FinancialMetrics.BalanceSheet.TOTAL_CURRENT_LIABILITIES),

    // --- 非流动负债 ---
    [FinancialMetrics.BalanceSheet.INSURANCE_CONTRACT_RESERVES]: z.number().optional().describe(FinancialMetrics.BalanceSheet.INSURANCE_CONTRACT_RESERVES),
    [FinancialMetrics.BalanceSheet.LONG_TERM_BORROWINGS]: z.number().optional().describe(FinancialMetrics.BalanceSheet.LONG_TERM_BORROWINGS),
    [FinancialMetrics.BalanceSheet.BONDS_PAYABLE]: z.number().optional().describe(FinancialMetrics.BalanceSheet.BONDS_PAYABLE),
    [FinancialMetrics.BalanceSheet.LEASE_LIABILITIES]: z.number().optional().describe(FinancialMetrics.BalanceSheet.LEASE_LIABILITIES),
    [FinancialMetrics.BalanceSheet.LONG_TERM_PAYABLES]: z.number().optional().describe(FinancialMetrics.BalanceSheet.LONG_TERM_PAYABLES),
    [FinancialMetrics.BalanceSheet.LONG_TERM_EMPLOYEE_BENEFITS_PAYABLE]: z.number().optional().describe(FinancialMetrics.BalanceSheet.LONG_TERM_EMPLOYEE_BENEFITS_PAYABLE),
    [FinancialMetrics.BalanceSheet.PROVISIONS]: z.number().optional().describe(FinancialMetrics.BalanceSheet.PROVISIONS),
    [FinancialMetrics.BalanceSheet.DEFERRED_INCOME]: z.number().optional().describe(FinancialMetrics.BalanceSheet.DEFERRED_INCOME),
    [FinancialMetrics.BalanceSheet.DEFERRED_TAX_LIABILITIES]: z.number().optional().describe(FinancialMetrics.BalanceSheet.DEFERRED_TAX_LIABILITIES),
    [FinancialMetrics.BalanceSheet.OTHER_NON_CURRENT_LIABILITIES]: z.number().optional().describe(FinancialMetrics.BalanceSheet.OTHER_NON_CURRENT_LIABILITIES),

    [FinancialMetrics.BalanceSheet.TOTAL_NON_CURRENT_LIABILITIES]: z.number().describe(FinancialMetrics.BalanceSheet.TOTAL_NON_CURRENT_LIABILITIES),

    [FinancialMetrics.BalanceSheet.TOTAL_LIABILITIES]: z.number().describe(FinancialMetrics.BalanceSheet.TOTAL_LIABILITIES),

    // --- 所有者权益 ---
    [FinancialMetrics.BalanceSheet.PAID_IN_CAPITAL]: z.number().optional().describe(FinancialMetrics.BalanceSheet.PAID_IN_CAPITAL),
    [FinancialMetrics.BalanceSheet.OTHER_EQUITY_INSTRUMENTS]: z.number().optional().describe(FinancialMetrics.BalanceSheet.OTHER_EQUITY_INSTRUMENTS),
    [FinancialMetrics.BalanceSheet.CAPITAL_RESERVE]: z.number().optional().describe(FinancialMetrics.BalanceSheet.CAPITAL_RESERVE),
    [FinancialMetrics.BalanceSheet.LESS_TREASURY_STOCK]: z.number().optional().describe(FinancialMetrics.BalanceSheet.LESS_TREASURY_STOCK),
    [FinancialMetrics.BalanceSheet.OTHER_COMPREHENSIVE_INCOME]: z.number().optional().describe(FinancialMetrics.BalanceSheet.OTHER_COMPREHENSIVE_INCOME),
    [FinancialMetrics.BalanceSheet.SPECIAL_RESERVE]: z.number().optional().describe(FinancialMetrics.BalanceSheet.SPECIAL_RESERVE),
    [FinancialMetrics.BalanceSheet.SURPLUS_RESERVE]: z.number().optional().describe(FinancialMetrics.BalanceSheet.SURPLUS_RESERVE),
    [FinancialMetrics.BalanceSheet.GENERAL_RISK_RESERVE]: z.number().optional().describe(FinancialMetrics.BalanceSheet.GENERAL_RISK_RESERVE),
    [FinancialMetrics.BalanceSheet.UNDISTRIBUTED_PROFITS]: z.number().optional().describe(FinancialMetrics.BalanceSheet.UNDISTRIBUTED_PROFITS),

    [FinancialMetrics.BalanceSheet.TOTAL_EQUITY_ATTRIBUTABLE_TO_PARENT_COMPANY]: z.number().describe(FinancialMetrics.BalanceSheet.TOTAL_EQUITY_ATTRIBUTABLE_TO_PARENT_COMPANY),
    [FinancialMetrics.BalanceSheet.MINORITY_INTERESTS]: z.number().optional().describe(FinancialMetrics.BalanceSheet.MINORITY_INTERESTS),

    [FinancialMetrics.BalanceSheet.TOTAL_OWNERS_EQUITY]: z.number().describe(FinancialMetrics.BalanceSheet.TOTAL_OWNERS_EQUITY),

    [FinancialMetrics.BalanceSheet.TOTAL_LIABILITIES_AND_OWNERS_EQUITY]: z.number().describe(FinancialMetrics.BalanceSheet.TOTAL_LIABILITIES_AND_OWNERS_EQUITY),
});

// ============================================================================
// 2. Income Statement Schema (利润表)
// ============================================================================

export const IncomeStatementSchema = z.object({
    [FinancialMetrics.IncomeStatement.TOTAL_REVENUE]: z.number().describe(FinancialMetrics.IncomeStatement.TOTAL_REVENUE),
    [FinancialMetrics.IncomeStatement.REVENUE]: z.number().optional().describe(FinancialMetrics.IncomeStatement.REVENUE),
    [FinancialMetrics.IncomeStatement.INTEREST_INCOME]: z.number().optional().describe(FinancialMetrics.IncomeStatement.INTEREST_INCOME),
    [FinancialMetrics.IncomeStatement.EARNED_PREMIUMS]: z.number().optional().describe(FinancialMetrics.IncomeStatement.EARNED_PREMIUMS),
    [FinancialMetrics.IncomeStatement.FEE_AND_COMMISSION_INCOME]: z.number().optional().describe(FinancialMetrics.IncomeStatement.FEE_AND_COMMISSION_INCOME),

    [FinancialMetrics.IncomeStatement.TOTAL_OPERATING_COSTS]: z.number().describe(FinancialMetrics.IncomeStatement.TOTAL_OPERATING_COSTS),
    [FinancialMetrics.IncomeStatement.OPERATING_COSTS]: z.number().optional().describe(FinancialMetrics.IncomeStatement.OPERATING_COSTS),
    [FinancialMetrics.IncomeStatement.INTEREST_EXPENSES]: z.number().optional().describe(FinancialMetrics.IncomeStatement.INTEREST_EXPENSES),
    [FinancialMetrics.IncomeStatement.FEE_AND_COMMISSION_EXPENSES]: z.number().optional().describe(FinancialMetrics.IncomeStatement.FEE_AND_COMMISSION_EXPENSES),
    [FinancialMetrics.IncomeStatement.SURRENDER_VALUE]: z.number().optional().describe(FinancialMetrics.IncomeStatement.SURRENDER_VALUE),
    [FinancialMetrics.IncomeStatement.NET_PAYMENTS_FOR_INSURANCE_CLAIMS]: z.number().optional().describe(FinancialMetrics.IncomeStatement.NET_PAYMENTS_FOR_INSURANCE_CLAIMS),
    [FinancialMetrics.IncomeStatement.NET_PROVISION_FOR_INSURANCE_CONTRACTS]: z.number().optional().describe(FinancialMetrics.IncomeStatement.NET_PROVISION_FOR_INSURANCE_CONTRACTS),
    [FinancialMetrics.IncomeStatement.POLICY_DIVIDEND_EXPENSES]: z.number().optional().describe(FinancialMetrics.IncomeStatement.POLICY_DIVIDEND_EXPENSES),
    [FinancialMetrics.IncomeStatement.REINSURANCE_EXPENSES]: z.number().optional().describe(FinancialMetrics.IncomeStatement.REINSURANCE_EXPENSES),
    [FinancialMetrics.IncomeStatement.TAXES_AND_SURCHARGES]: z.number().optional().describe(FinancialMetrics.IncomeStatement.TAXES_AND_SURCHARGES),
    [FinancialMetrics.IncomeStatement.SELLING_EXPENSES]: z.number().optional().describe(FinancialMetrics.IncomeStatement.SELLING_EXPENSES),
    [FinancialMetrics.IncomeStatement.ADMINISTRATIVE_EXPENSES]: z.number().optional().describe(FinancialMetrics.IncomeStatement.ADMINISTRATIVE_EXPENSES),
    [FinancialMetrics.IncomeStatement.R_AND_D_EXPENSES]: z.number().optional().describe(FinancialMetrics.IncomeStatement.R_AND_D_EXPENSES),
    [FinancialMetrics.IncomeStatement.FINANCIAL_EXPENSES]: z.number().optional().describe(FinancialMetrics.IncomeStatement.FINANCIAL_EXPENSES),

    [FinancialMetrics.IncomeStatement.ADD_OTHER_INCOME]: z.number().optional().describe(FinancialMetrics.IncomeStatement.ADD_OTHER_INCOME),
    [FinancialMetrics.IncomeStatement.INVESTMENT_INCOME]: z.number().optional().describe(FinancialMetrics.IncomeStatement.INVESTMENT_INCOME),
    [FinancialMetrics.IncomeStatement.EXCHANGE_GAINS]: z.number().optional().describe(FinancialMetrics.IncomeStatement.EXCHANGE_GAINS),
    [FinancialMetrics.IncomeStatement.NET_EXPOSURE_HEDGING_GAINS]: z.number().optional().describe(FinancialMetrics.IncomeStatement.NET_EXPOSURE_HEDGING_GAINS),
    [FinancialMetrics.IncomeStatement.FAIR_VALUE_CHANGE_INCOME]: z.number().optional().describe(FinancialMetrics.IncomeStatement.FAIR_VALUE_CHANGE_INCOME),
    [FinancialMetrics.IncomeStatement.CREDIT_IMPAIRMENT_LOSS]: z.number().optional().describe(FinancialMetrics.IncomeStatement.CREDIT_IMPAIRMENT_LOSS),
    [FinancialMetrics.IncomeStatement.ASSET_IMPAIRMENT_LOSS]: z.number().optional().describe(FinancialMetrics.IncomeStatement.ASSET_IMPAIRMENT_LOSS),
    [FinancialMetrics.IncomeStatement.ASSET_DISPOSAL_INCOME]: z.number().optional().describe(FinancialMetrics.IncomeStatement.ASSET_DISPOSAL_INCOME),

    [FinancialMetrics.IncomeStatement.OPERATING_PROFIT]: z.number().describe(FinancialMetrics.IncomeStatement.OPERATING_PROFIT),
    [FinancialMetrics.IncomeStatement.ADD_NON_OPERATING_INCOME]: z.number().optional().describe(FinancialMetrics.IncomeStatement.ADD_NON_OPERATING_INCOME),
    [FinancialMetrics.IncomeStatement.LESS_NON_OPERATING_EXPENSES]: z.number().optional().describe(FinancialMetrics.IncomeStatement.LESS_NON_OPERATING_EXPENSES),

    [FinancialMetrics.IncomeStatement.TOTAL_PROFIT]: z.number().describe(FinancialMetrics.IncomeStatement.TOTAL_PROFIT),
    [FinancialMetrics.IncomeStatement.LESS_INCOME_TAX_EXPENSES]: z.number().optional().describe(FinancialMetrics.IncomeStatement.LESS_INCOME_TAX_EXPENSES),

    [FinancialMetrics.IncomeStatement.NET_PROFIT]: z.number().describe(FinancialMetrics.IncomeStatement.NET_PROFIT),
    [FinancialMetrics.IncomeStatement.NET_PROFIT_ATTRIBUTABLE_TO_PARENT_COMPANY]: z.number().optional().describe(FinancialMetrics.IncomeStatement.NET_PROFIT_ATTRIBUTABLE_TO_PARENT_COMPANY),
    [FinancialMetrics.IncomeStatement.MINORITY_INTERESTS_INCOME]: z.number().optional().describe(FinancialMetrics.IncomeStatement.MINORITY_INTERESTS_INCOME),

    [FinancialMetrics.IncomeStatement.OTHER_COMPREHENSIVE_INCOME_NET_OF_TAX]: z.number().optional().describe(FinancialMetrics.IncomeStatement.OTHER_COMPREHENSIVE_INCOME_NET_OF_TAX),
    [FinancialMetrics.IncomeStatement.OTHER_COMPREHENSIVE_INCOME_ATTRIBUTABLE_TO_PARENT_COMPANY]: z.number().optional().describe(FinancialMetrics.IncomeStatement.OTHER_COMPREHENSIVE_INCOME_ATTRIBUTABLE_TO_PARENT_COMPANY),
    [FinancialMetrics.IncomeStatement.OTHER_COMPREHENSIVE_INCOME_ATTRIBUTABLE_TO_MINORITY_INTERESTS]: z.number().optional().describe(FinancialMetrics.IncomeStatement.OTHER_COMPREHENSIVE_INCOME_ATTRIBUTABLE_TO_MINORITY_INTERESTS),

    [FinancialMetrics.IncomeStatement.TOTAL_COMPREHENSIVE_INCOME]: z.number().describe(FinancialMetrics.IncomeStatement.TOTAL_COMPREHENSIVE_INCOME),
    [FinancialMetrics.IncomeStatement.TOTAL_COMPREHENSIVE_INCOME_ATTRIBUTABLE_TO_PARENT_COMPANY]: z.number().optional().describe(FinancialMetrics.IncomeStatement.TOTAL_COMPREHENSIVE_INCOME_ATTRIBUTABLE_TO_PARENT_COMPANY),
    [FinancialMetrics.IncomeStatement.TOTAL_COMPREHENSIVE_INCOME_ATTRIBUTABLE_TO_MINORITY_INTERESTS]: z.number().optional().describe(FinancialMetrics.IncomeStatement.TOTAL_COMPREHENSIVE_INCOME_ATTRIBUTABLE_TO_MINORITY_INTERESTS),

    [FinancialMetrics.IncomeStatement.BASIC_EPS]: z.number().optional().describe(FinancialMetrics.IncomeStatement.BASIC_EPS),
    [FinancialMetrics.IncomeStatement.DILUTED_EPS]: z.number().optional().describe(FinancialMetrics.IncomeStatement.DILUTED_EPS),
});

// ============================================================================
// 3. Cash Flow Statement Schema (现金流量表)
// ============================================================================

export const CashFlowSchema = z.object({
    // --- 经营活动 ---
    [FinancialMetrics.CashFlow.CASH_RECEIVED_FROM_SALES_OF_GOODS_OR_RENDERING_OF_SERVICES]: z.number().optional().describe(FinancialMetrics.CashFlow.CASH_RECEIVED_FROM_SALES_OF_GOODS_OR_RENDERING_OF_SERVICES),
    [FinancialMetrics.CashFlow.NET_INCREASE_IN_DEPOSITS_FROM_CUSTOMERS_AND_INTERBANK]: z.number().optional().describe(FinancialMetrics.CashFlow.NET_INCREASE_IN_DEPOSITS_FROM_CUSTOMERS_AND_INTERBANK),
    [FinancialMetrics.CashFlow.NET_INCREASE_IN_BORROWINGS_FROM_CENTRAL_BANK]: z.number().optional().describe(FinancialMetrics.CashFlow.NET_INCREASE_IN_BORROWINGS_FROM_CENTRAL_BANK),
    [FinancialMetrics.CashFlow.NET_INCREASE_IN_BORROWINGS_FROM_OTHER_FINANCIAL_INSTITUTIONS]: z.number().optional().describe(FinancialMetrics.CashFlow.NET_INCREASE_IN_BORROWINGS_FROM_OTHER_FINANCIAL_INSTITUTIONS),
    [FinancialMetrics.CashFlow.CASH_RECEIVED_FROM_PREMIUMS_OF_ORIGINAL_INSURANCE_CONTRACTS]: z.number().optional().describe(FinancialMetrics.CashFlow.CASH_RECEIVED_FROM_PREMIUMS_OF_ORIGINAL_INSURANCE_CONTRACTS),
    [FinancialMetrics.CashFlow.NET_CASH_RECEIVED_FROM_REINSURANCE_BUSINESS]: z.number().optional().describe(FinancialMetrics.CashFlow.NET_CASH_RECEIVED_FROM_REINSURANCE_BUSINESS),
    [FinancialMetrics.CashFlow.NET_INCREASE_IN_INSURED_DEPOSITS_AND_INVESTMENT]: z.number().optional().describe(FinancialMetrics.CashFlow.NET_INCREASE_IN_INSURED_DEPOSITS_AND_INVESTMENT),
    [FinancialMetrics.CashFlow.CASH_RECEIVED_FROM_INTEREST_FEES_AND_COMMISSIONS]: z.number().optional().describe(FinancialMetrics.CashFlow.CASH_RECEIVED_FROM_INTEREST_FEES_AND_COMMISSIONS),
    [FinancialMetrics.CashFlow.NET_INCREASE_IN_BORROWINGS_FROM_BANKS_AND_OTHER_FINANCIAL_INSTITUTIONS]: z.number().optional().describe(FinancialMetrics.CashFlow.NET_INCREASE_IN_BORROWINGS_FROM_BANKS_AND_OTHER_FINANCIAL_INSTITUTIONS),
    [FinancialMetrics.CashFlow.NET_INCREASE_IN_REPURCHASE_BUSINESS_FUNDS]: z.number().optional().describe(FinancialMetrics.CashFlow.NET_INCREASE_IN_REPURCHASE_BUSINESS_FUNDS),
    [FinancialMetrics.CashFlow.NET_CASH_RECEIVED_FROM_PROXY_TRADING_OF_SECURITIES]: z.number().optional().describe(FinancialMetrics.CashFlow.NET_CASH_RECEIVED_FROM_PROXY_TRADING_OF_SECURITIES),
    [FinancialMetrics.CashFlow.REFUND_OF_TAXES_AND_SURCHARGES]: z.number().optional().describe(FinancialMetrics.CashFlow.REFUND_OF_TAXES_AND_SURCHARGES),
    [FinancialMetrics.CashFlow.CASH_RECEIVED_RELATING_TO_OTHER_OPERATING_ACTIVITIES]: z.number().optional().describe(FinancialMetrics.CashFlow.CASH_RECEIVED_RELATING_TO_OTHER_OPERATING_ACTIVITIES),

    [FinancialMetrics.CashFlow.SUBTOTAL_OF_CASH_INFLOWS_FROM_OPERATING_ACTIVITIES]: z.number().describe(FinancialMetrics.CashFlow.SUBTOTAL_OF_CASH_INFLOWS_FROM_OPERATING_ACTIVITIES),

    [FinancialMetrics.CashFlow.CASH_PAID_FOR_GOODS_AND_SERVICES]: z.number().optional().describe(FinancialMetrics.CashFlow.CASH_PAID_FOR_GOODS_AND_SERVICES),
    [FinancialMetrics.CashFlow.NET_INCREASE_IN_LOANS_AND_ADVANCES_TO_CUSTOMERS]: z.number().optional().describe(FinancialMetrics.CashFlow.NET_INCREASE_IN_LOANS_AND_ADVANCES_TO_CUSTOMERS),
    [FinancialMetrics.CashFlow.NET_INCREASE_IN_DEPOSITS_IN_CENTRAL_BANK_AND_INTERBANK]: z.number().optional().describe(FinancialMetrics.CashFlow.NET_INCREASE_IN_DEPOSITS_IN_CENTRAL_BANK_AND_INTERBANK),
    [FinancialMetrics.CashFlow.CASH_PAID_FOR_ORIGINAL_INSURANCE_CONTRACT_CLAIMS]: z.number().optional().describe(FinancialMetrics.CashFlow.CASH_PAID_FOR_ORIGINAL_INSURANCE_CONTRACT_CLAIMS),
    [FinancialMetrics.CashFlow.NET_INCREASE_IN_LENDING_FUNDS]: z.number().optional().describe(FinancialMetrics.CashFlow.NET_INCREASE_IN_LENDING_FUNDS),
    [FinancialMetrics.CashFlow.CASH_PAID_FOR_INTEREST_FEES_AND_COMMISSIONS]: z.number().optional().describe(FinancialMetrics.CashFlow.CASH_PAID_FOR_INTEREST_FEES_AND_COMMISSIONS),
    [FinancialMetrics.CashFlow.CASH_PAID_FOR_POLICY_DIVIDENDS]: z.number().optional().describe(FinancialMetrics.CashFlow.CASH_PAID_FOR_POLICY_DIVIDENDS),
    [FinancialMetrics.CashFlow.CASH_PAID_TO_AND_ON_BEHALF_OF_EMPLOYEES]: z.number().optional().describe(FinancialMetrics.CashFlow.CASH_PAID_TO_AND_ON_BEHALF_OF_EMPLOYEES),
    [FinancialMetrics.CashFlow.PAYMENTS_OF_TAXES_AND_SURCHARGES]: z.number().optional().describe(FinancialMetrics.CashFlow.PAYMENTS_OF_TAXES_AND_SURCHARGES),
    [FinancialMetrics.CashFlow.CASH_PAID_RELATING_TO_OTHER_OPERATING_ACTIVITIES]: z.number().optional().describe(FinancialMetrics.CashFlow.CASH_PAID_RELATING_TO_OTHER_OPERATING_ACTIVITIES),

    [FinancialMetrics.CashFlow.SUBTOTAL_OF_CASH_OUTFLOWS_FROM_OPERATING_ACTIVITIES]: z.number().describe(FinancialMetrics.CashFlow.SUBTOTAL_OF_CASH_OUTFLOWS_FROM_OPERATING_ACTIVITIES),

    [FinancialMetrics.CashFlow.NET_CASH_FLOWS_FROM_OPERATING_ACTIVITIES]: z.number().describe(FinancialMetrics.CashFlow.NET_CASH_FLOWS_FROM_OPERATING_ACTIVITIES),

    // --- 投资活动 ---
    [FinancialMetrics.CashFlow.CASH_RECEIVED_FROM_DISPOSAL_OF_INVESTMENTS]: z.number().optional().describe(FinancialMetrics.CashFlow.CASH_RECEIVED_FROM_DISPOSAL_OF_INVESTMENTS),
    [FinancialMetrics.CashFlow.CASH_RECEIVED_FROM_RETURNS_ON_INVESTMENTS]: z.number().optional().describe(FinancialMetrics.CashFlow.CASH_RECEIVED_FROM_RETURNS_ON_INVESTMENTS),
    [FinancialMetrics.CashFlow.NET_CASH_RECEIVED_FROM_DISPOSAL_OF_FIXED_ASSETS_INTANGIBLE_ASSETS_AND_OTHER_LONG_TERM_ASSETS]: z.number().optional().describe(FinancialMetrics.CashFlow.NET_CASH_RECEIVED_FROM_DISPOSAL_OF_FIXED_ASSETS_INTANGIBLE_ASSETS_AND_OTHER_LONG_TERM_ASSETS),
    [FinancialMetrics.CashFlow.NET_CASH_RECEIVED_FROM_DISPOSAL_OF_SUBSIDIARIES_AND_OTHER_BUSINESS_UNITS]: z.number().optional().describe(FinancialMetrics.CashFlow.NET_CASH_RECEIVED_FROM_DISPOSAL_OF_SUBSIDIARIES_AND_OTHER_BUSINESS_UNITS),
    [FinancialMetrics.CashFlow.CASH_RECEIVED_RELATING_TO_OTHER_INVESTING_ACTIVITIES]: z.number().optional().describe(FinancialMetrics.CashFlow.CASH_RECEIVED_RELATING_TO_OTHER_INVESTING_ACTIVITIES),

    [FinancialMetrics.CashFlow.SUBTOTAL_OF_CASH_INFLOWS_FROM_INVESTING_ACTIVITIES]: z.number().describe(FinancialMetrics.CashFlow.SUBTOTAL_OF_CASH_INFLOWS_FROM_INVESTING_ACTIVITIES),

    [FinancialMetrics.CashFlow.CASH_PAID_TO_ACQUIRE_FIXED_ASSETS_INTANGIBLE_ASSETS_AND_OTHER_LONG_TERM_ASSETS]: z.number().optional().describe(FinancialMetrics.CashFlow.CASH_PAID_TO_ACQUIRE_FIXED_ASSETS_INTANGIBLE_ASSETS_AND_OTHER_LONG_TERM_ASSETS),
    [FinancialMetrics.CashFlow.CASH_PAID_TO_ACQUIRE_INVESTMENTS]: z.number().optional().describe(FinancialMetrics.CashFlow.CASH_PAID_TO_ACQUIRE_INVESTMENTS),
    [FinancialMetrics.CashFlow.NET_INCREASE_IN_PLEDGED_LOANS]: z.number().optional().describe(FinancialMetrics.CashFlow.NET_INCREASE_IN_PLEDGED_LOANS),
    [FinancialMetrics.CashFlow.NET_CASH_PAID_TO_ACQUIRE_SUBSIDIARIES_AND_OTHER_BUSINESS_UNITS]: z.number().optional().describe(FinancialMetrics.CashFlow.NET_CASH_PAID_TO_ACQUIRE_SUBSIDIARIES_AND_OTHER_BUSINESS_UNITS),
    [FinancialMetrics.CashFlow.CASH_PAID_RELATING_TO_OTHER_INVESTING_ACTIVITIES]: z.number().optional().describe(FinancialMetrics.CashFlow.CASH_PAID_RELATING_TO_OTHER_INVESTING_ACTIVITIES),

    [FinancialMetrics.CashFlow.SUBTOTAL_OF_CASH_OUTFLOWS_FROM_INVESTING_ACTIVITIES]: z.number().describe(FinancialMetrics.CashFlow.SUBTOTAL_OF_CASH_OUTFLOWS_FROM_INVESTING_ACTIVITIES),

    [FinancialMetrics.CashFlow.NET_CASH_FLOWS_FROM_INVESTING_ACTIVITIES]: z.number().describe(FinancialMetrics.CashFlow.NET_CASH_FLOWS_FROM_INVESTING_ACTIVITIES),

    // --- 筹资活动 ---
    [FinancialMetrics.CashFlow.CASH_RECEIVED_FROM_CAPITAL_CONTRIBUTIONS]: z.number().optional().describe(FinancialMetrics.CashFlow.CASH_RECEIVED_FROM_CAPITAL_CONTRIBUTIONS),
    [FinancialMetrics.CashFlow.CASH_RECEIVED_FROM_BORROWINGS]: z.number().optional().describe(FinancialMetrics.CashFlow.CASH_RECEIVED_FROM_BORROWINGS),
    [FinancialMetrics.CashFlow.CASH_RECEIVED_RELATING_TO_OTHER_FINANCING_ACTIVITIES]: z.number().optional().describe(FinancialMetrics.CashFlow.CASH_RECEIVED_RELATING_TO_OTHER_FINANCING_ACTIVITIES),

    [FinancialMetrics.CashFlow.SUBTOTAL_OF_CASH_INFLOWS_FROM_FINANCING_ACTIVITIES]: z.number().describe(FinancialMetrics.CashFlow.SUBTOTAL_OF_CASH_INFLOWS_FROM_FINANCING_ACTIVITIES),

    [FinancialMetrics.CashFlow.CASH_REPAYMENTS_OF_BORROWINGS]: z.number().optional().describe(FinancialMetrics.CashFlow.CASH_REPAYMENTS_OF_BORROWINGS),
    [FinancialMetrics.CashFlow.CASH_PAYMENTS_FOR_DISTRIBUTION_OF_DIVIDENDS_PROFITS_OR_INTEREST_EXPENSES]: z.number().optional().describe(FinancialMetrics.CashFlow.CASH_PAYMENTS_FOR_DISTRIBUTION_OF_DIVIDENDS_PROFITS_OR_INTEREST_EXPENSES),
    [FinancialMetrics.CashFlow.CASH_PAYMENTS_RELATING_TO_OTHER_FINANCING_ACTIVITIES]: z.number().optional().describe(FinancialMetrics.CashFlow.CASH_PAYMENTS_RELATING_TO_OTHER_FINANCING_ACTIVITIES),

    [FinancialMetrics.CashFlow.SUBTOTAL_OF_CASH_OUTFLOWS_FROM_FINANCING_ACTIVITIES]: z.number().describe(FinancialMetrics.CashFlow.SUBTOTAL_OF_CASH_OUTFLOWS_FROM_FINANCING_ACTIVITIES),

    [FinancialMetrics.CashFlow.NET_CASH_FLOWS_FROM_FINANCING_ACTIVITIES]: z.number().describe(FinancialMetrics.CashFlow.NET_CASH_FLOWS_FROM_FINANCING_ACTIVITIES),

    [FinancialMetrics.CashFlow.EFFECT_OF_FOREIGN_EXCHANGE_RATE_CHANGES_ON_CASH_AND_CASH_EQUIVALENTS]: z.number().optional().describe(FinancialMetrics.CashFlow.EFFECT_OF_FOREIGN_EXCHANGE_RATE_CHANGES_ON_CASH_AND_CASH_EQUIVALENTS),

    [FinancialMetrics.CashFlow.NET_INCREASE_IN_CASH_AND_CASH_EQUIVALENTS]: z.number().describe(FinancialMetrics.CashFlow.NET_INCREASE_IN_CASH_AND_CASH_EQUIVALENTS),
    [FinancialMetrics.CashFlow.ADD_CASH_AND_CASH_EQUIVALENTS_AT_BEGINNING_OF_PERIOD]: z.number().optional().describe(FinancialMetrics.CashFlow.ADD_CASH_AND_CASH_EQUIVALENTS_AT_BEGINNING_OF_PERIOD),
    [FinancialMetrics.CashFlow.CASH_AND_CASH_EQUIVALENTS_AT_END_OF_PERIOD]: z.number().describe(FinancialMetrics.CashFlow.CASH_AND_CASH_EQUIVALENTS_AT_END_OF_PERIOD),
});

export type StandardBalanceSheet = z.infer<typeof BalanceSheetSchema>;
export type StandardIncomeStatement = z.infer<typeof IncomeStatementSchema>;
export type StandardCashFlow = z.infer<typeof CashFlowSchema>;

/**
 * Get all standard financial metric names
 */
export function getAllMetricNames(): string[] {
    return [
        ...Object.keys(BalanceSheetSchema.shape),
        ...Object.keys(IncomeStatementSchema.shape),
        ...Object.keys(CashFlowSchema.shape)
    ];
}
