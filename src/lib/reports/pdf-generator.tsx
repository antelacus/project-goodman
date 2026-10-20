/**
 * PDF Generator for Financial Analysis Reports
 *
 * Uses @react-pdf/renderer to generate professional PDF documents
 * with full Chinese character support via Noto Sans SC font.
 *
 * v4.2: Created for report-generation feature
 *
 * ⚠️ SERVER-SIDE ONLY ⚠️
 * This module uses heavy rendering and should only be called from API routes.
 */

import React from 'react';
import path from 'path';
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  renderToBuffer,
} from '@react-pdf/renderer';
import type { ReportContent, ReportSection, ReportMetric } from '@/types/report';

// ============================================================================
// Font Registration
// ============================================================================

// Get font paths relative to project root
const fontsDir = path.join(process.cwd(), 'public', 'fonts');

// Register Noto Sans SC for Chinese character support
// Using local font files for reliability
Font.register({
  family: 'NotoSansSC',
  fonts: [
    {
      src: path.join(fontsDir, 'NotoSansSC-Regular.otf'),
      fontWeight: 400,
    },
    {
      src: path.join(fontsDir, 'NotoSansSC-Bold.otf'),
      fontWeight: 700,
    },
  ],
});

// Disable hyphenation for Chinese text
Font.registerHyphenationCallback((word) => [word]);

// ============================================================================
// Styles
// ============================================================================

const colors = {
  primary: '#111827',      // Charcoal for headers
  secondary: '#374151',    // Dark gray for text
  accent: '#f59e0b',       // Yellow accent
  muted: '#6b7280',        // Muted gray
  border: '#e5e7eb',       // Light border
  background: '#f9fafb',   // Light background
  success: '#f59e0b',      // Yellow for positive
  warning: '#f59e0b',      // Yellow for warnings
  danger: '#dc2626',       // Red for negative/risks
};

const styles = StyleSheet.create({
  page: {
    fontFamily: 'NotoSansSC',
    fontSize: 10,
    padding: 40,
    color: colors.secondary,
  },

  // Header
  header: {
    marginBottom: 30,
    borderBottom: `2px solid ${colors.primary}`,
    paddingBottom: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 700,
    color: colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 11,
    color: colors.muted,
  },

  // Executive Summary
  summaryContainer: {
    marginBottom: 25,
    padding: 15,
    backgroundColor: colors.background,
    borderRadius: 4,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.primary,
    marginBottom: 12,
  },
  summarySection: {
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: colors.accent,
    marginBottom: 4,
  },
  summaryItem: {
    fontSize: 9,
    color: colors.secondary,
    marginBottom: 3,
    paddingLeft: 8,
  },
  warningItem: {
    fontSize: 9,
    color: colors.danger,
    marginBottom: 3,
    paddingLeft: 8,
  },

  // Section
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.primary,
    marginBottom: 10,
    paddingBottom: 5,
    borderBottom: `1px solid ${colors.border}`,
  },

  // Metrics Table
  table: {
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    padding: 6,
  },
  tableHeaderCell: {
    fontSize: 9,
    fontWeight: 700,
    color: 'white',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottom: `1px solid ${colors.border}`,
    padding: 6,
  },
  tableRowAlt: {
    flexDirection: 'row',
    borderBottom: `1px solid ${colors.border}`,
    padding: 6,
    backgroundColor: colors.background,
  },
  tableCell: {
    fontSize: 9,
    color: colors.secondary,
  },
  tableCellName: {
    width: '30%',
    paddingRight: 5,
  },
  tableCellValue: {
    width: '20%',
    textAlign: 'right',
    paddingRight: 5,
  },
  tableCellPrevious: {
    width: '20%',
    textAlign: 'right',
    paddingRight: 5,
  },
  tableCellChange: {
    width: '30%',
    textAlign: 'right',
  },
  positiveChange: {
    color: colors.success,
  },
  negativeChange: {
    color: colors.danger,
  },

  // Analysis Text
  analysis: {
    fontSize: 9,
    color: colors.secondary,
    lineHeight: 1.6,
    textAlign: 'justify',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTop: `1px solid ${colors.border}`,
    paddingTop: 10,
  },
  footerText: {
    fontSize: 8,
    color: colors.muted,
  },
  pageNumber: {
    fontSize: 8,
    color: colors.muted,
  },
});

// ============================================================================
// PDF Components
// ============================================================================

interface ReportDocumentProps {
  report: ReportContent;
}

/**
 * Executive Summary component
 */
function ExecutiveSummary({ report }: { report: ReportContent }) {
  const { summary } = report;

  if (summary.status === 'not_generated') {
    return (
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryTitle}>执行摘要</Text>
        <Text style={styles.warningItem}>⚠ {summary.reason}</Text>
      </View>
    );
  }

  return (
    <View style={styles.summaryContainer}>
      <Text style={styles.summaryTitle}>执行摘要</Text>

      {/* Key Findings */}
      <View style={styles.summarySection}>
        <Text style={styles.summaryLabel}>关键发现</Text>
        {summary.keyFindings.map((finding, i) => (
          <Text key={i} style={styles.summaryItem}>• {finding}</Text>
        ))}
      </View>

      {/* Risk Warnings */}
      {summary.riskWarnings.length > 0 && (
        <View style={styles.summarySection}>
          <Text style={styles.summaryLabel}>风险警示</Text>
          {summary.riskWarnings.map((warning, i) => (
            <Text key={i} style={styles.warningItem}>⚠ {warning}</Text>
          ))}
        </View>
      )}

      {/* Recommendations */}
      <View style={styles.summarySection}>
        <Text style={styles.summaryLabel}>改进建议</Text>
        {summary.recommendations.map((rec, i) => (
          <Text key={i} style={styles.summaryItem}>• {rec}</Text>
        ))}
      </View>
    </View>
  );
}

/**
 * Metrics Table component
 */
function MetricsTable({
  metrics,
  hasComparison,
}: {
  metrics: ReportMetric[];
  hasComparison: boolean;
}) {
  return (
    <View style={styles.table}>
      {/* Table Header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderCell, styles.tableCellName]}>指标名称</Text>
        <Text style={[styles.tableHeaderCell, styles.tableCellValue]}>当期数值</Text>
        {hasComparison && (
          <>
            <Text style={[styles.tableHeaderCell, styles.tableCellPrevious]}>上期数值</Text>
            <Text style={[styles.tableHeaderCell, styles.tableCellChange]}>变化</Text>
          </>
        )}
      </View>

      {/* Table Rows */}
      {metrics.map((metric, i) => {
        const changeStyle = getChangeStyle(metric.change);
        return (
          <View key={metric.toolName} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
            <Text style={[styles.tableCell, styles.tableCellName]}>{metric.name}</Text>
            <Text style={[styles.tableCell, styles.tableCellValue]}>{metric.formatted}</Text>
            {hasComparison && (
              <>
                <Text style={[styles.tableCell, styles.tableCellPrevious]}>
                  {metric.previousValue !== undefined
                    ? formatMetricValue(metric.previousValue, metric.toolName)
                    : 'N/A'}
                </Text>
                <Text
                  style={
                    changeStyle
                      ? [styles.tableCell, styles.tableCellChange, changeStyle]
                      : [styles.tableCell, styles.tableCellChange]
                  }
                >
                  {metric.change || 'N/A'}
                </Text>
              </>
            )}
          </View>
        );
      })}
    </View>
  );
}

/**
 * Report Section component
 */
function ReportSectionComponent({
  section,
  hasComparison,
}: {
  section: ReportSection;
  hasComparison: boolean;
}) {
  return (
    <View style={styles.section} wrap={false}>
      <Text style={styles.sectionHeader}>{section.title}</Text>
      <MetricsTable metrics={section.metrics} hasComparison={hasComparison} />
      <Text style={styles.analysis}>{section.analysis}</Text>
    </View>
  );
}

/**
 * Main Report Document component
 */
function ReportDocument({ report }: ReportDocumentProps) {
  const hasComparison = !!report.comparisonYear;
  const generatedDate = new Date(report.generatedAt).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{report.title}</Text>
          <Text style={styles.subtitle}>
            生成日期：{generatedDate}
            {hasComparison && ` | 对比年份：${report.comparisonYear}年`}
          </Text>
        </View>

        {/* Executive Summary */}
        <ExecutiveSummary report={report} />

        {/* Sections */}
        {report.sections.map((section) => (
          <ReportSectionComponent
            key={section.id}
            section={section}
            hasComparison={hasComparison}
          />
        ))}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            本报告由 AI 财务助手自动生成，仅供参考
          </Text>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format metric value based on tool name
 */
function formatMetricValue(value: number, toolName: string): string {
  // Ratio metrics
  if (
    toolName.includes('ratio') ||
    toolName.includes('multiplier') ||
    toolName.includes('coverage')
  ) {
    return `${value.toFixed(2)}倍`;
  }

  // Percentage metrics
  if (
    toolName.includes('margin') ||
    toolName.includes('return') ||
    toolName.includes('roe') ||
    toolName.includes('roa')
  ) {
    return `${(value * 100).toFixed(2)}%`;
  }

  // Turnover days
  if (toolName.includes('days')) {
    return `${value.toFixed(0)}天`;
  }

  // Turnover times
  if (toolName.includes('turnover')) {
    return `${value.toFixed(2)}次`;
  }

  // Default
  return value.toFixed(2);
}

/**
 * Get style for change value
 * Returns undefined if no special styling needed
 */
function getChangeStyle(change?: string): typeof styles.positiveChange | undefined {
  if (!change) return undefined;

  if (change.startsWith('+')) {
    return styles.positiveChange;
  }
  if (change.startsWith('-')) {
    return styles.negativeChange;
  }
  return undefined;
}

// ============================================================================
// Main Export Function
// ============================================================================

/**
 * Generate a PDF buffer from a ReportContent object
 *
 * @param report - The report content to render
 * @returns Promise<Buffer> - The generated PDF as a Buffer
 */
export async function generateReportPDF(report: ReportContent): Promise<Buffer> {
  console.log('[PDF] Generating PDF for report:', report.title);
  const startTime = Date.now();

  try {
    const buffer = await renderToBuffer(<ReportDocument report={report} />);

    const duration = Date.now() - startTime;
    console.log(`[PDF] Generated PDF in ${duration}ms, size: ${buffer.length} bytes`);

    return buffer;
  } catch (error) {
    console.error('[PDF] Generation failed:', error);
    throw new Error(`PDF 生成失败: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
