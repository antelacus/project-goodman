'use client';

import React from 'react';
import { Save, Download, Loader2, FileDown } from 'lucide-react';

interface ReportActionsProps {
  onSave?: () => void;
  isSaving?: boolean;
  savedPdfUrl?: string;
  disabled?: boolean;
}

/**
 * Action buttons for saving report and downloading PDF
 */
export const ReportActions: React.FC<ReportActionsProps> = ({
  onSave,
  isSaving = false,
  savedPdfUrl,
  disabled = false,
}) => {
  const handleDownload = () => {
    if (savedPdfUrl) {
      window.open(savedPdfUrl, '_blank');
    }
  };

  return (
    <div className="flex items-center gap-3 pt-4 border-t border-neutral-200">
      {/* Save Button - shown when not yet saved */}
      {!savedPdfUrl && onSave && (
        <button
          onClick={onSave}
          disabled={disabled || isSaving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>正在生成PDF并保存...</span>
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
      {savedPdfUrl && (
        <button
          onClick={handleDownload}
          className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <FileDown size={16} />
          <span>下载 PDF</span>
        </button>
      )}

      {/* Status text when saved */}
      {savedPdfUrl && (
        <span className="text-sm text-green-600 flex items-center gap-1">
          <Download size={14} />
          报告已保存
        </span>
      )}
    </div>
  );
};

export default ReportActions;
