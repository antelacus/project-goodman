import React, { useRef, useState } from 'react';
import { FiPaperclip, FiSend, FiX, FiFileText, FiBarChart2 } from 'react-icons/fi';
import ExtractionResultModal from './ExtractionResultModal';
import DocumentSelectModal from '../DocumentSelectModal';
import { useDocumentStore } from '../../store/documents';

type AnalysisResult = {
    [key: string]: string | number;
};

interface ChatInputProps {
    onSendMessage: (message: string, files: File[], documentIds: string[]) => void;
    disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, disabled }) => {
    const [message, setMessage] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
    const [isDocModalOpen, setIsDocModalOpen] = useState(false);

    // Extraction Tool State
    const [isExtractModalOpen, setIsExtractModalOpen] = useState(false);
    const [extractionData, setExtractionData] = useState<AnalysisResult | null>(null);
    const [extracting, setExtracting] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const extractInputRef = useRef<HTMLInputElement>(null);

    const documents = useDocumentStore((s) => s.documents);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleSubmit = () => {
        if ((!message.trim() && files.length === 0 && selectedDocIds.length === 0) || disabled) return;
        onSendMessage(message, files, selectedDocIds);
        setMessage('');
        setFiles([]);
        setSelectedDocIds([]);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(prev => [...prev, ...Array.from(e.target.files || [])]);
        }
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const removeDocId = (idToRemove: string) => {
        setSelectedDocIds(prev => prev.filter(id => id !== idToRemove));
    };

    const autoResize = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    };

    // --- Data Extraction Logic ---
    const convertToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = () => reject(new Error('File read failed'));
            reader.readAsDataURL(file);
        });
    };

    const handleExtractFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setExtracting(true);
        setExtractionData(null);

        try {
            const base64Data = await convertToBase64(file);

            // 1. Upload to Temp (Vectorization) - Silent background compliance
            // We do this to ensure the file is available for future chat context if needed
            fetch('/api/documents/upload-temp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileData: base64Data,
                    fileType: file.type,
                    fileName: file.name,
                    source: 'data-extract'
                }),
            }).catch(console.error); // Background, don't block UI

            // 2. Call Extraction API
            const response = await fetch('/api/data-extract', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileData: base64Data,
                    fileType: file.type,
                    fileName: file.name
                }),
            });

            const result = await response.json();
            if (!result.success) throw new Error(result.message || 'Extraction failed');

            setExtractionData(result.data);
            setIsExtractModalOpen(true);

            // Optional: Add to chat files automatically? 
            // setFiles(prev => [...prev, file]); 

        } catch (error) {
            console.error('Extraction Error:', error);
            alert('Failed to extract data. Please try again.');
        } finally {
            setExtracting(false);
            if (extractInputRef.current) extractInputRef.current.value = '';
        }
    };

    return (
        <div className="relative max-w-4xl mx-auto w-full">
            {/* File Preview */}
            {(files.length > 0 || selectedDocIds.length > 0) && (
                <div className="flex flex-wrap gap-2 mb-2 px-2">
                    {files.map((file, i) => (
                        <div key={`file-${i}`} className="flex items-center bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-600 shadow-sm animate-in fade-in slide-in-from-bottom-1">
                            <span className="truncate max-w-[150px]">{file.name}</span>
                            <button onClick={() => removeFile(i)} className="ml-2 hover:text-red-500">
                                <FiX />
                            </button>
                        </div>
                    ))}
                    {selectedDocIds.map((id) => {
                        const doc = documents.find(d => d.id === id);
                        return (
                            <div key={`doc-${id}`} className="flex items-center bg-purple-50 border border-purple-200 rounded-lg px-3 py-1.5 text-xs text-purple-700 shadow-sm animate-in fade-in slide-in-from-bottom-1">
                                <span className="truncate max-w-[150px]">{doc ? doc.name : 'Unknown Doc'}</span>
                                <button onClick={() => removeDocId(id)} className="ml-2 hover:text-purple-900">
                                    <FiX />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 flex items-end p-2 transition-all focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/50 relative z-10">
                <button
                    onClick={() => setIsDocModalOpen(true)}
                    className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-colors"
                    disabled={disabled}
                    title="Select or Upload documents"
                >
                    <FiPaperclip size={20} />
                    {/* Hidden file input kept for drag-and-drop support if needed, or removed if strictly modal-only. 
                        Let's keep it but not use it via click. */}
                    <input
                        type="file"
                        multiple
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileChange}
                    />
                </button>

                <textarea
                    ref={textareaRef}
                    value={message}
                    onChange={(e) => { setMessage(e.target.value); autoResize(); }}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about financial reports, regulations, or upload documents..."
                    className="flex-1 max-h-[200px] min-h-[24px] bg-transparent border-none focus:ring-0 resize-none py-3 px-2 text-slate-700 placeholder:text-slate-400 leading-relaxed"
                    rows={1}
                    disabled={disabled}
                />

                <button
                    onClick={handleSubmit}
                    disabled={(!message.trim() && files.length === 0 && selectedDocIds.length === 0) || disabled}
                    className={`p-3 rounded-xl transition-all duration-200 ${(message.trim() || files.length > 0 || selectedDocIds.length > 0) && !disabled
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 hover:scale-105 active:scale-95'
                        : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                        }`}
                >
                    <FiSend size={20} />
                </button>
            </div>

            {/* Tool Shortcut Bar */}
            <div className="flex gap-4 mt-3 px-2">
                <button
                    onClick={() => extractInputRef.current?.click()}
                    disabled={extracting}
                    className="flex items-center gap-2 text-xs font-medium text-slate-500 hover:text-indigo-600 transition-colors group"
                >
                    <div className="p-1.5 rounded-lg bg-white border border-slate-200 group-hover:border-indigo-200 group-hover:bg-indigo-50 shadow-sm transition-colors">
                        {extracting ? (
                            <div className="animate-spin h-3.5 w-3.5 border-2 border-indigo-500 border-t-transparent rounded-full" />
                        ) : (
                            <FiFileText size={14} />
                        )}
                    </div>
                    Data Visualization
                    <input
                        type="file"
                        ref={extractInputRef}
                        className="hidden"
                        accept=".pdf,.png,.jpg,.jpeg,.xlsx"
                        onChange={handleExtractFileSelect}
                    />
                </button>

                {/* Placeholder for future tools */}
                <button className="flex items-center gap-2 text-xs font-medium text-slate-400 cursor-not-allowed">
                    <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 shadow-sm">
                        <FiBarChart2 size={14} />
                    </div>
                    Financial Analysis
                </button>
            </div>

            <div className="text-center mt-4">
                <p className="text-[10px] text-slate-400">Project Goodman V3.6c • AI can make mistakes. Please verify important information.</p>
            </div>

            {/* Results Modal */}
            <ExtractionResultModal
                isOpen={isExtractModalOpen}
                onClose={() => setIsExtractModalOpen(false)}
                data={extractionData}
            />

            {/* Document Select Modal */}
            <DocumentSelectModal
                open={isDocModalOpen}
                onClose={() => setIsDocModalOpen(false)}
                mode="multiple"
                categories={["business"]}
                selectedIds={selectedDocIds}
                onSelect={(ids) => setSelectedDocIds(ids)}
                showUpload={true}
            />
        </div>
    );
};

export default ChatInput;
