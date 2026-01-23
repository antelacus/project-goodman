'use client';

import React from 'react';
import { AlertTriangle, Lightbulb, TrendingUp } from 'lucide-react';
import type { ReportSummary as ReportSummaryType } from '@/types/report';

interface ReportSummaryProps {
  summary: ReportSummaryType;
}

/**
 * Executive summary component displaying key findings, risk warnings, and recommendations
 */
export const ReportSummary: React.FC<ReportSummaryProps> = ({ summary }) => {
  const { keyFindings, riskWarnings, recommendations } = summary;

  return (
    <div className="space-y-4">
      {/* Key Findings */}
      {keyFindings.length > 0 && (
        <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={18} className="text-yellow-600" />
            <h4 className="font-medium text-neutral-900">关键发现</h4>
          </div>
          <ul className="space-y-2">
            {keyFindings.map((finding, idx) => (
              <li
                key={idx}
                className="text-sm text-neutral-700 flex items-start gap-2"
              >
                <span className="text-yellow-500 mt-1">•</span>
                <span>{finding}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Risk Warnings */}
      {riskWarnings.length > 0 && (
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className="text-yellow-700" />
            <h4 className="font-medium text-yellow-900">风险警示</h4>
          </div>
          <ul className="space-y-2">
            {riskWarnings.map((warning, idx) => (
              <li
                key={idx}
                className="text-sm text-yellow-800 flex items-start gap-2"
              >
                <span className="text-yellow-600 mt-1">•</span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-neutral-50 rounded-lg p-4 border border-neutral-200">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={18} className="text-yellow-600" />
            <h4 className="font-medium text-neutral-900">改进建议</h4>
          </div>
          <ul className="space-y-2">
            {recommendations.map((rec, idx) => (
              <li
                key={idx}
                className="text-sm text-neutral-700 flex items-start gap-2"
              >
                <span className="text-yellow-500 mt-1">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ReportSummary;
