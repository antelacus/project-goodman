import React, { useState, useEffect, useRef } from "react";
import { Copy, FileText, Check, Loader2, FileSpreadsheet } from "lucide-react";
import { DocumentSelectModal } from "@/components/documents";
import { useDocumentStore } from "@/store/documents";

interface ExtractionModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type ExtractionStep = 'intro' | 'confirm' | 'extracting' | 'result' | 'error';

export default function ExtractionModal({
    isOpen,
    onClose,
}: ExtractionModalProps) {
    const [step, setStep] = useState<ExtractionStep>('intro');
    const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
    const [isDocSelectOpen, setIsDocSelectOpen] = useState(false);
    const [extractionResult, setExtractionResult] = useState<Record<string, unknown> | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Copy state
    const [copiedState, setCopiedState] = useState<{ key: string; type: string } | null>(null);
    const [openCopyMenu, setOpenCopyMenu] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const documents = useDocumentStore(s => s.documents);
    const selectedDoc = documents.find(d => d.id === selectedDocId);

    // Reset state when opening
    useEffect(() => {
        if (isOpen) {
            setStep('intro');
            setSelectedDocId(null);
            setExtractionResult(null);
            setErrorMsg(null);
        }
    }, [isOpen]);

    // Close menu on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenCopyMenu(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleDocSelect = (ids: string[]) => {
        if (ids.length > 0) {
            setSelectedDocId(ids[0]);
            setStep('confirm');
        }
    };

    const handleExtract = async () => {
        if (!selectedDocId) return;

        setStep('extracting');
        try {
            const response = await fetch('/api/quick-actions/extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentId: selectedDocId }),
            });

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.message || 'Extraction failed');
            }

            setExtractionResult(result.data);
            setStep('result');
        } catch (error: unknown) {
            console.error('Extraction Error:', error);
            setErrorMsg(error instanceof Error ? error.message : 'Unknown error occurred');
            setStep('error');
        }
    };

    const handleCopy = (key: string, value: unknown, type: "key" | "value" | "both") => {
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col relative">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-neutral-100">
                    <div>
                        <h2 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
                            <FileSpreadsheet className="text-yellow-500" />
                            财务信息提取工具
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-full transition-colors"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-8 bg-neutral-50 flex flex-col items-center justify-center min-h-[400px]">

                    {/* Step: Intro */}
                    {step === 'intro' && (
                        <div className="text-center max-w-lg">
                            <div className="mb-6 bg-yellow-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-yellow-600">
                                <FileText size={40} />
                            </div>
                            <h3 className="text-2xl font-bold text-neutral-900 mb-3">开始提取结构化数据</h3>
                            <p className="text-neutral-500 mb-8 leading-relaxed">
                                请选择一个已上传的财务文档（如发票、合同、报表），AI 将自动分析并提取其中的关键键值对信息。
                            </p>
                            <button
                                onClick={() => setIsDocSelectOpen(true)}
                                className="px-8 py-3 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-all font-medium shadow-md hover:shadow-lg flex items-center gap-2 mx-auto"
                            >
                                选择文档
                            </button>
                        </div>
                    )}

                    {/* Step: Confirm */}
                    {step === 'confirm' && selectedDoc && (
                        <div className="text-center max-w-lg w-full">
                            <h3 className="text-xl font-bold text-neutral-900 mb-6">确认提取目标</h3>

                            <div className="bg-white p-6 rounded-xl border border-neutral-200 shadow-sm mb-8 flex items-center gap-4 text-left">
                                <div className="bg-blue-50 p-3 rounded-lg text-blue-600">
                                    <FileText size={24} />
                                </div>
                                <div>
                                    <div className="font-semibold text-neutral-900">{selectedDoc.name}</div>
                                    <div className="text-sm text-neutral-500 mt-1">ID: {selectedDoc.id.slice(0, 8)}...</div>
                                </div>
                                <button
                                    onClick={() => setIsDocSelectOpen(true)}
                                    className="ml-auto text-sm text-neutral-400 hover:text-neutral-900 underline"
                                >
                                    更换
                                </button>
                            </div>

                            <button
                                onClick={handleExtract}
                                className="w-full px-8 py-3 bg-yellow-400 text-neutral-900 rounded-lg hover:bg-yellow-500 transition-all font-bold shadow-md hover:shadow-lg"
                            >
                                开始提取
                            </button>
                        </div>
                    )}

                    {/* Step: Extracting */}
                    {step === 'extracting' && (
                        <div className="text-center">
                            <Loader2 size={48} className="animate-spin text-yellow-500 mx-auto mb-6" />
                            <h3 className="text-xl font-bold text-neutral-900 mb-2">正在分析文档...</h3>
                            <p className="text-neutral-500">正在调用 Vision 模型识别结构化信息，请稍候</p>
                        </div>
                    )}

                    {/* Step: Error */}
                    {step === 'error' && (
                        <div className="text-center text-red-600">
                            <div className="mb-4 bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                                <span className="text-2xl">!</span>
                            </div>
                            <h3 className="text-lg font-bold mb-2">提取失败</h3>
                            <p className="mb-6">{errorMsg}</p>
                            <button
                                onClick={() => setStep('intro')}
                                className="px-6 py-2 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800"
                            >
                                重试
                            </button>
                        </div>
                    )}

                    {/* Step: Result */}
                    {step === 'result' && extractionResult && (
                        <div className="w-full h-full">
                            <div className="mb-4 flex items-center justify-between">
                                <h3 className="font-bold text-neutral-900">提取结果</h3>
                                <button
                                    onClick={() => {
                                        setStep('intro');
                                        setSelectedDocId(null);
                                        setExtractionResult(null);
                                    }}
                                    className="text-sm text-neutral-500 hover:text-neutral-900 underline"
                                >
                                    提取新文档
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
                                {Object.entries(extractionResult).map(([key, value]) => (
                                    <div key={key} className="p-4 bg-white rounded-lg border border-neutral-200 shadow-sm relative group hover:border-yellow-400 transition-colors">
                                        <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider mb-1">{key.replace(/_/g, ' ')}</p>
                                        <p className="text-lg font-semibold text-neutral-900 break-words line-clamp-3" title={String(value)}>
                                            {String(value)}
                                        </p>

                                        <div className="absolute top-2 right-2" ref={openCopyMenu === key ? menuRef : null}>
                                            <button
                                                onClick={() => setOpenCopyMenu(openCopyMenu === key ? null : key)}
                                                className="p-1.5 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-900 focus:outline-none opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Copy size={16} />
                                            </button>
                                            {openCopyMenu === key && (
                                                <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-xl z-20 border border-neutral-200 py-1 text-xs">
                                                    <button onClick={() => handleCopy(key, value, 'key')} className="w-full text-left px-3 py-2 hover:bg-neutral-50 text-neutral-700 flex items-center justify-between">
                                                        <span>复制标题</span>
                                                        {copiedState?.key === key && copiedState?.type === 'key' && <Check size={12} className="text-green-500" />}
                                                    </button>
                                                    <button onClick={() => handleCopy(key, value, 'value')} className="w-full text-left px-3 py-2 hover:bg-neutral-50 text-neutral-700 flex items-center justify-between">
                                                        <span>复制内容</span>
                                                        {copiedState?.key === key && copiedState?.type === 'value' && <Check size={12} className="text-green-500" />}
                                                    </button>
                                                    <button onClick={() => handleCopy(key, value, 'both')} className="w-full text-left px-3 py-2 hover:bg-neutral-50 text-neutral-700 flex items-center justify-between border-t border-neutral-100">
                                                        <span>复制全部</span>
                                                        {copiedState?.key === key && copiedState?.type === 'both' && <Check size={12} className="text-green-500" />}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Nested Document Selector */}
            <DocumentSelectModal
                open={isDocSelectOpen}
                onClose={() => setIsDocSelectOpen(false)}
                mode="single"
                categories={["business"]}
                selectedIds={selectedDocId ? [selectedDocId] : []}
                onSelect={handleDocSelect}
                showUpload={true}
            />
        </div>
    );
}
