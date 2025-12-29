'use client';

import React, { useState } from 'react';
import { useStreamingChat } from '@/hooks/useStreamingChat';
import MessageList from './MessageList';
import ChatInput from './ChatInput';

interface Message {
    role: 'user' | 'assistant';
    content: string;
    id?: string;
}

export default function ChatWorkspace() {
    const [messages, setMessages] = useState<Message[]>([]);

    const handleComplete = (data: { answer?: string; sessionId?: string }) => {
        // Add the final assistant response
        if (data && data.answer) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.answer || '',
                id: Date.now().toString()
            }]);
        } else {
            // Fallback if no answer structure
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "Request completed, but no answer was returned.",
                id: Date.now().toString()
            }]);
        }
    };

    const handleError = (error: string) => {
        setMessages(prev => [...prev, {
            role: 'assistant',
            content: `**Error**: ${error}`,
            id: Date.now().toString()
        }]);
    };

    const { sendMessage, isStreaming, currentThinking, sessionId } = useStreamingChat({
        onComplete: handleComplete,
        onError: handleError
    });

    const handleSendMessage = async (text: string, files: File[], documentIds: string[]) => {
        // 1. Optimistically add user message
        const userMsg: Message = {
            role: 'user',
            content: text + (files.length > 0 ? `\n\n[Attached ${files.length} files]` : '') + (documentIds.length > 0 ? `\n\n[Attached ${documentIds.length} existing documents]` : ''),
            id: Date.now().toString()
        };
        setMessages(prev => [...prev, userMsg]);

        // 2. Convert files to expected format
        const fileData = await Promise.all(files.map(async (file) => {
            return new Promise<{ name: string; type: string; content: string | ArrayBuffer | null }>((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    resolve({
                        name: file.name,
                        type: file.type,
                        content: e.target?.result || null
                    });
                };
                reader.readAsDataURL(file);
            });
        }));

        // 3. Send
        await sendMessage(text, fileData, documentIds);
    };

    return (
        <div className="flex flex-col h-full bg-neutral-50 relative overflow-hidden">
            {/* Background decoration - Simplified */}
            <div className="absolute inset-0 bg-white/50 opacity-10 pointer-events-none" />

            <div className="flex-1 flex flex-col max-w-5xl mx-auto w-full px-4 pt-6 pb-4 z-10 relative">
                <div className="flex-1 overflow-y-auto mb-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-white/50 shadow-sm p-6 scroll-smooth">
                    <MessageList messages={messages} currentThinking={currentThinking} />
                </div>

                <div className="w-full mb-2">
                    <ChatInput onSendMessage={handleSendMessage} disabled={isStreaming} />
                    {sessionId && (
                        <div className="text-[10px] text-center text-slate-300 mt-1 font-mono">
                            Session ID: {sessionId}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
