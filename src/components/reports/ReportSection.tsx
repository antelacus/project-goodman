'use client';

import React from 'react';
import { ChevronDown, ChevronRight, FileText, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { ReportSection as ReportSectionType, ReportMetric } from '@/types/report';

interface ReportSectionProps {
  section: ReportSectionType;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  hasComparison: boolean;
  comparisonYear?: string;
  primaryYear: string;
}

/**
 * Collapsible report section component with metrics table and analysis
 */
export const ReportSection: React.FC<ReportSectionProps> = ({
  section,
  index,
  isExpanded,
  onToggle,
  hasComparison,
  comparisonYear,
  primaryYear,
}) => {
  const sectionNumber = index + 1;

  return (
    <div className="border border-neutral-200 rounded-lg overflow-hidden">
      {/* Section Header - Clickable */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-neutral-50 hover:bg-neutral-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-yellow-500 text-black text-sm font-medium">
            {sectionNumber}
          </span>
          <h3 className="font-medium text-neutral-900">{section.title}</h3>
          <span className="text-sm text-neutral-500">
            ({section.metrics.length} 项指标)
          </span>
        </div>
        {isExpanded ? (
          <ChevronDown size={20} className="text-neutral-500" />
        ) : (
          <ChevronRight size={20} className="text-neutral-500" />
        )}
      </button>

      {/* Section Content - Expandable */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Metrics Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left py-2 px-3 font-medium text-neutral-600">
                    指标名称
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-neutral-600">
                    {primaryYear}年
                  </th>
                  {hasComparison && (
                    <>
                      <th className="text-right py-2 px-3 font-medium text-neutral-600">
                        {comparisonYear}年
                      </th>
                      <th className="text-right py-2 px-3 font-medium text-neutral-600">
                        变化
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {section.metrics.map((metric, idx) => (
                  <MetricRow
                    key={metric.toolName}
                    metric={metric}
                    hasComparison={hasComparison}
                    isOdd={idx % 2 === 1}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Analysis Text */}
          {section.analysis && (
            <div className="bg-neutral-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-neutral-700 mb-2">分析</h4>
              <p className="text-sm text-neutral-600 leading-relaxed whitespace-pre-wrap">
                {section.analysis}
              </p>
            </div>
          )}

          {/* Source Documents */}
          {section.sourceDocuments && section.sourceDocuments.length > 0 && (
            <div className="text-xs text-neutral-500">
              <span className="font-medium">数据来源：</span>
              {section.sourceDocuments.map((doc, idx) => (
                <span key={doc.documentId}>
                  {idx > 0 && '、'}
                  <span className="inline-flex items-center gap-1">
                    <FileText size={12} />
                    {doc.documentName}
                    {doc.year && ` (${doc.year})`}
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Single metric row in the table
 */
interface MetricRowProps {
  metric: ReportMetric;
  hasComparison: boolean;
  isOdd: boolean;
}

const MetricRow: React.FC<MetricRowProps> = ({ metric, hasComparison, isOdd }) => {
  const changeInfo = parseChange(metric.change);

  return (
    <tr className={isOdd ? 'bg-neutral-50' : ''}>
      <td className="py-2 px-3 text-neutral-800">
        <div className="flex items-center gap-2">
          {metric.name}
          {metric.warnings && metric.warnings.length > 0 && (
            <span className="text-yellow-600 text-xs">⚠</span>
          )}
        </div>
        {metric.interpretation && (
          <div className="text-xs text-neutral-500 mt-0.5">
            {metric.interpretation}
          </div>
        )}
      </td>
      <td className="py-2 px-3 text-right font-mono text-neutral-800">
        {metric.formatted}
      </td>
      {hasComparison && (
        <>
          <td className="py-2 px-3 text-right font-mono text-neutral-500">
            {metric.previousValue !== undefined
              ? formatPreviousValue(metric)
              : '-'
            }
          </td>
          <td className="py-2 px-3 text-right">
            <ChangeDisplay changeInfo={changeInfo} />
          </td>
        </>
      )}
    </tr>
  );
};

/**
 * Format previous value using similar format as current
 */
function formatPreviousValue(metric: ReportMetric): string {
  if (metric.previousValue === undefined) return '-';

  // Extract the unit/suffix from formatted value
  const match = metric.formatted.match(/[\u4e00-\u9fa5%]+$/);
  const suffix = match ? match[0] : '';

  // Format the number
  const formatted = typeof metric.previousValue === 'number'
    ? metric.previousValue.toFixed(2)
    : String(metric.previousValue);

  return formatted + suffix;
}

/**
 * Parse change string to determine direction and value
 */
interface ChangeInfo {
  direction: 'up' | 'down' | 'neutral' | 'na';
  display: string;
}

function parseChange(change?: string): ChangeInfo {
  if (!change || change.includes('N/A') || change.includes('数据不足')) {
    return { direction: 'na', display: change || '-' };
  }

  if (change.startsWith('+') || change.startsWith('↑')) {
    return { direction: 'up', display: change };
  }

  if (change.startsWith('-') || change.startsWith('↓')) {
    return { direction: 'down', display: change };
  }

  // Check if the numeric value is 0
  const numMatch = change.match(/([-+]?\d+\.?\d*)/);
  if (numMatch && parseFloat(numMatch[1]) === 0) {
    return { direction: 'neutral', display: change };
  }

  return { direction: 'neutral', display: change };
}

/**
 * Display change with appropriate styling
 */
const ChangeDisplay: React.FC<{ changeInfo: ChangeInfo }> = ({ changeInfo }) => {
  const { direction, display } = changeInfo;

  if (direction === 'na') {
    return <span className="text-neutral-400 text-sm">{display}</span>;
  }

  const colorClass = {
    up: 'text-yellow-700',
    down: 'text-red-600',
    neutral: 'text-neutral-500',
  }[direction];

  const Icon = {
    up: TrendingUp,
    down: TrendingDown,
    neutral: Minus,
  }[direction];

  return (
    <span className={`inline-flex items-center gap-1 text-sm ${colorClass}`}>
      <Icon size={14} />
      {display}
    </span>
  );
};

export default ReportSection;
