import React, { useEffect, useRef, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import rehypeKatex from 'rehype-katex';
import { ANSWER_SYNTAX } from '@/lib/markdown/answer-syntax';
import { Bot } from 'lucide-react';
import 'katex/dist/katex.min.css';
import ThinkingIndicator from './ThinkingIndicator';
import { ProcessLog } from './ProcessLog';
import { ReportMessage } from '@/components/reports';
import type { MessageListProps } from '@/types/message';

const MessageList: React.FC<MessageListProps> = ({
    messages,
    currentThinking,
    processEvents = [],
    onSaveReport,
    isSavingReport = false,
    savedReportDocxUrl,
    savedReportId,
}) => {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, currentThinking]);

    return (
        <div className="flex-1 w-full max-w-4xl mx-auto space-y-6 pb-4">
            {messages.map((msg, idx) => {
                // v4.2: Handle report type messages
                if (msg.messageType === 'report' && msg.reportContent) {
                    return (
                        <div key={msg.id || idx} className="flex items-start gap-4">
                            {/* Avatar for assistant */}
                            <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1 text-yellow-600">
                                <span className="text-xl">✨</span>
                            </div>
                            {/* Report Message Component */}
                            <div className="flex-1 max-w-[95%]">
                                <ReportMessage
                                    report={msg.reportContent}
                                    onSave={onSaveReport}
                                    isSaving={isSavingReport}
                                    savedDocxUrl={savedReportDocxUrl}
                                    savedReportId={savedReportId}
                                />
                            </div>
                        </div>
                    );
                }

                // Regular text messages
                return (
                    <div
                        key={msg.id || idx}
                        className={`flex items-start gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}
                    >
                        {/* Avatar (Only for Assistant, User doesn't usually show avatar in Gemini chat flow next to bubble) */}
                        {msg.role === 'assistant' && (
                            <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1 text-yellow-600">
                                <span className="text-xl">✨</span>
                            </div>
                        )}

                        {/* Content Bubble */}
                        <div className={`flex-1 max-w-[85%] text-base leading-relaxed
                            ${msg.role === 'user'
                                ? 'bg-neutral-100 text-[#1f1f1f] rounded-[24px] px-6 py-4'
                                : 'bg-transparent text-[#1f1f1f] px-0 py-0'
                            }`}
                        >
                            {msg.role === 'user' ? (
                                <div className="whitespace-pre-wrap">{msg.content}</div>
                            ) : (
                                <div className="prose prose-neutral max-w-none prose-p:leading-relaxed prose-pre:bg-neutral-100 prose-pre:rounded-xl prose-pre:p-4">
                                    <ReactMarkdown
                                        remarkPlugins={[...ANSWER_SYNTAX, remarkBreaks]}
                                        rehypePlugins={[rehypeKatex]}
                                    >
                                        {msg.content}
                                    </ReactMarkdown>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}

            {/* v4.0: Process Log - show after streaming completes */}
            {!currentThinking && processEvents.length > 0 && (
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8" /> {/* Spacer to align with messages */}
                    <div className="flex-1 max-w-[85%]">
                        <ProcessLog events={processEvents} />
                    </div>
                </div>
            )}

            {/* Thinking Indicator at the bottom if active */}
            {currentThinking && (
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-50 text-yellow-600 border border-yellow-100 shadow-sm flex items-center justify-center mt-1 animate-pulse">
                        <Bot size={16} />
                    </div>
                    <ThinkingIndicator currentNode={currentThinking} />
                </div>
            )}

            <div ref={bottomRef} />
        </div>
    );
};

// V3.9: Memoize to prevent unnecessary re-renders (REQ-015)
export default memo(MessageList);
