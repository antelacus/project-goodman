
import { useState, useRef, useCallback } from 'react';

// Define event types based on what we implemented
export type StreamEventType = 'thinking' | 'tool_call' | 'tool_result' | 'complete' | 'error' | 'debug';

export interface StreamEvent {
    type: StreamEventType;
    data: any;
    timestamp: number;
}

export interface UseStreamingChatProps {
    initialSessionId?: string;
    onComplete?: (data: any) => void;
    onError?: (error: string) => void;
}

export function useStreamingChat({ initialSessionId, onComplete, onError }: UseStreamingChatProps = {}) {
    const [sessionId, setSessionId] = useState<string | undefined>(initialSessionId);
    const [isStreaming, setIsStreaming] = useState(false);
    const [events, setEvents] = useState<StreamEvent[]>([]);
    const [currentThinking, setCurrentThinking] = useState<string | null>(null);

    const abortControllerRef = useRef<AbortController | null>(null);

    const sendMessage = useCallback(async (question: string, files: any[] = []) => {
        // Reset state for new message
        setIsStreaming(true);
        setEvents([]);
        setCurrentThinking(null);

        // Abort previous request if any (optional)
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        try {
            const response = await fetch('/api/chat/stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    question,
                    sessionId: sessionId, // Use current session ID if available
                    files,
                }),
                signal: abortController.signal,
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) throw new Error('No response body');

            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();

                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;

                // Process buffer for SSE
                const blocks = buffer.split('\n\n');

                // Keep incomplete block
                // If buffer ends with \n\n, last block is empty
                const hasCompleteEnd = buffer.endsWith('\n\n');
                const completeBlocks = hasCompleteEnd ? blocks.slice(0, -1) : blocks.slice(0, -1);
                buffer = hasCompleteEnd ? '' : blocks[blocks.length - 1];

                for (const block of completeBlocks) {
                    if (!block.trim()) continue;

                    const lines = block.split('\n');
                    let eventType: StreamEventType | null = null;
                    let eventData: any = null;

                    for (const line of lines) {
                        if (line.startsWith('event: ')) {
                            eventType = line.substring(7) as StreamEventType;
                        } else if (line.startsWith('data: ')) {
                            try {
                                eventData = JSON.parse(line.substring(6));
                            } catch (e) {
                                console.error('Failed to parse event data', e);
                            }
                        }
                    }

                    if (eventType && eventData) {
                        handleEvent(eventType, eventData);
                    }
                }
            }

        } catch (error: any) {
            if (error.name === 'AbortError') {
                console.log('Request aborted');
            } else {
                console.error('Streaming error:', error);
                if (onError) onError(error.message);
            }
        } finally {
            setIsStreaming(false);
            setCurrentThinking(null);
            abortControllerRef.current = null;
        }
    }, [sessionId, onError]);

    const handleEvent = (type: StreamEventType, data: any) => {
        // Add to event log
        const newEvent: StreamEvent = { type, data, timestamp: Date.now() };
        setEvents(prev => [...prev, newEvent]);

        if (type === 'thinking') {
            setCurrentThinking(data.node);
        } else if (type === 'complete') {
            setCurrentThinking(null);
            // Update session ID if returned
            if (data.sessionId) {
                setSessionId(data.sessionId);
            }
            if (onComplete) {
                onComplete(data);
            }
        } else if (type === 'error') {
            if (onError) onError(data.message);
        }
    };

    return {
        sessionId,
        sendMessage,
        isStreaming,
        events,
        currentThinking
    };
}
