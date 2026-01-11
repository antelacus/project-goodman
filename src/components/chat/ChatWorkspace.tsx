'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStreamingChat } from '@/hooks/useStreamingChat';
import { useReportGeneration } from '@/hooks/useReportGeneration';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import GuestBanner from './GuestBanner';
import { ReportYearSelector, ReportProgress } from '@/components/reports';
import type { ChatMessage } from '@/types/message';

export default function ChatWorkspace() {
    const searchParams = useSearchParams();
    const urlSessionId = searchParams.get('session');

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoadingSession, setIsLoadingSession] = useState(false);
    const [loadedSessionId, setLoadedSessionId] = useState<string | null>(null);

    // v4.2: Report generation via hook
    const [showReportSelector, setShowReportSelector] = useState(false);
    const {
        isGenerating: isGeneratingReport,
        phases: reportPhases,
        currentSection: currentReportSection,
        error: reportError,
        isSaving: isSavingReport,
        savedPdfUrl: savedReportPdfUrl,
        startGeneration,
        saveReport,
        cancel: cancelReport,
    } = useReportGeneration();

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

    // v4.2: Report request handler - shows year selector
    const handleRequestReport = useCallback(() => {
        setShowReportSelector(true);
    }, []);

    // v4.2: Cancel report generation
    const handleCancelReport = useCallback(() => {
        setShowReportSelector(false);
        cancelReport();
    }, [cancelReport]);

    // v4.2: Start report generation using hook
    const handleGenerateReport = useCallback(async (year: string, comparisonYear?: string) => {
        setShowReportSelector(false);

        // Add user message indicating report request
        const userMsg: ChatMessage = {
            role: 'user',
            content: `请生成${year}年度财务分析报告${comparisonYear ? `（与${comparisonYear}年对比）` : ''}`,
            id: Date.now().toString(),
        };
        setMessages(prev => [...prev, userMsg]);

        // Start generation via hook - it handles SSE parsing internally
        const generatedReport = await startGeneration(year, comparisonYear);

        // Add report as a message when complete
        if (generatedReport) {
            const reportMsg: ChatMessage = {
                role: 'assistant',
                content: '',
                id: Date.now().toString(),
                messageType: 'report',
                reportContent: generatedReport,
            };
            setMessages(prev => [...prev, reportMsg]);
        }
    }, [startGeneration]);

    // v4.2: Save report handler using hook
    const handleSaveReport = useCallback(async () => {
        await saveReport();
    }, [saveReport]);

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

    // v4.0: Get processEvents for transparency
    const { sendMessage, isStreaming, currentThinking, sessionId, processEvents } = useStreamingChat({
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
    const isDisabled = isStreaming || isGeneratingReport;

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

            {/* v4.2: Report Year Selector Modal */}
            {showReportSelector && (
                <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/20 backdrop-blur-sm">
                    <div className="max-w-md w-full mx-4">
                        <ReportYearSelector
                            onGenerate={handleGenerateReport}
                            onCancel={handleCancelReport}
                            isGenerating={false}
                        />
                    </div>
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
                        <ChatInput
                            onSendMessage={handleSendMessage}
                            disabled={isDisabled}
                            onRequestReport={handleRequestReport}
                        />
                    </div>
                </div>
            ) : (
                /* Active State: Chat Interface */
                <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 z-10 relative">
                    <div className="flex-1 overflow-y-auto py-4 scroll-smooth no-scrollbar" id="chat-scroll-area">
                        {/* v4.0: Pass processEvents for transparency */}
                        {/* v4.2: Pass report-related props */}
                        <MessageList
                            messages={messages}
                            currentThinking={currentThinking}
                            processEvents={processEvents}
                            onSaveReport={handleSaveReport}
                            isSavingReport={isSavingReport}
                            savedReportPdfUrl={savedReportPdfUrl}
                        />

                        {/* v4.2: Report Progress (shown during generation) */}
                        {isGeneratingReport && (
                            <div className="flex items-start gap-4 mt-4">
                                <div className="flex-shrink-0 w-8 h-8" />
                                <div className="flex-1 max-w-[85%]">
                                    <ReportProgress
                                        phases={reportPhases}
                                        currentSection={currentReportSection}
                                        error={reportError}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="w-full pb-4 pt-2">
                        <ChatInput
                            onSendMessage={handleSendMessage}
                            disabled={isDisabled}
                            onRequestReport={handleRequestReport}
                        />
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
