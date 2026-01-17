/**
 * Structured Extraction Utilities
 *
 * This module provides utilities for extracting structured data from various
 * document types including financial statements, regulations, and contracts.
 *
 * Key Features:
 * - Document type classification
 * - Type-specific extraction logic
 * - Hierarchical metric extraction for financial documents
 * - Article-level extraction for regulations
 * - Validation and confidence scoring
 */

import { z } from 'zod';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Supported document types for structured extraction
 */
export type DocumentType =
  | 'balance_sheet'      // 资产负债表
  | 'income_statement'   // 利润表
  | 'cash_flow'          // 现金流量表
  | 'financial_report'   // 财务报告 (PDF with structured text/tables, vector only)
  | 'account_detail'     // 科目明细 (not uploadable yet)
  | 'regulation'         // 法规
  | 'accounting_standard' // 会计准则
  | 'policy'             // 规章制度
  | 'business_info'      // 业务情况 (company operations info, vector only)
  | 'contract'           // 合同
  | 'invoice'            // 发票
  | 'voucher'            // 记账凭证
  | 'general';           // 通用文档

/**
 * Financial metric extracted from a document
 */
export interface FinancialMetric {
  name: string;                    // Hierarchical name (e.g., "流动资产.货币资金")
  value: number;                   // Numeric value
  unit: string;                    // Unit (e.g., "元", "万元", "%")
  section?: string;                // Section (e.g., "流动资产", "流动负债")
  previousValue?: number;          // Previous period value (if available)
  confidence: number;              // Confidence score (0-1)
}

/**
 * Regulation article extracted from a regulation document
 */
export interface RegulationArticle {
  articleNumber: string;           // Article number (e.g., "第一条", "第十三条")
  subArticle?: string;             // Sub-article (e.g., "（一）", "（二）")
  title?: string;                  // Article title (if any)
  content: string;                 // Full article content
  keywords: string[];              // Extracted keywords
  hierarchy?: string[];            // Nested structure (e.g., ["第十三条", "（一）", "1."])
  effectiveDate?: string;          // Effective date (ISO format)
  expiryDate?: string;             // Expiry date (if any)
}

/**
 * Contract clause extracted from a contract
 */
export interface ContractClause {
  clauseNumber?: string;           // Clause number
  title?: string;                  // Clause title
  content: string;                 // Clause content
  type?: string;                   // Clause type (e.g., "payment", "liability")
  parties?: string[];              // Involved parties
}

/**
 * Extraction result for financial documents
 */
export interface FinancialExtractionResult {
  documentType: 'balance_sheet' | 'income_statement' | 'cash_flow';
  year: string;                    // Year (YYYY)
  period: string;                  // Period (Q1, Q2, Q3, Q4, annual)
  metrics: FinancialMetric[];      // Extracted metrics
  summary: string;                 // Document summary
  confidence: number;              // Overall confidence score
  metadata: {
    company?: string;              // Company name
    currency?: string;             // Currency (default: CNY)
    unit?: string;                 // Unit (元, 万元, etc.)
    fiscalYearEnd?: string;        // Fiscal year end date
    [key: string]: string | undefined;
  };
}

/**
 * Extraction result for regulation documents
 */
export interface RegulationExtractionResult {
  documentType: 'regulation';
  regulationName: string;          // Regulation name
  articles: RegulationArticle[];   // Extracted articles
  summary: string;                 // Document summary
  confidence: number;              // Overall confidence score
  metadata: {
    issuingBody?: string;          // Issuing organization
    effectiveDate?: string;        // Effective date
    documentNumber?: string;       // Document number
    [key: string]: string | undefined;
  };
}

/**
 * Extraction result for contract documents
 */
export interface ContractExtractionResult {
  documentType: 'contract';
  contractType?: string;           // Contract type
  parties: string[];               // Contract parties
  clauses: ContractClause[];       // Extracted clauses
  summary: string;                 // Document summary
  confidence: number;              // Overall confidence score
  metadata: {
    signDate?: string;             // Signing date
    effectiveDate?: string;        // Effective date
    expiryDate?: string;           // Expiry date
    amount?: number;               // Contract amount
    [key: string]: string | number | undefined;
  };
}

/**
 * General extraction result for unclassified documents
 */
export interface GeneralExtractionResult {
  documentType: 'general' | 'invoice' | 'voucher' | 'financial_report' | 'account_detail' | 'accounting_standard' | 'policy' | 'business_info';
  extractedData: Record<string, unknown>;
  summary: string;
  confidence: number;
  metadata: Record<string, string | undefined>;
}

/**
 * Union type for all extraction results
 */
export type ExtractionResult =
  | FinancialExtractionResult
  | RegulationExtractionResult
  | ContractExtractionResult
  | GeneralExtractionResult;

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * Zod schema for financial metric validation
 * Exported for use in validation utilities
 */
export const FinancialMetricSchema = z.object({
  name: z.string().min(1),
  value: z.number(),
  unit: z.string(),
  section: z.string().optional(),
  previousValue: z.number().optional(),
  confidence: z.number().min(0).max(1),
});

/**
 * Zod schema for regulation article validation
 * Exported for use in validation utilities
 */
export const RegulationArticleSchema = z.object({
  articleNumber: z.string().min(1),
  subArticle: z.string().optional(),
  title: z.string().optional(),
  content: z.string().min(1),
  keywords: z.array(z.string()),
  hierarchy: z.array(z.string()).optional(),
  effectiveDate: z.string().optional(),
  expiryDate: z.string().optional(),
});

// ============================================================================
// Document Type Classification
// ============================================================================

/**
 * Keywords for document type classification
 */
const DOCUMENT_TYPE_KEYWORDS = {
  balance_sheet: [
    '资产负债表', '资产', '负债', '所有者权益', '流动资产', '非流动资产',
    '流动负债', '非流动负债', '股东权益', 'Balance Sheet', 'Assets', 'Liabilities'
  ],
  income_statement: [
    '利润表', '收益表', '损益表', '营业收入', '营业成本', '净利润',
    '利润总额', 'Income Statement', 'Profit and Loss', 'Revenue', 'Net Income'
  ],
  cash_flow: [
    '现金流量表', '经营活动产生的现金流量', '投资活动产生的现金流量',
    '筹资活动产生的现金流量', 'Cash Flow', 'Operating Activities', 'Investing Activities'
  ],
  regulation: [
    '第一条', '第二条', '第三条', '中华人民共和国', '法律', '条例', '规定',
    '办法', '通知', '公告', '税法', '会计准则', 'Article', '依据'
  ],
  contract: [
    '合同', '协议', '甲方', '乙方', '双方', '签订', '条款', '违约',
    'Contract', 'Agreement', 'Party A', 'Party B'
  ],
  invoice: [
    '发票', '增值税专用发票', '普通发票', '税额', '价税合计', '开票日期',
    'Invoice', '发票号码', '购买方', '销售方'
  ],
};

/**
 * Classify document type based on content
 *
 * Uses keyword matching and pattern recognition to determine document type.
 *
 * @param text - Document text content
 * @param fileName - Optional file name for additional context
 * @returns Classified document type and confidence score
 */
export function classifyDocumentType(
  text: string,
  fileName?: string
): { type: DocumentType; confidence: number } {
  const textLower = text.toLowerCase();
  const fileNameLower = fileName?.toLowerCase() || '';

  // Count keyword matches for each document type
  const scores: Record<DocumentType, number> = {
    balance_sheet: 0,
    income_statement: 0,
    cash_flow: 0,
    financial_report: 0,
    account_detail: 0,
    regulation: 0,
    accounting_standard: 0,
    policy: 0,
    business_info: 0,
    contract: 0,
    invoice: 0,
    voucher: 0,
    general: 0,
  };

  // Score based on content keywords
  for (const [docType, keywords] of Object.entries(DOCUMENT_TYPE_KEYWORDS)) {
    for (const keyword of keywords) {
      const keywordLower = keyword.toLowerCase();
      // Count occurrences in text
      const textMatches = (textLower.match(new RegExp(keywordLower, 'g')) || []).length;
      // Bonus for filename match
      const fileNameBonus = fileNameLower.includes(keywordLower) ? 5 : 0;
      scores[docType as DocumentType] += textMatches + fileNameBonus;
    }
  }

  // Find the type with highest score
  let maxScore = 0;
  let detectedType: DocumentType = 'general';

  for (const [type, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedType = type as DocumentType;
    }
  }

  // Calculate confidence based on score distribution
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const confidence = totalScore > 0 ? maxScore / totalScore : 0;

  // If confidence is too low, classify as general
  if (confidence < 0.3) {
    return { type: 'general', confidence: 0.5 };
  }

  return { type: detectedType, confidence };
}

// ============================================================================
// Financial Document Extraction
// ============================================================================

/**
 * Standard metric names for balance sheets
 */
const BALANCE_SHEET_METRICS = {
  // Current Assets
  '流动资产合计': ['流动资产合计', '流动资产总计', '流动资产小计'],
  '货币资金': ['货币资金', '现金', '银行存款', '其他货币资金'],
  '交易性金融资产': ['交易性金融资产', '以公允价值计量且其变动计入当期损益的金融资产'],
  '应收账款': ['应收账款', '应收账款净额'],
  '预付款项': ['预付款项', '预付账款'],
  '其他应收款': ['其他应收款', '其他应收款净额'],
  '存货': ['存货', '存货净额'],

  // Non-Current Assets
  '非流动资产合计': ['非流动资产合计', '非流动资产总计'],
  '长期投资': ['长期投资', '长期股权投资'],
  '固定资产': ['固定资产', '固定资产净额'],
  '无形资产': ['无形资产', '无形资产净额'],
  '商誉': ['商誉'],

  // Total Assets
  '资产总计': ['资产总计', '资产合计', '总资产'],

  // Current Liabilities
  '流动负债合计': ['流动负债合计', '流动负债总计'],
  '短期借款': ['短期借款'],
  '应付账款': ['应付账款'],
  '预收款项': ['预收款项', '预收账款'],
  '应付职工薪酬': ['应付职工薪酬'],
  '应交税费': ['应交税费'],

  // Non-Current Liabilities
  '非流动负债合计': ['非流动负债合计', '非流动负债总计'],
  '长期借款': ['长期借款'],
  '应付债券': ['应付债券'],

  // Total Liabilities
  '负债总计': ['负债总计', '负债合计', '总负债'],

  // Shareholders' Equity
  '所有者权益合计': ['所有者权益合计', '股东权益合计', '所有者权益总计'],
  '实收资本': ['实收资本', '股本'],
  '资本公积': ['资本公积'],
  '盈余公积': ['盈余公积'],
  '未分配利润': ['未分配利润'],
};

/**
 * Standard metric names for income statements
 */
const INCOME_STATEMENT_METRICS = {
  '营业收入': ['营业收入', '主营业务收入', '收入'],
  '营业成本': ['营业成本', '主营业务成本', '成本'],
  '税金及附加': ['税金及附加'],
  '销售费用': ['销售费用'],
  '管理费用': ['管理费用'],
  '研发费用': ['研发费用', 'R&D费用'],
  '财务费用': ['财务费用'],
  '利息费用': ['利息费用', '利息支出'],
  '利息收入': ['利息收入'],
  '投资收益': ['投资收益'],
  '营业利润': ['营业利润'],
  '利润总额': ['利润总额', '税前利润'],
  '所得税费用': ['所得税费用', '所得税'],
  '净利润': ['净利润', '净收益'],
  '基本每股收益': ['基本每股收益'],
  '稀释每股收益': ['稀释每股收益'],
};

/**
 * Extract financial metrics from text
 *
 * This function uses pattern matching to extract financial metrics from
 * structured financial documents like balance sheets and income statements.
 *
 * @param text - Document text
 * @param documentType - Type of financial document
 * @returns Array of extracted metrics
 */
export function extractFinancialMetrics(
  text: string,
  documentType: 'balance_sheet' | 'income_statement' | 'cash_flow'
): FinancialMetric[] {
  const metrics: FinancialMetric[] = [];

  // Select appropriate metric definitions
  const metricDefinitions = documentType === 'balance_sheet'
    ? BALANCE_SHEET_METRICS
    : documentType === 'income_statement'
      ? INCOME_STATEMENT_METRICS
      : {};

  // Pattern for extracting metrics: "metric_name ... number [unit]"
  // Supports formats like:
  // - "货币资金 1,000,000.00 元"
  // - "流动资产合计：2,500,000"
  // - "净利润 500,000.00"

  for (const [standardName, variations] of Object.entries(metricDefinitions)) {
    let found = false; // Track if we've found a match for this standardName

    for (const variation of (variations as string[])) {
      if (found) break; // Skip remaining variations if we've already found this metric

      // Build regex pattern to match metric and value
      // Matches: metric_name [optional punctuation] number [optional unit]
      const pattern = new RegExp(
        `${escapeRegex(variation)}[：:：\\s]*([-]?[\\d,]+\\.?\\d*)\\s*(元|万元|亿元)?`,
        'g'
      );

      const matches = text.matchAll(pattern);

      for (const match of matches) {
        const valueStr = match[1].replace(/,/g, ''); // Remove thousand separators
        const value = parseFloat(valueStr);
        const unit = match[2] || '元';

        if (!isNaN(value)) {
          // Determine section based on metric name
          let section: string | undefined;
          if (standardName.includes('流动资产')) section = '流动资产';
          else if (standardName.includes('非流动资产')) section = '非流动资产';
          else if (standardName.includes('流动负债')) section = '流动负债';
          else if (standardName.includes('非流动负债')) section = '非流动负债';
          else if (standardName.includes('所有者权益')) section = '所有者权益';
          else if (documentType === 'income_statement') section = '利润表';

          metrics.push({
            name: standardName,
            value,
            unit,
            section,
            confidence: 0.9, // High confidence for pattern-matched values
          });

          // Only take first match for each standardName to avoid duplicates
          found = true;
          break;
        }
      }
    }
  }

  return metrics;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Extract year and period from text
 *
 * @param text - Document text
 * @param fileName - Optional file name
 * @returns Extracted year and period
 */
export function extractYearAndPeriod(
  text: string,
  fileName?: string
): { year: string; period: string } {
  // Default values
  let year = new Date().getFullYear().toString();
  let period = 'annual';

  // Try to extract from fileName first
  if (fileName) {
    const yearMatch = fileName.match(/20\d{2}/);
    if (yearMatch) {
      year = yearMatch[0];
    }

    if (fileName.includes('Q1') || fileName.includes('一季度')) period = 'Q1';
    else if (fileName.includes('Q2') || fileName.includes('二季度') || fileName.includes('半年')) period = 'Q2';
    else if (fileName.includes('Q3') || fileName.includes('三季度')) period = 'Q3';
    else if (fileName.includes('Q4') || fileName.includes('四季度')) period = 'Q4';
    else if (fileName.includes('年度') || fileName.includes('annual')) period = 'annual';
  }

  // Try to extract from text content
  const yearPattern = /20\d{2}年/g;
  const yearMatches = text.match(yearPattern);
  if (yearMatches && yearMatches.length > 0) {
    // Use the most frequently occurring year
    const yearCounts: Record<string, number> = {};
    for (const match of yearMatches) {
      const y = match.replace('年', '');
      yearCounts[y] = (yearCounts[y] || 0) + 1;
    }
    const mostFrequentYear = Object.keys(yearCounts).reduce((a, b) =>
      yearCounts[a] > yearCounts[b] ? a : b
    );
    year = mostFrequentYear;
  }

  // Try to extract period from text
  if (text.includes('第一季度') || text.includes('1-3月')) period = 'Q1';
  else if (text.includes('第二季度') || text.includes('1-6月') || text.includes('半年')) period = 'Q2';
  else if (text.includes('第三季度') || text.includes('1-9月')) period = 'Q3';
  else if (text.includes('第四季度') || text.includes('全年') || text.includes('年度')) period = 'annual';

  return { year, period };
}

// ============================================================================
// Regulation Document Extraction
// ============================================================================

/**
 * Extract articles from regulation document
 *
 * Parses regulation documents to extract individual articles with
 * hierarchical structure, keywords, and metadata.
 *
 * @param text - Regulation document text
 * @returns Array of extracted articles
 */
export function extractRegulationArticles(text: string): RegulationArticle[] {
  const articles: RegulationArticle[] = [];

  // Pattern for matching article headers: "第X条", "第X款", etc.
  const articlePattern = /第[一二三四五六七八九十百千零0-9]+条/g;
  const matches = text.matchAll(articlePattern);

  const articlePositions: Array<{ number: string; index: number }> = [];

  for (const match of matches) {
    if (match.index !== undefined) {
      articlePositions.push({
        number: match[0],
        index: match.index,
      });
    }
  }

  // Extract content for each article
  for (let i = 0; i < articlePositions.length; i++) {
    const current = articlePositions[i];
    const next = articlePositions[i + 1];

    // Extract content from current article to next article (or end of text)
    const endIndex = next ? next.index : text.length;
    const articleText = text.substring(current.index, endIndex).trim();

    // Try to extract title (text between article number and content)
    const titleMatch = articleText.match(/^第[一二三四五六七八九十百千零0-9]+条\s*([^\n]*)/);
    const title = titleMatch ? titleMatch[1].trim() : undefined;

    // Extract keywords (simple approach: extract nouns and key terms)
    const keywords = extractKeywords(articleText);

    articles.push({
      articleNumber: current.number,
      title,
      content: articleText,
      keywords,
    });
  }

  return articles;
}

/**
 * Extract keywords from text
 *
 * Simple keyword extraction using common Chinese financial and legal terms.
 *
 * @param text - Text to extract keywords from
 * @returns Array of keywords
 */
export function extractKeywords(text: string): string[] {
  // Common keywords to look for
  const commonKeywords = [
    // Tax-related
    '增值税', '税率', '税额', '纳税', '征税', '免税', '退税', '抵扣',
    // Accounting-related
    '会计', '准则', '计量', '确认', '披露', '报表',
    // Financial terms
    '资产', '负债', '收入', '费用', '利润', '成本',
    // Legal terms
    '规定', '应当', '可以', '禁止', '必须', '违反',
    // Time-related
    '之日起', '有效期', '施行', '废止',
    // Percentage and numbers
    '13%', '9%', '6%', '3%', '0%',
  ];

  const keywords: string[] = [];

  for (const keyword of commonKeywords) {
    if (text.includes(keyword)) {
      keywords.push(keyword);
    }
  }

  // Remove duplicates
  return [...new Set(keywords)];
}

// ============================================================================
// High-Level Extraction Functions
// ============================================================================

/**
 * Perform structured extraction on a document
 *
 * This is the main entry point for structured extraction. It:
 * 1. Classifies the document type
 * 2. Routes to appropriate extraction function
 * 3. Returns structured data
 *
 * @param text - Document text
 * @param fileName - Optional file name
 * @param explicitType - Optional explicit document type (overrides classification)
 * @returns Extraction result
 */
export async function performStructuredExtraction(
  text: string,
  fileName?: string,
  explicitType?: DocumentType
): Promise<ExtractionResult> {
  // Classify document type if not explicitly provided
  const detectedType = explicitType ?? classifyDocumentType(text, fileName).type;

  // Route to appropriate extraction function
  switch (detectedType) {
    case 'balance_sheet':
    case 'income_statement':
    case 'cash_flow':
      return extractFinancialDocument(text, detectedType, fileName);

    case 'regulation':
    case 'accounting_standard':
    case 'policy':
      return extractRegulationDocument(text, fileName);

    case 'contract':
      return extractContractDocument(text, fileName);

    case 'invoice':
    case 'voucher':
    case 'financial_report':
    case 'account_detail':
    case 'business_info':
    case 'general':
    default:
      return extractGeneralDocument(text, detectedType, fileName);
  }
}

/**
 * Extract financial document (balance sheet, income statement, cash flow)
 */
function extractFinancialDocument(
  text: string,
  documentType: 'balance_sheet' | 'income_statement' | 'cash_flow',
  fileName?: string
): FinancialExtractionResult {
  const { year, period } = extractYearAndPeriod(text, fileName);
  const metrics = extractFinancialMetrics(text, documentType);

  // Generate summary
  const summary = `提取了 ${metrics.length} 个财务指标 (${year}年 ${period})`;

  // Calculate overall confidence
  const avgConfidence = metrics.length > 0
    ? metrics.reduce((sum, m) => sum + m.confidence, 0) / metrics.length
    : 0.5;

  return {
    documentType,
    year,
    period,
    metrics,
    summary,
    confidence: avgConfidence,
    metadata: {
      currency: 'CNY',
      unit: '元',
    },
  };
}

/**
 * Extract regulation document
 */
function extractRegulationDocument(
  text: string,
  fileName?: string
): RegulationExtractionResult {
  const articles = extractRegulationArticles(text);

  // Try to extract regulation name from beginning of text
  const lines = text.split('\n').filter(line => line.trim());
  const regulationName = fileName || (lines.length > 0 ? lines[0].trim() : '未命名法规');

  const summary = `提取了 ${articles.length} 个条款`;

  const avgConfidence = 0.85;

  return {
    documentType: 'regulation',
    regulationName,
    articles,
    summary,
    confidence: avgConfidence,
    metadata: {},
  };
}

/**
 * Extract contract document
 */
function extractContractDocument(
  text: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fileName?: string
): ContractExtractionResult {
  // Basic contract extraction (can be enhanced with more sophisticated parsing)
  const clauses: ContractClause[] = [];

  // Try to extract parties
  const parties: string[] = [];
  const partyPattern = /(甲方|乙方|丙方)[：:：\s]*([^\n，,。.]+)/g;
  const partyMatches = text.matchAll(partyPattern);

  for (const match of partyMatches) {
    parties.push(match[2].trim());
  }

  // Extract major sections as clauses
  const clausePattern = /第[一二三四五六七八九十0-9]+条/g;
  const clauseMatches = text.matchAll(clausePattern);

  const clausePositions: Array<{ number: string; index: number }> = [];
  for (const match of clauseMatches) {
    if (match.index !== undefined) {
      clausePositions.push({
        number: match[0],
        index: match.index,
      });
    }
  }

  for (let i = 0; i < clausePositions.length; i++) {
    const current = clausePositions[i];
    const next = clausePositions[i + 1];
    const endIndex = next ? next.index : text.length;
    const content = text.substring(current.index, endIndex).trim();

    clauses.push({
      clauseNumber: current.number,
      content,
    });
  }

  return {
    documentType: 'contract',
    parties,
    clauses,
    summary: `提取了 ${clauses.length} 个条款，识别 ${parties.length} 个合同方`,
    confidence: 0.7,
    metadata: {},
  };
}

/**
 * Extract general document
 */
function extractGeneralDocument(
  text: string,
  documentType: 'general' | 'invoice' | 'voucher' | 'financial_report' | 'account_detail' | 'accounting_standard' | 'policy' | 'business_info',
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  fileName?: string
): GeneralExtractionResult {
  // Basic key-value extraction for general documents
  const extractedData: Record<string, unknown> = {};

  // Try to extract date
  const datePattern = /(\d{4})年(\d{1,2})月(\d{1,2})日/;
  const dateMatch = text.match(datePattern);
  if (dateMatch) {
    extractedData.date = `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`;
  }

  // Try to extract amounts
  const amountPattern = /(?:金额|总额|合计)[：:：\s]*([\d,]+\.?\d*)\s*(元|万元)?/g;
  const amountMatches = text.matchAll(amountPattern);
  const amounts: number[] = [];

  for (const match of amountMatches) {
    const value = parseFloat(match[1].replace(/,/g, ''));
    if (!isNaN(value)) {
      amounts.push(value);
    }
  }

  if (amounts.length > 0) {
    extractedData.amounts = amounts;
  }

  return {
    documentType,
    extractedData,
    summary: `文档类型: ${documentType}`,
    confidence: 0.6,
    metadata: {},
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Validate extraction result
 *
 * @param result - Extraction result to validate
 * @returns Validation result with errors (if any)
 */
export function validateExtractionResult(result: ExtractionResult): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check confidence threshold
  if (result.confidence < 0.3) {
    errors.push('Confidence score too low');
  }

  // Type-specific validation
  if (result.documentType === 'balance_sheet' ||
    result.documentType === 'income_statement' ||
    result.documentType === 'cash_flow') {
    if (result.metrics.length === 0) {
      errors.push('No metrics extracted from financial document');
    }
  }

  if (result.documentType === 'regulation') {
    if (result.articles.length === 0) {
      errors.push('No articles extracted from regulation document');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Format metric name with hierarchical structure
 *
 * @param section - Section name (e.g., "流动资产")
 * @param metricName - Metric name (e.g., "货币资金")
 * @returns Formatted name (e.g., "流动资产.货币资金")
 */
export function formatMetricName(section: string | undefined, metricName: string): string {
  if (section && !metricName.includes(section)) {
    return `${section}.${metricName}`;
  }
  return metricName;
}

/**
 * Convert Chinese numbers to Arabic numbers
 *
 * @param chineseNum - Chinese number (e.g., "十三")
 * @returns Arabic number (e.g., 13)
 */
export function chineseToArabic(chineseNum: string): number {
  const chineseDigits: Record<string, number> = {
    '零': 0, '一': 1, '二': 2, '三': 3, '四': 4,
    '五': 5, '六': 6, '七': 7, '八': 8, '九': 9,
    '十': 10, '百': 100, '千': 1000,
  };

  let result = 0;
  let temp = 0;
  let unit = 1;

  for (let i = chineseNum.length - 1; i >= 0; i--) {
    const char = chineseNum[i];
    const digit = chineseDigits[char];

    if (digit === undefined) continue;

    if (digit >= 10) {
      unit = digit;
      if (temp === 0) temp = 1;
    } else {
      temp = digit;
    }

    if (temp > 0) {
      result += temp * unit;
      temp = 0;
      if (digit < 10) unit = 1;
    }
  }

  return result;
}
