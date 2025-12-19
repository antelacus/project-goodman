import React from 'react';

export interface SelectedDocumentInfo {
    documentId: string;
    documentName: string;
    relevanceScore?: number;
    selectionReason?: string;
    docType?: string;
    year?: number;
}

export interface DocumentSourceDisplayProps {
    mode: 'auto' | 'manual';
    selectedDocuments: SelectedDocumentInfo[];
    onModify: () => void;
    isLoading?: boolean;
}

export const DocumentSourceDisplay: React.FC<DocumentSourceDisplayProps> = ({
    mode,
    selectedDocuments,
    onModify,
    isLoading = false
}) => {
    if (selectedDocuments.length === 0 && !isLoading) return null;

    return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4">
            <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">参考文档来源</h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${mode === 'auto'
                            ? 'bg-purple-100 text-purple-700 border border-purple-200'
                            : 'bg-blue-100 text-blue-700 border border-blue-200'
                        }`}>
                        {mode === 'auto' ? 'AI 自动精选' : '人工指定'}
                    </span>
                </div>
                <button
                    onClick={onModify}
                    className="text-sm text-gray-600 hover:text-black underline decoration-gray-400 hover:decoration-black transition-colors"
                    disabled={isLoading}
                >
                    调整选择
                </button>
            </div>

            <div className="space-y-2">
                {isLoading ? (
                    <div className="animate-pulse space-y-2">
                        <div className="h-10 bg-gray-200 rounded"></div>
                        <div className="h-10 bg-gray-200 rounded"></div>
                    </div>
                ) : (
                    selectedDocuments.map((doc) => (
                        <div
                            key={doc.documentId}
                            className="flex items-center justify-between bg-white border border-gray-100 rounded p-2 text-sm shadow-sm"
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="flex-shrink-0 text-gray-400">
                                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                </span>
                                <span className="truncate font-medium text-gray-800" title={doc.documentName}>
                                    {doc.documentName}
                                </span>
                                {(doc.year) && (
                                    <span className="flex-shrink-0 px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs border border-gray-200">
                                        {doc.year}
                                    </span>
                                )}
                            </div>

                            {doc.relevanceScore !== undefined && (
                                <div className="flex items-center gap-1.5 flex-shrink-0 ml-3" title={`相关度评分: ${Math.round(doc.relevanceScore)}/100`}>
                                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${doc.relevanceScore > 80 ? 'bg-green-500' :
                                                    doc.relevanceScore > 50 ? 'bg-yellow-500' : 'bg-gray-400'
                                                }`}
                                            style={{ width: `${Math.min(100, Math.max(0, doc.relevanceScore))}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default DocumentSourceDisplay;
