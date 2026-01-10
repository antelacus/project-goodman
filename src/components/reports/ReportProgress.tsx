'use client';

import React from 'react';
import { Check, Loader2, Circle } from 'lucide-react';
import type { PhaseDisplayInfo, ReportPhase } from '@/types/report-events';

interface ReportProgressProps {
  phases: PhaseDisplayInfo[];
  currentSection?: string;
  error?: string;
}

/**
 * Progress indicator showing report generation phases
 */
export const ReportProgress: React.FC<ReportProgressProps> = ({
  phases,
  currentSection,
  error,
}) => {
  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-4 shadow-sm">
      <h3 className="text-sm font-medium text-neutral-700 mb-4">
        正在生成报告...
      </h3>

      {/* Phase Progress */}
      <div className="space-y-3">
        {phases.map((phase, index) => (
          <PhaseItem
            key={phase.id}
            phase={phase}
            isLast={index === phases.length - 1}
          />
        ))}
      </div>

      {/* Current Section Indicator */}
      {currentSection && (
        <div className="mt-4 pt-3 border-t border-neutral-100">
          <div className="flex items-center gap-2 text-sm text-neutral-600">
            <Loader2 size={14} className="animate-spin text-blue-500" />
            <span>正在分析: {getSectionLabel(currentSection)}</span>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
};

/**
 * Individual phase item
 */
interface PhaseItemProps {
  phase: PhaseDisplayInfo;
  isLast: boolean;
}

const PhaseItem: React.FC<PhaseItemProps> = ({ phase, isLast }) => {
  const statusConfig = {
    pending: {
      icon: Circle,
      iconClass: 'text-neutral-300',
      textClass: 'text-neutral-400',
      lineClass: 'bg-neutral-200',
    },
    in_progress: {
      icon: Loader2,
      iconClass: 'text-blue-500 animate-spin',
      textClass: 'text-blue-600 font-medium',
      lineClass: 'bg-blue-200',
    },
    completed: {
      icon: Check,
      iconClass: 'text-green-500',
      textClass: 'text-neutral-700',
      lineClass: 'bg-green-400',
    },
  };

  const config = statusConfig[phase.status];
  const Icon = config.icon;

  return (
    <div className="flex items-start gap-3">
      {/* Icon and Line */}
      <div className="flex flex-col items-center">
        <div className={`flex items-center justify-center w-6 h-6`}>
          <Icon size={18} className={config.iconClass} />
        </div>
        {!isLast && (
          <div
            className={`w-0.5 h-6 mt-1 ${config.lineClass}`}
          />
        )}
      </div>

      {/* Label */}
      <div className={`text-sm pt-0.5 ${config.textClass}`}>
        {phase.label}
      </div>
    </div>
  );
};

/**
 * Get display label for section ID
 */
function getSectionLabel(sectionId: string): string {
  const labels: Record<string, string> = {
    liquidity: '流动性分析',
    solvency: '偿债能力分析',
    profitability: '盈利能力分析',
    efficiency: '运营效率分析',
    comprehensive: '综合评价与建议',
  };
  return labels[sectionId] || sectionId;
}

export default ReportProgress;
