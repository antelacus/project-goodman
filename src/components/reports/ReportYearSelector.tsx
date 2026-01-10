'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, X, FileText, Loader2, AlertCircle } from 'lucide-react';

interface ReportYearSelectorProps {
  onGenerate: (year: string, comparisonYear?: string) => void;
  onCancel: () => void;
  isGenerating?: boolean;
  availableYears?: string[];
}

/**
 * Year selection modal for report generation
 * Allows user to select primary year and optional comparison year
 */
export const ReportYearSelector: React.FC<ReportYearSelectorProps> = ({
  onGenerate,
  onCancel,
  isGenerating = false,
  availableYears: propYears,
}) => {
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [comparisonYear, setComparisonYear] = useState<string>('');
  const [availableYears, setAvailableYears] = useState<string[]>(propYears || []);
  const [isLoadingYears, setIsLoadingYears] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Fetch available years from financial_data
  useEffect(() => {
    if (propYears && propYears.length > 0) return;

    const fetchYears = async () => {
      setIsLoadingYears(true);
      setLoadError(null);
      try {
        const res = await fetch('/api/financial-data/years');
        if (res.ok) {
          const data = await res.json();
          if (data.years && data.years.length > 0) {
            const sortedYears = data.years.sort((a: string, b: string) => b.localeCompare(a));
            setAvailableYears(sortedYears);
            // Default to most recent year
            setSelectedYear(sortedYears[0]);
            // Default comparison to previous year if available
            if (sortedYears.length > 1) {
              setComparisonYear(sortedYears[1]);
            }
          } else {
            setLoadError('系统中暂无财务数据，请先上传财务报表');
          }
        } else {
          setLoadError('获取可用年份失败');
        }
      } catch (error) {
        console.error('Failed to fetch years:', error);
        setLoadError('获取可用年份时发生错误');
      } finally {
        setIsLoadingYears(false);
      }
    };

    fetchYears();
  }, [propYears]);

  const handleGenerate = () => {
    if (!selectedYear) return;
    onGenerate(selectedYear, comparisonYear || undefined);
  };

  const isValid = selectedYear && (!comparisonYear || comparisonYear !== selectedYear);

  return (
    <div className="bg-white border border-neutral-200 rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-4 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="font-medium">生成财务分析报告</h3>
              <p className="text-sm text-blue-100 mt-0.5">选择分析年度</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            disabled={isGenerating}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {isLoadingYears ? (
          <div className="flex items-center justify-center py-8 text-neutral-500">
            <Loader2 size={20} className="animate-spin mr-2" />
            <span>加载可用年份...</span>
          </div>
        ) : loadError ? (
          <div className="flex items-center gap-3 py-8 px-4 bg-amber-50 border border-amber-100 rounded-lg text-amber-700">
            <AlertCircle size={20} />
            <span className="text-sm">{loadError}</span>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Primary Year */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                <Calendar size={14} className="inline mr-1.5" />
                分析年度 <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-4 py-2.5 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-neutral-900"
                disabled={isGenerating}
              >
                <option value="">请选择年度</option>
                {availableYears.map((year) => (
                  <option key={year} value={year}>
                    {year}年
                  </option>
                ))}
              </select>
            </div>

            {/* Comparison Year (Optional) */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-2">
                <Calendar size={14} className="inline mr-1.5" />
                对比年度 <span className="text-neutral-400">(可选)</span>
              </label>
              <select
                value={comparisonYear}
                onChange={(e) => setComparisonYear(e.target.value)}
                className="w-full px-4 py-2.5 border border-neutral-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-neutral-900"
                disabled={isGenerating}
              >
                <option value="">不进行年度对比</option>
                {availableYears
                  .filter((y) => y !== selectedYear)
                  .map((year) => (
                    <option key={year} value={year}>
                      {year}年
                    </option>
                  ))}
              </select>
              <p className="mt-1.5 text-xs text-neutral-500">
                选择对比年度后，报告将显示同比变化分析
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-neutral-100">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg transition-colors"
            disabled={isGenerating}
          >
            取消
          </button>
          <button
            onClick={handleGenerate}
            disabled={!isValid || isGenerating || isLoadingYears || !!loadError}
            className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <FileText size={16} />
                开始生成
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReportYearSelector;
