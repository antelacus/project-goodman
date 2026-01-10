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
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={18} className="text-blue-600" />
            <h4 className="font-medium text-blue-900">关键发现</h4>
          </div>
          <ul className="space-y-2">
            {keyFindings.map((finding, idx) => (
              <li
                key={idx}
                className="text-sm text-blue-800 flex items-start gap-2"
              >
                <span className="text-blue-400 mt-1">•</span>
                <span>{finding}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Risk Warnings */}
      {riskWarnings.length > 0 && (
        <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={18} className="text-amber-600" />
            <h4 className="font-medium text-amber-900">风险警示</h4>
          </div>
          <ul className="space-y-2">
            {riskWarnings.map((warning, idx) => (
              <li
                key={idx}
                className="text-sm text-amber-800 flex items-start gap-2"
              >
                <span className="text-amber-400 mt-1">•</span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-green-50 rounded-lg p-4 border border-green-100">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb size={18} className="text-green-600" />
            <h4 className="font-medium text-green-900">改进建议</h4>
          </div>
          <ul className="space-y-2">
            {recommendations.map((rec, idx) => (
              <li
                key={idx}
                className="text-sm text-green-800 flex items-start gap-2"
              >
                <span className="text-green-400 mt-1">•</span>
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
