import React, { useRef, useState } from 'react';
import { FiPaperclip, FiSend, FiX } from 'react-icons/fi';

interface ChatInputProps {
    onSendMessage: (message: string, files: File[]) => void;
    disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, disabled }) => {
    const [message, setMessage] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleSubmit = () => {
        if ((!message.trim() && files.length === 0) || disabled) return;
        onSendMessage(message, files);
        setMessage('');
        setFiles([]);
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(prev => [...prev, ...Array.from(e.target.files || [])]);
        }
        // Reset inputs
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeFile = (index: number) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const autoResize = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
        }
    };

    return (
        <div className="relative max-w-4xl mx-auto w-full">
            {/* File Preview */}
            {files.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2 px-2">
                    {files.map((file, i) => (
                        <div key={i} className="flex items-center bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-600 shadow-sm animate-in fade-in slide-in-from-bottom-1">
                            <span className="truncate max-w-[150px]">{file.name}</span>
                            <button onClick={() => removeFile(i)} className="ml-2 hover:text-red-500">
                                <FiX />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 flex items-end p-2 transition-all focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/50">
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-colors"
                    disabled={disabled}
                    title="Upload documents"
                >
                    <FiPaperclip size={20} />
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
                    disabled={(!message.trim() && files.length === 0) || disabled}
                    className={`p-3 rounded-xl transition-all duration-200 ${(message.trim() || files.length > 0) && !disabled
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 hover:scale-105 active:scale-95'
                            : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                        }`}
                >
                    <FiSend size={20} />
                </button>
            </div>
            <div className="text-center mt-2">
                <p className="text-[10px] text-slate-400">Project Goodman V3.6c • AI can make mistakes. Please verify important information.</p>
            </div>
        </div>
    );
};

export default ChatInput;
