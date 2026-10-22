/**
 * Document Constants
 *
 * Display mappings for document types and periods.
 * Single source of truth for converting database values to display labels.
 */

/**
 * Document type labels (database value -> display label)
 */
export const DOC_TYPE_LABELS: Record<string, string> = {
  // 财务报表
  'balance_sheet': '资产负债表',
  'income_statement': '利润表',
  'cash_flow': '现金流量表',
  'financial_report': '财务报告',
  // 财务信息
  'account_detail': '科目明细',
  // 法规准则
  'regulation': '法律法规',
  'accounting_standard': '会计准则',
  'policy': '规章制度',
  // 其他信息
  'business_info': '业务情况',
  'general': '其他文档',
  // 业务文档 (临时)
  'contract': '合同',
  'invoice': '发票',
  'voucher': '记账凭证',
};

/**
 * Period labels (database value -> display label)
 */
export const PERIOD_LABELS: Record<string, string> = {
  'Q1': '第一季度',
  'Q2': '第二季度',
  'Q3': '第三季度',
  'Q4': '第四季度',
  'annual': '全年',
  'permanent': '长期有效',
};

/**
 * Document type options for dropdown (value + label pairs)
 */
export const DOC_TYPE_OPTIONS = Object.entries(DOC_TYPE_LABELS).map(([value, label]) => ({
  value,
  label,
}));

/**
 * Period options for dropdown (value + label pairs)
 */
export const PERIOD_OPTIONS = Object.entries(PERIOD_LABELS).map(([value, label]) => ({
  value,
  label,
}));

/**
 * Format document type for display
 * @param docType - Database value (e.g., 'balance_sheet')
 * @returns Display label (e.g., '资产负债表')
 */
export function formatDocType(docType: string | null | undefined): string {
  if (!docType) return '-';
  return DOC_TYPE_LABELS[docType] || docType;
}

/**
 * Format period for display
 * @param period - Database value (e.g., 'Q1')
 * @returns Display label (e.g., '第一季度')
 */
export function formatPeriod(period: string | null | undefined): string {
  if (!period) return '-';
  return PERIOD_LABELS[period] || period;
}

/**
 * Format year and period together for display
 * @param year - Year string (e.g., '2024')
 * @param period - Period value (e.g., 'Q1')
 * @returns Combined display (e.g., '2024年第一季度')
 */
export function formatYearPeriod(
  year: string | null | undefined,
  period: string | null | undefined
): string {
  if (!year && !period) return '-';
  if (!period) return year ? `${year}年` : '-';
  if (!year) return formatPeriod(period);
  return `${year}年${formatPeriod(period)}`;
}

/**
 * Get document type value from display label
 * @param label - Display label (e.g., '资产负债表')
 * @returns Database value (e.g., 'balance_sheet') or null if not found
 */
export function getDocTypeValue(label: string): string | null {
  const entry = Object.entries(DOC_TYPE_LABELS).find(([, l]) => l === label);
  return entry ? entry[0] : null;
}

/**
 * Get period value from display label
 * @param label - Display label (e.g., '第一季度')
 * @returns Database value (e.g., 'Q1') or null if not found
 */
export function getPeriodValue(label: string): string | null {
  const entry = Object.entries(PERIOD_LABELS).find(([, l]) => l === label);
  return entry ? entry[0] : null;
}

/**
 * Check if a document type is a financial statement (structured extraction)
 */
export function isFinancialStatement(docType: string | null | undefined): boolean {
  if (!docType) return false;
  return ['balance_sheet', 'income_statement', 'cash_flow'].includes(docType);
}

/**
 * Check if a document type is a financial report (vector only, no structured extraction)
 */
export function isFinancialReport(docType: string | null | undefined): boolean {
  if (!docType) return false;
  return docType === 'financial_report';
}

/**
 * Check if a document type requires year/period selection
 */
export function requiresYearPeriod(docType: string | null | undefined): boolean {
  if (!docType) return false;
  return ['balance_sheet', 'income_statement', 'cash_flow', 'financial_report'].includes(docType);
}

/**
 * Check if a document type is business info (for AI context enhancement)
 */
export function isBusinessInfo(docType: string | null | undefined): boolean {
  if (!docType) return false;
  return docType === 'business_info';
}

/**
 * Document types that are not uploadable yet
 */
export const NON_UPLOADABLE_TYPES = ['account_detail'];

/**
 * Check if a document type is uploadable
 */
export function isUploadable(docType: string | null | undefined): boolean {
  if (!docType) return false;
  return !NON_UPLOADABLE_TYPES.includes(docType);
}

/**
 * Document types that only accept PDF format
 */
export const PDF_ONLY_TYPES = ['financial_report'];

/**
 * Types whose text is split into articles and searched as regulations (REQ §5.6).
 * A company policy is not one: it is searched as a document and never cited by article.
 * The SQL search functions repeat this list (migration 20261021002917).
 */
export const REGULATION_TYPES = ['regulation', 'accounting_standard'];

export function isRegulation(docType: string | null | undefined): boolean {
  return !!docType && REGULATION_TYPES.includes(docType);
}
