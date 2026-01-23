'use client';

import React from 'react';
import { Save, Download, Loader2, FileDown } from 'lucide-react';

interface ReportActionsProps {
  onSave?: () => void;
  isSaving?: boolean;
  savedDocxUrl?: string;
  savedReportId?: string;
  disabled?: boolean;
}

/**
 * Action buttons for saving report and downloading DOCX
 */
export const ReportActions: React.FC<ReportActionsProps> = ({
  onSave,
  isSaving = false,
  savedDocxUrl,
  savedReportId,
  disabled = false,
}) => {
  const handleDownload = () => {
    if (savedDocxUrl) {
      window.open(savedDocxUrl, '_blank');
    }
  };

  return (
    <div className="flex items-center gap-3 pt-4 border-t border-neutral-200">
      {/* Save Button - shown when not yet saved */}
      {!savedReportId && onSave && (
        <button
          onClick={onSave}
          disabled={disabled || isSaving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500 text-black rounded-lg hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>正在生成DOCX并保存...</span>
            </>
          ) : (
            <>
              <Save size={16} />
              <span>保存报告</span>
            </>
          )}
        </button>
      )}

      {/* Download Button - shown after save */}
      {savedDocxUrl && (
        <button
          onClick={handleDownload}
          className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors"
        >
          <FileDown size={16} />
          <span>下载 DOCX</span>
        </button>
      )}

      {/* Status text when saved */}
      {savedReportId && (
        <span className={`text-sm flex items-center gap-1 ${savedDocxUrl ? 'text-yellow-700' : 'text-gray-600'}`}>
          <Download size={14} />
          {savedDocxUrl ? '报告已保存' : '报告已保存，DOCX 未生成'}
        </span>
      )}

      {savedReportId && !savedDocxUrl && onSave && (
        <button
          onClick={onSave}
          disabled={disabled || isSaving}
          className="inline-flex items-center gap-2 px-3 py-2 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Save size={16} />
          <span>重新生成 DOCX</span>
        </button>
      )}
    </div>
  );
};

export default ReportActions;
