'use client';

/**
 * ProcessLog Component
 * v4.0: Process transparency feature
 *
 * Displays a collapsible log of agent process events (thinking, tool calls, results).
 * Allows users to verify the agent's work and trace data sources.
 */

import { useState, memo } from 'react';
import { ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import type { ProcessEvent, SourceReference } from '@/types/process-events';

// ============================================================================
// Event Icon Mapping
// ============================================================================

const EVENT_ICONS: Record<string, string> = {
    thinking: '🤔',
    tool_call: '🔧',
    tool_result: '✅',
    data_fetch: '📄',
    calculation: '📊',
    error: '❌',
};

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Source link component for data traceability
 */
function SourceLink({ source }: { source: SourceReference }) {
    const displayText = source.article
        ? `${source.documentName}${source.article}`
        : source.year
            ? `${source.year}年${source.documentType || source.documentName}`
            : source.documentName;

    // v4.6: Build link via preview-url redirect to support non-PDF files
    const href = source.fileUrl
        ? `/api/documents/preview-url?fileUrl=${encodeURIComponent(source.fileUrl)}&redirect=1`
        : (source.documentId ? `/api/documents/preview-url?id=${encodeURIComponent(source.documentId)}&redirect=1` : '#');

    // Don't render if no meaningful link target
    if (!source.fileUrl && !source.documentId) {
        return (
            <span className="text-neutral-500 text-xs ml-2">
                [来源: {displayText}]
            </span>
        );
    }

    return (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 ml-2 text-yellow-700 hover:text-yellow-800 hover:underline text-xs"
        >
            [{displayText}]
            <ExternalLink size={10} />
        </a>
    );
}

/**
 * Single event item in the process log
 */
function ProcessEventItem({ event }: { event: ProcessEvent }) {
    const icon = EVENT_ICONS[event.type] || '•';
    const isError = event.type === 'error';

    return (
        <div className={`flex items-start gap-2 py-1 ${isError ? 'text-red-600' : 'text-neutral-700'}`}>
            <span className="flex-shrink-0 text-sm">{icon}</span>
            <div className="flex-1 text-sm">
                <span>{event.content}</span>
                {event.sourceReferences
                    ?.filter(source => source.documentName)
                    .map((source, i) => <SourceLink key={`${source.documentId}-${source.article ?? i}`} source={source} />)}
            </div>
        </div>
    );
}

// ============================================================================
// Main Component
// ============================================================================

interface ProcessLogProps {
    events: ProcessEvent[];
    defaultExpanded?: boolean;
}

function ProcessLogComponent({ events, defaultExpanded = false }: ProcessLogProps) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    // Don't render if no events
    if (events.length === 0) {
        return null;
    }

    // Filter out redundant thinking events (keep only first for each unique node)
    const filteredEvents = filterDuplicateThinkingEvents(events);

    return (
        <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 overflow-hidden">
            {/* Collapse/Expand Toggle */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100 transition-colors"
            >
                {isExpanded ? (
                    <ChevronDown size={16} className="flex-shrink-0" />
                ) : (
                    <ChevronRight size={16} className="flex-shrink-0" />
                )}
                <span>查看计算过程 ({filteredEvents.length} 步)</span>
            </button>

            {/* Expanded Event List */}
            {isExpanded && (
                <div className="border-t border-neutral-200 px-3 py-2 space-y-1 max-h-80 overflow-y-auto">
                    {filteredEvents.map((event) => (
                        <ProcessEventItem key={event.id} event={event} />
                    ))}
                </div>
            )}
        </div>
    );
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Filter out duplicate thinking events to reduce noise.
 * LangGraph emits multiple thinking events for the same node.
 */
function filterDuplicateThinkingEvents(events: ProcessEvent[]): ProcessEvent[] {
    const seenThinkingNodes = new Set<string>();

    return events.filter((event) => {
        // Keep non-thinking events
        if (event.type !== 'thinking') {
            return true;
        }

        // For thinking events, only keep first occurrence of each node
        const node = event.details?.node as string | undefined;
        if (!node) return true;

        // Skip common internal nodes that add noise
        if (['__start__', 'LangGraph'].includes(node)) {
            return false;
        }

        if (seenThinkingNodes.has(node)) {
            return false;
        }

        seenThinkingNodes.add(node);
        return true;
    });
}

// Memoize to prevent unnecessary re-renders
export const ProcessLog = memo(ProcessLogComponent);
export default ProcessLog;
