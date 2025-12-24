import React, { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { FiUser, FiCpu } from 'react-icons/fi';
import 'katex/dist/katex.min.css';
import ThinkingIndicator from './ThinkingIndicator';

/* 
   Assuming Message type. 
   If not explicitly defined in a shared type file yet, I'll define a local interface 
   that matches what we store in the hook.
*/
interface Message {
    role: 'user' | 'assistant';
    content: string;
    id?: string;
}

interface MessageListProps {
    messages: Message[];
    currentThinking?: string | null;
}

const MessageList: React.FC<MessageListProps> = ({ messages, currentThinking }) => {
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, currentThinking]);

    return (
        <div className="flex-1 w-full max-w-4xl mx-auto space-y-6 pb-4">
            {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 mt-20">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-100 to-white rounded-2xl flex items-center justify-center mb-4 shadow-sm border border-indigo-50">
                        <FiCpu className="w-8 h-8 text-indigo-400" />
                    </div>
                    <p className="text-lg font-medium text-slate-600">How can I help you today?</p>
                    <p className="text-sm mt-2 opacity-70">Ask about financial analysis, compliance, or upload reports.</p>
                </div>
            )}

            {messages.map((msg, idx) => (
                <div
                    key={msg.id || idx}
                    className={`flex items-start gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                    {/* Avatar */}
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border shadow-sm mt-1
                ${msg.role === 'user'
                            ? 'bg-slate-800 text-white border-slate-700'
                            : 'bg-white text-indigo-600 border-indigo-100'}`}
                    >
                        {msg.role === 'user' ? <FiUser size={14} /> : <FiCpu size={14} />}
                    </div>

                    {/* Content Bubble */}
                    <div className={`flex-1 max-w-[80%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-sm
                ${msg.role === 'user'
                            ? 'bg-slate-800 text-slate-50 rounded-tr-sm'
                            : 'bg-white text-slate-800 border border-slate-100 rounded-tl-sm'}`}
                    >
                        {msg.role === 'user' ? (
                            <div className="whitespace-pre-wrap">{msg.content}</div>
                        ) : (
                            <div className="prose prose-sm max-w-none prose-slate prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-li:my-0">
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
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white text-indigo-600 border border-indigo-100 shadow-sm flex items-center justify-center mt-1 animate-pulse">
                        <FiCpu size={14} />
                    </div>
                    <ThinkingIndicator currentNode={currentThinking} />
                </div>
            )}

            <div ref={bottomRef} />
        </div>
    );
};

export default MessageList;
