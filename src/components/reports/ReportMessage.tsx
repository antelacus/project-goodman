'use client';

import React, { useState, useCallback, memo } from 'react';
import { FileText, Calendar, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { ReportSummary } from './ReportSummary';
import { ReportSection } from './ReportSection';
import { ReportActions } from './ReportActions';
import type { ReportContent } from '@/types/report';

interface ReportMessageProps {
  report: ReportContent;
  onSave?: () => void;
  isSaving?: boolean;
  savedDocxUrl?: string;
  savedReportId?: string;
}

/**
 * Main report message component displayed in chat
 * Features collapsible sections and save/export actions
 */
export const ReportMessage: React.FC<ReportMessageProps> = ({
  report,
  onSave,
  isSaving = false,
  savedDocxUrl,
  savedReportId,
}) => {
  // Track which sections are expanded (first section expanded by default)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set([report.sections[0]?.id])
  );

  // Toggle section expansion
  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  // Expand/collapse all sections
  const [allExpanded, setAllExpanded] = useState(false);
  const toggleAll = useCallback(() => {
    if (allExpanded) {
      setExpandedSections(new Set());
    } else {
      setExpandedSections(new Set(report.sections.map((s) => s.id)));
    }
    setAllExpanded(!allExpanded);
  }, [allExpanded, report.sections]);

  const hasComparison = !!report.comparisonYear;
  const generatedDate = new Date(report.generatedAt);

  return (
    <div className="bg-white border border-neutral-200 rounded-xl shadow-sm overflow-hidden">
      {/* Report Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-white">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <FileText size={24} />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{report.title}</h2>
              <div className="flex items-center gap-4 mt-1 text-sm text-blue-100">
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  {report.year}年度
                  {hasComparison && ` (对比 ${report.comparisonYear}年)`}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={14} />
                  {formatDate(generatedDate)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="p-6 space-y-6">
        {/* Executive Summary */}
        <div>
          <h3 className="text-base font-medium text-neutral-800 mb-3">
            执行摘要
          </h3>
          <ReportSummary summary={report.summary} />
        </div>

        {/* Sections */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-medium text-neutral-800">
              详细分析
            </h3>
            <button
              onClick={toggleAll}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              {allExpanded ? (
                <>
                  <ChevronUp size={14} />
                  全部收起
                </>
              ) : (
                <>
                  <ChevronDown size={14} />
                  全部展开
                </>
              )}
            </button>
          </div>

          <div className="space-y-3">
            {report.sections.map((section, index) => (
              <ReportSection
                key={section.id}
                section={section}
                index={index}
                isExpanded={expandedSections.has(section.id)}
                onToggle={() => toggleSection(section.id)}
                hasComparison={hasComparison}
                comparisonYear={report.comparisonYear}
                primaryYear={report.year}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <ReportActions
          onSave={onSave}
          isSaving={isSaving}
          savedDocxUrl={savedDocxUrl}
          savedReportId={savedReportId}
        />
      </div>

      {/* Footer */}
      <div className="bg-neutral-50 px-6 py-3 border-t border-neutral-200">
        <p className="text-xs text-neutral-500 text-center">
          本报告由 AI 自动生成，仅供参考。如需作出重要财务决策，请咨询专业人士。
        </p>
      </div>
    </div>
  );
};

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default memo(ReportMessage);
