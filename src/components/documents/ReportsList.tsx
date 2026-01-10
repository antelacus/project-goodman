'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Download, Calendar, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import type { ReportListItem } from '@/types/report';

/**
 * ReportsList component for displaying saved financial analysis reports
 * v4.2: Created for documents page integration
 */
export function ReportsList() {
  const [reports, setReports] = useState<ReportListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Fetch reports on mount
  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/reports', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '获取报告列表失败');
      }

      const data = await response.json();
      setReports(data.data?.reports || []);
    } catch (err) {
      console.error('[ReportsList] Fetch error:', err);
      setError(err instanceof Error ? err.message : '加载报告列表时出错');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Handle PDF download
  const handleDownloadPdf = useCallback(async (reportId: string) => {
    setDownloadingId(reportId);

    try {
      const response = await fetch(`/api/reports/${reportId}/pdf`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '获取下载链接失败');
      }

      const data = await response.json();
      const pdfUrl = data.data?.url;

      if (pdfUrl) {
        // Open PDF in new tab or trigger download
        window.open(pdfUrl, '_blank');
      } else {
        throw new Error('未获取到下载链接');
      }
    } catch (err) {
      console.error('[ReportsList] Download error:', err);
      alert(err instanceof Error ? err.message : '下载失败');
    } finally {
      setDownloadingId(null);
    }
  }, []);

  // Format date for display
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '-';
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8 text-gray-500">
        <Loader2 className="animate-spin mr-2" size={20} />
        加载中...
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-500">
        <div className="flex items-center gap-2 text-red-500 mb-2">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
        <button
          onClick={fetchReports}
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          <RefreshCw size={14} />
          重试
        </button>
      </div>
    );
  }

  // Empty state
  if (reports.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <FileText size={32} className="mx-auto mb-2 opacity-50" />
        <p>暂无分析报告</p>
        <p className="text-sm mt-1">在工作台聊天区生成报告后将显示在此处</p>
      </div>
    );
  }

  // Reports list
  return (
    <div className="space-y-3">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-500">
          共 {reports.length} 份报告
        </span>
        <button
          onClick={fetchReports}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          title="刷新列表"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Report cards */}
      <div className="grid gap-4">
        {reports.map((report) => (
          <div
            key={report.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm transition-all"
          >
            <div className="flex items-start justify-between">
              {/* Report info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <FileText size={18} className="text-blue-600 flex-shrink-0" />
                  <h4 className="font-medium text-gray-900 truncate">
                    {report.title}
                  </h4>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar size={14} />
                    {report.year}年度
                    {report.comparisonYear && ` vs ${report.comparisonYear}年`}
                  </span>
                  <span>
                    {formatDate(report.createdAt)}
                  </span>
                </div>

                {report.summaryText && (
                  <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                    {report.summaryText}
                  </p>
                )}
              </div>

              {/* Download button */}
              <button
                onClick={() => handleDownloadPdf(report.id)}
                disabled={downloadingId === report.id}
                className="flex-shrink-0 ml-4 px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 text-sm"
                title="下载 PDF"
              >
                {downloadingId === report.id ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    下载中
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    PDF
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ReportsList;
