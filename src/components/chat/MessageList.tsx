import React, { useEffect, useRef, memo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Bot } from 'lucide-react';
import 'katex/dist/katex.min.css';
import ThinkingIndicator from './ThinkingIndicator';
import type { ChatMessage, MessageListProps } from '@/types/message';

const MessageList: React.FC<MessageListProps> = ({ messages, currentThinking }) => {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, currentThinking]);

    return (
        <div className="flex-1 w-full max-w-4xl mx-auto space-y-6 pb-4">
            {messages.map((msg, idx) => (
                <div
                    key={msg.id || idx}
                    className={`flex items-start gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}
                >
                    {/* Avatar (Only for Assistant, User doesn't usually show avatar in Gemini chat flow next to bubble) */}
                    {msg.role === 'assistant' && (
                        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1 text-blue-500">
                            <span className="text-xl">✨</span>
                            {/* Or use the cleaner Icon: <Bot size={20} className="text-blue-500" />. 
                                Gemini uses the sparkle icon. I'll stick to a simple sparkle or Bot icon for now 
                                but style it cleaner. */}
                        </div>
                    )}

                    {/* Content Bubble */}
                    <div className={`flex-1 max-w-[85%] text-base leading-relaxed
                        ${msg.role === 'user'
                            ? 'bg-[#f0f4f9] text-[#1f1f1f] rounded-[24px] px-6 py-4' // Gemini User Bubble
                            : 'bg-transparent text-[#1f1f1f] px-0 py-0' // Gemini Assistant (Borderless)
                        }`}
                    >
                        {msg.role === 'user' ? (
                            <div className="whitespace-pre-wrap">{msg.content}</div>
                        ) : (
                            <div className="prose prose-neutral max-w-none prose-p:leading-relaxed prose-pre:bg-neutral-100 prose-pre:rounded-xl prose-pre:p-4">
                                <ReactMarkdown
                                    remarkPlugins={[remarkMath]}
                                    rehypePlugins={[rehypeKatex]}
                                >
                                    {msg.content}
                                </ReactMarkdown>
                            </div>
                        )}
                    </div>
                </div>
            ))}

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
