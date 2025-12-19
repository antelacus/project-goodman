import React, { useState, useEffect } from 'react';
import { useDocumentStore, Document } from '../store/documents';
import { SelectedDocumentInfo } from './DocumentSourceDisplay';

interface DocumentSelectionModalProps {
    open: boolean;
    onClose: () => void;
    // Current state
    currentMode: 'auto' | 'manual';
    currentSelection: SelectedDocumentInfo[];
    // Available "Auto" result from the last API call (for restoration)
    autoRecommended?: SelectedDocumentInfo[];
    // Callback when user confirms
    onConfirm: (mode: 'auto' | 'manual', selectedIds: string[]) => void;
}

export const DocumentSelectionModal: React.FC<DocumentSelectionModalProps> = ({
    open,
    onClose,
    currentMode,
    currentSelection,
    autoRecommended = [],
    onConfirm
}) => {
    const allDocuments = useDocumentStore((s) => s.documents);

    // Local state for the modal
    const [internalMode, setInternalMode] = useState<'auto' | 'manual'>(currentMode);
    // We only track IDs for manual selection locally. 
    // If mode is 'auto', we ignore this list and use autoRecommended.
    const [manualSelectedIds, setManualSelectedIds] = useState<string[]>(
        currentSelection.map(d => d.documentId)
    );

    const [search, setSearch] = useState("");

    // Reset state when opening
    useEffect(() => {
        if (open) {
            setInternalMode(currentMode);
            setManualSelectedIds(currentSelection.map(d => d.documentId));
        }
    }, [open, currentMode, currentSelection]);

    if (!open) return null;

    // Filter docs for manual selection
    const filteredDocuments = allDocuments.filter(doc =>
        !search || doc.name.toLowerCase().includes(search.toLowerCase())
    );

    const handleToggleMode = (mode: 'auto' | 'manual') => {
        setInternalMode(mode);
        if (mode === 'auto') {
            // If switching back to auto, we pre-select the auto recommendations just in case the UI needs it,
            // but strictly speaking 'auto' mode means "let backend decide" usually.
            // However here 'auto' implies "Use the original Recommendation".
        } else {
            // If switching to manual, start with current selection (which might be the auto ones)
            // This is initialized in useEffect, but if we toggle back and forth:
            // If coming from Auto -> Manual, we might want to populate with Auto entries as a starting point.
            if (manualSelectedIds.length === 0 && autoRecommended.length > 0) {
                setManualSelectedIds(autoRecommended.map(d => d.documentId));
            }
        }
    };

    const handleManualToggle = (id: string) => {
        if (internalMode === 'auto') return; // Cannot edit in auto mode

        setManualSelectedIds(prev => {
            if (prev.includes(id)) {
                return prev.filter(pid => pid !== id);
            } else {
                return [...prev, id];
            }
        });
    };

    const handleConfirm = () => {
        if (internalMode === 'auto') {
            // Confirming auto mode basically means "Revert to AI logic"
            // We pass the IDs of the auto-recommended docs just for consistency,
            // but the API call likely just needs "autoSelect: true" and no ids.
            // However, the callback signature expects ids.
            onConfirm('auto', autoRecommended.map(d => d.documentId));
        } else {
            onConfirm('manual', manualSelectedIds);
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[1001] flex items-center justify-center bg-black bg-opacity-30 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
                    <h3 className="font-bold text-lg text-gray-800">调整文档选择</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <svg width="24" height="24" fill="none" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    </button>
                </div>

                {/* Mode Switcher */}
                <div className="px-6 py-4 border-b border-gray-100">
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => handleToggleMode('auto')}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${internalMode === 'auto'
                                    ? 'bg-white text-purple-700 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            ✨ AI 自动精选 ({autoRecommended.length})
                        </button>
                        <button
                            onClick={() => handleToggleMode('manual')}
                            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${internalMode === 'manual'
                                    ? 'bg-white text-blue-700 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            👆 人工指定 ({manualSelectedIds.length})
                        </button>
                    </div>

                    <p className="mt-3 text-sm text-gray-500 px-1">
                        {internalMode === 'auto'
                            ? "使用 AI 算法根据您的问题自动计算相关性并选择最佳文档。"
                            : "完全按照您的意愿指定分析范围，AI 将仅基于您选择的文档进行分析。"}
                    </p>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6">
                    {internalMode === 'auto' ? (
                        <div className="space-y-3">
                            {autoRecommended.length === 0 ? (
                                <div className="text-center py-8 text-gray-400">
                                    AI 尚未推荐任何文档，或分析尚未开始。
                                </div>
                            ) : (
                                autoRecommended.map(doc => (
                                    <div key={doc.documentId} className="flex items-center p-3 bg-purple-50 border border-purple-100 rounded-lg">
                                        <span className="text-purple-500 mr-3">✨</span>
                                        <div className="flex-1">
                                            <div className="font-medium text-purple-900">{doc.documentName}</div>
                                            <div className="text-xs text-purple-600 flex items-center gap-2 mt-1">
                                                {doc.year && <span className="bg-white px-1.5 rounded border border-purple-100">{doc.year}</span>}
                                                {doc.relevanceScore && <span>相关度: {Math.round(doc.relevanceScore)}</span>}
                                                {doc.selectionReason && <span>• {doc.selectionReason}</span>}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Manual Selection Mode */}
                            <input
                                type="text"
                                placeholder="搜索文档..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg px-4 py-2 mb-4 focus:ring-2 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                            />

                            <div className="space-y-2">
                                {filteredDocuments.map(doc => {
                                    const isSelected = manualSelectedIds.includes(doc.id);
                                    return (
                                        <div
                                            key={doc.id}
                                            onClick={() => handleManualToggle(doc.id)}
                                            className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${isSelected
                                                    ? 'bg-blue-50 border-blue-200 shadow-sm'
                                                    : 'bg-white border-gray-100 hover:bg-gray-50'
                                                }`}
                                        >
                                            <div className={`w-5 h-5 rounded border mr-3 flex items-center justify-center ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                                                }`}>
                                                {isSelected && <svg width="12" height="12" fill="white" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className={`font-medium truncate ${isSelected ? 'text-blue-900' : 'text-gray-800'}`}>{doc.name}</div>
                                                <div className="text-xs text-gray-400 mt-1">
                                                    {doc.docCategory === 'knowledge' ? '知识库' : '业务'} • {Math.round((doc.size || 0) / 1024)}KB
                                                    {doc.year && ` • ${doc.year}`}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {filteredDocuments.length === 0 && (
                                    <div className="text-center py-8 text-gray-400">没有找到匹配的文档</div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50 rounded-b-xl">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 rounded-lg text-gray-600 hover:bg-gray-200 transition-colors font-medium"
                    >
                        取消
                    </button>
                    <button
                        onClick={handleConfirm}
                        className={`px-6 py-2 rounded-lg text-white font-medium shadow-md transition-transform active:scale-95 ${internalMode === 'auto' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                    >
                        确认{internalMode === 'auto' ? '使用 AI 推荐' : '使用选中来源'}
                    </button>
                </div>
            </div>
        </div>
    );
};
