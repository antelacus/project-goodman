/**
 * Report type definitions for financial analysis reports
 * v4.2: Created for report-generation feature
 */

/**
 * Complete report content structure
 */
export interface ReportContent {
  title: string;                    // "2024年度财务综合分析报告"
  generatedAt: string;              // ISO timestamp
  year: string;                     // "2024"
  comparisonYear?: string;          // "2023"

  sections: ReportSection[];        // 5 sections

  summary: ReportSummary;
}

/**
 * Executive summary with key findings
 */
export interface ReportSummary {
  keyFindings: string[];          // Key findings (3-5 items)
  riskWarnings: string[];         // Risk warnings (0-3 items)
  recommendations: string[];      // Improvement suggestions (3-5 items)
}

/**
 * Report section (chapter)
 */
export interface ReportSection {
  id: ReportSectionId;              // 'liquidity', 'solvency', etc.
  title: string;                    // '流动性分析'
  metrics: ReportMetric[];          // Metrics for this section
  analysis: string;                 // LLM-generated analysis text
  sourceDocuments: ReportSourceReference[];
}

/**
 * Valid section IDs
 */
export type ReportSectionId =
  | 'liquidity'
  | 'solvency'
  | 'profitability'
  | 'efficiency'
  | 'comprehensive';

/**
 * Single metric in a report
 */
export interface ReportMetric {
  name: string;                     // '流动比率'
  toolName: string;                 // 'current_ratio'
  value: number;                    // 2.15
  formatted: string;                // "2.15倍"
  previousValue?: number;           // 1.87 (comparison year)
  change?: string;                  // "+14.97%" or "N/A (数据不足)"
  interpretation?: string;          // Brief interpretation
  warnings?: string[];              // Warning messages
  sourceDocumentIds?: string[];     // Source document IDs for traceability
}

/**
 * Source document reference for traceability
 */
export interface ReportSourceReference {
  documentId: string;
  documentName: string;
  documentType: string;
  year?: string;
  period?: string;
  fileUrl?: string;
}

/**
 * Report type enumeration
 */
export type ReportType = 'comprehensive_financial';

/**
 * Owner type for reports (matches database schema)
 */
export type ReportOwnerType = 'system' | 'admin' | 'user' | 'guest';

/**
 * Report record from database (for lists)
 */
export interface ReportListItem {
  id: string;
  title: string;
  year: string;
  comparisonYear?: string;
  summaryText?: string;
  createdAt: string;
}

/**
 * Full report record from database
 */
export interface ReportRecord {
  id: string;
  title: string;
  reportType: ReportType;
  year: string;
  comparisonYear?: string;
  content: ReportContent;
  summaryText?: string;
  pdfStoragePath?: string;
  generationTimeMs?: number;
  createdAt: string;
  updatedAt: string;
  ownerId?: string;
  ownerType: ReportOwnerType;
}
