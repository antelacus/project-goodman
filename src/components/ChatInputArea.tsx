"use client";
import React, { useRef, useState, useEffect } from "react";
import { FiSend, FiFileText, FiZap } from "react-icons/fi";

interface ChatInputAreaProps {
    input: string;
    setInput: (val: string) => void;
    onSend: (val: string) => void;
    loading: boolean;
    disabled: boolean;
    placeholder: string;

    // Document selection
    onDocumentSelect: () => void;
    selectedDocCount: number;

    // Preset questions
    presetQuestions: string[];
    onPresetSelect: (question: string) => void;
}

export default function ChatInputArea({
    input,
    setInput,
    onSend,
    loading,
    disabled,
    placeholder,
    onDocumentSelect,
    selectedDocCount,
    presetQuestions,
    onPresetSelect,
}: ChatInputAreaProps) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [showPresetMenu, setShowPresetMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'; // Reset to auto to get correct scrollHeight
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`; // Grow up to 200px
        }
    }, [input]);

    // Handle click outside for preset menu
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowPresetMenu(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey && !loading) {
            e.preventDefault();
            onSend(input);
        }
    };

    const insertTextAtCursor = (text: string) => {
        const textarea = textareaRef.current;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const currentValue = textarea.value;
            const newValue = currentValue.substring(0, start) + text + currentValue.substring(end);

            setInput(newValue);

            setTimeout(() => {
                textarea.focus();
                textarea.setSelectionRange(start + text.length, start + text.length);
            }, 0);
        } else {
            setInput(input + text);
        }
    };

    const handlePresetClick = (q: string) => {
        insertTextAtCursor(q);
        setShowPresetMenu(false);
        onPresetSelect(q);
    };

    return (
        <div className="bg-white pt-2 pb-4 border-t border-gray-200 sticky bottom-0 z-20">
            <div className="flex flex-col bg-gray-50 rounded-2xl border border-gray-200 focus-within:ring-2 focus-within:ring-yellow-500/50 transition-all">

                {/* Top: Textarea */}
                <div className="w-full">
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={placeholder}
                        disabled={disabled}
                        rows={1}
                        className="w-full px-4 pt-4 pb-2 bg-transparent border-0 focus:ring-0 resize-none overflow-y-auto min-h-[52px] text-gray-800 placeholder-gray-400"
                        style={{ maxHeight: '200px' }}
                    />
                </div>

                {/* Bottom: Actions Row */}
                <div className="flex justify-between items-center px-2 pb-2">
                    {/* Left: Helper Actions */}
                    <div className="flex gap-1">
                        {/* Document Select Button */}
                        <button
                            onClick={onDocumentSelect}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors group"
                            title="选择文档"
                        >
                            <div className="relative">
                                <FiFileText size={18} className="text-gray-500 group-hover:text-gray-700" />
                                {selectedDocCount > 0 && (
                                    <span className="absolute -top-1 -right-2 bg-yellow-500 text-white text-[10px] px-1 rounded-full min-w-[14px] h-[14px] flex items-center justify-center border border-white">
                                        {selectedDocCount}
                                    </span>
                                )}
                            </div>
                            <span className="hidden sm:inline">选择文档</span>
                        </button>

                        {/* Preset Questions Button */}
                        <div className="relative" ref={menuRef}>
                            <button
                                onClick={() => setShowPresetMenu(!showPresetMenu)}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded-lg transition-colors group"
                                title="常见问题"
                            >
                                <FiZap size={18} className="text-gray-500 group-hover:text-gray-700" />
                                <span className="hidden sm:inline">预设问题</span>
                            </button>

                            {showPresetMenu && (
                                <div className="absolute bottom-full left-0 mb-2 w-72 bg-white border border-gray-200 rounded-xl shadow-xl z-30 overflow-hidden transform origin-bottom-left animate-in fade-in slide-in-from-bottom-2">
                                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 border-b border-gray-100 bg-gray-50">
                                        建议问题
                                    </div>
                                    <div className="max-h-60 overflow-y-auto p-1">
                                        {presetQuestions.map((q, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handlePresetClick(q)}
                                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-yellow-50 hover:text-yellow-700 rounded-lg transition-colors"
                                            >
                                                {q}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Send Button */}
                    <button
                        onClick={() => onSend(input)}
                        disabled={loading || !input.trim() || disabled}
                        className={`p-2 rounded-lg transition-all duration-200 flex items-center justify-center ${!input.trim() || disabled
                            ? "bg-transparent text-gray-300 cursor-not-allowed"
                            : "bg-black text-white hover:bg-gray-800 shadow-md"
                            }`}
                        title="发送"
                    >
                        {loading ? (
                            <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full" />
                        ) : (
                            <FiSend size={18} className={!input.trim() ? "ml-0" : "ml-0.5"} />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
