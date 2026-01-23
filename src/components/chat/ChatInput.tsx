import React, { useRef, useState } from 'react';
import { Paperclip, Send, X, BarChart2, FileText } from 'lucide-react';
import { DocumentSelectModal } from '@/components/documents';
import { useDocumentStore } from '../../store/documents';

interface ChatInputProps {
    onSendMessage: (message: string, files: File[], documentIds: string[]) => void;
    disabled?: boolean;
    onRequestReport?: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, disabled, onRequestReport }) => {
    const [message, setMessage] = useState('');
    const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
    const [isDocModalOpen, setIsDocModalOpen] = useState(false);

    // Menu States
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isToolsMenuOpen, setIsToolsMenuOpen] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const toolsMenuRef = useRef<HTMLDivElement>(null);

    const documents = useDocumentStore((s) => s.documents);

    // Close menus on click outside
    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
            if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
                setIsToolsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleSubmit = () => {
        if ((!message.trim() && selectedDocIds.length === 0) || disabled) return;
        // Pass empty array for files - all uploads now go through DocumentSelectModal as document IDs
        onSendMessage(message, [], selectedDocIds);
        setMessage('');
        setSelectedDocIds([]);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
    };

    const handleUploadClick = () => {
        setIsDocModalOpen(true);
        setIsMenuOpen(false);
    };

    const handleGenerateReportClick = () => {
        setIsToolsMenuOpen(false);
        onRequestReport?.();
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

    return (
        <div className="relative max-w-4xl mx-auto w-full">
            {/* Selected Document Chips */}
            {selectedDocIds.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3 px-2">
                    {selectedDocIds.map((id) => {
                        const doc = documents.find(d => d.id === id);
                        return (
                            <div key={`doc-${id}`} className="flex items-center bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-1.5 text-xs text-yellow-800 shadow-sm animate-in fade-in slide-in-from-bottom-1">
                                <span className="truncate max-w-[150px]">{doc ? doc.name : 'Unknown Doc'}</span>
                                <button onClick={() => removeDocId(id)} className="ml-2 hover:text-yellow-900">
                                    <X size={14} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Main Input Container - Gemini Style */}
            <div className="bg-neutral-100 focus-within:bg-white border border-transparent focus-within:border-yellow-500 focus-within:shadow-sm transition-all duration-200 ease-in-out rounded-[28px]">
                <div className="flex flex-col">
                    {/* Row 1: Text Area */}
                    <div className="w-full px-4 pt-4">
                        <textarea
                            ref={textareaRef}
                            value={message}
                            onChange={(e) => { setMessage(e.target.value); autoResize(); }}
                            onKeyDown={handleKeyDown}
                            placeholder="输入您的问题..."
                            className="w-full max-h-[200px] min-h-[48px] bg-transparent border-none focus:outline-none focus-visible:ring-0 resize-none p-0 text-neutral-900 placeholder:text-neutral-500 leading-relaxed text-base"
                            rows={1}
                            disabled={disabled}
                        />
                    </div>

                    {/* Row 2: Toolbar & Send Button */}
                    <div className="flex items-center justify-between px-2 pb-2">
                        {/* Left: Tools */}
                        <div className="flex items-center gap-1">
                            {/* + Button */}
                            <div className="relative" ref={menuRef}>
                                <button
                                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-neutral-200/50 text-neutral-600 transition-colors"
                                    disabled={disabled}
                                    title="添加附件"
                                >
                                    <span className="text-2xl leading-none font-light pb-1">+</span>
                                </button>

                                {/* Dropdown Menu */}
                                {isMenuOpen && (
                                    <div className="absolute bottom-12 left-0 w-56 bg-white rounded-xl shadow-xl border border-neutral-100 overflow-hidden py-2 animate-in fade-in zoom-in-95 origin-bottom-left z-50">
                                        <button
                                            onClick={handleUploadClick}
                                            className="w-full text-left px-4 py-3 hover:bg-neutral-50 flex items-center gap-3 text-sm text-neutral-700"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
                                                <Paperclip size={16} />
                                            </div>
                                            <div className="font-medium">上传文件</div>
                                        </button>

                                        {/* Other options masked for now as per requirement */}
                                    </div>
                                )}
                            </div>

                            {/* Tools Button with Dropdown */}
                            <div className="relative" ref={toolsMenuRef}>
                                <button
                                    onClick={() => setIsToolsMenuOpen(!isToolsMenuOpen)}
                                    className="flex items-center gap-2 h-10 px-4 rounded-full hover:bg-neutral-200/50 text-neutral-600 transition-colors"
                                    disabled={disabled}
                                    title="工具"
                                >
                                    <BarChart2 size={18} />
                                    <span className="text-sm font-medium">工具</span>
                                </button>

                                {/* Tools Dropdown Menu */}
                                {isToolsMenuOpen && (
                                    <div className="absolute bottom-12 left-0 w-56 bg-white rounded-xl shadow-xl border border-neutral-100 overflow-hidden py-1 animate-in fade-in zoom-in-95 origin-bottom-left z-50">
                                        <button
                                            onClick={handleGenerateReportClick}
                                            className="w-full text-left px-4 py-3 hover:bg-neutral-50 flex items-center gap-3 text-sm text-neutral-700"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-yellow-50 text-yellow-600 flex items-center justify-center">
                                                <FileText size={16} />
                                            </div>
                                            <div>
                                                <div className="font-medium">生成报告</div>
                                                <div className="text-[10px] text-neutral-400">生成年度财务分析报告</div>
                                            </div>
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right: Send Button (Conditional) */}
                        {(message.trim() || selectedDocIds.length > 0) && (
                            <button
                                onClick={handleSubmit}
                                disabled={disabled}
                                className="w-10 h-10 flex items-center justify-center rounded-full bg-black text-white hover:bg-neutral-800 transition-all duration-200 animate-in zoom-in"
                            >
                                <Send size={18} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="text-center mt-3">
                <p className="text-[10px] text-neutral-400">Goodman 可能会犯错，请核查重要信息</p>
            </div>

            {/* Document Select Modal - Single entry point for file uploads */}
            <DocumentSelectModal
                open={isDocModalOpen}
                onClose={() => setIsDocModalOpen(false)}
                mode="multiple"
                categories={["business"]}
                selectedIds={selectedDocIds}
                onSelect={(ids) => setSelectedDocIds(ids)}
                showUpload={true}
                uploadAccept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.xlsx,.txt,.md"
                uploadHelpText="支持上传 PDF、图片、Excel(.xlsx)、TXT、MD 格式。TXT/MD 仅用于对话上下文，不支持结构化提取。"
            />
        </div>
    );
};

export default ChatInput;
