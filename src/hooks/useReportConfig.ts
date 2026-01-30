/**
 * useReportConfig Hook
 * v4.2: Manages conversational report configuration state
 *
 * Handles the flow where user configures report parameters through chat,
 * rather than a modal dialog (PRD Section 3.5).
 */

import { useState, useCallback, useRef } from 'react';
import type { ReportConfigIntent } from '@/lib/validation/api-schemas';
import {
  getInitialConfigMessage,
  getConfigUpdatedMessage,
  getComparisonRemovedMessage,
  getCancelledMessage,
  getNoDataAvailableMessage,
  getUnclearIntentMessage,
  getGenerationStartingMessage,
} from '@/lib/ai/prompts/report-config-messages';

/**
 * Report configuration state
 */
export interface ReportConfigState {
  isActive: boolean;
  year: string;
  comparisonYear: string | undefined;
  availableYears: string[];
  isProcessing: boolean;
  error: string | undefined;
}

/**
 * Result from handling user response
 */
export interface HandleUserResponseResult {
  /** Agent response message to display */
  agentResponse?: string;
  /** Whether to start report generation */
  shouldStartGeneration?: boolean;
  /** Final configuration if generation should start */
  finalConfig?: {
    year: string;
    comparisonYear?: string;
  };
  /** Whether config mode ended (cancelled or started generation) */
  configEnded?: boolean;
}

/**
 * Return type for the useReportConfig hook
 */
export interface UseReportConfigReturn {
  state: ReportConfigState;

  /**
   * Start configuration mode.
   * Fetches available years and returns the initial agent message.
   */
  startConfig: () => Promise<string | null>;

  /**
   * Handle user's response during configuration.
   * Parses intent and returns appropriate response/action.
   */
  handleUserResponse: (message: string) => Promise<HandleUserResponseResult>;

  /**
   * Cancel configuration mode.
   */
  cancel: () => void;

  /**
   * Reset all state.
   */
  reset: () => void;
}

/**
 * Hook for managing conversational report configuration
 *
 * @example
 * ```tsx
 * const reportConfig = useReportConfig();
 *
 * // User clicks "生成报告"
 * const initialMessage = await reportConfig.startConfig();
 * addAgentMessage(initialMessage);
 *
 * // User types a response
 * const result = await reportConfig.handleUserResponse(userMessage);
 * if (result.agentResponse) {
 *   addAgentMessage(result.agentResponse);
 * }
 * if (result.shouldStartGeneration) {
 *   startReportGeneration(result.finalConfig);
 * }
 * ```
 */
export function useReportConfig(): UseReportConfigReturn {
  const [state, setState] = useState<ReportConfigState>({
    isActive: false,
    year: '',
    comparisonYear: undefined,
    availableYears: [],
    isProcessing: false,
    error: undefined,
  });

  // Track abort controller for cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Fetch available years from API
   */
  const fetchAvailableYears = async (): Promise<string[]> => {
    const response = await fetch('/api/financial-data/years');
    if (!response.ok) {
      throw new Error('Failed to fetch available years');
    }
    const data = await response.json();
    if (!data.success || !data.data?.years) {
      throw new Error('Invalid response from years API');
    }
    return data.data.years as string[];
  };

  /**
   * Start configuration mode
   */
  const startConfig = useCallback(async (): Promise<string | null> => {
    // Cancel any pending operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setState(prev => ({ ...prev, isProcessing: true, error: undefined }));

    try {
      // Fetch available years
      const years = await fetchAvailableYears();

      if (years.length === 0) {
        setState({
          isActive: false,
          year: '',
          comparisonYear: undefined,
          availableYears: [],
          isProcessing: false,
          error: 'No data available',
        });
        return getNoDataAvailableMessage();
      }

      // Default: most recent year as primary, previous year as comparison
      const primaryYear = years[0];
      const comparisonYear = years.length > 1 ? years[1] : undefined;

      setState({
        isActive: true,
        year: primaryYear,
        comparisonYear,
        availableYears: years,
        isProcessing: false,
        error: undefined,
      });

      return getInitialConfigMessage(primaryYear, comparisonYear);
    } catch (error) {
      console.error('[useReportConfig] Failed to start config:', error);
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
      return null;
    }
  }, []);

  /**
   * Handle user's response during configuration
   */
  const handleUserResponse = useCallback(
    async (message: string): Promise<HandleUserResponseResult> => {
      console.log('[useReportConfig] handleUserResponse called, state.isActive:', state.isActive);

      if (!state.isActive) {
        console.log('[useReportConfig] Config not active, returning empty');
        return {};
      }

      setState(prev => ({ ...prev, isProcessing: true }));

      try {
        console.log('[useReportConfig] Making API call with:', { message, year: state.year, comparisonYear: state.comparisonYear });
        // Call parse-config API
        const response = await fetch('/api/reports/parse-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userMessage: message,
            currentConfig: {
              year: state.year,
              comparisonYear: state.comparisonYear || null,
            },
            availableYears: state.availableYears,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to parse intent');
        }

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to parse intent');
        }

        const intent: ReportConfigIntent = data.data;

        // Handle based on intent
        switch (intent.intent) {
          case 'confirm': {
            // User confirmed - start generation
            const finalConfig = {
              year: state.year,
              comparisonYear: state.comparisonYear,
            };

            setState(prev => ({
              ...prev,
              isActive: false,
              isProcessing: false,
            }));

            return {
              agentResponse: getGenerationStartingMessage(
                finalConfig.year,
                finalConfig.comparisonYear
              ),
              shouldStartGeneration: true,
              finalConfig,
              configEnded: true,
            };
          }

          case 'change_year': {
            // Update primary year (and optionally comparison year)
            const newYear = intent.year || state.year;
            // If comparison year was also specified, use it; otherwise auto-select previous year
            let newComparisonYear = intent.comparisonYear;
            if (newComparisonYear === null && state.comparisonYear) {
              // User didn't mention comparison, keep auto-selecting
              const yearIndex = state.availableYears.indexOf(newYear);
              if (yearIndex >= 0 && yearIndex < state.availableYears.length - 1) {
                newComparisonYear = state.availableYears[yearIndex + 1];
              }
            }

            setState(prev => ({
              ...prev,
              year: newYear,
              comparisonYear: newComparisonYear || undefined,
              isProcessing: false,
            }));

            return {
              agentResponse: getConfigUpdatedMessage(newYear, newComparisonYear || undefined),
            };
          }

          case 'change_comparison': {
            // Update comparison year only
            const newComparisonYear = intent.comparisonYear || undefined;

            setState(prev => ({
              ...prev,
              comparisonYear: newComparisonYear,
              isProcessing: false,
            }));

            return {
              agentResponse: getConfigUpdatedMessage(state.year, newComparisonYear),
            };
          }

          case 'remove_comparison': {
            // Remove comparison year
            setState(prev => ({
              ...prev,
              comparisonYear: undefined,
              isProcessing: false,
            }));

            return {
              agentResponse: getComparisonRemovedMessage(state.year),
            };
          }

          case 'cancel': {
            // Cancel configuration
            setState({
              isActive: false,
              year: '',
              comparisonYear: undefined,
              availableYears: [],
              isProcessing: false,
              error: undefined,
            });

            return {
              agentResponse: getCancelledMessage(),
              configEnded: true,
            };
          }

          case 'unclear':
          default: {
            // Need clarification
            setState(prev => ({ ...prev, isProcessing: false }));

            return {
              agentResponse: getUnclearIntentMessage(intent.clarificationNeeded || undefined),
            };
          }
        }
      } catch (error) {
        console.error('[useReportConfig] Failed to handle response:', error);
        setState(prev => ({ ...prev, isProcessing: false }));

        return {
          agentResponse: getUnclearIntentMessage(
            '处理您的请求时出现问题，请重试。'
          ),
        };
      }
    },
    [state]
  );

  /**
   * Cancel configuration mode
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setState({
      isActive: false,
      year: '',
      comparisonYear: undefined,
      availableYears: [],
      isProcessing: false,
      error: undefined,
    });
  }, []);

  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    cancel();
  }, [cancel]);

  return {
    state,
    startConfig,
    handleUserResponse,
    cancel,
    reset,
  };
}
