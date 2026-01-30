'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStreamingChat } from '@/hooks/useStreamingChat';
import { useReportGeneration } from '@/hooks/useReportGeneration';
import { useReportConfig } from '@/hooks/useReportConfig';
import { useSidebar } from '@/components/layout/SidebarProvider';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import GuestBanner from './GuestBanner';
import { ReportProgress } from '@/components/reports';
import { SkeletonMessage } from '@/components/ui/Skeleton';
import type { ChatMessage } from '@/types/message';
import type { ReportSectionId } from '@/types/report';
import { formatChatWarnings, type ChatWarning } from '@/lib/chat/warnings';
import { notifyGuestRateUpdate } from '@/lib/security/guest-rate-client';
import { decodeReportMessage } from '@/lib/reports/report-message';

export default function ChatWorkspace() {
    const searchParams = useSearchParams();
    const urlSessionId = searchParams.get('session');
    const { refreshSessions } = useSidebar(); // v4.3: For sidebar session sync

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoadingSession, setIsLoadingSession] = useState(false);
    const [loadedSessionId, setLoadedSessionId] = useState<string | null>(null);
    const previousSessionIdRef = useRef<string | null>(null); // v4.3: Track previous sessionId

    // v4.2: Report generation via hook
    const {
        isGenerating: isGeneratingReport,
        phases: reportPhases,
        currentSection: currentReportSection,
        error: reportError,
        isSaving: isSavingReport,
        savedDocxUrl: savedReportDocxUrl,
        savedReportId,
        reportSessionId,
        startGeneration,
        saveReport,
    } = useReportGeneration();

    // v4.2: Conversational report configuration (PRD Section 3.5)
    const reportConfig = useReportConfig();

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
                        setMessages(data.messages.map((m: { role: string; content: string; id?: string }) => {
                            const decodedReport = decodeReportMessage(m.content);
                            if (decodedReport && m.role === 'assistant') {
                                return {
                                    role: 'assistant',
                                    content: '',
                                    id: m.id || Date.now().toString(),
                                    messageType: 'report',
                                    reportContent: decodedReport,
                                } satisfies ChatMessage;
                            }

                            return {
                                role: m.role,
                                content: m.content,
                                id: m.id || Date.now().toString(),
                            };
                        }));
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

    // v4.2: Report request handler - start conversational configuration
    const handleRequestReport = useCallback(async () => {
        // Start conversational config flow
        const initialMessage = await reportConfig.startConfig();

        if (initialMessage) {
            // Add agent's initial proposal to chat
            const agentMsg: ChatMessage = {
                role: 'assistant',
                content: initialMessage,
                id: Date.now().toString(),
            };
            setMessages(prev => [...prev, agentMsg]);
        }
    }, [reportConfig]);

    // v4.2: Start report generation (called after user confirms config)
    const handleGenerateReport = useCallback(async (
        year: string,
        comparisonYear?: string,
        sections?: ReportSectionId[]
    ) => {
        // Start generation via hook - it handles SSE parsing internally
        const generatedReport = await startGeneration(year, comparisonYear, sections);

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

    const handleComplete = (data: { answer?: string; sessionId?: string; warnings?: ChatWarning[] }) => {
        const warningMessage = formatChatWarnings(data?.warnings);
        const content = data?.answer || "Request completed, but no answer was returned.";

        setMessages(prev => {
            const next: ChatMessage[] = [
                ...prev,
                {
                    role: 'assistant',
                    content,
                    id: Date.now().toString()
                }
            ];

            if (warningMessage) {
                next.push({
                    role: 'assistant',
                    content: warningMessage,
                    id: Date.now().toString()
                });
            }

            return next;
        });

        notifyGuestRateUpdate();
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

    // v4.3: Refresh sidebar sessions when a new session is created
    useEffect(() => {
        if (sessionId && sessionId !== previousSessionIdRef.current) {
            previousSessionIdRef.current = sessionId;
            // Only refresh if this is a new session (not initial load)
            if (previousSessionIdRef.current !== urlSessionId) {
                refreshSessions();
            }
        }
    }, [sessionId, urlSessionId, refreshSessions]);

    useEffect(() => {
        if (reportSessionId) {
            refreshSessions();
        }
    }, [reportSessionId, refreshSessions]);

    const handleSendMessage = async (text: string, files: File[], documentIds: string[]) => {
        console.log('[ChatWorkspace] handleSendMessage called, text:', text);
        console.log('[ChatWorkspace] reportConfig.state.isActive:', reportConfig.state.isActive);

        // 1. Optimistically add user message
        const userMsg: ChatMessage = {
            role: 'user',
            content: text + (files.length > 0 ? `\n\n[Attached ${files.length} files]` : '') + (documentIds.length > 0 ? `\n\n[Attached ${documentIds.length} existing documents]` : ''),
            id: Date.now().toString()
        };
        setMessages(prev => [...prev, userMsg]);

        // v4.2: Check if in report configuration mode
        if (reportConfig.state.isActive) {
            console.log('[ChatWorkspace] In report config mode, calling handleUserResponse');
            // Handle as report configuration response
            const result = await reportConfig.handleUserResponse(text);
            console.log('[ChatWorkspace] handleUserResponse result:', result);

            // Add agent response if any
            if (result.agentResponse) {
                const agentMsg: ChatMessage = {
                    role: 'assistant',
                    content: result.agentResponse,
                    id: Date.now().toString(),
                };
                setMessages(prev => [...prev, agentMsg]);
            }

            // Start generation if user confirmed
            if (result.shouldStartGeneration && result.finalConfig) {
                await handleGenerateReport(
                    result.finalConfig.year,
                    result.finalConfig.comparisonYear,
                    result.finalConfig.sections
                );
            }

            return; // Don't send to regular chat flow
        }

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

        // 3. Send to regular chat flow
        await sendMessage(text, fileData, documentIds);
    };

    const hasMessages = messages.length > 0;
    const isDisabled = isStreaming || isGeneratingReport || reportConfig.state.isProcessing;

    return (
        <div className="flex flex-col h-full bg-neutral-50 relative overflow-hidden font-sans">
            {/* Guest Banner - Shows rate limits for guests */}
            <GuestBanner />

            {/* Background decoration - Simplified */}
            <div className="absolute inset-0 bg-white/50 opacity-10 pointer-events-none" />

            {/* v4.3: Skeleton loading for session loading */}
            {isLoadingSession && (
                <div className="absolute inset-0 z-20 bg-white/95 overflow-hidden">
                    <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
                        <SkeletonMessage />
                        <SkeletonMessage />
                        <SkeletonMessage />
                    </div>
                </div>
            )}


            {!hasMessages && !isLoadingSession ? (
                /* Zero State: Centered */
                <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-3xl mx-auto w-full z-10 relative animate-in fade-in duration-500">
                    <div className="mb-8 text-left w-full pl-1">
                        <h1 className="text-4xl md:text-5xl bg-clip-text text-transparent bg-gradient-to-r from-neutral-900 via-neutral-600 to-yellow-600 font-medium mb-2 tracking-tight">您好，</h1>
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
                            savedReportDocxUrl={savedReportDocxUrl}
                            savedReportId={savedReportId}
                        />

                        {/* v4.2: Report Progress (shown during generation or on error) */}
                        {(isGeneratingReport || reportError) && (
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
                        {/* v4.2: Report config mode indicator (above input) */}
                        {reportConfig.state.isActive && (
                            <div className="text-center mb-2">
                                <span className="inline-flex items-center gap-1.5 text-xs text-yellow-700 bg-yellow-50 px-2.5 py-1 rounded-full border border-yellow-200">
                                    <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse"></span>
                                    报告配置中 · 输入&quot;确认&quot;开始生成，或调整年份设置
                                </span>
                            </div>
                        )}
                        <ChatInput
                            onSendMessage={handleSendMessage}
                            disabled={isDisabled}
                            onRequestReport={handleRequestReport}
                        />
                        {sessionId && !reportConfig.state.isActive && (
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
