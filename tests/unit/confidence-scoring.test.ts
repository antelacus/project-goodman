/**
 * Test Suite for Confidence Scoring Utilities
 *
 * Run with: npx ts-node test-confidence-scoring.ts
 */

import {
  calculateWeightedConfidence,
  applyThresholdGating,
  createConfidenceScore,
  buildExtractionConfidence,
  buildCalculationConfidence,
  buildGuidanceConfidence,
  buildRoutingConfidence,
  combineConfidenceScores,
  allScoresPass,
  getLowestScore,
  formatConfidence,
  getConfidenceLevel,
  validateConfidenceScore,
  DEFAULT_THRESHOLDS,
  type ConfidenceMetric,
  type ConfidenceScore,
} from './src/lib/confidence-scoring';

// ============================================================================
// Test Utilities
// ============================================================================

let testCount = 0;
let passCount = 0;

function test(name: string, fn: () => void) {
  testCount++;
  try {
    fn();
    passCount++;
    console.log(`✅ ${name}`);
  } catch (error) {
    console.error(`❌ ${name}`);
    console.error(`   Error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertApprox(actual: number, expected: number, tolerance: number = 0.01, message?: string) {
  const diff = Math.abs(actual - expected);
  if (diff > tolerance) {
    throw new Error(message || `Expected ${expected} ± ${tolerance}, got ${actual}`);
  }
}

// ============================================================================
// Test Suite 1: Core Functions
// ============================================================================

console.log('\n📦 Test Suite 1: Core Functions\n');

test('calculateWeightedConfidence - equal weights', () => {
  const metrics: ConfidenceMetric[] = [
    { name: 'metric1', value: 0.8, weight: 1 },
    { name: 'metric2', value: 0.6, weight: 1 },
  ];
  const result = calculateWeightedConfidence(metrics);
  assertApprox(result, 0.7, 0.01, 'Should be average of 0.8 and 0.6');
});

test('calculateWeightedConfidence - different weights', () => {
  const metrics: ConfidenceMetric[] = [
    { name: 'metric1', value: 0.8, weight: 0.3 },
    { name: 'metric2', value: 0.6, weight: 0.7 },
  ];
  const result = calculateWeightedConfidence(metrics);
  // (0.8 * 0.3 + 0.6 * 0.7) / (0.3 + 0.7) = (0.24 + 0.42) / 1 = 0.66
  assertApprox(result, 0.66, 0.01, 'Should be weighted average');
});

test('calculateWeightedConfidence - empty array', () => {
  const result = calculateWeightedConfidence([]);
  assert(result === 0, 'Should return 0 for empty array');
});

test('applyThresholdGating - pass', () => {
  const result = applyThresholdGating(0.85, 'calculation');
  assert(result === true, 'Should pass with 0.85 confidence for calculation (threshold 0.85)');
});

test('applyThresholdGating - fail', () => {
  const result = applyThresholdGating(0.65, 'calculation');
  assert(result === false, 'Should fail with 0.65 confidence for calculation (threshold 0.85)');
});

test('createConfidenceScore - passing score', () => {
  const metrics: ConfidenceMetric[] = [
    { name: 'metric1', value: 0.9, weight: 1 },
    { name: 'metric2', value: 0.8, weight: 1 },
  ];
  const score = createConfidenceScore(metrics, 'extraction');
  assertApprox(score.overall, 0.85, 0.01);
  assert(score.pass === true, 'Should pass with 0.85 for extraction (threshold 0.70)');
  assert(score.reason === undefined, 'Should not have reason when passing');
});

test('createConfidenceScore - failing score', () => {
  const metrics: ConfidenceMetric[] = [
    { name: 'metric1', value: 0.5, weight: 1 },
    { name: 'metric2', value: 0.4, weight: 1 },
  ];
  const score = createConfidenceScore(metrics, 'calculation');
  assertApprox(score.overall, 0.45, 0.01);
  assert(score.pass === false, 'Should fail with 0.45 for calculation (threshold 0.85)');
  assert(score.reason !== undefined, 'Should have reason when failing');
});

// ============================================================================
// Test Suite 2: Extraction Confidence
// ============================================================================

console.log('\n📦 Test Suite 2: Extraction Confidence\n');

test('buildExtractionConfidence - all metrics high', () => {
  const score = buildExtractionConfidence({
    llmConfidence: 0.9,
    expectedFields: 10,
    extractedFields: 9,
    formatMatches: 8,
    totalFields: 9,
    crossValidationPassed: true,
  });
  assert(score.overall >= 0.85, 'Should have high overall confidence');
  assert(score.pass === true, 'Should pass extraction threshold (0.70)');
});

test('buildExtractionConfidence - low completeness', () => {
  const score = buildExtractionConfidence({
    llmConfidence: 0.9,
    expectedFields: 10,
    extractedFields: 3,  // Only 30%
    formatMatches: 3,
    totalFields: 3,
    crossValidationPassed: true,
  });
  // With high other metrics, confidence is moderate (~0.75)
  // Low completeness (30%) reduces overall score, but not below threshold
  assert(score.overall >= 0.70 && score.overall < 0.80,
    'Should have moderate confidence with low completeness but high other metrics');
  assert(score.pass === true, 'Should still pass extraction threshold (0.70)');
});

test('buildExtractionConfidence - no metrics', () => {
  const score = buildExtractionConfidence({});
  assert(score.overall === 0.5, 'Should default to 0.5 when no metrics provided');
  assert(score.pass === false, 'Should fail with default confidence');
});

// ============================================================================
// Test Suite 3: Calculation Confidence
// ============================================================================

console.log('\n📦 Test Suite 3: Calculation Confidence\n');

test('buildCalculationConfidence - all data available', () => {
  const score = buildCalculationConfidence({
    requiredInputs: 2,
    availableInputs: 2,
    dataQualityScore: 0.95,
    functionMatchScore: 0.9,
    validationPassed: true,
    warningCount: 0,
  });
  assert(score.overall >= 0.9, 'Should have very high confidence with all data');
  assert(score.pass === true, 'Should pass calculation threshold (0.85)');
});

test('buildCalculationConfidence - missing data', () => {
  const score = buildCalculationConfidence({
    requiredInputs: 5,
    availableInputs: 2,  // Only 40%
    dataQualityScore: 0.8,
    functionMatchScore: 0.7,
    validationPassed: true,
  });
  assert(score.overall < 0.85, 'Should have low confidence with missing data');
  assert(score.pass === false, 'Should fail calculation threshold');
});

test('buildCalculationConfidence - validation with warnings', () => {
  const score = buildCalculationConfidence({
    requiredInputs: 2,
    availableInputs: 2,
    dataQualityScore: 0.9,
    functionMatchScore: 0.85,
    validationPassed: true,
    warningCount: 2,  // 2 warnings
  });
  // Warnings should reduce validation score
  assert(score.metrics.find(m => m.name === 'validation_pass')?.value === 0.8,
    'Validation score should be reduced by warnings');
});

// ============================================================================
// Test Suite 4: Guidance Confidence
// ============================================================================

console.log('\n📦 Test Suite 4: Guidance Confidence\n');

test('buildGuidanceConfidence - high similarity and citations', () => {
  const score = buildGuidanceConfidence({
    semanticSimilarity: 0.92,
    keywordMatchRatio: 0.85,
    citationCount: 3,
    minCitations: 2,
    contextRelevance: 0.88,
  });
  assert(score.overall >= 0.85, 'Should have high confidence');
  assert(score.pass === true, 'Should pass guidance threshold (0.75)');
});

test('buildGuidanceConfidence - low similarity', () => {
  const score = buildGuidanceConfidence({
    semanticSimilarity: 0.5,
    keywordMatchRatio: 0.4,
    citationCount: 1,
    minCitations: 2,
    contextRelevance: 0.6,
  });
  assert(score.overall < 0.75, 'Should have low confidence');
  assert(score.pass === false, 'Should fail guidance threshold');
});

test('buildGuidanceConfidence - no citations', () => {
  const score = buildGuidanceConfidence({
    semanticSimilarity: 0.9,
    keywordMatchRatio: 0.8,
    citationCount: 0,
    minCitations: 2,
    contextRelevance: 0.85,
  });
  // Should have reduced confidence due to no citations
  assert(score.metrics.find(m => m.name === 'citation_quality')?.value === 0,
    'Citation quality should be 0 with no citations');
});

// ============================================================================
// Test Suite 5: Routing Confidence
// ============================================================================

console.log('\n📦 Test Suite 5: Routing Confidence\n');

test('buildRoutingConfidence - clear intent', () => {
  const score = buildRoutingConfidence({
    intentClarity: 0.9,
    moduleMatchScore: 0.85,
    contextCompleteness: 0.8,
  });
  assert(score.overall >= 0.85, 'Should have high confidence with clear intent');
  assert(score.pass === true, 'Should pass routing threshold (0.60)');
});

test('buildRoutingConfidence - unclear intent', () => {
  const score = buildRoutingConfidence({
    intentClarity: 0.4,
    moduleMatchScore: 0.5,
    contextCompleteness: 0.6,
  });
  assert(score.overall < 0.6, 'Should have low confidence with unclear intent');
  assert(score.pass === false, 'Should fail routing threshold');
});

// ============================================================================
// Test Suite 6: Utility Functions
// ============================================================================

console.log('\n📦 Test Suite 6: Utility Functions\n');

test('combineConfidenceScores - equal weights', () => {
  const scores: ConfidenceScore[] = [
    {
      overall: 0.8,
      metrics: [],
      pass: true,
    },
    {
      overall: 0.6,
      metrics: [],
      pass: true,
    },
  ];
  const combined = combineConfidenceScores(scores);
  assertApprox(combined, 0.7, 0.01);
});

test('combineConfidenceScores - custom weights', () => {
  const scores: ConfidenceScore[] = [
    { overall: 0.8, metrics: [], pass: true },
    { overall: 0.6, metrics: [], pass: true },
  ];
  const combined = combineConfidenceScores(scores, [0.3, 0.7]);
  // (0.8 * 0.3 + 0.6 * 0.7) / (0.3 + 0.7) = 0.66
  assertApprox(combined, 0.66, 0.01);
});

test('allScoresPass - all pass', () => {
  const scores: ConfidenceScore[] = [
    { overall: 0.9, metrics: [], pass: true },
    { overall: 0.85, metrics: [], pass: true },
  ];
  assert(allScoresPass(scores) === true, 'Should return true when all pass');
});

test('allScoresPass - one fails', () => {
  const scores: ConfidenceScore[] = [
    { overall: 0.9, metrics: [], pass: true },
    { overall: 0.5, metrics: [], pass: false },
  ];
  assert(allScoresPass(scores) === false, 'Should return false when one fails');
});

test('getLowestScore - finds lowest', () => {
  const scores: ConfidenceScore[] = [
    { overall: 0.9, metrics: [], pass: true },
    { overall: 0.5, metrics: [], pass: false },
    { overall: 0.7, metrics: [], pass: true },
  ];
  const lowest = getLowestScore(scores);
  assert(lowest?.overall === 0.5, 'Should find lowest score');
});

test('getLowestScore - empty array', () => {
  const lowest = getLowestScore([]);
  assert(lowest === null, 'Should return null for empty array');
});

test('formatConfidence - formats correctly', () => {
  assert(formatConfidence(0.854) === '85.4%', 'Should format to one decimal place');
  assert(formatConfidence(0.5) === '50.0%', 'Should handle round numbers');
  assert(formatConfidence(1) === '100.0%', 'Should handle 100%');
});

test('getConfidenceLevel - high', () => {
  assert(getConfidenceLevel(0.9) === '高', 'Should return 高 for >= 0.8');
  assert(getConfidenceLevel(0.8) === '高', 'Should return 高 for 0.8');
});

test('getConfidenceLevel - medium', () => {
  assert(getConfidenceLevel(0.7) === '中', 'Should return 中 for 0.6-0.8');
  assert(getConfidenceLevel(0.6) === '中', 'Should return 中 for 0.6');
});

test('getConfidenceLevel - low', () => {
  assert(getConfidenceLevel(0.5) === '低', 'Should return 低 for < 0.6');
  assert(getConfidenceLevel(0.3) === '低', 'Should return 低 for low values');
});

test('validateConfidenceScore - valid', () => {
  const score: ConfidenceScore = {
    overall: 0.85,
    metrics: [
      { name: 'test', value: 0.8, weight: 1 },
    ],
    pass: true,
  };
  assert(validateConfidenceScore(score) === true, 'Should validate correct score');
});

test('validateConfidenceScore - invalid', () => {
  const invalid = {
    overall: 1.5,  // Out of range
    metrics: [],
    pass: true,
  };
  assert(validateConfidenceScore(invalid) === false, 'Should reject invalid score');
});

// ============================================================================
// Test Suite 7: Real-World Scenarios
// ============================================================================

console.log('\n📦 Test Suite 7: Real-World Scenarios\n');

test('Scenario: Complete balance sheet extraction', () => {
  const score = buildExtractionConfidence({
    llmConfidence: 0.92,
    expectedFields: 45,
    extractedFields: 43,
    formatMatches: 42,
    totalFields: 43,
    crossValidationPassed: true,
  });
  console.log(`   Overall: ${formatConfidence(score.overall)}, Level: ${getConfidenceLevel(score.overall)}`);
  assert(score.pass === true, 'Should pass for complete extraction');
});

test('Scenario: Calculate ROE with all data', () => {
  const score = buildCalculationConfidence({
    requiredInputs: 2,  // net_profit, shareholders_equity
    availableInputs: 2,
    dataQualityScore: 0.95,
    functionMatchScore: 0.92,
    validationPassed: true,
    warningCount: 0,
  });
  console.log(`   Overall: ${formatConfidence(score.overall)}, Level: ${getConfidenceLevel(score.overall)}`);
  assert(score.pass === true, 'Should pass for complete calculation');
});

test('Scenario: Calculate with missing data', () => {
  const score = buildCalculationConfidence({
    requiredInputs: 6,  // EBITDA requires many inputs
    availableInputs: 3,  // Only half available
    dataQualityScore: 0.85,
    functionMatchScore: 0.8,
    validationPassed: false,
  });
  console.log(`   Overall: ${formatConfidence(score.overall)}, Level: ${getConfidenceLevel(score.overall)}`);
  console.log(`   Reason: ${score.reason}`);
  assert(score.pass === false, 'Should fail with insufficient data');
});

test('Scenario: Tax guidance with strong citations', () => {
  const score = buildGuidanceConfidence({
    semanticSimilarity: 0.89,
    keywordMatchRatio: 0.85,
    citationCount: 3,
    minCitations: 2,
    contextRelevance: 0.88,
  });
  console.log(`   Overall: ${formatConfidence(score.overall)}, Level: ${getConfidenceLevel(score.overall)}`);
  assert(score.pass === true, 'Should pass with strong citations');
});

test('Scenario: Unclear routing intent', () => {
  const score = buildRoutingConfidence({
    intentClarity: 0.45,
    moduleMatchScore: 0.55,
    contextCompleteness: 0.5,
  });
  console.log(`   Overall: ${formatConfidence(score.overall)}, Level: ${getConfidenceLevel(score.overall)}`);
  assert(score.pass === false, 'Should fail with unclear intent');
});

// ============================================================================
// Summary
// ============================================================================

console.log('\n' + '='.repeat(60));
console.log(`\n📊 Test Results: ${passCount}/${testCount} tests passed\n`);

if (passCount === testCount) {
  console.log('✅ All tests passed!\n');
  process.exit(0);
} else {
  console.log(`❌ ${testCount - passCount} test(s) failed\n`);
  process.exit(1);
}
