'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useStreamingChat } from '@/hooks/useStreamingChat';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import GuestBanner from './GuestBanner';
import { ReportYearSelector, ReportProgress, ReportMessage } from '@/components/reports';
import type { ChatMessage } from '@/types/message';
import type { ReportContent } from '@/types/report';
import type { PhaseDisplayInfo } from '@/types/report-events';
import { REPORT_PHASES } from '@/types/report-events';

export default function ChatWorkspace() {
    const searchParams = useSearchParams();
    const urlSessionId = searchParams.get('session');

    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isLoadingSession, setIsLoadingSession] = useState(false);
    const [loadedSessionId, setLoadedSessionId] = useState<string | null>(null);

    // v4.2: Report generation state
    const [showReportSelector, setShowReportSelector] = useState(false);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);
    const [reportPhases, setReportPhases] = useState<PhaseDisplayInfo[]>([...REPORT_PHASES]);
    const [currentReportSection, setCurrentReportSection] = useState<string | undefined>();
    const [reportError, setReportError] = useState<string | undefined>();
    const [currentReport, setCurrentReport] = useState<ReportContent | null>(null);
    const [isSavingReport, setIsSavingReport] = useState(false);
    const [savedReportPdfUrl, setSavedReportPdfUrl] = useState<string | undefined>();

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
        setReportError(undefined);
    }, []);

    // v4.2: Cancel report generation
    const handleCancelReport = useCallback(() => {
        setShowReportSelector(false);
        setIsGeneratingReport(false);
        setReportPhases([...REPORT_PHASES]);
        setCurrentReportSection(undefined);
        setReportError(undefined);
    }, []);

    // v4.2: Start report generation
    const handleGenerateReport = useCallback(async (year: string, comparisonYear?: string) => {
        setShowReportSelector(false);
        setIsGeneratingReport(true);
        setReportError(undefined);
        setCurrentReport(null);
        setSavedReportPdfUrl(undefined);
        setReportPhases([...REPORT_PHASES]);

        // Add user message indicating report request
        const userMsg: ChatMessage = {
            role: 'user',
            content: `请生成${year}年度财务分析报告${comparisonYear ? `（与${comparisonYear}年对比）` : ''}`,
            id: Date.now().toString(),
        };
        setMessages(prev => [...prev, userMsg]);

        try {
            const response = await fetch('/api/reports/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ year, comparisonYear }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || '报告生成请求失败');
            }

            if (!response.body) {
                throw new Error('无法获取响应流');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const eventData = JSON.parse(line.slice(6));
                            handleReportSSEEvent(eventData);
                        } catch {
                            // Ignore parse errors for malformed events
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Report generation error:', error);
            setReportError(error instanceof Error ? error.message : '报告生成失败');
            setIsGeneratingReport(false);
        }
    }, []);

    // v4.2: Handle SSE events from report generation
    const handleReportSSEEvent = useCallback((event: { type: string; data: unknown }) => {
        switch (event.type) {
            case 'phase': {
                const { phase, status } = event.data as { phase: string; status: string };
                setReportPhases(prev => prev.map(p => {
                    if (p.id === phase) {
                        return { ...p, status: status === 'completed' ? 'completed' : 'in_progress' };
                    }
                    // Mark previous phases as completed
                    const phaseOrder = ['check', 'gather', 'analyze', 'generate'];
                    const currentIndex = phaseOrder.indexOf(phase);
                    const thisIndex = phaseOrder.indexOf(p.id);
                    if (thisIndex < currentIndex) {
                        return { ...p, status: 'completed' };
                    }
                    return p;
                }));
                break;
            }
            case 'section': {
                const { sectionId, status } = event.data as { sectionId: string; status: string };
                if (status === 'generating') {
                    setCurrentReportSection(sectionId);
                } else if (status === 'completed') {
                    setCurrentReportSection(undefined);
                }
                break;
            }
            case 'complete': {
                const { content } = event.data as { reportId: string; content: ReportContent };
                setCurrentReport(content);
                setIsGeneratingReport(false);
                // Add report as a message
                const reportMsg: ChatMessage = {
                    role: 'assistant',
                    content: '',
                    id: Date.now().toString(),
                    messageType: 'report',
                    reportContent: content,
                };
                setMessages(prev => [...prev, reportMsg]);
                break;
            }
            case 'error': {
                const { message } = event.data as { message: string };
                setReportError(message);
                setIsGeneratingReport(false);
                break;
            }
        }
    }, []);

    // v4.2: Save report handler
    const handleSaveReport = useCallback(async () => {
        if (!currentReport) return;

        setIsSavingReport(true);
        try {
            const response = await fetch('/api/reports/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: currentReport,
                    year: currentReport.year,
                    comparisonYear: currentReport.comparisonYear,
                }),
            });

            const data = await response.json();
            if (data.success && data.data?.pdfUrl) {
                setSavedReportPdfUrl(data.data.pdfUrl);
            } else {
                throw new Error(data.error || '保存失败');
            }
        } catch (error) {
            console.error('Failed to save report:', error);
            // Could show toast notification here
        } finally {
            setIsSavingReport(false);
        }
    }, [currentReport]);

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
