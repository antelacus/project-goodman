/**
 * DOCX Generator for Financial Analysis Reports
 *
 * Generates editable DOCX documents from structured report content.
 * v4.6: Added for performance-optimization DOCX export.
 *
 * ⚠️ SERVER-SIDE ONLY ⚠️
 */

import 'server-only';

if (typeof window !== 'undefined') {
  throw new Error('[SECURITY] docx-generator.ts must not be imported in client-side code.');
}

import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import type { ReportContent, ReportMetric, ReportSection, ReportSourceReference } from '@/types/report';
import { formatReportMetricPreviousValue, formatReportMetricValue } from './formatting';

const DOCX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function buildTextParagraph(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun(text)],
  });
}

type DocxHeadingLevel = (typeof HeadingLevel)[keyof typeof HeadingLevel];

function buildHeading(text: string, level: DocxHeadingLevel): Paragraph {
  return new Paragraph({
    text,
    heading: level,
  });
}

function buildBulletList(items: string[]): Paragraph[] {
  return items.map(item => new Paragraph({
    text: item,
    bullet: { level: 0 },
  }));
}

function buildTableCell(text: string, bold = false): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold })],
      }),
    ],
  });
}

function buildMetricsTable(metrics: ReportMetric[]): Table {
  const rows: TableRow[] = [
    new TableRow({
      children: [
        buildTableCell('指标', true),
        buildTableCell('本期', true),
        buildTableCell('上期', true),
        buildTableCell('变动', true),
      ],
    }),
    ...metrics.map(metric => new TableRow({
      children: [
        buildTableCell(metric.name),
        buildTableCell(formatReportMetricValue(metric)),
        buildTableCell(formatReportMetricPreviousValue(metric)),
        buildTableCell(metric.change || '—'),
      ],
    })),
  ];

  return new Table({
    rows,
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
  });
}

function buildAnalysisParagraphs(text: string): Paragraph[] {
  return text
    .split(/\n+/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => buildTextParagraph(line));
}

function buildSourceList(sources: ReportSourceReference[]): Paragraph[] {
  return sources.map(source => new Paragraph({
    text: `${source.documentName}${source.year ? `（${source.year}）` : ''}`,
    bullet: { level: 0 },
  }));
}

function buildSectionContent(section: ReportSection): Array<Paragraph | Table> {
  const children: Array<Paragraph | Table> = [];

  children.push(buildHeading(section.title, HeadingLevel.HEADING_1));

  if (section.metrics.length > 0) {
    children.push(buildHeading('关键指标', HeadingLevel.HEADING_2));
    children.push(buildMetricsTable(section.metrics));
  }

  if (section.analysis) {
    children.push(buildHeading('分析解读', HeadingLevel.HEADING_2));
    children.push(...buildAnalysisParagraphs(section.analysis));
  }

  if (section.sourceDocuments.length > 0) {
    children.push(buildHeading('来源', HeadingLevel.HEADING_2));
    children.push(...buildSourceList(section.sourceDocuments));
  }

  return children;
}

function buildSummarySection(report: ReportContent): Paragraph[] {
  const summaryParagraphs: Paragraph[] = [];

  summaryParagraphs.push(buildHeading('执行摘要', HeadingLevel.HEADING_1));

  if (report.summary.status === 'not_generated') {
    summaryParagraphs.push(buildTextParagraph(report.summary.reason ?? ''));
    return summaryParagraphs;
  }

  if (report.summary.keyFindings.length > 0) {
    summaryParagraphs.push(buildHeading('关键发现', HeadingLevel.HEADING_2));
    summaryParagraphs.push(...buildBulletList(report.summary.keyFindings));
  }

  if (report.summary.riskWarnings.length > 0) {
    summaryParagraphs.push(buildHeading('风险提示', HeadingLevel.HEADING_2));
    summaryParagraphs.push(...buildBulletList(report.summary.riskWarnings));
  }

  if (report.summary.recommendations.length > 0) {
    summaryParagraphs.push(buildHeading('改进建议', HeadingLevel.HEADING_2));
    summaryParagraphs.push(...buildBulletList(report.summary.recommendations));
  }

  return summaryParagraphs;
}

export async function generateReportDocx(report: ReportContent): Promise<Buffer> {
  const startTime = Date.now();

  const children: Array<Paragraph | Table> = [
    buildHeading(report.title, HeadingLevel.TITLE),
    buildTextParagraph(`报告年度：${report.year}${report.comparisonYear ? `（对比 ${report.comparisonYear}）` : ''}`),
    buildTextParagraph(`生成时间：${report.generatedAt}`),
    ...buildSummarySection(report),
  ];

  report.sections.forEach(section => {
    children.push(...buildSectionContent(section));
  });

  const doc = new Document({
    sections: [
      {
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const duration = Date.now() - startTime;

  console.log(`[ReportDocx] Generated DOCX in ${duration}ms, size: ${buffer.length} bytes`);

  return buffer;
}

export const DOCX_CONTENT_TYPE = DOCX_MIME_TYPE;
