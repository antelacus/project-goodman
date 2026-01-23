/**
 * useReportGeneration Hook
 * v4.2: Manages report generation state, SSE streaming, and saving
 *
 * Extracted from ChatWorkspace to provide reusable report generation logic
 */

import { useState, useRef, useCallback } from 'react';
import type { ReportContent } from '@/types/report';
import type { PhaseDisplayInfo, ReportPhase } from '@/types/report-events';
import { REPORT_PHASES } from '@/types/report-events';
import { notifyGuestRateUpdate } from '@/lib/security/guest-rate-client';

/**
 * Return type for the useReportGeneration hook
 */
export interface UseReportGenerationReturn {
  // Generation state
  isGenerating: boolean;
  phases: PhaseDisplayInfo[];
  currentSection: string | undefined;
  report: ReportContent | null;
  error: string | undefined;
  reportSessionId: string | undefined;

  // Save state - DOCX generation + upload takes 2-4 seconds
  isSaving: boolean;
  savedDocxUrl: string | undefined;
  savedReportId: string | undefined;

  // Generation input tracking (for save operation)
  generationYear: string | undefined;
  comparisonYear: string | undefined;
  generationTimeMs: number | undefined;

  // Operations
  startGeneration: (year: string, comparisonYear?: string) => Promise<ReportContent | null>;
  saveReport: () => Promise<{ reportId: string; docxUrl: string | null } | null>;
  reset: () => void;
  cancel: () => void;
}

/**
 * Phase order for status updates
 */
const PHASE_ORDER: ReportPhase[] = ['check', 'gather', 'analyze', 'generate'];

/**
 * Hook for managing financial report generation
 *
 * Handles SSE streaming, phase tracking, and report saving with DOCX generation.
 *
 * @example
 * ```tsx
 * const {
 *   isGenerating,
 *   phases,
 *   report,
 *   startGeneration,
 *   saveReport,
 * } = useReportGeneration();
 *
 * // Start generation
 * await startGeneration('2024', '2023');
 *
 * // Save when complete
 * const result = await saveReport();
 * ```
 */
export function useReportGeneration(): UseReportGenerationReturn {
  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [phases, setPhases] = useState<PhaseDisplayInfo[]>([...REPORT_PHASES]);
  const [currentSection, setCurrentSection] = useState<string | undefined>();
  const [report, setReport] = useState<ReportContent | null>(null);
  const [generationTimeMs, setGenerationTimeMs] = useState<number | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [reportSessionId, setReportSessionId] = useState<string | undefined>();

  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [savedDocxUrl, setSavedDocxUrl] = useState<string | undefined>();
  const [savedReportId, setSavedReportId] = useState<string | undefined>();

  // Track generation input for save
  const [generationYear, setGenerationYear] = useState<string | undefined>();
  const [comparisonYear, setComparisonYear] = useState<string | undefined>();

  // Abort controller for cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Update phase status based on SSE event
   */
  const updatePhaseStatus = useCallback((phase: ReportPhase, status: string) => {
    setPhases(prev => prev.map(p => {
      if (p.id === phase) {
        return { ...p, status: status === 'completed' ? 'completed' : 'in_progress' };
      }
      // Mark previous phases as completed
      const currentIndex = PHASE_ORDER.indexOf(phase);
      const thisIndex = PHASE_ORDER.indexOf(p.id);
      if (thisIndex < currentIndex) {
        return { ...p, status: 'completed' };
      }
      return p;
    }));
  }, []);

  /**
   * Handle SSE event from report generation
   */
  const handleSSEEvent = useCallback((event: { type: string; data: unknown }): ReportContent | null => {
    switch (event.type) {
      case 'phase': {
        const { phase, status } = event.data as { phase: ReportPhase; status: string };
        updatePhaseStatus(phase, status);
        return null;
      }
      case 'section': {
        const { sectionId, status } = event.data as { sectionId: string; status: string };
        if (status === 'generating') {
          setCurrentSection(sectionId);
        } else if (status === 'completed') {
          setCurrentSection(undefined);
        }
        return null;
      }
      case 'complete': {
        const { content, generationTimeMs: completedTime, sessionId } = event.data as {
          reportId: string;
          content: ReportContent;
          generationTimeMs?: number;
          sessionId?: string;
        };
        setReport(content);
        setGenerationTimeMs(completedTime);
        setReportSessionId(sessionId);
        setIsGenerating(false);
        setCurrentSection(undefined);
        return content;
      }
      case 'error': {
        const { message } = event.data as { message: string };
        setError(message);
        setIsGenerating(false);
        return null;
      }
      default:
        return null;
    }
  }, [updatePhaseStatus]);

  /**
   * Start report generation with SSE streaming
   *
   * @param year - Primary analysis year (required)
   * @param compYear - Comparison year (optional)
   * @returns The generated report content, or null if failed
   */
  const startGeneration = useCallback(async (
    year: string,
    compYear?: string
  ): Promise<ReportContent | null> => {
    // Reset state
    setIsGenerating(true);
    setError(undefined);
    setReport(null);
    setSavedDocxUrl(undefined);
    setSavedReportId(undefined);
    setPhases([...REPORT_PHASES]);
    setCurrentSection(undefined);
    setGenerationYear(year);
    setComparisonYear(compYear);
    setGenerationTimeMs(undefined);
    setReportSessionId(undefined);

    // Create abort controller
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    let generatedReport: ReportContent | null = null;

    try {
      console.log('[useReportGeneration] Starting fetch to /api/reports/generate');
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, comparisonYear: compYear }),
        signal: abortController.signal,
      });

      console.log('[useReportGeneration] Response status:', response.status);
      notifyGuestRateUpdate();

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[useReportGeneration] Response not OK:', errorData);
        throw new Error(errorData.error || '报告生成请求失败');
      }

      if (!response.body) {
        throw new Error('无法获取响应流');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      console.log('[useReportGeneration] Starting to read SSE stream');
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('[useReportGeneration] SSE stream ended');
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.slice(6));
              console.log('[useReportGeneration] SSE event:', eventData.type);
              const result = handleSSEEvent(eventData);
              if (result) {
                generatedReport = result;
              }
            } catch (parseErr) {
              console.warn('[useReportGeneration] Parse error for line:', line.substring(0, 100), parseErr);
            }
          }
        }
      }
    } catch (err) {
      console.error('[useReportGeneration] Caught error:', err);
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('[useReportGeneration] Request was aborted');
        setIsGenerating(false);
      } else {
        console.error('[useReportGeneration] Setting error state:', err instanceof Error ? err.message : '报告生成失败');
        setError(err instanceof Error ? err.message : '报告生成失败');
        setIsGenerating(false);
      }
    } finally {
      console.log('[useReportGeneration] Finally block, generatedReport:', !!generatedReport);
      abortControllerRef.current = null;
    }

    return generatedReport;
  }, [handleSSEEvent]);

  /**
   * Fetch CSRF token from the server
   */
  const fetchCsrfToken = useCallback(async (): Promise<string | null> => {
    try {
      const response = await fetch('/api/auth/csrf');
      const data = await response.json();
      return data.success ? data.token : null;
    } catch {
      console.error('Failed to fetch CSRF token');
      return null;
    }
  }, []);

  /**
   * Save the current report to database and generate DOCX
   *
   * Note: DOCX generation + Supabase upload takes 2-4 seconds.
   * The isSaving state should trigger explicit "正在生成DOCX并保存..." message in UI.
   *
   * @returns Object with reportId and docxUrl, or null if failed
   */
  const saveReport = useCallback(async (): Promise<{ reportId: string; docxUrl: string | null } | null> => {
    if (!report) {
      console.warn('No report to save');
      return null;
    }

    setIsSaving(true);
    try {
      // Fetch CSRF token for the request
      const csrfToken = await fetchCsrfToken();
      if (!csrfToken) {
        throw new Error('无法获取安全令牌，请刷新页面重试');
      }

      const response = await fetch('/api/reports/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({
          content: report,
          year: report.year,
          comparisonYear: report.comparisonYear,
          generationTimeMs,
        }),
      });

      const data = await response.json();

      if (data.success && data.data?.reportId) {
        const docxUrl = data.data.docxUrl ?? null;
        setSavedReportId(data.data.reportId);
        setSavedDocxUrl(docxUrl ?? undefined);
        return {
          reportId: data.data.reportId,
          docxUrl,
        };
      }

      if (data.success) {
        throw new Error('保存成功但未返回报告信息');
      } else {
        throw new Error(data.error || '保存失败');
      }
    } catch (err) {
      console.error('Failed to save report:', err);
      setError(err instanceof Error ? err.message : '保存失败');
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [report, fetchCsrfToken, generationTimeMs]);

  /**
   * Reset all state to initial values
   */
  const reset = useCallback(() => {
    setIsGenerating(false);
    setPhases([...REPORT_PHASES]);
    setCurrentSection(undefined);
    setReport(null);
    setError(undefined);
    setIsSaving(false);
    setSavedDocxUrl(undefined);
    setSavedReportId(undefined);
    setGenerationYear(undefined);
    setComparisonYear(undefined);
    setGenerationTimeMs(undefined);
    setReportSessionId(undefined);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  /**
   * Cancel ongoing generation
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    setPhases([...REPORT_PHASES]);
    setCurrentSection(undefined);
    setError(undefined);
    setReportSessionId(undefined);
  }, []);

  return {
    // State
    isGenerating,
    phases,
    currentSection,
    report,
    error,
    reportSessionId,
    isSaving,
    savedDocxUrl,
    savedReportId,
    generationYear,
    comparisonYear,
    generationTimeMs,

    // Operations
    startGeneration,
    saveReport,
    reset,
    cancel,
  };
}
