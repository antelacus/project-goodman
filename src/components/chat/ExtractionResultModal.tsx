import React, { useState, useEffect, useRef } from "react";

type AnalysisResult = {
    [key: string]: string | number;
};

interface ExtractionResultModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: AnalysisResult | null;
    fileName?: string;
}

export default function ExtractionResultModal({
    isOpen,
    onClose,
    data,
    fileName
}: ExtractionResultModalProps) {
    const [openCopyMenu, setOpenCopyMenu] = useState<string | null>(null);
    const [copiedState, setCopiedState] = useState<{ key: string; type: string } | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenCopyMenu(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleCopy = (key: string, value: string | number, type: "key" | "value" | "both") => {
        const textToCopy = {
            key: key,
            value: String(value),
            both: `${key}: ${String(value)}`,
        }[type];

        navigator.clipboard.writeText(textToCopy);
        setCopiedState({ key, type });
        setTimeout(() => setCopiedState(null), 2000);
        setTimeout(() => setOpenCopyMenu(null), 300);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">文档信息提取结果</h2>
                        {fileName && <p className="text-sm text-gray-500 mt-1">来源: {fileName}</p>}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    {data ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {Object.entries(data).map(([key, value]) => (
                                <div key={key} className="p-4 bg-white rounded-lg border border-gray-200 shadow-sm relative group hover:border-gray-300 transition-colors">
                                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">{key.replace(/_/g, ' ')}</p>
                                    <p className="text-lg font-semibold text-gray-900 break-words">{String(value)}</p>

                                    <div className="absolute top-2 right-2" ref={openCopyMenu === key ? menuRef : null}>
                                        <button
                                            onClick={() => setOpenCopyMenu(openCopyMenu === key ? null : key)}
                                            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 focus:outline-none opacity-0 group-hover:opacity-100 transition-opacity"
                                            aria-label="More options"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                                            </svg>
                                        </button>
                                        {openCopyMenu === key && (
                                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl z-20 border border-gray-200 py-1 text-sm">
                                                <button onClick={() => handleCopy(key, value, 'key')} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700 flex items-center justify-between">
                                                    <span>复制标题</span>
                                                    {copiedState?.key === key && copiedState?.type === 'key' && <span className="text-green-500 text-xs">✓</span>}
                                                </button>
                                                <button onClick={() => handleCopy(key, value, 'value')} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700 flex items-center justify-between">
                                                    <span>复制内容</span>
                                                    {copiedState?.key === key && copiedState?.type === 'value' && <span className="text-green-500 text-xs">✓</span>}
                                                </button>
                                                <button onClick={() => handleCopy(key, value, 'both')} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700 flex items-center justify-between border-t border-gray-100">
                                                    <span>复制全部</span>
                                                    {copiedState?.key === key && copiedState?.type === 'both' && <span className="text-green-500 text-xs">✓</span>}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <p>暂无数据</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-white flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors font-medium border border-transparent shadow-sm"
                    >
                        关闭
                    </button>
                </div>
            </div>
        </div>
    );
}
