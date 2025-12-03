/**
 * Confidence Scoring Utilities
 *
 * Multi-metric confidence calculation and threshold gating for AI responses.
 * Used to determine if a response is reliable enough to show to users.
 */

import { z } from 'zod';

// ============================================================================
// Types & Schemas
// ============================================================================

/**
 * Individual confidence metric
 */
export interface ConfidenceMetric {
  name: string;
  value: number;      // 0-1
  weight: number;     // Importance of this metric (0-1)
  description?: string;
}

/**
 * Overall confidence score with breakdown
 */
export interface ConfidenceScore {
  overall: number;    // Weighted average (0-1)
  metrics: ConfidenceMetric[];
  pass: boolean;      // Whether confidence meets threshold
  reason?: string;    // Why confidence is low (if pass=false)
}

/**
 * Confidence thresholds for different operation types
 */
export interface ConfidenceThresholds {
  extraction: number;           // For data extraction
  calculation: number;          // For financial calculations
  guidance: number;             // For compliance guidance
  routing: number;              // For module routing (landing page)
}

/**
 * Operation types that require confidence scoring
 */
export type OperationType = keyof ConfidenceThresholds;

/**
 * Zod schema for validation
 */
const ConfidenceMetricSchema = z.object({
  name: z.string(),
  value: z.number().min(0).max(1),
  weight: z.number().min(0).max(1),
  description: z.string().optional(),
});

const ConfidenceScoreSchema = z.object({
  overall: z.number().min(0).max(1),
  metrics: z.array(ConfidenceMetricSchema),
  pass: z.boolean(),
  reason: z.string().optional(),
});

// ============================================================================
// Configuration
// ============================================================================

/**
 * Default confidence thresholds
 * These determine when a response is "good enough" to show to users
 */
export const DEFAULT_THRESHOLDS: ConfidenceThresholds = {
  extraction: 0.70,     // 70% - Data extraction (moderate threshold)
  calculation: 0.85,    // 85% - Financial calculations (high threshold - accuracy critical)
  guidance: 0.75,       // 75% - Compliance guidance (high threshold - legal implications)
  routing: 0.60,        // 60% - Module routing (lower threshold - less critical)
};

/**
 * Metric weights for different operation types
 * These define how much each factor contributes to overall confidence
 */
export const METRIC_WEIGHTS = {
  extraction: {
    llmConfidence: 0.4,          // LLM's self-reported confidence
    dataCompleteness: 0.3,        // % of expected fields populated
    formatConsistency: 0.2,       // How well data matches expected format
    crossValidation: 0.1,         // Internal consistency checks
  },
  calculation: {
    dataAvailability: 0.4,        // All required data present?
    dataQuality: 0.3,             // Data quality and consistency
    functionMatch: 0.2,           // How well function matches intent
    validationPass: 0.1,          // Passes validation rules?
  },
  guidance: {
    semanticSimilarity: 0.35,     // Vector search similarity score
    keywordMatch: 0.25,           // Keyword matching score
    citationQuality: 0.25,        // Quality of citations
    contextRelevance: 0.15,       // Relevance to user's context
  },
  routing: {
    intentClarity: 0.5,           // How clear is user's intent?
    moduleMatch: 0.3,             // How well does module match?
    contextCompleteness: 0.2,     // Enough context to route?
  },
};

// ============================================================================
// Core Confidence Calculation Functions
// ============================================================================

/**
 * Calculate weighted average confidence from multiple metrics
 *
 * @param metrics - Array of confidence metrics
 * @returns Weighted average confidence score (0-1)
 */
export function calculateWeightedConfidence(metrics: ConfidenceMetric[]): number {
  if (metrics.length === 0) {
    return 0;
  }

  // Calculate weighted sum
  const totalWeight = metrics.reduce((sum, m) => sum + m.weight, 0);

  if (totalWeight === 0) {
    // If all weights are 0, return simple average
    return metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
  }

  const weightedSum = metrics.reduce((sum, m) => sum + (m.value * m.weight), 0);

  return weightedSum / totalWeight;
}

/**
 * Apply threshold gating to confidence score
 *
 * @param confidence - Overall confidence score
 * @param operationType - Type of operation
 * @param thresholds - Custom thresholds (optional)
 * @returns Whether confidence meets threshold
 */
export function applyThresholdGating(
  confidence: number,
  operationType: OperationType,
  thresholds: ConfidenceThresholds = DEFAULT_THRESHOLDS
): boolean {
  const threshold = thresholds[operationType];
  return confidence >= threshold;
}

/**
 * Create confidence score with threshold gating
 *
 * @param metrics - Individual confidence metrics
 * @param operationType - Type of operation
 * @param thresholds - Custom thresholds (optional)
 * @returns Complete confidence score object
 */
export function createConfidenceScore(
  metrics: ConfidenceMetric[],
  operationType: OperationType,
  thresholds: ConfidenceThresholds = DEFAULT_THRESHOLDS
): ConfidenceScore {
  // Validate metrics
  metrics.forEach(m => {
    try {
      ConfidenceMetricSchema.parse(m);
    } catch (error) {
      throw new Error(`Invalid confidence metric: ${JSON.stringify(m)}`);
    }
  });

  const overall = calculateWeightedConfidence(metrics);
  const pass = applyThresholdGating(overall, operationType, thresholds);

  let reason: string | undefined;
  if (!pass) {
    reason = generateLowConfidenceReason(metrics, operationType, overall, thresholds[operationType]);
  }

  return {
    overall: parseFloat(overall.toFixed(4)),  // Round to 4 decimal places
    metrics,
    pass,
    reason,
  };
}

/**
 * Generate human-readable reason for low confidence
 *
 * @param metrics - Confidence metrics
 * @param operationType - Type of operation
 * @param overall - Overall confidence score
 * @param threshold - Required threshold
 * @returns Explanation of low confidence
 */
function generateLowConfidenceReason(
  metrics: ConfidenceMetric[],
  operationType: OperationType,
  overall: number,
  threshold: number
): string {
  const lowMetrics = metrics
    .filter(m => m.value < 0.5)
    .sort((a, b) => (b.weight * (0.5 - b.value)) - (a.weight * (0.5 - a.value)))
    .slice(0, 2);  // Top 2 problematic metrics

  if (lowMetrics.length === 0) {
    return `置信度 (${(overall * 100).toFixed(1)}%) 未达到要求的阈值 (${(threshold * 100).toFixed(1)}%)`;
  }

  const metricNames = lowMetrics.map(m => m.description || m.name).join('、');
  return `置信度不足 (${(overall * 100).toFixed(1)}%)，主要原因：${metricNames}得分较低`;
}

// ============================================================================
// Operation-Specific Confidence Builders
// ============================================================================

/**
 * Build confidence score for data extraction
 *
 * @param params - Extraction confidence parameters
 * @returns Confidence score for extraction
 */
export function buildExtractionConfidence(params: {
  llmConfidence?: number;          // LLM's self-reported confidence (0-1)
  expectedFields?: number;         // Total expected fields
  extractedFields?: number;        // Successfully extracted fields
  formatMatches?: number;          // Fields matching expected format
  totalFields?: number;            // Total fields checked for format
  crossValidationPassed?: boolean; // Internal consistency checks
}): ConfidenceScore {
  const weights = METRIC_WEIGHTS.extraction;
  const metrics: ConfidenceMetric[] = [];

  // LLM confidence
  if (params.llmConfidence !== undefined) {
    metrics.push({
      name: 'llm_confidence',
      value: params.llmConfidence,
      weight: weights.llmConfidence,
      description: 'LLM自信度',
    });
  }

  // Data completeness
  if (params.expectedFields && params.extractedFields !== undefined) {
    const completeness = Math.min(params.extractedFields / params.expectedFields, 1);
    metrics.push({
      name: 'data_completeness',
      value: completeness,
      weight: weights.dataCompleteness,
      description: '数据完整性',
    });
  }

  // Format consistency
  if (params.formatMatches !== undefined && params.totalFields) {
    const consistency = params.formatMatches / params.totalFields;
    metrics.push({
      name: 'format_consistency',
      value: consistency,
      weight: weights.formatConsistency,
      description: '格式一致性',
    });
  }

  // Cross validation
  if (params.crossValidationPassed !== undefined) {
    metrics.push({
      name: 'cross_validation',
      value: params.crossValidationPassed ? 1 : 0,
      weight: weights.crossValidation,
      description: '交叉验证',
    });
  }

  // If no metrics provided, return low confidence
  if (metrics.length === 0) {
    metrics.push({
      name: 'no_metrics',
      value: 0.5,
      weight: 1,
      description: '缺少置信度指标',
    });
  }

  return createConfidenceScore(metrics, 'extraction');
}

/**
 * Build confidence score for financial calculations
 *
 * @param params - Calculation confidence parameters
 * @returns Confidence score for calculation
 */
export function buildCalculationConfidence(params: {
  requiredInputs?: number;         // Total required inputs
  availableInputs?: number;        // Available inputs
  dataQualityScore?: number;       // Quality of input data (0-1)
  functionMatchScore?: number;     // How well function matches intent (0-1)
  validationPassed?: boolean;      // Passes validation rules?
  warningCount?: number;           // Number of warnings generated
}): ConfidenceScore {
  const weights = METRIC_WEIGHTS.calculation;
  const metrics: ConfidenceMetric[] = [];

  // Data availability
  if (params.requiredInputs && params.availableInputs !== undefined) {
    const availability = Math.min(params.availableInputs / params.requiredInputs, 1);
    metrics.push({
      name: 'data_availability',
      value: availability,
      weight: weights.dataAvailability,
      description: '数据可用性',
    });
  }

  // Data quality
  if (params.dataQualityScore !== undefined) {
    metrics.push({
      name: 'data_quality',
      value: params.dataQualityScore,
      weight: weights.dataQuality,
      description: '数据质量',
    });
  }

  // Function match
  if (params.functionMatchScore !== undefined) {
    metrics.push({
      name: 'function_match',
      value: params.functionMatchScore,
      weight: weights.functionMatch,
      description: '功能匹配度',
    });
  }

  // Validation pass
  if (params.validationPassed !== undefined) {
    // Reduce confidence if there are warnings
    let validationScore = params.validationPassed ? 1 : 0;
    if (params.warningCount && params.warningCount > 0) {
      // Each warning reduces score by 0.1 (max 0.5 reduction)
      validationScore = Math.max(validationScore - (params.warningCount * 0.1), 0.5);
    }

    metrics.push({
      name: 'validation_pass',
      value: validationScore,
      weight: weights.validationPass,
      description: '验证通过',
    });
  }

  if (metrics.length === 0) {
    metrics.push({
      name: 'no_metrics',
      value: 0.5,
      weight: 1,
      description: '缺少置信度指标',
    });
  }

  return createConfidenceScore(metrics, 'calculation');
}

/**
 * Build confidence score for compliance guidance
 *
 * @param params - Guidance confidence parameters
 * @returns Confidence score for guidance
 */
export function buildGuidanceConfidence(params: {
  semanticSimilarity?: number;     // Vector search similarity (0-1)
  keywordMatchRatio?: number;      // Ratio of matched keywords (0-1)
  citationCount?: number;          // Number of citations
  minCitations?: number;           // Minimum required citations
  contextRelevance?: number;       // Relevance to user's context (0-1)
}): ConfidenceScore {
  const weights = METRIC_WEIGHTS.guidance;
  const metrics: ConfidenceMetric[] = [];

  // Semantic similarity
  if (params.semanticSimilarity !== undefined) {
    metrics.push({
      name: 'semantic_similarity',
      value: params.semanticSimilarity,
      weight: weights.semanticSimilarity,
      description: '语义相似度',
    });
  }

  // Keyword match
  if (params.keywordMatchRatio !== undefined) {
    metrics.push({
      name: 'keyword_match',
      value: params.keywordMatchRatio,
      weight: weights.keywordMatch,
      description: '关键词匹配度',
    });
  }

  // Citation quality
  if (params.citationCount !== undefined) {
    const minCitations = params.minCitations || 1;
    const citationQuality = Math.min(params.citationCount / minCitations, 1);
    metrics.push({
      name: 'citation_quality',
      value: citationQuality,
      weight: weights.citationQuality,
      description: '引用质量',
    });
  }

  // Context relevance
  if (params.contextRelevance !== undefined) {
    metrics.push({
      name: 'context_relevance',
      value: params.contextRelevance,
      weight: weights.contextRelevance,
      description: '上下文相关性',
    });
  }

  if (metrics.length === 0) {
    metrics.push({
      name: 'no_metrics',
      value: 0.5,
      weight: 1,
      description: '缺少置信度指标',
    });
  }

  return createConfidenceScore(metrics, 'guidance');
}

/**
 * Build confidence score for module routing
 *
 * @param params - Routing confidence parameters
 * @returns Confidence score for routing
 */
export function buildRoutingConfidence(params: {
  intentClarity?: number;          // How clear is user's intent? (0-1)
  moduleMatchScore?: number;       // How well does module match? (0-1)
  contextCompleteness?: number;    // Enough context to route? (0-1)
}): ConfidenceScore {
  const weights = METRIC_WEIGHTS.routing;
  const metrics: ConfidenceMetric[] = [];

  // Intent clarity
  if (params.intentClarity !== undefined) {
    metrics.push({
      name: 'intent_clarity',
      value: params.intentClarity,
      weight: weights.intentClarity,
      description: '意图清晰度',
    });
  }

  // Module match
  if (params.moduleMatchScore !== undefined) {
    metrics.push({
      name: 'module_match',
      value: params.moduleMatchScore,
      weight: weights.moduleMatch,
      description: '模块匹配度',
    });
  }

  // Context completeness
  if (params.contextCompleteness !== undefined) {
    metrics.push({
      name: 'context_completeness',
      value: params.contextCompleteness,
      weight: weights.contextCompleteness,
      description: '上下文完整性',
    });
  }

  if (metrics.length === 0) {
    metrics.push({
      name: 'no_metrics',
      value: 0.5,
      weight: 1,
      description: '缺少置信度指标',
    });
  }

  return createConfidenceScore(metrics, 'routing');
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Combine multiple confidence scores into one
 * Useful when a response depends on multiple operations
 *
 * @param scores - Array of confidence scores
 * @param weights - Optional weights for each score
 * @returns Combined confidence score
 */
export function combineConfidenceScores(
  scores: ConfidenceScore[],
  weights?: number[]
): number {
  if (scores.length === 0) {
    return 0;
  }

  if (weights && weights.length !== scores.length) {
    throw new Error('Weights array must match scores array length');
  }

  if (!weights) {
    // Equal weights
    return scores.reduce((sum, s) => sum + s.overall, 0) / scores.length;
  }

  // Weighted average
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  if (totalWeight === 0) {
    return scores.reduce((sum, s) => sum + s.overall, 0) / scores.length;
  }

  const weightedSum = scores.reduce((sum, s, i) => sum + (s.overall * weights[i]), 0);
  return weightedSum / totalWeight;
}

/**
 * Check if all confidence scores pass their thresholds
 *
 * @param scores - Array of confidence scores
 * @returns Whether all scores pass
 */
export function allScoresPass(scores: ConfidenceScore[]): boolean {
  return scores.every(s => s.pass);
}

/**
 * Get the lowest confidence score from array
 *
 * @param scores - Array of confidence scores
 * @returns Lowest confidence score
 */
export function getLowestScore(scores: ConfidenceScore[]): ConfidenceScore | null {
  if (scores.length === 0) {
    return null;
  }

  return scores.reduce((lowest, current) =>
    current.overall < lowest.overall ? current : lowest
  );
}

/**
 * Format confidence score for display
 *
 * @param confidence - Confidence score (0-1)
 * @returns Formatted string (e.g., "85.0%")
 */
export function formatConfidence(confidence: number): string {
  return `${(confidence * 100).toFixed(1)}%`;
}

/**
 * Get confidence level label
 *
 * @param confidence - Confidence score (0-1)
 * @returns Label (高/中/低)
 */
export function getConfidenceLevel(confidence: number): '高' | '中' | '低' {
  if (confidence >= 0.8) return '高';
  if (confidence >= 0.6) return '中';
  return '低';
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate confidence score object
 *
 * @param score - Confidence score to validate
 * @returns Whether score is valid
 */
export function validateConfidenceScore(score: any): score is ConfidenceScore {
  try {
    ConfidenceScoreSchema.parse(score);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate confidence metric
 *
 * @param metric - Confidence metric to validate
 * @returns Whether metric is valid
 */
export function validateConfidenceMetric(metric: any): metric is ConfidenceMetric {
  try {
    ConfidenceMetricSchema.parse(metric);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Export Types & Constants
// ============================================================================


