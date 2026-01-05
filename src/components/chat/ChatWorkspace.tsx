'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStreamingChat } from '@/hooks/useStreamingChat';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import GuestBanner from './GuestBanner';
import type { ChatMessage } from '@/types/message';

export default function ChatWorkspace() {
    const searchParams = useSearchParams();
    const urlSessionId = searchParams.get('session');

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoadingSession, setIsLoadingSession] = useState(false);
    const [loadedSessionId, setLoadedSessionId] = useState<string | null>(null);

    // Load session messages when URL session parameter changes
    useEffect(() => {
        const loadSession = async () => {
            if (!urlSessionId || urlSessionId === loadedSessionId) return;

            setIsLoadingSession(true);
            try {
                const res = await fetch(`/api/sessions/${urlSessionId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.messages && data.messages.length > 0) {
                        setMessages(data.messages.map((m: any) => ({
                            role: m.role,
                            content: m.content,
                            id: m.id || Date.now().toString(),
                        })));
                    }
                    setLoadedSessionId(urlSessionId);
                }
            } catch (error) {
                console.error('Failed to load session:', error);
            } finally {
                setIsLoadingSession(false);
            }
        };

        loadSession();
    }, [urlSessionId, loadedSessionId]);

    // Reset when navigating to new chat (no session param)
    useEffect(() => {
        if (!urlSessionId && loadedSessionId) {
            setMessages([]);
            setLoadedSessionId(null);
        }
    }, [urlSessionId, loadedSessionId]);

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
        initialSessionId: urlSessionId || undefined,
        onComplete: handleComplete,
        onError: handleError
    });

    const handleSendMessage = async (text: string, files: File[], documentIds: string[]) => {
        // 1. Optimistically add user message
        const userMsg: ChatMessage = {
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

    const hasMessages = messages.length > 0;

    return (
        <div className="flex flex-col h-full bg-neutral-50 relative overflow-hidden font-sans">
            {/* Guest Banner - Shows rate limits for guests */}
            <GuestBanner />

            {/* Background decoration - Simplified */}
            <div className="absolute inset-0 bg-white/50 opacity-10 pointer-events-none" />

            {/* Loading indicator for session loading */}
            {isLoadingSession && (
                <div className="absolute inset-0 flex items-center justify-center z-20 bg-white/80">
                    <div className="text-neutral-500">加载对话中...</div>
                </div>
            )}

            {!hasMessages && !isLoadingSession ? (
                /* Zero State: Centered */
                <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-3xl mx-auto w-full z-10 relative animate-in fade-in duration-500">
                    <div className="mb-8 text-left w-full pl-1">
                        <h1 className="text-4xl md:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-neutral-900 via-neutral-600 to-yellow-600 font-medium mb-2 tracking-tight">你好，</h1>
                        <h2 className="text-4xl md:text-5xl text-neutral-300 font-medium tracking-tight">今天有什么可以帮您？</h2>
                    </div>
                    <div className="w-full">
                        <ChatInput onSendMessage={handleSendMessage} disabled={isStreaming} />
                    </div>
                </div>
            ) : (
                /* Active State: Chat Interface */
                <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 z-10 relative">
                    <div className="flex-1 overflow-y-auto py-4 scroll-smooth no-scrollbar" id="chat-scroll-area">
                        <MessageList messages={messages} currentThinking={currentThinking} />
                    </div>

                    <div className="w-full pb-4 pt-2">
                        <ChatInput onSendMessage={handleSendMessage} disabled={isStreaming} />
                        {sessionId && (
                            <div className="text-[10px] text-center text-slate-300 mt-2 font-mono">
                                会话 ID: {sessionId}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
