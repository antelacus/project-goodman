/**
 * Unit Tests for Report Workflow
 *
 * Tests the report generation workflow components:
 * 1. Tool registration in gather-metrics
 * 2. Metric formatting
 * 3. Report section constants
 * 4. Config messages
 *
 * Run with: npx tsx tests/unit/report-workflow.test.ts
 */

import { toolRegistry, registerUnifiedTools } from '../../src/lib/tools';
import {
  REPORT_SECTIONS,
  getAllMetricNames,
  getMetricDisplayName,
  formatMetricValue,
} from '../../src/lib/workflows/report/constants';
import {
  getInitialConfigMessage,
  getConfigUpdatedMessage,
  getComparisonRemovedMessage,
  getCancelledMessage,
  getGenerationStartingMessage,
} from '../../src/lib/prompts/report-config-messages';

// ============================================================================
// Test Utilities
// ============================================================================

let passCount = 0;
let failCount = 0;

function test(name: string, fn: () => void | Promise<void>): void {
  try {
    const result = fn();
    if (result instanceof Promise) {
      result
        .then(() => {
          console.log(`✅ PASS: ${name}`);
          passCount++;
        })
        .catch((error: Error) => {
          console.log(`❌ FAIL: ${name}`);
          console.log(`   Error: ${error.message}`);
          failCount++;
        });
    } else {
      console.log(`✅ PASS: ${name}`);
      passCount++;
    }
  } catch (error: unknown) {
    console.log(`❌ FAIL: ${name}`);
    console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
    failCount++;
  }
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

// ============================================================================
// Unit Tests
// ============================================================================

async function runTests() {
  console.log('\n========================================');
  console.log('Report Workflow Unit Tests');
  console.log('========================================\n');

  // ---------------------------------------------------------------------------
  // Test Group 1: Report Section Constants
  // ---------------------------------------------------------------------------
  console.log('\n--- Report Section Constants ---\n');

  test('REPORT_SECTIONS has 5 sections', () => {
    assert(REPORT_SECTIONS.length === 5, `Expected 5 sections, got ${REPORT_SECTIONS.length}`);
  });

  test('Report sections have correct IDs', () => {
    const expectedIds = ['liquidity', 'solvency', 'profitability', 'efficiency', 'comprehensive'];
    const actualIds = REPORT_SECTIONS.map(s => s.id);
    for (const id of expectedIds) {
      assert(actualIds.includes(id), `Missing section ID: ${id}`);
    }
  });

  test('Each section has metrics defined', () => {
    for (const section of REPORT_SECTIONS) {
      assert(section.metrics.length > 0, `Section ${section.id} has no metrics`);
    }
  });

  test('getAllMetricNames returns all metrics', () => {
    const metricNames = getAllMetricNames();
    assert(metricNames.length >= 20, `Expected at least 20 metrics, got ${metricNames.length}`);
    console.log(`   Found ${metricNames.length} total metrics`);
  });

  // ---------------------------------------------------------------------------
  // Test Group 2: Metric Display Names
  // ---------------------------------------------------------------------------
  console.log('\n--- Metric Display Names ---\n');

  test('getMetricDisplayName returns correct Chinese names', () => {
    const tests = [
      { tool: 'current_ratio', expected: '流动比率' },
      { tool: 'debt_to_asset_ratio', expected: '资产负债率' },
      { tool: 'net_profit_margin', expected: '净利润率' },
    ];

    for (const { tool, expected } of tests) {
      const actual = getMetricDisplayName(tool);
      assert(actual === expected, `Expected ${expected} for ${tool}, got ${actual}`);
    }
  });

  test('getMetricDisplayName handles unknown tools', () => {
    const result = getMetricDisplayName('unknown_tool');
    assert(result === 'unknown_tool', 'Should return tool name for unknown tools');
  });

  // ---------------------------------------------------------------------------
  // Test Group 3: Metric Value Formatting
  // ---------------------------------------------------------------------------
  console.log('\n--- Metric Value Formatting ---\n');

  test('formatMetricValue formats ratios with unit', () => {
    const result = formatMetricValue('current_ratio', 1.5);
    assert(result === '1.50倍', `Expected 1.50倍, got ${result}`);
  });

  test('formatMetricValue formats percentages correctly', () => {
    // Percentage values are stored as decimals (0.15 = 15%)
    const result = formatMetricValue('net_profit_margin', 0.15);
    assert(result.includes('%'), `Expected % in result, got ${result}`);
  });

  test('formatMetricValue formats turnover days correctly', () => {
    const result = formatMetricValue('asset_turnover_days', 45.5);
    // Days are rounded to nearest integer
    assert(result.includes('天'), `Expected 天 in result, got ${result}`);
  });

  test('formatMetricValue handles zero values', () => {
    const result = formatMetricValue('current_ratio', 0);
    assert(result === '0.00倍', `Expected 0.00倍, got ${result}`);
  });

  // ---------------------------------------------------------------------------
  // Test Group 4: Config Messages
  // ---------------------------------------------------------------------------
  console.log('\n--- Config Messages ---\n');

  test('getInitialConfigMessage includes tool introduction', () => {
    const message = getInitialConfigMessage('2024', '2023');
    assert(message.includes('财务分析报告生成工具'), 'Should include tool title');
    assert(message.includes('流动性分析'), 'Should mention liquidity analysis');
    assert(message.includes('PDF 格式'), 'Should mention PDF format');
    assert(message.includes('2024'), 'Should include primary year');
    assert(message.includes('2023'), 'Should include comparison year');
  });

  test('getInitialConfigMessage handles no comparison year', () => {
    const message = getInitialConfigMessage('2024');
    assert(message.includes('2024'), 'Should include primary year');
    assert(message.includes('对比年份: 无'), 'Should show "无" for no comparison');
  });

  test('getConfigUpdatedMessage shows updated config', () => {
    const message = getConfigUpdatedMessage('2023', '2022');
    assert(message.includes('2023'), 'Should include new primary year');
    assert(message.includes('2022'), 'Should include new comparison year');
    assert(message.includes('已更新配置'), 'Should indicate config updated');
  });

  test('getComparisonRemovedMessage confirms removal', () => {
    const message = getComparisonRemovedMessage('2024');
    assert(message.includes('已移除对比年份'), 'Should confirm removal');
    assert(message.includes('2024'), 'Should mention analysis year');
  });

  test('getCancelledMessage provides guidance', () => {
    const message = getCancelledMessage();
    assert(message.includes('已取消'), 'Should confirm cancellation');
    assert(message.includes('工具'), 'Should mention how to restart');
  });

  test('getGenerationStartingMessage shows correct info', () => {
    const messageWithComparison = getGenerationStartingMessage('2024', '2023');
    assert(messageWithComparison.includes('2024'), 'Should include year');
    assert(messageWithComparison.includes('2023年对比'), 'Should mention comparison');

    const messageWithoutComparison = getGenerationStartingMessage('2024');
    assert(!messageWithoutComparison.includes('对比'), 'Should not mention comparison');
  });

  // ---------------------------------------------------------------------------
  // Test Group 5: Tool Registration
  // ---------------------------------------------------------------------------
  console.log('\n--- Tool Registration ---\n');

  test('registerUnifiedTools registers financial tools', () => {
    toolRegistry.clear();
    registerUnifiedTools();
    assert(toolRegistry.size > 0, 'Registry should have tools after registration');
    console.log(`   Registered ${toolRegistry.size} tools`);
  });

  test('Registry has required financial metric tools', () => {
    const requiredTools = [
      'current_ratio',
      'quick_ratio',
      'debt_to_asset_ratio',
      'net_profit_margin',
      'return_on_equity',
      'inventory_turnover',
    ];

    for (const toolName of requiredTools) {
      assert(toolRegistry.has(toolName), `Missing required tool: ${toolName}`);
    }
  });

  test('Financial tools have correct metadata', () => {
    const tool = toolRegistry.get('current_ratio');
    assert(tool !== undefined, 'Should find current_ratio tool');
    assert(tool?.category === 'financial', 'Should be financial category');
    assert(tool?.displayName === '流动比率', 'Should have correct display name');
  });

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  // Wait for async tests
  await new Promise(resolve => setTimeout(resolve, 100));

  console.log('\n========================================');
  console.log(`Results: ${passCount} passed, ${failCount} failed`);
  console.log('========================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

// Run tests
runTests().catch(console.error);
